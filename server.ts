import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_DISEASES } from './src/data/defaultDiseases';
import { createAuthRouter } from './server/authRoutes';
import { createPhoneDataRouter } from './server/phoneDataRoutes';

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
app.use('/api', createPhoneDataRouter());

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
const CANDIDATE_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];

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

  // Model-first order: always exhaust gemini-4-hydrogen (grounded -> direct) before falling back to lite
  for (const model of CANDIDATE_MODELS) {
    for (const pass of passes) {
      if (pass.label === 'grounded' && Date.now() < searchCooldownUntil) {
        continue;
      }

      const effectiveConfig =
        model === 'gemini-4-hydrogen' && pass.config
          ? {
              ...pass.config,
              thinkingConfig: pass.config.thinkingConfig || { thinkingLevel: ThinkingLevel.HIGH },
            }
          : pass.config;

      try {
        const res = await ai.models.generateContent({
          model,
          contents: pass.contents,
          config: effectiveConfig,
        });
        const extracted = extractResponseText(res);
        if (!extracted) {
          const finishReason = res?.candidates?.[0]?.finishReason || 'unknown';
          const partTypes = Array.isArray(res?.candidates?.[0]?.content?.parts)
            ? res.candidates[0].content.parts.map((p: any) => Object.keys(p || {}).join('+')).join(',')
            : 'none';
          const emptyMsg = `empty(finish=${finishReason},parts=${partTypes})`;
          attemptLogs.push(`${model}[${pass.label}]:${emptyMsg}`);
          lastErr = new Error(`Gemini chưa trả về câu trả lời (${emptyMsg}).`);
          continue;
        }
        return res;
      } catch (err: any) {
        lastErr = err;
        const code = Number(err?.status || err?.code || 0);
        const rawMsg = err?.message || String(err || '');
        const msg = rawMsg.toLowerCase();
        attemptLogs.push(`${model}[${pass.label}]:${code || 'err'}:${rawMsg.slice(0, 120)}`);

        if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
          throw err;
        }

        const isQuotaOrRateLimit = code === 429 || msg.includes('resource_exhausted') || msg.includes('quota');
        if (pass.label === 'grounded' && isQuotaOrRateLimit) {
          // Avoid burning extra RPM slots on search grounding when Free Tier search quota is exhausted
          searchCooldownKey = activeKey;
          searchCooldownUntil = Date.now() + 120_000;
        }

        if (
          code === 404 ||
          isQuotaOrRateLimit ||
          code === 503 ||
          code === 500 ||
          msg.includes('not_found') ||
          msg.includes('unavailable') ||
          msg.includes('high demand') ||
          msg.includes('overloaded')
        ) {
          console.info(`[AgriVision AI] Model ${model} (${pass.label}) returned ${code || 'error'}, trying next...`);
          continue;
        }
        throw err;
      }
    }
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

