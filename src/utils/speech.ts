const clientAudioCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
let activeCallbacks: { onEnd?: () => void; onError?: (message?: string) => void } | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/[*_`#>•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
  return URL.createObjectURL(blob);
}

function findNativeVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  return (
    voices.find((v) => v.lang.toLowerCase() === 'vi-vn') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ||
    null
  );
}

export function stopSpeaking(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore audio element teardown errors
    }
    activeAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore Web Speech cancellation errors
    }
  }

  activeCallbacks = null;
}

export async function speakVietnamese(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message?: string) => void;
  }
): Promise<boolean> {
  const cleanText = cleanSpeechText(text);
  if (!cleanText) {
    callbacks?.onError?.('Chưa có nội dung để đọc.');
    return false;
  }

  stopSpeaking();
  activeCallbacks = callbacks || null;

  const controller = new AbortController();
  activeAbortController = controller;

  const playObjectUrl = (objectUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (controller.signal.aborted) {
        resolve(false);
        return;
      }

      const audio = new Audio(objectUrl);
      activeAudio = audio;

      audio.onplay = () => {
        if (!controller.signal.aborted) {
          callbacks?.onStart?.();
        }
      };

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        if (!controller.signal.aborted) {
          callbacks?.onEnd?.();
        }
        resolve(true);
      };

      audio.onerror = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        if (!controller.signal.aborted) {
          callbacks?.onError?.('Không phát được tệp âm thanh trên trình duyệt này.');
        }
        resolve(false);
      };

      audio.play().catch(() => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        if (!controller.signal.aborted) {
          callbacks?.onError?.('Trình duyệt chưa cho phép phát âm thanh tự động.');
        }
        resolve(false);
      });
    });
  };

  try {
    const cachedUrl = clientAudioCache.get(cleanText);
    if (cachedUrl) {
      return await playObjectUrl(cachedUrl);
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText }),
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      return false;
    }

    let serverErrorMsg: string | undefined;
    if (response.ok) {
      const data = await response.json();
      if (data?.audioBase64) {
        const objectUrl = base64ToObjectUrl(data.audioBase64, data.mimeType || 'audio/wav');
        if (clientAudioCache.size >= 25) {
          const oldestKey = clientAudioCache.keys().next().value;
          const oldestUrl = oldestKey ? clientAudioCache.get(oldestKey) : undefined;
          if (oldestKey) clientAudioCache.delete(oldestKey);
          if (oldestUrl) URL.revokeObjectURL(oldestUrl);
        }
        clientAudioCache.set(cleanText, objectUrl);
        return await playObjectUrl(objectUrl);
      }
    } else {
      const errJson = await response.json().catch(() => ({}));
      serverErrorMsg = errJson?.error;
    }

    // Fallback to native Web Speech ONLY if the browser truly has a Vietnamese voice installed
    const viVoice = findNativeVietnameseVoice();
    if (viVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.onstart = () => callbacks?.onStart?.();
      utterance.onend = () => callbacks?.onEnd?.();
      utterance.onerror = () => callbacks?.onError?.('Không đọc được nội dung bằng giọng tiếng Việt.');
      window.speechSynthesis.speak(utterance);
      return true;
    }

    callbacks?.onError?.(
      serverErrorMsg || 'Hiện chưa tạo được giọng đọc tiếng Việt. Bác thử lại sau giây lát nhé.'
    );
    return false;
  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      return false;
    }

    const viVoice = findNativeVietnameseVoice();
    if (viVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.onstart = () => callbacks?.onStart?.();
      utterance.onend = () => callbacks?.onEnd?.();
      utterance.onerror = () => callbacks?.onError?.('Không đọc được nội dung bằng giọng tiếng Việt.');
      window.speechSynthesis.speak(utterance);
      return true;
    }

    callbacks?.onError?.('Chưa kết nối được máy chủ giọng đọc tiếng Việt.');
    return false;
  }
}
