import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_DISEASES } from './src/data/defaultDiseases';
import { createAuthRouter } from './server/authRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const app = express();
const PORT = getPort();

// Body parser with 30mb limit for high-res camera captures
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use('/api/auth', createAuthRouter());

// Lazy Initialize Gemini Client (supports CUSTOM_GEMINI_API_KEY override)
let aiClient: GoogleGenAI | null = null;
let cachedApiKey: string = '';
function getGeminiClient(): GoogleGenAI | null {
  const activeKey = (process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!activeKey) {
    return null;
  }
  if (!aiClient || cachedApiKey !== activeKey) {
    aiClient = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = activeKey;
  }
  return aiClient;
}



// Active Gemini Flash models (ordered from SKILL.md recommended to fallback)
const CANDIDATE_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

// Short-lived cooldown when Google Search grounding has 0 Free Tier quota (resets if key changes or after 2 minutes)
let searchCooldownKey = '';
let searchCooldownUntil = 0;

function extractResponseText(res: any): string {
  if (typeof res?.text === 'string' && res.text.trim()) {
    return res.text.trim();
  }
  const parts = res?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts
      .filter((p: any) => !p?.thought && typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('')
      .trim();
    if (joined) return joined;
  }
  return '';
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    fallbackContents?: any;
    fallbackConfig?: any;
  }
): Promise<any> {
  const attemptLogs: string[] = [];
  let lastErr: any = null;

  const activeKey = (process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (searchCooldownKey !== activeKey) {
    searchCooldownKey = activeKey;
    searchCooldownUntil = 0;
  }

  const hasTools = Boolean(params.config?.tools && Array.isArray(params.config.tools) && params.config.tools.length > 0);
  const skipGrounded = hasTools && Date.now() < searchCooldownUntil;

  const passes: { contents: any; config: any; label: string }[] = [];
  if (!skipGrounded) {
    passes.push({
      contents: params.contents,
      config: params.config,
      label: hasTools ? 'grounded' : 'direct',
    });
  }

  if (hasTools) {
    const { tools: _ignoredTools, ...configWithoutTools } = params.config || {};
    const directConfig =
      params.fallbackConfig !== undefined
        ? params.fallbackConfig
        : Object.keys(configWithoutTools).length > 0
        ? configWithoutTools
        : undefined;
    passes.push({
      contents: params.fallbackContents !== undefined ? params.fallbackContents : params.contents,
      config: directConfig,
      label: 'direct-no-search',
    });
  }

  for (const pass of passes) {
    let shouldTryNextPass = false;
    let sawOnly429InPass = true;
    for (const model of CANDIDATE_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: pass.contents,
          config: pass.config,
        });
        const extracted = extractResponseText(res);
        if (!extracted) {
          sawOnly429InPass = false;
          const finishReason = res?.candidates?.[0]?.finishReason || 'unknown';
          const partTypes = Array.isArray(res?.candidates?.[0]?.content?.parts)
            ? res.candidates[0].content.parts.map((p: any) => Object.keys(p || {}).join('+')).join(',')
            : 'none';
          const emptyMsg = `empty(finish=${finishReason},parts=${partTypes})`;
          attemptLogs.push(`${model}[${pass.label}]:${emptyMsg}`);
          lastErr = new Error(`Gemini chưa trả về câu trả lời (${emptyMsg}).`);
          shouldTryNextPass = true;
          continue;
        }
        return res;
      } catch (err: any) {
        lastErr = err;
        const code = Number(err?.status || err?.code || 0);
        const rawMsg = err?.message || String(err || '');
        const msg = rawMsg.toLowerCase();
        attemptLogs.push(`${model}[${pass.label}]:${code || 'err'}:${rawMsg.slice(0, 120)}`);

        if (code !== 429 && !msg.includes('resource_exhausted') && !msg.includes('quota')) {
          sawOnly429InPass = false;
        }

        if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
          throw err;
        }
        if (
          code === 404 ||
          code === 429 ||
          code === 503 ||
          code === 500 ||
          msg.includes('not_found') ||
          msg.includes('resource_exhausted') ||
          msg.includes('quota') ||
          msg.includes('unavailable') ||
          msg.includes('high demand') ||
          msg.includes('overloaded')
        ) {
          console.info(`[AgriVision AI] Model ${model} (${pass.label}) returned ${code || 'error'}, trying next...`);
          shouldTryNextPass = true;
          continue;
        }
        throw err;
      }
    }
    if (pass.label === 'grounded' && sawOnly429InPass) {
      searchCooldownKey = activeKey;
      searchCooldownUntil = Date.now() + 120_000;
    }
    if (!shouldTryNextPass) break;
  }

  if (lastErr && typeof lastErr === 'object') {
    lastErr.attemptSummary = attemptLogs.join(' | ');
  }
  throw lastErr;
}