function buildCropKnowledgeContext(cropType: string): string {
  const cropDiseases = DEFAULT_DISEASES.filter((d) => d.cropType === cropType);
  const diseaseSummaries = cropDiseases
    .map(
      (d) =>
        `- [${d.id}] ${d.vietnameseName} (${d.englishName}) | Bộ phận: ${d.affectedPlantParts.join(', ')}\n  + Triệu chứng chuẩn: ${d.symptoms}\n  + Nguyên nhân: ${d.causes}\n  + Xử lý an toàn: ${d.safeManagement}`
    )
    .join('\n');

  let differentialRules = '';
  if (cropType === 'citrus') {
    differentialRules = `
BẢNG PHÂN BIỆT BỆNH & SÂU HẠI CÂY CÓ MÚI:
- [citrus_greening] (Vàng lá gân xanh HLB) vs Thiếu vi lượng (Kẽm/Magie/Sắt): HLB lá vàng LOANG LỔ KHÔNG ĐỐI XỨNG qua gân chính, gân nổi gồ ghề, lá non mọc đứng kiểu tai thỏ, quả lệch tâm cuống vàng trước; còn thiếu vi lượng lá vàng ĐỐI XỨNG hai bên gân chính kiểu xương cá đều đặn.
- [citrus_canker] (Loét cam quýt) vs [citrus_scab] (Ghẻ sẹo) vs [citrus_black_spot] (Đốm đen vỏ quả): Loét tạo vết tròn nâu xám nứt nẻ CÓ QUẦNG VÀNG SÁNG (halo) bao quanh trên CẢ HAI MẶT LÁ và quả; Ghẻ sẹo tạo MỤN GAI NHÔ LỒI hình nón sừng làm lá/quả nhăn nheo và không có quầng vàng sáng; Đốm đen vỏ quả tạo đốm tròn hơi lõm tâm xám có chấm đen li ti trên vỏ quả chín.
- [citrus_gummosis] (Thối gốc chảy gôm): Vỏ cổ rễ/thân nứt thâm rỉ nhựa gôm vàng nâu.
- SÂU HẠI TRÊN LÁ / LỘC NON CAM QUÝT (gọi ĐÚNG tên chuẩn Cục BVTV Việt Nam, TUYỆT ĐỐI KHÔNG tự ghép/bịa tên lạ như "rầy lửa"):
  + [citrus_psyllid] Rầy chổng cánh (Diaphorina citri - môi giới truyền bệnh Vàng lá gân xanh HLB): Con trưởng thành nhỏ màu nâu đen/nâu xám có cánh thuôn nhọn, khi đậu ĐUÔI CHỔNG LÊN GÓC ~45 ĐỘ so với mặt lá; ấu trùng dẹt màu vàng nâu/cam kèm CÁC SỢI SÁP TRẮNG XOẮN tiết ra trên lá non/chồi non.
  + [citrus_brown_aphid] Rệp muội đen/nâu cam quýt (Toxoptera citricida): Cơ thể mềm tròn màu nâu đen bóng tụ tập dày đặc thành đám ở đọt non, KHÔNG chổng đuôi 45 độ, KHÔNG có sợi sáp xoắn.
  + [citrus_leafminer] Sâu vẽ bùa (Phyllocnistis citrella): Đường đục ngoằn ngoèo màu trắng bạc óng ánh dưới biểu bì lá non làm lá xoăn.
  + Nhện đỏ (Panonychus citri): Chấm li ti màu đỏ tía, làm lá bạc màu mốc chì.`;
  } else if (cropType === 'rice') {
    differentialRules = `
BẢNG PHÂN BIỆT BỆNH & SÂU HẠI CÂY LÚA:
- [rice_blast] (Đạo ôn) vs [rice_brown_spot] (Đốm nâu): Đạo ôn vết HÌNH THOI / MẮT ÉN NHỌN HAI ĐẦU, tâm xám tro, viền nâu đỏ (hoặc cổ bông thâm đen gãy gục); Đốm nâu là các ĐỐM TRÒN HOẶC BẦU DỤC NHỎ NHƯ HẠT MÈ, KHÔNG NHỌN HAI ĐẦU.
- [rice_bacterial_blight] (Bạc lá) vs [rice_sheath_blight] (Khô vằn): Bạc lá cháy từ CHÓP HOẶC MÉP LÁ lan vào theo ĐƯỜNG GỢN SÓNG màu trắng xám rơm; Khô vằn bắt đầu từ BẸ LÁ SÁT MẶT NƯỚC dạng VỆT VẰN DA HỔ (vân mây) rìa nâu đậm.
- [rice_false_smut] (Hoa cúc / Than đen hạt lúa): Hạt lúa trên bông phình to thành khối u tròn mịn màu vàng cam chuyển xanh đen.
- [rice_tungro] (Vàng lùn / Tungro): Khóm lúa lùn thấp, lá vàng cam từ chóp lá xuống, đẻ nhánh ít.
- Sâu hại thường gặp (dùng đúng ID & tên chuẩn BVTV): [rice_brown_planthopper] Rầy nâu (Nilaparvata lugens) bám bẹ gốc gây cháy rầy; [rice_leaf_folder] Sâu cuốn lá nhỏ (Cnaphalocrocis medinalis) khâu mép lá thành ống gặm trắng lá.`;
  } else {
    differentialRules = `
BẢNG PHÂN BIỆT BỆNH & SÂU HẠI CÂY LẠC:
- [peanut_leaf_spot] (Đốm lá lạc: đốm nâu sớm / đốm đen muộn) vs [peanut_rust] (Gỉ sắt lạc): Đốm lá là các ĐỐM TRÒN RÕ RỆT màu nâu đỏ có quầng vàng sáng (đốm sớm) hoặc đen tuyền (đốm muộn), làm lá RỤNG HÀNG LOẠT; Gỉ sắt là VÔ SỐ MỤN NHỎ LI TI màu vàng cam/nâu đỏ tập trung MẶT DƯỚI LÁ, chà nhẹ ra BỘT MÀU GỈ SẮT, lá KHÔ QUĂN GIÒN BÁM DÍNH TRÊN THÂN ít rụng.
- [peanut_stem_rot] (Thối trắng thân / mốc trắng gốc) vs [peanut_aspergillus_crown_rot] (Thối đen cổ rễ) vs [peanut_bacterial_wilt] (Héo xanh vi khuẩn): Thối trắng có SỢI NẤM TRẮNG NHƯ BÔNG kèm HẠCH NẤM TRÒN MÀU NÂU NHƯ HẠT CẢI ở gốc sát đất; Thối đen cổ rễ có BỘT BÀO TỬ MÀU ĐEN TUYỀN ở cổ rễ; Héo xanh không có sợi nấm/bột đen mà cắt ngang gốc thấy mạch dẫn nâu và rỉ dịch vi khuẩn đục trong nước.
- Sâu hại thường gặp: [peanut_aphid] Rệp muội đen (Aphis craccivora) bám ngọn non; [peanut_spodoptera] Sâu khoang (Spodoptera litura) cắn rách lá lạc.`;
  }

  return `${diseaseSummaries}\n${differentialRules}`.trim();
}

