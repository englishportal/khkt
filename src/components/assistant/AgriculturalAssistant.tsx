import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  User,
  RefreshCw,
  X,
  ExternalLink,
  Mic,
  Square,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { isSpeechSupported, speakVietnamese, stopSpeaking } from '../../utils/speech';

interface AgriculturalAssistantProps {
  initialContext?: {
    crop: string;
    part?: string;
    suspectedDisease?: string;
    symptoms?: string[];
    confidenceLevel?: string;
  } | null;
  onClearContext?: () => void;
}

export const AgriculturalAssistant: React.FC<AgriculturalAssistantProps> = ({
  initialContext,
  onClearContext,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        'Chào bác! Bác đang thấy cây Cam, Lúa hay Lạc có dấu hiệu gì lạ cứ nhắn hỏi hoặc bấm nút nói chuyện bằng giọng nói ở đây nhé. Tôi sẽ giải thích thật dễ hiểu và đọc lại để bác nghe rõ.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeContext, setActiveContext] = useState(initialContext);

  // Voice Q&A states
  const [voiceModeEnabled, setVoiceModeEnabled] = useState<boolean>(false);
  const [autoReadReply, setAutoReadReply] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef<boolean>(false);
  const voiceAutoSendRef = useRef<boolean>(true);
  const autoReadReplyRef = useRef<boolean>(true);
  const voiceModeEnabledRef = useRef<boolean>(false);

  useEffect(() => {
    autoReadReplyRef.current = autoReadReply;
  }, [autoReadReply]);

  useEffect(() => {
    voiceModeEnabledRef.current = voiceModeEnabled;
  }, [voiceModeEnabled]);

  useEffect(() => {
    if (initialContext) {
      setActiveContext(initialContext);
    }
  }, [initialContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isTranscribing]);

  useEffect(() => {
    return () => {
      cleanupMediaRecorder();
      stopSpeaking();
    };
  }, []);

  const cleanupMediaRecorder = () => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        discardRecordingRef.current = true;
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors on unmount
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const quickQuestions = [
    'Lúa bị đạo ôn thì chữa thế nào?',
    'Cây cam bị vàng lá làm sao cứu?',
    'Cách phòng bệnh đốm lá cây lạc?',
    'Chụp ảnh lá cây sao cho rõ nét?',
  ];

  const playMessageAudio = async (messageId: string, content: string) => {
    if (speakingMessageId === messageId || loadingAudioMessageId === messageId) {
      stopSpeaking();
      setSpeakingMessageId(null);
      setLoadingAudioMessageId(null);
      return;
    }

    setVoiceError(null);
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(messageId);

    await speakVietnamese(content, {
      onStart: () => {
        setLoadingAudioMessageId(null);
        setSpeakingMessageId(messageId);
      },
      onEnd: () => {
        setLoadingAudioMessageId(null);
        setSpeakingMessageId(null);
      },
      onError: (msg) => {
        setLoadingAudioMessageId(null);
        setSpeakingMessageId(null);
        if (msg) setVoiceError(msg);
      },
    });
  };

  const handleSend = async (questionText?: string, shouldAutoRead?: boolean) => {
    const textToSend = (questionText ?? input).trim();
    if (!textToSend || loading) return;

    stopSpeaking();
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(null);
    setVoiceError(null);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      contextDiagnosis: activeContext
        ? {
            crop: activeContext.crop,
            suspectedDisease: activeContext.suspectedDisease || '',
          }
        : undefined,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6),
          diagnosisContext: activeContext,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Không kết nối được với Bác sĩ AI.');
      }

      const botMsgId = `bot_${Date.now()}`;
      const replyContent = data.reply || 'Bác hỏi rõ hơn một chút để tôi trả lời chính xác nhé.';
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'assistant',
          content: replyContent,
          sources: Array.isArray(data.sources) ? data.sources : [],
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      const readAloud =
        typeof shouldAutoRead === 'boolean'
          ? shouldAutoRead
          : voiceModeEnabledRef.current && autoReadReplyRef.current;

      if (readAloud && isSpeechSupported()) {
        void playMessageAudio(botMsgId, replyContent);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'assistant',
          content: err?.message || 'Mạng đang hơi chập chờn, bác bấm gửi lại giúp tôi nhé.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const transcribeRecordedBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setVoiceError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Không đọc được đoạn ghi âm.'));
        reader.readAsDataURL(blob);
      });

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: dataUrl,
          mimeType,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Chưa chuyển được giọng nói thành chữ.');
      }

      const spokenText = (data.text || '').trim();
      if (!spokenText) {
        setVoiceError('Máy chưa nghe rõ tiếng bác nói. Bác bấm nút micro nói gần điện thoại hơn một chút nhé.');
        return;
      }

      if (voiceAutoSendRef.current) {
        await handleSend(spokenText, voiceModeEnabledRef.current && autoReadReplyRef.current);
      } else {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${spokenText}` : spokenText));
      }
    } catch (err: any) {
      setVoiceError(err?.message || 'Có lỗi khi nhận diện giọng nói. Bác thử nói lại nhé.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startVoiceRecording = async (autoSendAfterTranscribe: boolean = true) => {
    if (isRecording || isTranscribing || loading) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Trình duyệt trên máy này chưa hỗ trợ ghi âm trực tiếp. Bác thử mở bằng Chrome hoặc gõ chữ nhé.');
      return;
    }

    stopSpeaking();
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(null);
    setVoiceError(null);
    discardRecordingRef.current = false;
    voiceAutoSendRef.current = autoSendAfterTranscribe;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const chosenMime = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        setIsRecording(false);

        if (discardRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const recordedType = recorder.mimeType || chosenMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
        audioChunksRef.current = [];

        if (audioBlob.size < 800) {
          setVoiceError('Đoạn ghi âm hơi ngắn quá, bác bấm giữ hoặc nói dài hơn 1–2 giây nhé.');
          return;
        }

        transcribeRecordedBlob(audioBlob, recordedType);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            stopVoiceRecording(false);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setVoiceError('Bác chưa cấp quyền Micro cho trình duyệt. Hãy bấm "Cho phép" micro trên thanh địa chỉ để nói chuyện nhé.');
      } else {
        setVoiceError('Không mở được micro trên thiết bị này. Bác kiểm tra lại tai nghe/micro nhé.');
      }
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = (discard: boolean = false) => {
    discardRecordingRef.current = discard;
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
    }
  };

  const toggleVoiceMode = () => {
    const nextState = !voiceModeEnabled;
    setVoiceModeEnabled(nextState);
    if (nextState) {
      setAutoReadReply(true);
      setVoiceError(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(null);
      setLoadingAudioMessageId(null);
      if (isRecording) stopVoiceRecording(true);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Hỏi Bác Sĩ Cây Trồng
          </h1>
          <p className="text-base text-stone-600 mt-1">
            Bấm nút Micro để nói câu hỏi tiếng Việt hoặc nhắn chữ bên dưới.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleVoiceMode}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base border-2 transition-all min-h-[48px] cursor-pointer shrink-0 ${
            voiceModeEnabled
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span>{voiceModeEnabled ? 'Chế độ nói chuyện: Đang bật' : 'Bật chế độ hỏi đáp giọng nói'}</span>
        </button>
      </div>

      {/* Dedicated Voice Q&A Control Bar when Voice Mode is Active */}
      {voiceModeEnabled && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-emerald-700" />
                <span>Chế độ Hỏi – Đáp Bằng Giọng Nói</span>
              </h2>
              <p className="text-sm text-stone-700">
                Bác bấm nói câu hỏi, máy sẽ tự gửi và đọc to câu trả lời tiếng Việt cho bác nghe.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !autoReadReply;
                setAutoReadReply(next);
                if (!next) {
                  stopSpeaking();
                  setSpeakingMessageId(null);
                  setLoadingAudioMessageId(null);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border cursor-pointer ${
                autoReadReply
                  ? 'bg-white text-emerald-900 border-emerald-300'
                  : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {autoReadReply ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
              <span>{autoReadReply ? 'Tự đọc trả lời: Bật' : 'Tự đọc trả lời: Tắt'}</span>
            </button>
          </div>

          {isRecording ? (
            <div className="bg-white rounded-xl border-2 border-red-300 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                <span className="text-base font-bold text-red-900">
                  Đang nghe bác nói... ({formatDuration(recordingSeconds)} / 0:30)
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(true)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-sm cursor-pointer min-h-[44px]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(false)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Nói xong, gửi ngay</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={isTranscribing || loading}
              onClick={() => startVoiceRecording(true)}
              className={`w-full min-h-[56px] px-5 py-3 rounded-xl font-bold text-lg text-white flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isTranscribing || loading
                  ? 'bg-stone-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 shadow-sm active:scale-[0.99]'
              }`}
            >
              {isTranscribing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang nghe hiểu câu hỏi của bác...</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span>Bấm vào đây để nói câu hỏi cho bác sĩ</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {voiceError && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-sm sm:text-base flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="p-1 text-amber-800 hover:text-amber-950 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeContext && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="text-base text-stone-800">
            <span className="font-bold text-emerald-950">Đang hỏi về lần khám vừa rồi: </span>
            <span>{activeContext.crop}</span>
            {activeContext.suspectedDisease && (
              <span> — <strong>{activeContext.suspectedDisease}</strong></span>
            )}
          </div>
          <button
            onClick={() => {
              setActiveContext(undefined);
              if (onClearContext) onClearContext();
            }}
            className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-emerald-100 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 flex flex-col h-[560px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isBot = msg.sender === 'assistant';
            const isThisSpeaking = speakingMessageId === msg.id;
            const isThisLoadingAudio = loadingAudioMessageId === msg.id;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-base leading-relaxed ${
                    isBot
                      ? 'bg-stone-50 border border-stone-200 text-stone-900 whitespace-pre-wrap'
                      : 'bg-emerald-700 text-white font-medium'
                  }`}
                >
                  <div>{msg.content}</div>
                  {isBot && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-1.5">
                      <p className="text-xs font-bold text-stone-600">Nguồn tham khảo:</p>
                      <div className="flex flex-col gap-1">
                        {msg.sources.slice(0, 2).map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 hover:underline break-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span>{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    {isBot && isSpeechSupported() ? (
                      <button
                        type="button"
                        onClick={() => playMessageAudio(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          isThisSpeaking
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : isThisLoadingAudio
                            ? 'bg-stone-200 text-stone-700 border-stone-300'
                            : 'bg-white text-emerald-900 border-stone-300 hover:bg-emerald-50'
                        }`}
                      >
                        {isThisLoadingAudio ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : isThisSpeaking ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isThisLoadingAudio
                            ? 'Đang tạo giọng...'
                            : isThisSpeaking
                            ? 'Dừng đọc'
                            : 'Nghe trả lời'}
                        </span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className={`text-xs ${isBot ? 'text-stone-500' : 'text-emerald-100'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {!isBot && (
                  <div className="w-9 h-9 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {isTranscribing && (
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-base text-emerald-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Đang chuyển giọng nói của bác thành chữ...</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-base text-stone-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Đang tìm câu trả lời cho bác...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Simple Quick Questions */}
        <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-stone-600">Hỏi nhanh:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-white hover:bg-emerald-50 text-stone-800 border border-stone-300 transition-colors cursor-pointer min-h-[40px]"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Big Input Row with Quick Mic Button */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopVoiceRecording(false);
                } else {
                  startVoiceRecording(true);
                }
              }}
              disabled={isTranscribing || loading}
              title={isRecording ? 'Bấm để dừng và gửi câu hỏi' : 'Bấm để nói câu hỏi bằng giọng nói'}
              className={`min-h-[48px] min-w-[48px] px-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : isTranscribing || loading
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
              <span className="hidden sm:inline text-sm">
                {isRecording ? `Dừng (${formatDuration(recordingSeconds)})` : 'Nói'}
              </span>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? 'Đang ghi âm giọng nói của bác...'
                  : 'Gõ câu hỏi hoặc bấm nút Nói...'
              }
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 text-base focus:outline-none focus:border-emerald-700 bg-stone-50/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || isRecording || isTranscribing}
              className={`min-h-[48px] px-5 py-2.5 rounded-xl text-white font-bold text-base flex items-center gap-2 transition-colors cursor-pointer ${
                !input.trim() || loading || isRecording || isTranscribing
                  ? 'bg-stone-300 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <span>Gửi</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
