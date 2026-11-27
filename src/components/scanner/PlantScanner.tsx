import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  BookOpen,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  X,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CropType, PlantPart, DiagnosisResult, ConfidenceLevel, FollowUpAnswer } from '../../types';
import { runServerDiagnosis, saveDiagnosisRecord } from '../../services/diagnosisService';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DISEASES } from '../../data/defaultDiseases';
import { isSpeechSupported, speakVietnamese, stopSpeaking } from '../../utils/speech';

interface PlantScannerProps {
  initialCrop?: CropType;
  onNavigateToAssistant: (context: any) => void;
  onNavigateToLibrary: (crop?: CropType) => void;
}

export const PlantScanner: React.FC<PlantScannerProps> = ({
  initialCrop = 'citrus',
  onNavigateToAssistant,
  onNavigateToLibrary,
}) => {
  const { user } = useAuth();

  const [selectedCrop, setSelectedCrop] = useState<CropType>(initialCrop);
  const [selectedPart, setSelectedPart] = useState<PlantPart>('leaf');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [secondaryImagePreview, setSecondaryImagePreview] = useState<string | null>(null);
  const [secondaryMimeType, setSecondaryMimeType] = useState<string>('image/jpeg');

  // Camera capture modal state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [scanStepMessage, setScanStepMessage] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [followUpSelections, setFollowUpSelections] = useState<Record<string, string>>({});
  const [hasRefinedWithAnswers, setHasRefinedWithAnswers] = useState<boolean>(false);
  const [showCorrectionBox, setShowCorrectionBox] = useState<boolean>(false);
  const [userObservationText, setUserObservationText] = useState<string>('');
  const [isRecheckingWithNote, setIsRecheckingWithNote] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [sourceSampleCrop, setSourceSampleCrop] = useState<CropType | null>(null);
  const [refImgError, setRefImgError] = useState<boolean>(false);

  // Real-time blur and lighting pre-check
  const [previewQuality, setPreviewQuality] = useState<{
    imageQuality: 'good' | 'fair' | 'poor';
    qualityIssues: string[];
    isBlurry: boolean;
    isTooDark: boolean;
    isOverexposed: boolean;
    sharpnessScore: number;
  } | null>(null);

  const [showTips, setShowTips] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedCrop(initialCrop);
  }, [initialCrop]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const cropOptions: { id: CropType; label: string; icon: string }[] = [
    { id: 'citrus', label: 'Cây Cam, Bưởi', icon: '🍊' },
    { id: 'rice', label: 'Cây Lúa', icon: '🌾' },
    { id: 'peanut', label: 'Cây Lạc (Đậu)', icon: '🥜' },
  ];

  const getPartOptions = (crop: CropType): { id: PlantPart; label: string; hint: string }[] => {
    if (crop === 'rice') {
      return [
        { id: 'leaf', label: 'Lá lúa', hint: 'Ưu tiên soi đạo ôn lá, bạc lá, khô vằn trên lá' },
        { id: 'stem', label: 'Thân / Bẹ lúa', hint: 'Ưu tiên soi khô vằn, rầy nâu bám bẹ, thối thân' },
        { id: 'fruit', label: 'Bông / Hạt lúa', hint: 'Ưu tiên soi đạo ôn cổ bông, lem lép hạt, đen hạt' },
        { id: 'other', label: 'Cả khóm lúa', hint: 'Xem tổng thể cả khóm, độ vàng lùn, cháy rầy' },
      ];
    }
    if (crop === 'peanut') {
      return [
        { id: 'leaf', label: 'Lá lạc', hint: 'Ưu tiên soi đốm nâu, đốm đen, gỉ sắt trên lá lạc' },
        { id: 'stem', label: 'Thân / Cổ rễ', hint: 'Ưu tiên soi héo xanh vi khuẩn, thối gốc mốc trắng' },
        { id: 'fruit', label: 'Củ / Quả lạc', hint: 'Ưu tiên soi thối củ, nấm mốc củ sau nhổ lên' },
        { id: 'other', label: 'Toàn cây', hint: 'Xem tổng thể khóm lạc héo rũ hay còi cọc' },
      ];
    }
    return [
      { id: 'leaf', label: 'Lá cây', hint: 'Ưu tiên soi vàng lá gân xanh (HLB), loét, sẹo lá, sâu vẽ bùa' },
      { id: 'stem', label: 'Thân / Cành', hint: 'Ưu tiên soi chảy gôm, nứt thân, rệp sáp, nấm hồng' },
      { id: 'fruit', label: 'Quả', hint: 'Ưu tiên soi loét quả, ghẻ sẹo, ruồi đục quả, thối nhũn' },
      { id: 'other', label: 'Toàn cây', hint: 'Xem tổng thể tán cây vàng lá, thối rễ, suy cây' },
    ];
  };

  const partOptions = getPartOptions(selectedCrop);

  const getCropLabel = (crop: CropType) =>
    crop === 'citrus' ? 'Cây Cam, Bưởi' : crop === 'rice' ? 'Cây Lúa' : 'Cây Lạc';

  const getPartLabel = (part: PlantPart) =>
    partOptions.find((p) => p.id === part)?.label || partOptions[0].label;

  const selectedPartHint =
    partOptions.find((p) => p.id === selectedPart)?.hint || partOptions[0].hint;

  const compressDataUrl = (dataUrl: string, maxDim = 1280, quality = 0.84): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setAnalysisError('Bác vui lòng chọn ảnh chụp thông thường (JPG hoặc PNG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAnalysisError('Ảnh này hơi lớn quá (trên 15MB). Bác vui lòng chọn ảnh nhẹ hơn.');
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setAnalysisError(null);
    setImageFileName(file.name);
    setSourceSampleCrop(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);
    setIsSaved(false);
    setRefImgError(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      const compressed = await compressDataUrl(raw, 1280, 0.84);
      setMimeType('image/jpeg');
      setImagePreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSecondaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setAnalysisError('Bác vui lòng chọn ảnh góc thứ 2 định dạng JPG hoặc PNG nhé.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAnalysisError('Ảnh góc thứ 2 hơi lớn (trên 15MB). Bác chọn ảnh nhẹ hơn nhé.');
      return;
    }

    setAnalysisError(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      const compressed = await compressDataUrl(raw, 1280, 0.84);
      setSecondaryMimeType('image/jpeg');
      setSecondaryImagePreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setAnalysisError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraCaptureInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera fallback to native input:', err);
      cameraCaptureInputRef.current?.click();
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const rawW = videoRef.current.videoWidth || 640;
    const rawH = videoRef.current.videoHeight || 480;
    const scale = Math.min(1, 1280 / Math.max(rawW, rawH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rawW * scale));
    canvas.height = Math.max(1, Math.round(rawH * scale));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopSpeaking();
      setIsSpeaking(false);
      setImagePreview(dataUrl);
      setImageFileName('camera_snapshot.jpg');
      setSourceSampleCrop(null);
      setMimeType('image/jpeg');
      setResult(null);
      setIsSaved(false);
      setRefImgError(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive, cameraStream]);

  useEffect(() => {
    if (imagePreview) {
      extractVisualMetrics(imagePreview, imageFileName, sourceSampleCrop).then((metrics) => {
        setPreviewQuality({
          imageQuality: metrics.imageQuality,
          qualityIssues: metrics.qualityIssues,
          isBlurry: metrics.isBlurry,
          isTooDark: metrics.isTooDark,
          isOverexposed: metrics.isOverexposed,
          sharpnessScore: metrics.sharpnessScore,
        });
      });
    } else {
      setPreviewQuality(null);
    }
  }, [imagePreview, imageFileName, sourceSampleCrop]);

  const extractVisualMetrics = async (
    dataUrl: string,
    fileNameHint?: string,
    sampleCropHint?: CropType | null
  ): Promise<{
    healthyGreenRatio: number;
    yellowRatio: number;
    lesionRatio: number;
    leafShape: 'broadleaf_oval' | 'slender_blade' | 'compound_rounded_leaflets';
    detectedCropHint: 'citrus' | 'rice' | 'peanut' | 'unknown';
    sharpnessScore: number;
    imageQuality: 'good' | 'fair' | 'poor';
    qualityIssues: string[];
    isBlurry: boolean;
    isTooDark: boolean;
    isOverexposed: boolean;
    sourceSampleId?: string;
    filenameHint?: string;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({
              healthyGreenRatio: 0.5,
              yellowRatio: 0,
              lesionRatio: 0,
              leafShape: 'broadleaf_oval',
              detectedCropHint: 'unknown',
              sharpnessScore: 80,
              imageQuality: 'good',
              qualityIssues: [],
              isBlurry: false,
              isTooDark: false,
              isOverexposed: false,
            });
          }
          ctx.drawImage(img, 0, 0, 128, 128);
          const imgData = ctx.getImageData(0, 0, 128, 128).data;
          let plantPixels = 0;
          let greenPixels = 0;
          let yellowPixels = 0;
          let lesionPixels = 0;
          let soilPixels = 0;
          let minX = 128, maxX = 0, minY = 128, maxY = 0;
          const gray = new Float32Array(128 * 128);
          let sumBrightness = 0;

          for (let i = 0; i < imgData.length; i += 4) {
            const pixelIndex = Math.floor(i / 4);
            const px = pixelIndex % 128;
            const py = Math.floor(pixelIndex / 128);
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];
            const gVal = 0.299 * r + 0.587 * g + 0.114 * b;
            gray[pixelIndex] = gVal;

            if (a < 50) continue;

            const isWhiteBg = r > 240 && g > 240 && b > 240;
            const isPitchBlack = r < 20 && g < 20 && b < 20;
            if (isWhiteBg || isPitchBlack) continue;

            if (r > 75 && r > g * 1.05 && r > b * 1.25 && b < 125) {
              soilPixels++;
            }

            plantPixels++;
            sumBrightness += gVal;

            if (g > r * 1.15 && g > b * 1.15 && g > 45) {
              greenPixels++;
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            } else if (r > 130 && g > 120 && b < 100 && Math.abs(r - g) < 55) {
              yellowPixels++;
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            } else if ((r > 60 && g < r * 0.9 && b < g) || (r < 65 && g < 65 && b < 65)) {
              lesionPixels++;
            }
          }

          let lapSum = 0;
          let lapCount = 0;
          const lapList: number[] = [];
          for (let y = 1; y < 127; y++) {
            for (let x = 1; x < 127; x++) {
              const idx = y * 128 + x;
              const lap = 4 * gray[idx] - gray[idx + 1] - gray[idx - 1] - gray[idx + 128] - gray[idx - 128];
              lapList.push(lap);
              lapSum += lap;
              lapCount++;
            }
          }
          const lapMean = lapSum / Math.max(lapCount, 1);
          let varSum = 0;
          for (let i = 0; i < lapCount; i++) {
            const diff = lapList[i] - lapMean;
            varSum += diff * diff;
          }
          const rawVariance = Math.round(varSum / Math.max(lapCount, 1));
          const sharpnessScore = Math.min(100, Math.max(5, Math.round((rawVariance / 160) * 100)));

          const total = Math.max(plantPixels, 1);
          const avgBrightness = sumBrightness / total;
          const isTooDark = avgBrightness < 40 && plantPixels > 100;
          const isOverexposed = avgBrightness > 220 && plantPixels > 100;
          const isBlurry = rawVariance < 35;

          const qualityIssues: string[] = [];
          if (isBlurry) {
            qualityIssues.push('Ảnh hơi bị mờ nét hoặc rung tay khi chụp.');
          }
          if (isTooDark) {
            qualityIssues.push('Ảnh chụp bị tối, thiếu ánh sáng.');
          }
          if (isOverexposed) {
            qualityIssues.push('Ảnh bị lóa nắng quá sáng.');
          }

          const imageQuality: 'good' | 'fair' | 'poor' =
            isBlurry || isTooDark || isOverexposed ? 'poor' : sharpnessScore < 60 ? 'fair' : 'good';

          const bboxW = Math.max(0, maxX - minX + 1);
          const bboxH = Math.max(0, maxY - minY + 1);
          const maxDim = Math.max(bboxW, bboxH);
          const minDim = Math.min(bboxW, bboxH);
          const aspectRatio = maxDim > 0 ? minDim / maxDim : 0;
          const bboxArea = bboxW * bboxH;
          const density = bboxArea > 0 ? (greenPixels + yellowPixels) / bboxArea : 0;
          const soilRatio = soilPixels / total;

          const fn = (fileNameHint || imageFileName || '').toLowerCase();
          const isSamplePeanut =
            sampleCropHint === 'peanut' ||
            sourceSampleCrop === 'peanut' ||
            dataUrl.includes('peanut_leaf_spot');
          const isSampleRice =
            sampleCropHint === 'rice' ||
            sourceSampleCrop === 'rice' ||
            dataUrl.includes('rice_leaf_blast');
          const isSampleCitrus =
            sampleCropHint === 'citrus' ||
            sourceSampleCrop === 'citrus' ||
            dataUrl.includes('citrus_leaf_hlb');

          let detectedCropHint: 'citrus' | 'rice' | 'peanut' = 'citrus';
          let leafShape: 'broadleaf_oval' | 'slender_blade' | 'compound_rounded_leaflets' = 'broadleaf_oval';

          if (isSamplePeanut || /lac|peanut|dauphong|dau_phong|dau-phong|đậu|groundnut/i.test(fn)) {
            detectedCropHint = 'peanut';
            leafShape = 'compound_rounded_leaflets';
          } else if (isSampleRice || /lua|rice|paddy|thoc/i.test(fn)) {
            detectedCropHint = 'rice';
            leafShape = 'slender_blade';
          } else if (isSampleCitrus || /cam|citrus|orange|lemon|chanh|buoi/i.test(fn)) {
            detectedCropHint = 'citrus';
            leafShape = 'broadleaf_oval';
          } else if (aspectRatio < 0.28) {
            detectedCropHint = 'rice';
            leafShape = 'slender_blade';
          } else if (soilRatio > 0.08 || (density < 0.35 && aspectRatio > 0.45)) {
            detectedCropHint = 'peanut';
            leafShape = 'compound_rounded_leaflets';
          } else {
            detectedCropHint = 'citrus';
            leafShape = 'broadleaf_oval';
          }

          resolve({
            healthyGreenRatio: greenPixels / total,
            yellowRatio: yellowPixels / total,
            lesionRatio: lesionPixels / total,
            leafShape,
            detectedCropHint,
            sharpnessScore,
            imageQuality,
            qualityIssues,
            isBlurry,
            isTooDark,
            isOverexposed,
            sourceSampleId: sourceSampleCrop || undefined,
            filenameHint: fileNameHint || imageFileName || undefined,
          });
        } catch {
          resolve({
            healthyGreenRatio: 0.5,
            yellowRatio: 0,
            lesionRatio: 0,
            leafShape: 'broadleaf_oval',
            detectedCropHint: 'unknown',
            sharpnessScore: 80,
            imageQuality: 'good',
            qualityIssues: [],
            isBlurry: false,
            isTooDark: false,
            isOverexposed: false,
          });
        }
      };
      img.onerror = () => {
        resolve({
          healthyGreenRatio: 0.5,
          yellowRatio: 0,
          lesionRatio: 0,
          leafShape: 'broadleaf_oval',
          detectedCropHint: 'unknown',
          sharpnessScore: 80,
          imageQuality: 'good',
          qualityIssues: [],
          isBlurry: false,
          isTooDark: false,
          isOverexposed: false,
        });
      };
      img.src = dataUrl;
    });
  };

  const handleRunDiagnosis = async () => {
    if (!imagePreview) {
      setAnalysisError(`Bác vui lòng chụp ảnh hoặc chọn ảnh ${getPartLabel(selectedPart).toLowerCase()} trước nhé.`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);
    setRefImgError(false);
    setScanStepMessage(secondaryImagePreview ? 'Bác sĩ AI đang xem cả 2 góc ảnh...' : 'Bác sĩ AI đang kiểm tra...');

    try {
      const visualMetrics = await extractVisualMetrics(imagePreview, imageFileName, sourceSampleCrop);

      const diagnosisResult = await runServerDiagnosis(
        imagePreview,
        selectedCrop,
        selectedPart,
        mimeType,
        visualMetrics,
        secondaryImagePreview
          ? {
              secondaryImageBase64: secondaryImagePreview,
              secondaryMimeType,
            }
          : undefined
      );

      setResult(diagnosisResult);

      await saveDiagnosisRecord({
        userId: user?.uid || 'guest_user',
        userEmail: user?.email || '',
        cropType: selectedCrop,
        plantPart: selectedPart,
        imageUrl: imagePreview,
        assessment: diagnosisResult,
        suspectedDiseases: diagnosisResult.possibleDiagnoses.map((d) => d.diseaseName),
        imageQuality: diagnosisResult.imageQuality,
        verificationStatus: 'unverified',
      });
      setIsSaved(true);
    } catch (err: any) {
      console.error('Diagnosis failed:', err);
      setAnalysisError(err.message || 'Chưa kiểm tra được ảnh này. Bác vui lòng chụp lại ảnh rõ hơn nhé.');
    } finally {
      setIsAnalyzing(false);
      setScanStepMessage('');
    }
  };

  const handleConfirmFollowUp = async () => {
    if (!imagePreview || !result?.followUpQuestions?.length) return;
    const answers: FollowUpAnswer[] = result.followUpQuestions
      .filter((q) => followUpSelections[q.id])
      .map((q) => ({
        question: q.question,
        answer: followUpSelections[q.id],
      }));

    if (answers.length === 0) {
      setAnalysisError('Bác vui lòng bấm chọn ít nhất 1 câu trả lời để Bác sĩ AI chốt bệnh chính xác hơn nhé.');
      return;
    }

    setIsRefining(true);
    setAnalysisError(null);

    try {
      const visualMetrics = await extractVisualMetrics(imagePreview, imageFileName, sourceSampleCrop);
      const refinedResult = await runServerDiagnosis(
        imagePreview,
        selectedCrop,
        selectedPart,
        mimeType,
        visualMetrics,
        {
          secondaryImageBase64: secondaryImagePreview || undefined,
          secondaryMimeType: secondaryImagePreview ? secondaryMimeType : undefined,
          followUpAnswers: answers,
        }
      );
      setResult(refinedResult);
      setHasRefinedWithAnswers(true);

      await saveDiagnosisRecord({
        userId: user?.uid || 'guest_user',
        userEmail: user?.email || '',
        cropType: selectedCrop,
        plantPart: selectedPart,
        imageUrl: imagePreview,
        assessment: refinedResult,
        suspectedDiseases: refinedResult.possibleDiagnoses.map((d) => d.diseaseName),
        imageQuality: refinedResult.imageQuality,
        verificationStatus: 'unverified',
      });
    } catch (err: any) {
      setAnalysisError(err.message || 'Chưa cập nhật được kết quả xác nhận. Bác thử bấm lại nhé.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleRecheckWithObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !userObservationText.trim()) return;

    setIsRecheckingWithNote(true);
    setAnalysisError(null);

    try {
      const visualMetrics = await extractVisualMetrics(imagePreview, imageFileName, sourceSampleCrop);
      const refinedResult = await runServerDiagnosis(
        imagePreview,
        selectedCrop,
        selectedPart,
        mimeType,
        visualMetrics,
        {
          secondaryImageBase64: secondaryImagePreview || undefined,
          secondaryMimeType: secondaryImagePreview ? secondaryMimeType : undefined,
          userObservation: userObservationText.trim(),
        }
      );
      setResult(refinedResult);
      setHasRefinedWithAnswers(true);
      setShowCorrectionBox(false);
      setUserObservationText('');

      await saveDiagnosisRecord({
        userId: user?.uid || 'guest_user',
        userEmail: user?.email || '',
        cropType: selectedCrop,
        plantPart: selectedPart,
        imageUrl: imagePreview,
        assessment: refinedResult,
        suspectedDiseases: refinedResult.possibleDiagnoses.map((d) => d.diseaseName),
        imageQuality: refinedResult.imageQuality,
        verificationStatus: 'unverified',
      });
    } catch (err: any) {
      setAnalysisError(err.message || 'Chưa kiểm tra lại được. Bác thử lại giúp tôi nhé.');
    } finally {
      setIsRecheckingWithNote(false);
    }
  };

  const handleSwitchCropAndDiagnose = async (newCrop: CropType) => {
    setSelectedCrop(newCrop);
    setSourceSampleCrop(newCrop);
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);
    setRefImgError(false);
    setScanStepMessage('Bác sĩ AI đang kiểm tra...');

    try {
      const visualMetrics = await extractVisualMetrics(imagePreview, imageFileName, newCrop);
      const diagnosisResult = await runServerDiagnosis(
        imagePreview,
        newCrop,
        selectedPart,
        mimeType,
        visualMetrics,
        secondaryImagePreview
          ? {
              secondaryImageBase64: secondaryImagePreview,
              secondaryMimeType,
            }
          : undefined
      );
      setResult(diagnosisResult);

      await saveDiagnosisRecord({
        userId: user?.uid || 'guest_user',
        userEmail: user?.email || '',
        cropType: newCrop,
        plantPart: selectedPart,
        imageUrl: imagePreview,
        assessment: diagnosisResult,
        suspectedDiseases: diagnosisResult.possibleDiagnoses.map((d) => d.diseaseName),
        imageQuality: diagnosisResult.imageQuality,
        verificationStatus: 'unverified',
      });
      setIsSaved(true);
    } catch (err: any) {
      setAnalysisError(err.message || 'Có lỗi khi chuyển sang loại cây khác.');
    } finally {
      setIsAnalyzing(false);
      setScanStepMessage('');
    }
  };

  const handleSwitchPartAndDiagnose = async (newPart: PlantPart) => {
    setSelectedPart(newPart);
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);
    setShowCorrectionBox(false);
    setUserObservationText('');
    setRefImgError(false);
    setScanStepMessage('Bác sĩ AI đang kiểm tra lại đúng bộ phận...');

    try {
      const visualMetrics = await extractVisualMetrics(imagePreview, imageFileName, sourceSampleCrop);
      const diagnosisResult = await runServerDiagnosis(
        imagePreview,
        selectedCrop,
        newPart,
        mimeType,
        visualMetrics,
        secondaryImagePreview
          ? {
              secondaryImageBase64: secondaryImagePreview,
              secondaryMimeType,
            }
          : undefined
      );
      setResult(diagnosisResult);

      await saveDiagnosisRecord({
        userId: user?.uid || 'guest_user',
        userEmail: user?.email || '',
        cropType: selectedCrop,
        plantPart: newPart,
        imageUrl: imagePreview,
        assessment: diagnosisResult,
        suspectedDiseases: diagnosisResult.possibleDiagnoses.map((d) => d.diseaseName),
        imageQuality: diagnosisResult.imageQuality,
        verificationStatus: 'unverified',
      });
      setIsSaved(true);
    } catch (err: any) {
      setAnalysisError(err.message || 'Có lỗi khi chuyển sang kiểm tra bộ phận khác.');
    } finally {
      setIsAnalyzing(false);
      setScanStepMessage('');
    }
  };

  const resetScanner = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsLoadingSpeech(false);
    setSpeechError(null);
    setImagePreview(null);
    setSecondaryImagePreview(null);
    setImageFileName('');
    setSourceSampleCrop(null);
    setResult(null);
    setFollowUpSelections({});
    setHasRefinedWithAnswers(false);
    setShowCorrectionBox(false);
    setUserObservationText('');
    setPreviewQuality(null);
    setAnalysisError(null);
    setIsSaved(false);
    setRefImgError(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getConfidenceText = (level: ConfidenceLevel) => {
    switch (level) {
      case 'high':
        return { label: 'Khả năng cao', style: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'medium':
        return { label: 'Khả năng trung bình', style: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'low':
        return { label: 'Ít khả năng', style: 'bg-stone-100 text-stone-800 border-stone-300' };
      default:
        return { label: 'Cần xem thêm', style: 'bg-stone-100 text-stone-800 border-stone-300' };
    }
  };

  const quickSamples = [
    {
      crop: 'citrus' as CropType,
      part: 'leaf' as PlantPart,
      label: 'Mẫu lá Cam',
      url: '/images/citrus_leaf_hlb.jpg',
      icon: '🍊',
    },
    {
      crop: 'rice' as CropType,
      part: 'leaf' as PlantPart,
      label: 'Mẫu lá Lúa',
      url: '/images/rice_leaf_blast.jpg',
      icon: '🌾',
    },
    {
      crop: 'peanut' as CropType,
      part: 'leaf' as PlantPart,
      label: 'Mẫu lá Lạc',
      url: '/images/peanut_leaf_spot.jpg',
      icon: '🥜',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Simple Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Chụp ảnh khám bệnh cây
          </h1>
          <p className="text-base text-stone-600 mt-1">
            Chỉ cần 2 bước đơn giản: chọn cây và chụp ảnh chỗ bị bệnh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors w-fit min-h-[44px] cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>{showTips ? 'Ẩn mẹo chụp rõ' : 'Cách chụp ảnh cho rõ'}</span>
        </button>
      </div>

      {showTips && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2 text-base text-stone-800">
          <p className="font-bold text-emerald-950">3 mẹo nhỏ giúp máy nhìn rõ bệnh nhất:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Đưa điện thoại cách lá hoặc quả khoảng <strong>1 gang tay (20 cm)</strong>.</li>
            <li>Giữ chắc tay khoảng 1 giây rồi mới bấm chụp để ảnh không bị rung mờ.</li>
            <li>Chụp nơi đủ sáng ngoài trời, tránh để bóng tay che lên vết bệnh.</li>
          </ul>
        </div>
      )}

      {/* Step 1: Choose Crop */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">
          Bước 1: Bác đang khám cây gì?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cropOptions.map((crop) => {
            const isSelected = selectedCrop === crop.id;
            return (
              <button
                key={crop.id}
                type="button"
                onClick={() => {
                  setSelectedCrop(crop.id);
                  setResult(null);
                }}
                className={`min-h-[68px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                    : 'border-stone-200 hover:border-emerald-300 bg-white text-stone-800'
                }`}
              >
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {crop.icon}
                </span>
                <span className="text-base sm:text-lg font-bold leading-tight">
                  {crop.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unobtrusive 1-row part selector */}
        <div className="pt-3 border-t border-stone-100 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-stone-600 mr-1">Chụp bộ phận:</span>
            {partOptions.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => {
                  setSelectedPart(part.id);
                  setResult(null);
                  setIsSaved(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold min-h-[40px] transition-colors cursor-pointer ${
                  selectedPart === part.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {part.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2">
            <strong>Gợi ý soi ({getPartLabel(selectedPart)}):</strong> {selectedPartHint}.
          </p>
        </div>
      </section>

      {/* Step 2: Capture or Upload Photo */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-5">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">
          Bước 2: Chụp ảnh hoặc chọn ảnh
        </h2>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <input
          type="file"
          ref={secondaryFileInputRef}
          onChange={handleSecondaryFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <input
          type="file"
          ref={cameraCaptureInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-sm font-semibold text-white bg-black/60 px-3 py-1.5 rounded-lg">
                Đưa {getPartLabel(selectedPart).toLowerCase()} bị bệnh vào giữa khung hình
              </span>
            </div>

            <div className="absolute bottom-4 flex items-center gap-4">
              <button
                type="button"
                onClick={stopCamera}
                className="px-5 py-3 rounded-xl bg-stone-900/90 text-white text-base font-bold min-h-[48px] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={captureCameraSnapshot}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold flex items-center gap-2 min-h-[52px] shadow-lg cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Chụp ảnh này</span>
              </button>
            </div>
          </div>
        ) : imagePreview ? (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-16/10 sm:aspect-2/1 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Ảnh bác vừa chọn"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Easy Retake / Replace Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-base font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-emerald-700" />
                <span>Chụp lại ảnh khác</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-base font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-5 h-5 text-emerald-700" />
                <span>Chọn ảnh khác trong máy</span>
              </button>
            </div>

            {/* Optional 2nd angle photo for higher accuracy */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
              {secondaryImagePreview ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={secondaryImagePreview}
                      alt="Ảnh góc thứ 2"
                      className="w-16 h-16 object-cover rounded-lg border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-900">Đã thêm ảnh góc thứ 2</p>
                      <p className="text-xs text-stone-600">Máy sẽ xem cả 2 ảnh để chẩn đoán chính xác hơn.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecondaryImagePreview(null)}
                    className="p-2 rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-900 shrink-0 cursor-pointer"
                    aria-label="Xóa ảnh góc thứ 2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => secondaryFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-emerald-800 hover:text-emerald-950 py-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Thêm ảnh góc thứ 2 (mặt dưới lá hoặc cận vết bệnh — giúp soi chuẩn hơn)</span>
                </button>
              )}
            </div>

            {/* Friendly Blur / Light Check */}
            {previewQuality && (
              <div>
                {previewQuality.isBlurry ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-lg font-bold">
                          Ảnh bị mờ rồi!
                        </p>
                        <p className="text-base text-stone-800">
                          Bác giữ chắc tay, để máy cách lá khoảng 1 gang tay (20cm) rồi chụp lại cho rõ nhé.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Chụp lại ảnh rõ hơn</span>
                    </button>
                  </div>
                ) : previewQuality.isTooDark ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 text-base flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>Ảnh hơi tối. Bác đưa cây ra chỗ sáng hơn một chút sẽ dễ xem bệnh hơn.</span>
                  </div>
                ) : previewQuality.isOverexposed ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 text-base flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>Ảnh hơi bị chói nắng. Bác nghiêng máy tránh ánh nắng rọi thẳng nhé.</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-base font-semibold flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>Ảnh đã rõ nét, sẵn sàng kiểm tra.</span>
                  </div>
                )}
              </div>
            )}

            {/* Giant Primary Diagnose CTA */}
            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isAnalyzing}
              className={`w-full min-h-[58px] py-4 px-6 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-3 transition-all cursor-pointer ${
                isAnalyzing
                  ? 'bg-stone-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                  <span>{scanStepMessage || 'Bác sĩ AI đang kiểm tra...'}</span>
                </>
              ) : (
                <span>XEM BỆNH CỦA CÂY NGAY</span>
              )}
            </button>

            {isAnalyzing && (
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center gap-4">
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-700 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-emerald-950">
                    Bác sĩ AI đang kiểm tra...
                  </p>
                  <p className="text-base text-stone-700">
                    Đang xem kỹ ảnh chụp và tra cứu Google đối chiếu bệnh cây cho bác, vui lòng chờ vài giây nhé.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Two Huge Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[88px] p-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <Camera className="w-7 h-7 shrink-0" />
                <span>Mở máy ảnh chụp ngay</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[88px] p-5 rounded-2xl bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-900 border-2 border-stone-300 font-bold text-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <Upload className="w-7 h-7 text-emerald-700 shrink-0" />
                <span>Chọn ảnh trong máy</span>
              </button>
            </div>

            {/* 3 Quick Sample Photos */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5">
              <p className="text-sm font-semibold text-stone-600">
                Hoặc bấm vào ảnh mẫu bên dưới để xem thử cách máy hoạt động:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {quickSamples.map((sample) => (
                  <button
                    key={sample.crop}
                    type="button"
                    onClick={() => {
                      setSelectedCrop(sample.crop);
                      setSelectedPart(sample.part);
                      setImagePreview(sample.url);
                      setSourceSampleCrop(sample.crop);
                      setImageFileName(`${sample.crop}_sample.jpg`);
                      setMimeType('image/jpeg');
                      setResult(null);
                      setIsSaved(false);
                      setAnalysisError(null);
                      setRefImgError(false);
                    }}
                    className="p-2.5 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-400 transition-colors text-center flex flex-col items-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    <img
                      src={sample.url}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-16 sm:h-20 object-cover rounded-lg border border-stone-200"
                    />
                    <span className="text-sm font-bold text-stone-800 leading-tight">
                      {sample.icon} {sample.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-base flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700" />
            <span>{analysisError}</span>
          </div>
        )}
      </section>

      {/* Result Area (strictly hidden when no image uploaded) */}
      {imagePreview && result && (
        <section className="space-y-5">
          {/* Case 0: Not a plant photo */}
          {!result.isPlantImage ? (
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-950">
                    Ảnh này chưa thấy lá hoặc thân cây!
                  </h2>
                  <p className="text-base text-stone-800 leading-relaxed">
                    {result.symptoms?.[0] || 'Bác vui lòng chụp lại sát vào lá, thân hoặc quả cây bị bệnh để Bác sĩ AI xem chính xác nhé.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="w-full sm:w-auto min-h-[52px] px-5 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Chụp lại ảnh cây trồng</span>
              </button>
            </div>
          ) : !result.selectedCropMatches ? (() => {
            const detectedLower = (result.cropDetected || '').toLowerCase();
            const isNegativeOrFake =
              detectedLower.includes('không phải') ||
              detectedLower.includes('ghép') ||
              detectedLower.includes('giả') ||
              detectedLower.includes('ai ') ||
              detectedLower.includes('tạo bởi');

            const detectedTargetCrop: CropType | null = isNegativeOrFake
              ? null
              : detectedLower.includes('lạc') || detectedLower.includes('đậu') || detectedLower.includes('peanut')
              ? 'peanut'
              : detectedLower.includes('cam') || detectedLower.includes('bưởi') || detectedLower.includes('chanh') || detectedLower.includes('citrus')
              ? 'citrus'
              : detectedLower.includes('lúa') || detectedLower.includes('rice')
              ? 'rice'
              : null;

            const canSwitchToOtherCrop = detectedTargetCrop !== null && detectedTargetCrop !== selectedCrop;

            return (
              <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-amber-950">
                      {canSwitchToOtherCrop ? 'Nhầm loại cây rồi bác ơi!' : 'Ảnh chưa đúng cây trồng thực tế!'}
                    </h2>
                    <p className="text-base text-stone-800 leading-relaxed">
                      Bác đang chọn khám <strong>{getCropLabel(selectedCrop)}</strong>, nhưng ảnh này có dấu hiệu:{' '}
                      <strong>{result.cropDetected}</strong>. Máy tạm dừng để tránh báo nhầm bệnh cho bác.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  {canSwitchToOtherCrop && detectedTargetCrop && (
                    <button
                      type="button"
                      onClick={() => handleSwitchCropAndDiagnose(detectedTargetCrop)}
                      className="flex-1 min-h-[54px] px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span>
                        Chuyển sang khám đúng {getCropLabel(detectedTargetCrop)} ngay
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={startCamera}
                    className={`${canSwitchToOtherCrop ? '' : 'flex-1'} min-h-[54px] px-5 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>Chụp lại ảnh khác</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[54px] px-5 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-base font-semibold cursor-pointer"
                  >
                    Chọn lại ảnh khác
                  </button>
                </div>
              </div>
            );
          })() : result.selectedPartMatches === false && result.partDetected && result.partDetected !== selectedPart && selectedPart !== 'other' ? (
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-950">
                    Nhầm bộ phận chụp rồi bác ơi!
                  </h2>
                  <p className="text-base text-stone-800 leading-relaxed">
                    Bác đang chọn chụp <strong>{getPartLabel(selectedPart)}</strong>, nhưng trong ảnh lại là{' '}
                    <strong>{getPartLabel(result.partDetected)}</strong>. Máy tạm dừng để tránh chẩn đoán nhầm bệnh cho bác.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSwitchPartAndDiagnose(result.partDetected!)}
                  className="flex-1 min-h-[54px] px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Chuyển sang khám đúng {getPartLabel(result.partDetected)} ngay</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="min-h-[54px] px-5 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Chụp lại ảnh khác</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[54px] px-5 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-base font-semibold cursor-pointer"
                >
                  Chọn lại ảnh khác
                </button>
              </div>
            </div>
          ) : (() => {
            const primaryDiag = result.possibleDiagnoses[0];
            const isHealthy = primaryDiag?.diseaseId === 'healthy';
            const isBlurryResult =
              primaryDiag?.diseaseId === 'unclear_due_to_blur' ||
              (result.imageQuality === 'poor' && primaryDiag?.confidenceLevel === 'insufficient_evidence');

            /* Case 2: Blurry Photo Result */
            if (isBlurryResult) {
              return (
                <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-7 h-7 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-bold text-amber-950">
                        Ảnh bị mờ, chưa nhìn rõ bệnh!
                      </h2>
                      <p className="text-base text-stone-800">
                        Bác làm theo 3 bước sau rồi chụp lại để máy xem chính xác nhé:
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside space-y-2 text-base text-stone-800 bg-white rounded-xl p-4 border border-amber-200">
                    <li>Đặt điện thoại cách lá khoảng 1 gang tay (20 cm).</li>
                    <li>Chạm tay vào màn hình chỗ có đốm bệnh cho rõ nét.</li>
                    <li>Giữ yên tay 1 giây rồi bấm chụp nơi đủ sáng.</li>
                  </ol>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full min-h-[54px] px-5 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Chụp lại ảnh rõ hơn</span>
                  </button>
                </div>
              );
            }

            /* Case 3: Healthy Plant */
            if (isHealthy) {
              return (
                <div className="bg-white rounded-2xl border-2 border-emerald-300 p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-bold text-emerald-900">
                          Cây khỏe mạnh, không có bệnh!
                        </h2>
                        <p className="text-base text-stone-600">
                          Cây đang kiểm tra: <strong>{getCropLabel(selectedCrop)}</strong> ({getPartLabel(selectedPart)})
                        </p>
                      </div>
                    </div>

                    {isSpeechSupported() && (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (isSpeaking || isLoadingSpeech) {
                              stopSpeaking();
                              setIsSpeaking(false);
                              setIsLoadingSpeech(false);
                              return;
                            }
                            setSpeechError(null);
                            setIsLoadingSpeech(true);
                            const textToRead = `Kết quả kiểm tra ${getCropLabel(selectedCrop)}: Cây khỏe mạnh, chưa thấy dấu hiệu bệnh hại. ${
                              result.recommendations.length > 0
                                ? 'Cách chăm sóc: ' + result.recommendations.slice(0, 3).join('. ')
                                : ''
                            }`;
                            await speakVietnamese(textToRead, {
                              onStart: () => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(true);
                              },
                              onEnd: () => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(false);
                              },
                              onError: (msg) => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(false);
                                setSpeechError(msg || 'Không phát được giọng đọc tiếng Việt.');
                              },
                            });
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] cursor-pointer ${
                            isSpeaking
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : isLoadingSpeech
                              ? 'bg-stone-100 text-stone-700 border-stone-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isLoadingSpeech ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isSpeaking ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                          <span>
                            {isLoadingSpeech
                              ? 'Đang tạo giọng đọc...'
                              : isSpeaking
                              ? 'Dừng đọc'
                              : 'Nghe bác sĩ đọc'}
                          </span>
                        </button>
                        {speechError && (
                          <span className="text-xs text-red-700 font-medium">{speechError}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {result.symptoms.length > 0 && (
                    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2">
                      <h3 className="text-lg font-bold text-stone-900">Dấu hiệu nhận biết trên ảnh:</h3>
                      <ul className="list-disc list-inside space-y-1.5 text-base text-stone-800">
                        {result.symptoms.slice(0, 3).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.recommendations.length > 0 && (
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-2">
                      <h3 className="text-lg font-bold text-emerald-950">Cách chăm sóc giữ cây khỏe:</h3>
                      <ul className="list-disc list-inside space-y-1.5 text-base text-stone-800">
                        {result.recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.referenceLinks && result.referenceLinks.length > 0 && (
                    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2">
                      <h3 className="text-base font-bold text-stone-900">Nguồn tham khảo uy tín từ Google:</h3>
                      <div className="flex flex-col gap-1.5">
                        {result.referenceLinks.slice(0, 2).map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-base font-semibold text-emerald-800 hover:underline break-all"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span>{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={resetScanner}
                      className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold cursor-pointer"
                    >
                      Chụp khám cây khác
                    </button>
                  </div>
                </div>
              );
            }

            /* Case 4: Disease Found */
            const badge = getConfidenceText(primaryDiag?.confidenceLevel || 'medium');
            const diagNameLower = (primaryDiag?.diseaseName || '').toLowerCase();
            const diagIdLower = (primaryDiag?.diseaseId || '').toLowerCase();
            const exactRef = DEFAULT_DISEASES.find(
              (d) => d.cropType === selectedCrop && d.id === primaryDiag?.diseaseId
            );
            const matchedRefId = exactRef
              ? exactRef.id
              : selectedCrop === 'citrus'
              ? diagIdLower.includes('psyllid') || diagIdLower.includes('ray_chong_canh') || diagNameLower.includes('rầy chổng cánh') || diagNameLower.includes('diaphorina')
                ? 'citrus_psyllid'
                : diagIdLower.includes('leafminer') || diagIdLower.includes('ve_bua') || diagNameLower.includes('vẽ bùa')
                ? 'citrus_leafminer'
                : diagIdLower.includes('gummosis') || diagIdLower.includes('chay_gom') || diagNameLower.includes('chảy gôm') || diagNameLower.includes('xì mủ') || diagNameLower.includes('phytophthora')
                ? 'citrus_gummosis'
                : diagIdLower.includes('aphid') || diagIdLower.includes('rep_muoi') || diagNameLower.includes('rệp muội') || diagNameLower.includes('rệp đen')
                ? 'citrus_brown_aphid'
                : diagIdLower.includes('black_spot') || diagIdLower.includes('dom_den') || diagNameLower.includes('đốm đen')
                ? 'citrus_black_spot'
                : diagIdLower.includes('greening') || diagIdLower.includes('hlb') || diagNameLower.includes('vàng lá gân xanh') || diagNameLower.includes('hlb')
                ? 'citrus_greening'
                : diagIdLower.includes('canker') || diagNameLower.includes('loét')
                ? 'citrus_canker'
                : diagIdLower.includes('scab') || diagNameLower.includes('ghẻ') || diagNameLower.includes('sẹo')
                ? 'citrus_scab'
                : null
              : selectedCrop === 'rice'
              ? diagIdLower.includes('planthopper') || diagIdLower.includes('ray_nau') || diagNameLower.includes('rầy nâu') || diagNameLower.includes('cháy rầy')
                ? 'rice_brown_planthopper'
                : diagIdLower.includes('false_smut') || diagIdLower.includes('hoa_cuc') || diagNameLower.includes('hoa cúc') || diagNameLower.includes('than đen')
                ? 'rice_false_smut'
                : diagIdLower.includes('leaf_folder') || diagIdLower.includes('cuon_la') || diagNameLower.includes('cuốn lá')
                ? 'rice_leaf_folder'
                : diagIdLower.includes('tungro') || diagIdLower.includes('vang_lun') || diagNameLower.includes('vàng lùn') || diagNameLower.includes('tungro')
                ? 'rice_tungro'
                : diagIdLower.includes('blast') || diagIdLower.includes('dao_on') || diagNameLower.includes('đạo ôn')
                ? 'rice_blast'
                : diagIdLower.includes('bacterial') || diagIdLower.includes('bac_la') || diagNameLower.includes('bạc lá') || diagNameLower.includes('cháy bìa')
                ? 'rice_bacterial_blight'
                : diagIdLower.includes('sheath') || diagIdLower.includes('kho_van') || diagNameLower.includes('khô vằn')
                ? 'rice_sheath_blight'
                : diagIdLower.includes('brown') || diagIdLower.includes('dom_nau') || diagNameLower.includes('đốm nâu')
                ? 'rice_brown_spot'
                : null
              : diagIdLower.includes('wilt') || diagIdLower.includes('heo_xanh') || diagNameLower.includes('héo xanh') || diagNameLower.includes('ralstonia')
              ? 'peanut_bacterial_wilt'
              : diagIdLower.includes('aspergillus') || diagIdLower.includes('thoi_den') || diagNameLower.includes('thối đen') || diagNameLower.includes('mốc đen')
              ? 'peanut_aspergillus_crown_rot'
              : diagIdLower.includes('aphid') || diagIdLower.includes('rep_muoi') || diagNameLower.includes('rệp muội')
              ? 'peanut_aphid'
              : diagIdLower.includes('spodoptera') || diagIdLower.includes('sau_khoang') || diagNameLower.includes('sâu khoang') || diagNameLower.includes('ăn tạp')
              ? 'peanut_spodoptera'
              : diagIdLower.includes('rust') || diagIdLower.includes('gi_sat') || diagNameLower.includes('gỉ sắt')
              ? 'peanut_rust'
              : diagIdLower.includes('stem_rot') || diagIdLower.includes('thoi_trang') || diagNameLower.includes('thối trắng') || diagNameLower.includes('mốc trắng')
              ? 'peanut_stem_rot'
              : diagIdLower.includes('spot') || diagIdLower.includes('dom_la') || diagNameLower.includes('đốm lá') || diagNameLower.includes('đốm nâu') || diagNameLower.includes('đốm đen')
              ? 'peanut_leaf_spot'
              : null;
            const matchedRef = matchedRefId
              ? DEFAULT_DISEASES.find((d) => d.id === matchedRefId)
              : undefined;

            return (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 sm:p-7 space-y-6">
                {/* Main Diagnosis Headline */}
                <div className="space-y-2 border-b border-stone-200 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-600">
                      {getCropLabel(selectedCrop)} • {getPartLabel(selectedPart)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-lg border text-sm font-bold ${badge.style}`}>
                        {badge.label}
                      </span>
                      {isSpeechSupported() && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (isSpeaking || isLoadingSpeech) {
                              stopSpeaking();
                              setIsSpeaking(false);
                              setIsLoadingSpeech(false);
                              return;
                            }
                            setSpeechError(null);
                            setIsLoadingSpeech(true);
                            const signs = (primaryDiag?.evidence?.length ? primaryDiag.evidence : result.symptoms).slice(0, 3).join('. ');
                            const recs = result.recommendations.slice(0, 4).join('. ');
                            const textToRead = `Kết quả chẩn đoán ${getCropLabel(selectedCrop)}: ${
                              primaryDiag?.diseaseName || 'Chưa xác định rõ bệnh'
                            }. ${signs ? 'Dấu hiệu nhận biết: ' + signs + '. ' : ''}${
                              result.causes ? 'Nguyên nhân: ' + result.causes + '. ' : ''
                            }${recs ? 'Cách xử lý an toàn: ' + recs : ''}`;
                            await speakVietnamese(textToRead, {
                              onStart: () => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(true);
                              },
                              onEnd: () => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(false);
                              },
                              onError: (msg) => {
                                setIsLoadingSpeech(false);
                                setIsSpeaking(false);
                                setSpeechError(msg || 'Không phát được giọng đọc tiếng Việt.');
                              },
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold border min-h-[40px] cursor-pointer ${
                            isSpeaking
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : isLoadingSpeech
                              ? 'bg-stone-100 text-stone-700 border-stone-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isLoadingSpeech ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isSpeaking ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                          <span>
                            {isLoadingSpeech
                              ? 'Đang tạo giọng...'
                              : isSpeaking
                              ? 'Dừng đọc'
                              : 'Nghe bác sĩ đọc'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  {speechError && (
                    <p className="text-xs text-red-700 font-medium">{speechError}</p>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                    {primaryDiag?.diseaseName || 'Chưa xác định rõ bệnh'}
                  </h2>
                  {hasRefinedWithAnswers && (
                    <p className="text-sm font-semibold text-emerald-800">
                      ✓ Đã cập nhật chẩn đoán dựa trên dấu hiệu thực tế bác vừa xác nhận.
                    </p>
                  )}
                </div>

                {/* Interactive Symptom Verification Questions when AI needs confirmation */}
                {result.followUpQuestions && result.followUpQuestions.length > 0 && !hasRefinedWithAnswers && (
                  <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-4 sm:p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-amber-950">
                        Hỏi thêm 1–2 ý để Bác sĩ AI chốt chính xác hơn:
                      </h3>
                      <p className="text-sm text-stone-700">
                        Bác nhìn hoặc sờ nhẹ trực tiếp lên cây rồi bấm chọn bên dưới nhé:
                      </p>
                    </div>

                    <div className="space-y-4">
                      {result.followUpQuestions.map((q, qIdx) => (
                        <div key={q.id} className="bg-white rounded-xl border border-amber-200 p-3.5 space-y-2.5">
                          <p className="text-base font-bold text-stone-900">
                            {qIdx + 1}. {q.question}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => {
                              const isPicked = followUpSelections[q.id] === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setFollowUpSelections((prev) => ({
                                      ...prev,
                                      [q.id]: opt,
                                    }))
                                  }
                                  className={`px-4 py-2.5 rounded-xl text-sm sm:text-base font-semibold border transition-colors min-h-[44px] cursor-pointer ${
                                    isPicked
                                      ? 'bg-emerald-700 text-white border-emerald-700'
                                      : 'bg-stone-50 text-stone-800 border-stone-300 hover:border-emerald-500'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmFollowUp}
                      disabled={isRefining}
                      className={`w-full min-h-[50px] px-5 py-3 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isRefining
                          ? 'bg-stone-400 cursor-not-allowed'
                          : 'bg-amber-800 hover:bg-amber-900'
                      }`}
                    >
                      {isRefining ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                          <span>Đang chốt lại kết quả...</span>
                        </>
                      ) : (
                        <span>Chốt lại kết quả chính xác hơn</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Observed Symptoms */}
                {(result.symptoms.length > 0 || (primaryDiag?.evidence && primaryDiag.evidence.length > 0)) && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-stone-900">
                      Dấu hiệu nhận biết trên ảnh
                    </h3>
                    <ul className="list-disc list-inside space-y-1.5 text-base text-stone-800 bg-stone-50 p-4 rounded-xl border border-stone-200">
                      {(primaryDiag?.evidence?.length ? primaryDiag.evidence : result.symptoms).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Causes */}
                {result.causes && (
                  <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 sm:p-5 space-y-2">
                    <h3 className="text-lg font-bold text-stone-900">
                      Nguyên nhân gây bệnh
                    </h3>
                    <p className="text-base text-stone-800 leading-relaxed">
                      {result.causes}
                    </p>
                  </div>
                )}

                {/* What to do right now */}
                {result.recommendations.length > 0 && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 sm:p-5 space-y-3">
                    <h3 className="text-lg font-bold text-emerald-950">
                      Cách xử lý an toàn cho bác
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-base text-stone-900 leading-relaxed">
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Reference Links from Google Search */}
                {result.referenceLinks && result.referenceLinks.length > 0 && (
                  <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-2.5">
                    <h3 className="text-base font-bold text-stone-900">
                      Nguồn tham khảo uy tín từ Google
                    </h3>
                    <div className="flex flex-col gap-2">
                      {result.referenceLinks.slice(0, 2).map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-base font-semibold text-emerald-800 hover:text-emerald-950 hover:underline break-all"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" />
                          <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simple Side-by-side Visual Comparison (Light Clean Theme) */}
                {matchedRef && matchedRef.sampleImageUrl && (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-lg font-bold text-stone-900">
                      So sánh ảnh bác chụp với ảnh mẫu bệnh
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-stone-200 p-3 bg-stone-50 space-y-2">
                        <p className="text-sm font-bold text-stone-800">1. Ảnh bác chụp</p>
                        <div className="rounded-lg overflow-hidden aspect-4/3 bg-white border border-stone-200">
                          <img
                            src={imagePreview || ''}
                            alt="Ảnh bác chụp"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-stone-200 p-3 bg-stone-50 space-y-2">
                        <p className="text-sm font-bold text-stone-800">
                          2. Ảnh mẫu: {matchedRef.vietnameseName}
                        </p>
                        <div className="rounded-lg overflow-hidden aspect-4/3 bg-white border border-stone-200 flex items-center justify-center">
                          {!refImgError ? (
                            <img
                              src={matchedRef.sampleImageUrl}
                              alt={matchedRef.vietnameseName}
                              referrerPolicy="no-referrer"
                              onError={() => setRefImgError(true)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm text-stone-500 p-4 text-center">
                              Chưa có ảnh mẫu đối chiếu
                            </span>
                          )}
                        </div>
                        {matchedRef.imageSource && (
                          <p className="text-xs text-stone-600 leading-snug">{matchedRef.imageSource}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary possibilities when AI sees lookalikes */}
                {result.possibleDiagnoses.length > 1 && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Khả năng khác cũng cần lưu ý:
                    </h3>
                    <ul className="space-y-1.5 text-sm sm:text-base text-stone-800">
                      {result.possibleDiagnoses.slice(1, 3).map((alt, idx) => (
                        <li key={idx} className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">• {alt.diseaseName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                            {getConfidenceText(alt.confidenceLevel).label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical details tucked safely away */}
                {(result.alternativeCauses.length > 0 || result.disclaimer) && (
                  <details className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <summary className="font-semibold text-stone-800 cursor-pointer">
                      Xem ghi chú dành cho cán bộ kỹ thuật
                    </summary>
                    <div className="mt-3 space-y-2 leading-relaxed">
                      {result.alternativeCauses.length > 0 && (
                        <p>
                          <strong>Nguyên nhân khác có thể nhầm lẫn:</strong> {result.alternativeCauses.join('; ')}.
                        </p>
                      )}
                      {result.disclaimer && (
                        <p>
                          <strong>Lưu ý chuyên môn:</strong> {result.disclaimer}
                        </p>
                      )}
                    </div>
                  </details>
                )}

                {/* Quick correction / re-check if farmer spots mismatch */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionBox(!showCorrectionBox)}
                    className="text-sm sm:text-base font-semibold text-amber-900 hover:underline flex items-center gap-2 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      {showCorrectionBox
                        ? 'Ẩn phần góp ý sửa kết quả'
                        : 'Thấy máy đoán chưa đúng? Nhắc thêm dấu hiệu để kiểm tra lại'}
                    </span>
                  </button>

                  {showCorrectionBox && (
                    <form onSubmit={handleRecheckWithObservation} className="space-y-3">
                      <textarea
                        rows={2}
                        value={userObservationText}
                        onChange={(e) => setUserObservationText(e.target.value)}
                        placeholder="Ví dụ: Đây là con rầy đậu chổng đuôi lên, có sợi sáp trắng; hoặc mặt dưới lá có bột màu nâu..."
                        className="w-full p-3 rounded-xl border border-stone-300 bg-white text-base focus:outline-none focus:border-emerald-700"
                      />
                      <button
                        type="submit"
                        disabled={isRecheckingWithNote || !userObservationText.trim()}
                        className={`min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 cursor-pointer ${
                          isRecheckingWithNote || !userObservationText.trim()
                            ? 'bg-stone-400 cursor-not-allowed'
                            : 'bg-amber-800 hover:bg-amber-900'
                        }`}
                      >
                        {isRecheckingWithNote ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang kiểm tra lại...</span>
                          </>
                        ) : (
                          <span>Kiểm tra lại với mô tả của bác</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToAssistant({
                          crop: result.cropDetected,
                          part: getPartLabel(selectedPart),
                          suspectedDisease: primaryDiag?.diseaseName,
                          symptoms: result.symptoms,
                          confidenceLevel: badge.label,
                        })
                      }
                      className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-base bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Hỏi thêm cách chữa</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetScanner}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-base bg-white hover:bg-stone-50 text-stone-800 border-2 border-stone-300 cursor-pointer"
                    >
                      Chụp khám cây khác
                    </button>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onNavigateToLibrary(selectedCrop)}
                      className="text-sm font-semibold text-emerald-800 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Mở sổ bệnh</span>
                    </button>
                    {isSaved && (
                      <span className="text-sm font-semibold text-emerald-700">
                        ✓ Đã lưu
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
};