// 1. Diagnose Plant Image Endpoint (Gemini Vision + Verified Botanical Knowledge + Google Search Grounding)
app.post('/api/diagnose', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      secondaryImageBase64,
      secondaryMimeType = 'image/jpeg',
      cropType = 'citrus',
      plantPart = 'leaf',
      followUpAnswers,
      userObservation,
    } = req.body;

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
    const secondaryImage =
      typeof secondaryImageBase64 === 'string' && secondaryImageBase64.trim()
        ? await resolveImageBase64(secondaryImageBase64, secondaryMimeType)
        : null;

    const cropNameVi = cropType === 'citrus' ? 'Cây Cam / Bưởi (cây có múi)' : cropType === 'rice' ? 'Cây Lúa' : 'Cây Lạc (Đậu phộng)';
    const partNameVi =
      cropType === 'rice'
        ? plantPart === 'leaf'
          ? 'Lá lúa'
          : plantPart === 'stem'
          ? 'Thân / Bẹ lúa'
          : plantPart === 'fruit'
          ? 'Bông / Hạt lúa'
          : 'Cả khóm lúa'
        : cropType === 'peanut'
        ? plantPart === 'leaf'
          ? 'Lá lạc'
          : plantPart === 'stem'
          ? 'Thân / Cổ rễ lạc'
          : plantPart === 'fruit'
          ? 'Củ / Quả lạc'
          : 'Toàn cây lạc'
        : plantPart === 'leaf'
        ? 'Lá cây'
        : plantPart === 'stem'
        ? 'Thân / Cành'
        : plantPart === 'fruit'
        ? 'Quả cam / bưởi'
        : 'Toàn cây';

    const cropKnowledgeContext = buildCropKnowledgeContext(cropType);
    const hasFollowUpAnswers = Array.isArray(followUpAnswers) && followUpAnswers.length > 0;
    const followUpText = hasFollowUpAnswers
      ? followUpAnswers
          .map((item: { question: string; answer: string }, idx: number) => `${idx + 1}. Hỏi: ${item.question}\n   Bác trả lời: ${item.answer}`)
          .join('\n')
      : '';

    const systemInstruction = `
Bạn là "Bác sĩ cây trồng AgriVision" gần gũi, tận tâm đồng hành cùng bà con nông dân Việt Nam (xưng hô "Bác - tôi").
Nhiệm vụ của bạn là quan sát trực tiếp hình ảnh người dùng gửi lên (có thể gồm 1 hoặc 2 góc chụp), đối chiếu CHẶT CHẼ với Bộ tiêu chuẩn bệnh hại đã kiểm chứng dưới đây, kết hợp tra cứu Google Search để chẩn đoán chính xác và dễ hiểu cho người lớn tuổi.

=== CƠ SỞ DỮ LIỆU BỆNH HẠI ĐÃ KIỂM CHỨNG (${cropNameVi}) ===
${cropKnowledgeContext}
==============================================================

CÁC NGUYÊN TẮC BẮT BUỘC:
1. PHÁT HIỆN NHẦM LOẠI CÂY HOẶC KHÔNG PHẢI ẢNH CÂY THẬT:
   - Nếu ảnh không phải cây trồng (ví dụ đồ vật, người, động vật...) hoặc ảnh cắt ghép/AI tạo sai thực tế sinh học (ví dụ củ lạc mọc treo trên cành cây gỗ): đặt isPlantImage: false, selectedCropMatches: false, possibleDiagnoses: [], followUpQuestions: [], ghi rõ lý do ngắn gọn trong symptoms[0] để bác chụp lại ảnh cây thật ngoài vườn.
   - Kiểm tra xem cây trong ảnh có đúng là "${cropNameVi}" hay không:
     + Cam / Bưởi (cây có múi): cây thân gỗ, lá đơn hình bầu dục dày bóng, cuống thường có cánh nhỏ, quả có múi.
     + Lúa: lá dải dài hẹp, gân song song, thân bụi cỏ, bông lúa kết hạt.
     + Lạc (Đậu phộng): lá kép gồm 4 lá chét tròn đầu mọc đối xứng nhau, thân thảo; củ lạc mọc dưới đất chứ không mọc treo trên cành cây.
   - Nếu bác chọn nhầm cây (ví dụ chọn Cam/Bưởi nhưng ảnh là cây Lạc thật hoặc cây Lúa thật): BẮT BUỘC đặt selectedCropMatches: false, điền đúng tên cây nhìn thấy vào cropDetected (chỉ ghi đúng tên cây như "Cây Lạc (Đậu phộng)" hoặc "Cây Lúa" hoặc "Cây Cam, Bưởi"), possibleDiagnoses: [], followUpQuestions: [] (tuyệt đối không gán bệnh của cây này sang cây khác!).

2. KIỂM TRA ĐÚNG BỘ PHẬN ĐÃ CHỌN (${partNameVi}, mã "${plantPart}"):
   - Nếu bác chọn "other" (Toàn cây / Cả khóm): chấp nhận ảnh miễn đúng loại cây (đặt selectedPartMatches: true, partDetected: "other").
   - Nếu bác chọn bộ phận cụ thể ("leaf" = Lá cây, "stem" = Thân/Cành/Bẹ, "fruit" = Quả/Củ/Bông lúa): kiểm tra xem đối tượng chính trong ảnh có đúng là bộ phận đó không:
     + Nếu ảnh rõ ràng chụp BỘ PHẬN KHÁC (ví dụ: bác chọn Lá cây nhưng ảnh chụp cận cảnh Quả cam/bưởi, Bông lúa, hay Thân/Cành cây mà không phải lá bệnh; hoặc bác chọn Quả nhưng ảnh chỉ chụp Lá): BẮT BUỘC đặt selectedPartMatches: false, đặt partDetected là đúng mã bộ phận nhìn thấy rõ nhất trong ảnh ("leaf" | "stem" | "fruit"), và đặt possibleDiagnoses: [], followUpQuestions: [] để máy tạm dừng cảnh báo bác chụp nhầm bộ phận.
     + Nếu ảnh chụp đúng bộ phận đã chọn (hoặc chụp cả cành có cả lá lẫn quả nhưng bộ phận đã chọn vẫn hiện rõ vết bệnh): đặt selectedPartMatches: true, partDetected: "${plantPart}".
   - Khi đúng bộ phận, tập trung quan sát triệu chứng bệnh lý đặc trưng trên "${partNameVi}" của ${cropNameVi}. Nếu có mặt trong danh sách bệnh/sâu hại đã kiểm chứng ở trên, BẮT BUỘC dùng đúng "diseaseId" trong ngoặc vuông tương ứng (ví dụ: citrus_greening, citrus_psyllid, citrus_canker, citrus_scab, citrus_leafminer, citrus_gummosis, citrus_brown_aphid, citrus_black_spot, rice_blast, rice_bacterial_blight, rice_sheath_blight, rice_brown_spot, rice_brown_planthopper, rice_false_smut, rice_leaf_folder, rice_tungro, peanut_leaf_spot, peanut_rust, peanut_stem_rot, peanut_bacterial_wilt, peanut_aspergillus_crown_rot, peanut_aphid, peanut_spodoptera). Nếu là bệnh khác ngoài danh sách đó, vẫn chẩn đoán chính xác và đặt diseaseId ngắn gọn không dấu.

3. PHÂN BIỆT RÕ LÁ/CÂY KHỎE MẠNH VS BỆNH VS ẢNH QUÁ MỜ:
   - Nếu ảnh quá mờ, rung tay, out nét không thấy rõ bề mặt vết bệnh: đặt imageQuality: "poor", diseaseId: "unclear_due_to_blur", confidenceLevel: "insufficient_evidence", needsMoreImages: true, followUpQuestions: [], hướng dẫn bác chụp lại rõ hơn.
   - Nếu cây xanh tươi khỏe mạnh, không thấy vết bệnh hay sâu hại: đặt diseaseId: "healthy", diseaseName: "Cây khỏe mạnh (Không thấy dấu hiệu bệnh)", confidenceLevel: "high", followUpQuestions: [], nêu rõ dấu hiệu khỏe tốt và cách chăm giữ cây khỏe.

4. CÂU HỎI XÁC NHẬN TRIỆU CHỨNG ĐỂ CHỐT CHÍNH XÁC HƠN (followUpQuestions):
   - ${hasFollowUpAnswers ? 'Bác đã trả lời câu hỏi xác nhận ở dưới — hãy dùng câu trả lời đó kết hợp với ảnh để CHỐT lại chẩn đoán chính xác hơn và đặt followUpQuestions: [].' : 'Nếu ảnh có thể nhầm lẫn giữa 2 bệnh/nguyên nhân (confidenceLevel là "medium" hoặc "low", hoặc có alternativeCauses), hãy tạo ĐÚNG 1-2 câu hỏi trắc nghiệm thật ngắn gọn, dễ quan sát bằng mắt thường hoặc sờ tay (ví dụ: mặt dưới lá có bột gỉ sắt không, gốc sát đất có sợi nấm trắng không, cây có rụng lá nhiều không, vết bệnh có quầng vàng sáng không) kèm 2-3 lựa chọn trả lời thật ngắn để bác bấm chọn.'}
   - Nếu đã rất chắc chắn (confidenceLevel: "high" và không có bệnh dễ nhầm lẫn), đặt followUpQuestions: [].

5. NỘI DUNG KẾT QUẢ BẰNG TIẾNG VIỆT GẦN GŨI ("Bác - tôi"):
   - Viết câu ngắn gọn, rõ ý, tránh thuật ngữ khó hiểu; giải thích bình dân dễ đọc cho bác nông dân lớn tuổi.
   - BẮT BUỘC dùng đúng tên bệnh và tên sâu hại chuẩn tiếng Việt của Cục Bảo vệ Thực vật / Viện Bảo vệ Thực vật Việt Nam (ví dụ: "Rầy chổng cánh", "Rệp muội", "Sâu vẽ bùa", tuyệt đối không tự bịa hoặc dịch sai tên như "rầy lửa").
   - Phải nêu rõ:
     + Tên bệnh (diseaseName)
     + Dấu hiệu nhận biết trực tiếp trên ảnh (symptoms & evidence - chỉ mô tả những gì thực sự thấy trên ảnh!)
     + Nguyên nhân gây bệnh (causes - vi khuẩn/nấm/côn trùng môi giới/thời tiết ẩm hoặc thiếu chất...)
     + Cách xử lý an toàn (recommendations - ưu tiên cắt tỉa, vệ sinh vườn, bón cân đối, biện pháp sinh học/IPM an toàn, không tự bịa liều lượng hóa chất độc hại).
   - Dùng công cụ Google Search để đối chiếu triệu chứng và tìm nguồn khuyến nông/Viện BVTV uy tín.

6. ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC):
   - Trả lời DUY NHẤT một đối tượng JSON hợp lệ (không thêm chữ giải thích bên ngoài dấu { }), đúng các khóa sau:
{
  "isPlantImage": true,
  "cropDetected": "Tên loại cây nhận diện bằng tiếng Việt",
  "selectedCropMatches": true,
  "partDetected": "leaf" | "stem" | "fruit" | "other",
  "selectedPartMatches": true,
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
  "followUpQuestions": [
    {
      "id": "q1",
      "question": "Câu hỏi ngắn để bác kiểm tra trực tiếp trên cây?",
      "options": ["Có, thấy rõ", "Không thấy", "Chưa kiểm tra"]
    }
  ],
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
        partDetected: { type: Type.STRING },
        selectedPartMatches: { type: Type.BOOLEAN },
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
        followUpQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['id', 'question', 'options'],
          },
        },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        expertVerificationRecommended: { type: Type.BOOLEAN },
        disclaimer: { type: Type.STRING },
      },
      required: [
        'isPlantImage',
        'cropDetected',
        'selectedCropMatches',
        'partDetected',
        'selectedPartMatches',
        'imageQuality',
        'qualityIssues',
        'symptoms',
        'causes',
        'possibleDiagnoses',
        'alternativeCauses',
        'severityAssessment',
        'needsMoreImages',
        'additionalImageInstructions',
        'followUpQuestions',
        'recommendations',
        'expertVerificationRecommended',
        'disclaimer',
      ],
    };

    const directSystemInstruction = systemInstruction
      .replace(/, kết hợp tra cứu Google Search/g, '')
      .replace(/\s*- Dùng công cụ Google Search[^\n]*\n?/g, '\n');

    const followUpPromptBlock = hasFollowUpAnswers
      ? `\n\n[THÔNG TIN BÁC NÔNG DÂN VỪA KIỂM TRA THÊM TRÊN VƯỜN]:\n${followUpText}\nHãy kết hợp thông tin thực tế bác vừa xác nhận với hình ảnh để chốt lại kết luận bệnh chính xác hơn và giải thích rõ vì sao.`
      : '';

    const observationText = typeof userObservation === 'string' ? userObservation.trim() : '';
    const userObservationBlock = observationText
      ? `\n\n[GHI CHÚ THỰC TẾ BÁC NÔNG DÂN BỔ SUNG / CHỈNH LẠI]:\n"${observationText}"\nHãy đặc biệt lưu ý mô tả này của bác, đối chiếu lại thật kỹ với hình ảnh và bảng bệnh/sâu hại chuẩn để kiểm tra lại và sửa nếu lần trước nhận định nhầm.`
      : '';

    const multiAngleNote = secondaryImage
      ? '\n- Số lượng ảnh: 2 góc chụp (ảnh chính + ảnh góc thứ 2 / cận cảnh hoặc mặt dưới lá). Hãy quan sát kỹ CẢ HAI ẢNH.'
      : '';

    const userPrompt = `
