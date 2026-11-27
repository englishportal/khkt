import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DiagnosisResult, DiagnosisHistoryItem, CropType, PlantPart, FollowUpAnswer } from '../types';

const COLLECTION_NAME = 'diagnoses';
const LOCAL_STORAGE_KEY = 'agrivision_local_diagnoses';

export async function runServerDiagnosis(
  imageBase64: string,
  cropType: CropType,
  plantPart: PlantPart,
  mimeType: string = 'image/jpeg',
  visualMetrics?: {
    healthyGreenRatio: number;
    yellowRatio: number;
    lesionRatio: number;
    leafShape?: 'broadleaf_oval' | 'slender_blade' | 'compound_rounded_leaflets';
    detectedCropHint?: 'citrus' | 'rice' | 'peanut' | 'unknown';
    sharpnessScore?: number;
    imageQuality?: 'good' | 'fair' | 'poor';
    qualityIssues?: string[];
    isBlurry?: boolean;
    isTooDark?: boolean;
    isOverexposed?: boolean;
    sourceSampleId?: string;
    filenameHint?: string;
  },
  extraContext?: {
    secondaryImageBase64?: string;
    secondaryMimeType?: string;
    followUpAnswers?: FollowUpAnswer[];
    userObservation?: string;
  }
): Promise<DiagnosisResult> {
  const response = await fetch('/api/diagnose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      cropType,
      plantPart,
      visualMetrics,
      secondaryImageBase64: extraContext?.secondaryImageBase64,
      secondaryMimeType: extraContext?.secondaryMimeType,
      followUpAnswers: extraContext?.followUpAnswers,
      userObservation: extraContext?.userObservation,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Lỗi khi gửi ảnh phân tích đến máy chủ.');
  }

  const result: DiagnosisResult = await response.json();
  return result;
}

export async function saveDiagnosisRecord(
  item: Omit<DiagnosisHistoryItem, 'id' | 'createdAt'>,
  customId?: string
): Promise<DiagnosisHistoryItem> {
  const id = customId || `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullItem: DiagnosisHistoryItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
  };

  // Cache locally in browser
  try {
    const local = getAllLocalDiagnoses();
    local.unshift(fullItem);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local.slice(0, 40)));
    } catch {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local.slice(0, 10)));
    }
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // Persist to server for cross-device phone sync when signed in with a phone account
  if (item.userId && item.userId !== 'guest_user') {
    try {
      await fetch('/api/diagnoses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullItem),
      });
    } catch (err) {
      console.warn('Server diagnosis sync error:', err);
    }
  }

  // Also save to Firestore if signed into Firebase Auth
  if (item.userId && auth.currentUser && auth.currentUser.uid === item.userId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, fullItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${id}`);
    }
  }

  return fullItem;
}

export async function fetchUserDiagnoses(
  userId?: string,
  isAdminOrResearcher: boolean = false
): Promise<DiagnosisHistoryItem[]> {
  // 1. Cross-device server sync for phone-number users or researcher review
  if (isAdminOrResearcher && !userId) {
    try {
      const res = await fetch('/api/diagnoses?all=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          return data.items;
        }
      }
    } catch (err) {
      console.warn('Server fetch all diagnoses failed:', err);
    }
  } else if (userId && userId !== 'guest_user') {
    try {
      const res = await fetch(`/api/diagnoses?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        const serverItems: DiagnosisHistoryItem[] = Array.isArray(data.items) ? data.items : [];
        const localForUser = getLocalDiagnosesByUser(userId);
        const serverIds = new Set(serverItems.map((i) => i.id));
        const merged = [
          ...serverItems,
          ...localForUser.filter((l) => !serverIds.has(l.id)),
        ];
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged;
      }
    } catch (err) {
      console.warn('Server fetch user diagnoses failed:', err);
    }
  }

  // 2. Fallback to Firestore if Firebase Auth session exists
  try {
    if (auth.currentUser) {
      const colRef = collection(db, COLLECTION_NAME);
      const q =
        isAdminOrResearcher && !userId
          ? query(colRef, limit(100))
          : userId && auth.currentUser.uid === userId
          ? query(colRef, where('userId', '==', userId), limit(50))
          : null;

      if (q) {
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: DiagnosisHistoryItem[] = [];
          snap.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return items;
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }

  // 3. Offline / guest local cache strictly scoped to current userId
  return getLocalDiagnosesByUser(userId || 'guest_user');
}

export async function updateDiagnosisVerification(
  id: string,
  status: 'unverified' | 'expert_verified' | 'corrected',
  expertNotes?: string,
  correctedDisease?: string
): Promise<void> {
  // Update local storage copy
  const local = getAllLocalDiagnoses().map((item) => {
    if (item.id === id) {
      return {
        ...item,
        verificationStatus: status,
        expertNotes: expertNotes ?? item.expertNotes,
        correctedDisease: correctedDisease ?? item.correctedDisease,
      };
    }
    return item;
  });
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
  } catch {
    // ignore storage errors
  }

  try {
    await fetch(`/api/diagnoses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationStatus: status, expertNotes, correctedDisease }),
    });
  } catch (err) {
    console.warn('Server update diagnosis failed:', err);
  }

  if (auth.currentUser) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updatePayload: any = {
        verificationStatus: status,
        updatedAt: new Date().toISOString(),
      };
      if (expertNotes !== undefined) updatePayload.expertNotes = expertNotes;
      if (correctedDisease !== undefined) updatePayload.correctedDisease = correctedDisease;
      await setDoc(docRef, updatePayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  }
}

export async function deleteDiagnosisRecord(id: string, userId?: string): Promise<void> {
  const local = getAllLocalDiagnoses().filter((item) => item.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
  } catch {
    // ignore storage errors
  }

  try {
    const queryStr = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    await fetch(`/api/diagnoses/${encodeURIComponent(id)}${queryStr}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Server delete diagnosis failed:', err);
  }

  if (!auth.currentUser) return;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

function getAllLocalDiagnoses(): DiagnosisHistoryItem[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getLocalDiagnosesByUser(userId: string): DiagnosisHistoryItem[] {
  const all = getAllLocalDiagnoses();
  if (!userId || userId === 'guest_user') {
    return all.filter((item) => !item.userId || item.userId === 'guest_user');
  }
  return all.filter((item) => item.userId === userId);
}