// Extract 1-2 clean reference links from Gemini Google Search groundingMetadata
function extractGroundingLinks(response: any, maxLinks: number = 2): { title: string; url: string }[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const links: { title: string; url: string }[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (!uri || typeof uri !== 'string') continue;
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) continue;
    if (seen.has(uri)) continue;

    seen.add(uri);
    let title = (chunk?.web?.title || '').trim();
    if (!title) {
      try {
        title = new URL(uri).hostname.replace(/^www\./, '');
      } catch {
        title = 'Nguồn tham khảo nông nghiệp';
      }
    }
    links.push({ title, url: uri });
    if (links.length >= maxLinks) break;
  }

  return links;
}

// Parse JSON from model text output even if wrapped in markdown fences or extra prose
function extractJsonFromText(rawText?: string): any | null {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Format human-friendly Gemini API error in Vietnamese
function formatGeminiError(err: any): { status: number; message: string } {
  const msg = (err?.message || String(err || '')).toLowerCase();
  const code = Number(err?.status || err?.code || 500);

  if (
    msg.includes('billing_disabled') ||
    msg.includes('requires billing') ||
    msg.includes('enable billing') ||
    msg.includes('free tier is not available')
  ) {
    return {
      status: 403,
      message:
        'Dự án Google Cloud của bạn đã bật dịch vụ nhưng chưa gắn thanh toán (Billing). Vui lòng bật Billing cho dự án trên Google Cloud Console hoặc đổi sang khóa Google AI Studio (AIza...) trong Settings > Secrets.',
    };
  }
  if (msg.includes('service_disabled') || msg.includes('has not been used in project')) {
    return {
      status: 403,
      message:
        'Khóa API đã nhận, nhưng dự án Google Cloud của bạn chưa bật dịch vụ Vertex AI (aiplatform.googleapis.com). Hãy mở Google Cloud Console bấm nút Enable (Bật) API này rồi đợi 1–2 phút thử lại nhé.',
    };
  }
  if (code === 403 || msg.includes('permission_denied') || msg.includes('api_key_invalid')) {
    return {
      status: 403,
      message: 'Khóa kết nối Gemini API chưa hợp lệ hoặc chưa được cấp quyền. Bác vui lòng kiểm tra lại GEMINI_API_KEY trong Settings > Secrets.',
    };
  }
  if (code === 429 || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return {
      status: 429,
      message:
        'Dự án Google AI của bạn đang hết hạn mức gọi miễn phí (hoặc hạn mức đang bằng 0 vì chưa liên kết Billing trên Google AI Studio). Bạn kiểm tra lại hạn mức tại https://ai.dev/rate-limit hoặc gắn Billing cho khóa API nhé.',
    };
  }
  if (code === 503 || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('overloaded')) {
    return {
      status: 503,
      message:
        'Hệ thống Bác sĩ AI đang có nhiều người hỏi cùng lúc nên hơi quá tải nhẹ. Bác đợi vài giây rồi bấm thử lại giúp tôi nhé.',
    };
  }
  return {
    status: 500,
    message: 'Không thể kết nối tới Bác sĩ AI lúc này. Bác kiểm tra mạng rồi thử lại giúp tôi nhé.',
  };
}

// Helper to resolve image to base64 if it's a local path, external URL, or data URL
async function resolveImageBase64(input: string, fallbackMime: string = 'image/jpeg'): Promise<{ base64: string; mimeType: string }> {
  if (input.startsWith('/images/')) {
    const filePath = path.resolve(__dirname, 'public', input.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      const base64 = fs.readFileSync(filePath).toString('base64');
      return { base64, mimeType: fallbackMime };
    }
  }

  if (input.startsWith('/src/')) {
    const filePath = path.resolve(__dirname, input.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      const base64 = fs.readFileSync(filePath).toString('base64');
      return { base64, mimeType: fallbackMime };
    }
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    const contentType = res.headers.get('content-type') || fallbackMime;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { base64, mimeType: contentType };
  }

  // Check data URL
  const match = input.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
  const mimeType = match ? match[1] : fallbackMime;
  const base64 = input.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  return { base64, mimeType };
}

// 1. Diagnose Plant Image Endpoint (Real Gemini 2.5 Flash + Google Search Grounding)
app.post('/api/diagnose', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cropType = 'citrus', plantPart = 'leaf' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Bác vui lòng chọn hoặc chụp ảnh cây trước khi kiểm tra nhé.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Chưa có khóa kết nối Gemini API (GEMINI_API_KEY) trên máy chủ.',
      });
    }

    const { base64: cleanBase64, mimeType: resolvedMime } = await resolveImageBase64(imageBase64, mimeType);

    const cropNameVi = cropType === 'citrus' ? 'Cây Cam / Bưởi (cây có múi)' : cropType === 'rice' ? 'Cây Lúa' : 'Cây Lạc (Đậu phộng)';
    const partNameVi = plantPart === 'leaf' ? 'Lá cây' : plantPart === 'stem' ? 'Thân / Cành' : plantPart === 'fruit' ? 'Quả / Củ' : 'Toàn cây';

    const systemInstruction = `
Bạn là "Bác sĩ cây trồng AgriVision" gần gũi, tận tâm đồng hành cùng bà con nông dân Việt Nam (xưng hô "Bác - tôi").
Nhiệm vụ của bạn là quan sát trực tiếp hình ảnh người dùng gửi lên, kết hợp tra cứu Google Search đối chiếu kiến thức bệnh hại cây trồng Việt Nam (Viện Bảo vệ Thực vật, Cục Bảo vệ Thực vật, Khuyến nông Quốc gia, FAO, IRRI) để chẩn đoán chính xác, dễ hiểu cho người lớn tuổi.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. PHÁT HIỆN NHẦM LOẠI CÂY HOẶC KHÔNG PHẢI ẢNH CÂY:
   - Nếu ảnh không phải cây trồng (ví dụ đồ vật, người, động vật...): đặt isPlantImage: false, selectedCropMatches: false, possibleDiagnoses: [], giải thích nhẹ nhàng để bác chụp lại ảnh cây.
   - Kiểm tra xem cây trong ảnh có đúng là "${cropNameVi}" hay không:
     + Cam / Bưởi (cây có múi): cây thân gỗ, lá đơn hình bầu dục dày bóng, cuống thường có cánh nhỏ, quả có múi.
     + Lúa: lá dải dài hẹp, gân song song, thân bụi cỏ.
     + Lạc (Đậu phộng): lá kép gồm 4 lá chét tròn đầu mọc đối xứng nhau, thân thảo.
   - Nếu bác chọn nhầm cây (ví dụ chọn Cam/Bưởi nhưng ảnh là cây Lạc hoặc cây Lúa): BẮT BUỘC đặt selectedCropMatches: false, điền đúng tên cây nhìn thấy vào cropDetected (ví dụ "Cây Lạc (Đậu phộng)" hoặc "Cây Lúa" hoặc "Cây Cam, Bưởi"), possibleDiagnoses: [] (tuyệt đối không gán bệnh của cây này sang cây khác!).

2. PHÂN BIỆT RÕ LÁ KHỎE MẠNH VS LÁ BỆNH VS ẢNH QUÁ MỜ:
   - Nếu ảnh quá mờ, rung tay, out nét không thấy rõ bề mặt lá/vết bệnh: đặt imageQuality: "poor", diseaseId: "unclear_due_to_blur", confidenceLevel: "insufficient_evidence", needsMoreImages: true, hướng dẫn bác chụp lại rõ hơn.
   - Nếu lá/cây xanh tươi khỏe mạnh, không thấy vết bệnh hay sâu hại: đặt diseaseId: "healthy", diseaseName: "Cây khỏe mạnh (Không thấy dấu hiệu bệnh)", confidenceLevel: "high", nêu rõ dấu hiệu xanh tốt và cách chăm giữ cây khỏe.

3. NỘI DUNG KẾT QUẢ BẰNG TIẾNG VIỆT GẦN GŨI ("Bác - tôi"):
   - Viết câu ngắn gọn, rõ ý, tránh thuật ngữ khó hiểu; giải thích bình dân dễ đọc cho bác nông dân lớn tuổi.
   - Phải nêu rõ:
     + Tên bệnh (diseaseName)
     + Dấu hiệu nhận biết trực tiếp trên ảnh (symptoms & evidence - chỉ mô tả những gì thực sự thấy trên ảnh!)
     + Nguyên nhân gây bệnh (causes - vi khuẩn/nấm/côn trùng môi giới/thời tiết ẩm hoặc thiếu chất...)
     + Cách xử lý an toàn (recommendations - ưu tiên cắt tỉa, vệ sinh vườn, bón cân đối, biện pháp sinh học/IPM an toàn, không tự bịa liều lượng hóa chất độc hại).
   - Dùng công cụ Google Search để đối chiếu triệu chứng và tìm nguồn khuyến nông/Viện BVTV uy tín.

4. ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC):
   - Trả lời DUY NHẤT một đối tượng JSON hợp lệ (không thêm chữ giải thích bên ngoài dấu { }), đúng các khóa sau:
{
  "isPlantImage": true,
  "cropDetected": "Tên loại cây nhận diện bằng tiếng Việt",
  "selectedCropMatches": true,
  "imageQuality": "good" | "fair" | "poor",
  "qualityIssues": ["..."],
  "symptoms": ["Dấu hiệu 1 nhìn thấy trên ảnh...", "Dấu hiệu 2..."],
  "causes": "Giải thích ngắn gọn nguyên nhân gây bệnh bằng giọng xưng Bác - tôi...",
  "possibleDiagnoses": [
    {
      "diseaseId": "ma_benh_khong_dau",
      "diseaseName": "Tên bệnh tiếng Việt rõ ràng",
      "evidence": ["Bằng chứng nhìn thấy trên ảnh 1", "Bằng chứng 2"],
      "confidenceLevel": "high" | "medium" | "low" | "insufficient_evidence"
    }
  ],
  "alternativeCauses": ["Nguyên nhân khác cần lưu ý nếu có"],
  "severityAssessment": "mild" | "moderate" | "severe" | "uncertain",
  "needsMoreImages": false,
  "additionalImageInstructions": [],
  "recommendations": [
    "Bước xử lý an toàn 1 cho bác...",
    "Bước xử lý an toàn 2...",
    "Bước phòng ngừa lây lan..."
  ],
  "expertVerificationRecommended": true,
  "disclaimer": "Đây là gợi ý kiểm tra từ Bác sĩ AI dựa trên ảnh chụp và tài liệu nông nghiệp; nếu bệnh lan nhanh bác nên mang mẫu tới trạm khuyến nông gần nhất."
}
`.trim();

    const DIAGNOSIS_RESPONSE_SCHEMA = {
      type: Type.OBJECT,
      properties: {
        isPlantImage: { type: Type.BOOLEAN },
        cropDetected: { type: Type.STRING },
        selectedCropMatches: { type: Type.BOOLEAN },
        imageQuality: { type: Type.STRING },
        qualityIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
        symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
        causes: { type: Type.STRING },
        possibleDiagnoses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              diseaseId: { type: Type.STRING },
              diseaseName: { type: Type.STRING },
              evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidenceLevel: { type: Type.STRING },
            },
            required: ['diseaseId', 'diseaseName', 'evidence', 'confidenceLevel'],
          },
        },
        alternativeCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
        severityAssessment: { type: Type.STRING },
        needsMoreImages: { type: Type.BOOLEAN },
        additionalImageInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        expertVerificationRecommended: { type: Type.BOOLEAN },
        disclaimer: { type: Type.STRING },
      },
      required: [
        'isPlantImage',
        'cropDetected',
        'selectedCropMatches',
        'imageQuality',
        'qualityIssues',
        'symptoms',
        'causes',
        'possibleDiagnoses',
        'alternativeCauses',
        'severityAssessment',
        'needsMoreImages',
        'additionalImageInstructions',
        'recommendations',
        'expertVerificationRecommended',
        'disclaimer',
      ],
    };

    const directSystemInstruction = systemInstruction
      .replace(/, kết hợp tra cứu Google Search/g, '')
      .replace(/\s*- Dùng công cụ Google Search[^\n]*\n?/g, '\n');

    const userPrompt = `
Bác nông dân đang nhờ kiểm tra hình ảnh thực tế này:
- Loại cây bác chọn: ${cropNameVi}
- Bộ phận chụp: ${partNameVi}
- Khu vực: Việt Nam (ưu tiên điều kiện canh tác Bắc Trung Bộ & đồng bằng).

Hãy quan sát thật kỹ hình ảnh đính kèm, tra cứu Google Search để đối chiếu bệnh hại chính xác và trả về đúng cấu trúc JSON yêu cầu (dùng cách xưng hô thân thiện "Bác - tôi").
`.trim();

    const directUserPrompt = `
Bác nông dân đang nhờ kiểm tra hình ảnh thực tế này:
- Loại cây bác chọn: ${cropNameVi}
- Bộ phận chụp: ${partNameVi}
- Khu vực: Việt Nam (ưu tiên điều kiện canh tác Bắc Trung Bộ & đồng bằng).

Hãy quan sát thật kỹ hình ảnh đính kèm, đối chiếu bệnh hại chính xác và trả về đúng cấu trúc JSON yêu cầu (dùng cách xưng hô thân thiện "Bác - tôi").
`.trim();

    const response = await generateWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: resolvedMime,
            data: cleanBase64,
          },
        },
        {
          text: userPrompt,
        },
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
      fallbackContents: [
        {
          inlineData: {
            mimeType: resolvedMime,
            data: cleanBase64,
          },
        },
        {
          text: directUserPrompt,
        },
      ],
      fallbackConfig: {
        systemInstruction: directSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: DIAGNOSIS_RESPONSE_SCHEMA,
      },
    });

    const groundingLinks = extractGroundingLinks(response, 2);
    const responseText = extractResponseText(response);
    let parsedResult = extractJsonFromText(responseText);

    // If grounded response included prose rather than pure JSON, convert it cleanly using structured JSON mode
    if (!parsedResult && responseText) {
      const formatResponse = await generateWithFallback(ai, {
        contents: `Chuyển đổi nội dung chẩn đoán sau thành JSON chuẩn theo đúng schema (giữ nguyên thông tin và giọng văn Bác - tôi):\n\n${responseText}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: DIAGNOSIS_RESPONSE_SCHEMA,
        },
      });
      parsedResult = extractJsonFromText(extractResponseText(formatResponse));
    }

    if (!parsedResult) {
      throw new Error('Không thể đọc kết quả phân tích từ Gemini.');
    }

    const normalizedResult = {
      isPlantImage: parsedResult.isPlantImage ?? true,
      cropDetected: parsedResult.cropDetected || cropNameVi,
      selectedCropMatches: parsedResult.selectedCropMatches ?? true,
      imageQuality: ['good', 'fair', 'poor'].includes(parsedResult.imageQuality)
        ? parsedResult.imageQuality
        : 'good',
      qualityIssues: Array.isArray(parsedResult.qualityIssues) ? parsedResult.qualityIssues : [],
      symptoms: Array.isArray(parsedResult.symptoms) ? parsedResult.symptoms : [],
      causes: typeof parsedResult.causes === 'string' ? parsedResult.causes : '',
      possibleDiagnoses: Array.isArray(parsedResult.possibleDiagnoses) ? parsedResult.possibleDiagnoses : [],
      alternativeCauses: Array.isArray(parsedResult.alternativeCauses) ? parsedResult.alternativeCauses : [],
      severityAssessment: ['mild', 'moderate', 'severe', 'uncertain'].includes(parsedResult.severityAssessment)
        ? parsedResult.severityAssessment
        : 'moderate',
      needsMoreImages: Boolean(parsedResult.needsMoreImages),
      additionalImageInstructions: Array.isArray(parsedResult.additionalImageInstructions)
        ? parsedResult.additionalImageInstructions
        : [],
      recommendations: Array.isArray(parsedResult.recommendations) ? parsedResult.recommendations : [],
      referenceLinks: groundingLinks,
      expertVerificationRecommended: parsedResult.expertVerificationRecommended ?? true,
      disclaimer:
        parsedResult.disclaimer ||
        'Kết quả do Bác sĩ AI đối chiếu hình ảnh và tài liệu nông nghiệp trên Google; nếu bệnh lan nhanh, bác nên mang mẫu tới trạm khuyến nông gần nhà để kiểm tra thêm.',
    };

    return res.json(normalizedResult);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    if (formatted.status === 403) {
      console.info('[AgriVision AI] Gemini API 403:', formatted.message);
    } else {
      console.error('Error during Gemini plant diagnosis:', error);
    }
    return res.status(formatted.status).json({
      error: formatted.message,
      details: error?.attemptSummary || error?.message || String(error),
    });
  }
});

// 2. Agricultural AI Assistant Chat Endpoint (Real Gemini 2.5 Flash + Google Search Grounding)
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, history = [], diagnosisContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Bác vui lòng nhập câu hỏi nhé.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Chưa có khóa kết nối Gemini API (GEMINI_API_KEY) trên máy chủ.',
      });
    }

    const systemInstruction = `
Bạn là "Bác sĩ cây trồng AgriVision" thân thiện, am hiểu sâu về cây Cam/Bưởi, cây Lúa và cây Lạc tại Việt Nam.
Hãy trả lời bằng tiếng Việt thật gần gũi, dễ hiểu cho bà con nông dân lớn tuổi (xưng hô "Bác - tôi").

NGUYÊN TẮC TRẢ LỜI:
1. Sử dụng công cụ Google Search để tra cứu thông tin nông nghiệp, khuyến nông, Viện Bảo vệ Thực vật chính xác và cập nhật.
2. Trình bày ngắn gọn, rõ từng ý (gạch đầu dòng hoặc đánh số 1, 2, 3), tránh từ ngữ học thuật rắc rối.
3. Luôn ưu tiên hướng dẫn an toàn sinh học (cắt tỉa, vệ sinh đồng ruộng, bón phân cân đối, chế phẩm sinh học) trước, không tự ý bịa đặt liều lượng thuốc độc hại.
4. Nếu có ngữ cảnh lần khám vừa rồi của bác, hãy bám sát vào cây trồng và triệu chứng đó để giải thích cụ thể.
`.trim();

    let contextPrompt = '';
    if (diagnosisContext) {
      contextPrompt = `
[Thông tin lần khám vừa rồi của bác]:
- Cây trồng: ${diagnosisContext.crop}
- Bộ phận: ${diagnosisContext.part || 'Lá'}
- Bệnh nghi ngờ: ${diagnosisContext.suspectedDisease || 'Chưa xác định'}
- Dấu hiệu ghi nhận: ${JSON.stringify(diagnosisContext.symptoms || [])}
- Mức độ tin cậy: ${diagnosisContext.confidenceLevel || 'Trung bình'}
\n`;
    }

    const conversationPrompt = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: { sender: string; content: string }) => `${h.sender === 'user' ? 'Bác nông dân' : 'Bác sĩ AI'}: ${h.content}`)
          .join('\n')
      : '';

    const fullPrompt = `${contextPrompt}${conversationPrompt ? conversationPrompt + '\n' : ''}Bác nông dân hỏi: ${message}\nBác sĩ AI trả lời gần gũi (xưng Bác - tôi):`;

    const directAssistantInstruction = systemInstruction.replace(
      '1. Sử dụng công cụ Google Search để tra cứu thông tin nông nghiệp, khuyến nông, Viện Bảo vệ Thực vật chính xác và cập nhật.',
      '1. Dựa trên kiến thức chuẩn của Viện Bảo vệ Thực vật, Cục Bảo vệ Thực vật và Khuyến nông Việt Nam để tư vấn chính xác.'
    );

    const response = await generateWithFallback(ai, {
      contents: fullPrompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
      fallbackConfig: {
        systemInstruction: directAssistantInstruction,
      },
    });

    const replyText = extractResponseText(response);
    const sources = extractGroundingLinks(response, 2);

    if (!replyText) {
      throw new Error('Gemini chưa trả về câu trả lời.');
    }

    return res.json({ reply: replyText, sources });
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    if (formatted.status === 403) {
      console.info('[AgriVision AI] Assistant Gemini API 403:', formatted.message);
    } else {
      console.error('Error during AI assistant response:', error);
    }
    return res.status(formatted.status).json({
      error: formatted.message,
      details: error?.attemptSummary || error?.message || String(error),
    });
  }
});

// 3. Verified Disease Database API
app.get('/api/diseases', (req, res) => {
  res.json({ diseases: DEFAULT_DISEASES });
});

// 4. Server Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AgriVision AI',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
  });
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgriVision AI] Server running at http://0.0.0.0:${PORT}`);
  });
}

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

startServer().catch((err) => {
  console.error('[AgriVision AI] Failed to start server:', err);
  process.exit(1);
});