Bác nông dân đang nhờ kiểm tra hình ảnh thực tế này:
- Loại cây bác chọn: ${cropNameVi}
- Bộ phận chụp: ${partNameVi}${multiAngleNote}
- Khu vực: Việt Nam (ưu tiên điều kiện canh tác Bắc Trung Bộ & đồng bằng).${followUpPromptBlock}${userObservationBlock}

Hãy quan sát thật kỹ hình ảnh đính kèm, đối chiếu với bảng bệnh hại kiểm chứng và tra cứu Google Search để chẩn đoán chính xác, trả về đúng cấu trúc JSON yêu cầu (dùng cách xưng hô thân thiện "Bác - tôi").
`.trim();

    const directUserPrompt = `
Bác nông dân đang nhờ kiểm tra hình ảnh thực tế này:
- Loại cây bác chọn: ${cropNameVi}
- Bộ phận chụp: ${partNameVi}${multiAngleNote}
- Khu vực: Việt Nam (ưu tiên điều kiện canh tác Bắc Trung Bộ & đồng bằng).${followUpPromptBlock}${userObservationBlock}

Hãy quan sát thật kỹ hình ảnh đính kèm, đối chiếu với bảng bệnh hại kiểm chứng để chẩn đoán chính xác và trả về đúng cấu trúc JSON yêu cầu (dùng cách xưng hô thân thiện "Bác - tôi").
`.trim();

    const imageParts: any[] = [
      {
        inlineData: {
          mimeType: resolvedMime,
          data: cleanBase64,
        },
      },
    ];
    if (secondaryImage) {
      imageParts.push({
        inlineData: {
          mimeType: secondaryImage.mimeType,
          data: secondaryImage.base64,
        },
      });
    }

    const response = await generateWithFallback(ai, {
      contents: [
        ...imageParts,
        {
          text: userPrompt,
        },
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
      fallbackContents: [
        ...imageParts,
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

    const sanitizedFollowUpQuestions = hasFollowUpAnswers
      ? []
      : Array.isArray(parsedResult.followUpQuestions)
      ? parsedResult.followUpQuestions
          .filter(
            (q: any) =>
              q &&
              typeof q.question === 'string' &&
              q.question.trim() &&
              Array.isArray(q.options) &&
              q.options.length >= 2
          )
          .slice(0, 2)
          .map((q: any, idx: number) => ({
            id: typeof q.id === 'string' && q.id.trim() ? q.id : `q_${idx + 1}`,
            question: q.question.trim(),
            options: q.options.filter((o: any) => typeof o === 'string' && o.trim()).slice(0, 4),
          }))
      : [];

    const validParts = ['leaf', 'stem', 'fruit', 'other'];
    const normalizedPartDetected = validParts.includes(parsedResult.partDetected)
      ? parsedResult.partDetected
      : plantPart;
    const normalizedPartMatches =
      plantPart === 'other' || normalizedPartDetected === plantPart
        ? true
        : parsedResult.selectedPartMatches ?? true;

    const normalizedResult = {
      isPlantImage: parsedResult.isPlantImage ?? true,
      cropDetected: parsedResult.cropDetected || cropNameVi,
      selectedCropMatches: parsedResult.selectedCropMatches ?? true,
      partDetected: normalizedPartDetected,
      selectedPartMatches: normalizedPartMatches,
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
      followUpQuestions: sanitizedFollowUpQuestions,
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

// 4. Vietnamese Text-to-Speech Endpoint (Gemini 3.8 Flash Lite TTS -> genuine audio/wav)
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();
app.post('/api/tts', async (req, res) => {
  try {
    const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
    const cleanText = rawText
      .replace(/[*_`#>]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    if (!cleanText) {
      return res.status(400).json({ error: 'Chưa có nội dung để đọc.' });
    }

    const cached = ttsCache.get(cleanText);
    if (cached) {
      return res.json(cached);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Chưa có khóa kết nối Gemini API (GEMINI_API_KEY) trên máy chủ.',
      });
    }

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style:
                  'Warm, clear, slow and friendly standard Vietnamese agricultural advisor speaking to a farmer',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p?.inlineData?.data
    );
    const audioBase64 = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      return res.status(502).json({ error: 'Chưa tạo được tệp âm thanh tiếng Việt.' });
    }

    const payload = { audioBase64, mimeType };
    if (ttsCache.size >= 40) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cleanText, payload);

    return res.json(payload);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    console.error('[AgriVision AI] TTS Error:', error?.message || error);
    return res.status(formatted.status).json({
      error: formatted.message,
      details: error?.message || String(error),
    });
  }
});

// 5. Vietnamese Speech-to-Text Endpoint (Gemini 3.5 Transcribe)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Chưa nhận được đoạn ghi âm giọng nói.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Chưa có khóa kết nối Gemini API (GEMINI_API_KEY) trên máy chủ.',
      });
    }

    const cleanBase64 = audioBase64.includes('base64,')
      ? audioBase64.split('base64,')[1]
      : audioBase64;
    const baseMime = String(mimeType).split(';')[0].trim() || 'audio/webm';

    const transcribeRes = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: baseMime,
              data: cleanBase64,
            },
          },
          {
            text: 'Chép lại chính xác lời nói tiếng Việt trong đoạn ghi âm này thành văn bản tiếng Việt có dấu. Ngữ cảnh: nông dân Việt Nam hỏi về sâu bệnh cây cam, bưởi, lúa, lạc (như vàng lá gân xanh, rầy chổng cánh, đạo ôn, bạc lá, khô vằn, đốm lá, gỉ sắt, héo xanh...). Chỉ trả về đúng lời nói đã chép, không thêm chú thích hay dấu ngoặc kép. Nếu không có tiếng người nói rõ ràng, trả về chuỗi rỗng.',
          },
        ],
      },
    });

    const rawText = extractResponseText(transcribeRes);
    const cleaned = rawText.replace(/^["'“”]+|["'“”]+$/g, '').trim();

    return res.json({ text: cleaned });
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    console.error('[AgriVision AI] Transcribe Error:', error?.message || error);
    return res.status(formatted.status).json({
      error: formatted.message,
      details: error?.message || String(error),
    });
  }
});

// 6. Server Health Check
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
        allowedHosts: true,
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
