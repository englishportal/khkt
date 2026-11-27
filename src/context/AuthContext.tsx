import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { submitRoleUpgradeRequest } from '../services/userService';

export interface AppUser {
  uid: string;
  email: string | null;
  phoneNumber?: string | null;
  username?: string | null;
  displayName: string | null;
  photoURL: string | null;
  authProvider: 'phone' | 'firebase';
}

const PHONE_PROFILE_STORAGE_KEY = 'agrivision_phone_profile';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole;
  realRole: UserRole;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithPhone: (phone: string, displayName?: string) => Promise<{ recordCount: number }>;
  signOut: () => Promise<void>;
  impersonateRole: (role: UserRole) => void;
  requestElevation: (role: 'researcher' | 'administrator', organization: string, reason: string) => Promise<void>;
  isAdmin: boolean;
  isResearcher: boolean;
  isRealAdmin: boolean;
  isImpersonating: boolean;
  resetImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SYSTEM_ADMIN_EMAILS = [
  'phamthikhanhuyen201@gmail.com',
  'phamthikhanhhuyen281@gmail.com',
  'cl8593834@gmail.com',
];

function loadSavedPhoneProfile(): AppUser | null {
  try {
    const raw =
      localStorage.getItem(PHONE_PROFILE_STORAGE_KEY) ||
      localStorage.getItem('agrivision_quick_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.uid === 'string' && typeof parsed.phoneNumber === 'string') {
      const normalizedUid = parsed.uid.startsWith('farmer_phone_')
        ? `phone_${parsed.phoneNumber.replace(/\D/g, '')}`
        : parsed.uid;
      return {
        uid: normalizedUid,
        email: null,
        phoneNumber: parsed.phoneNumber,
        username: null,
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : parsed.phoneNumber,
        photoURL: null,
        authProvider: 'phone',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<AppUser | null>(null);
  const [phoneUser, setPhoneUser] = useState<AppUser | null>(() => loadSavedPhoneProfile());

  const [realRole, setRealRole] = useState<UserRole>('user');
  const [activeRole, setActiveRole] = useState<UserRole>('user');
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync saved phone profile with server on initial load
  useEffect(() => {
    const saved = loadSavedPhoneProfile();
    if (!saved?.phoneNumber) return;

    fetch('/api/phone-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: saved.phoneNumber,
        displayName: saved.displayName !== saved.phoneNumber ? saved.displayName : undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const synced: AppUser = {
            uid: data.user.uid,
            email: null,
            phoneNumber: data.user.phoneNumber,
            username: null,
            displayName: data.user.displayName || data.user.phoneNumber,
            photoURL: null,
            authProvider: 'phone',
          };
          setPhoneUser(synced);
          localStorage.setItem(PHONE_PROFILE_STORAGE_KEY, JSON.stringify(synced));
          if (data.user.role && data.user.role !== 'user') {
            setRealRole(data.user.role);
            setActiveRole(data.user.role);
          }
        }
      })
      .catch(() => {
        // Keep local saved phone profile offline
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const mapped: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          phoneNumber: currentUser.phoneNumber,
          username: null,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          authProvider: 'firebase',
        };
        setFirebaseUser(mapped);

        try {
          const userEmail = (currentUser.email || '').toLowerCase().trim();
          let assignedRole: UserRole = 'user';

          if (SYSTEM_ADMIN_EMAILS.includes(userEmail)) {
            assignedRole = 'administrator';
          } else {
            const userRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists() && snap.data().role) {
              assignedRole = snap.data().role;
            }
          }

          setRealRole(assignedRole);
          const savedImpersonation = localStorage.getItem('agrivision_admin_preview_role') as UserRole | null;
          if (assignedRole === 'administrator' && savedImpersonation && savedImpersonation !== 'administrator') {
            setActiveRole(savedImpersonation);
            setIsImpersonating(true);
          } else {
            setActiveRole(assignedRole);
            setIsImpersonating(false);
          }

          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(
            userRef,
            {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Bác Nông Dân',
              role: assignedRole,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          if (SYSTEM_ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase())) {
            setRealRole('administrator');
            setActiveRole('administrator');
          }
        }
      } else {
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const user = phoneUser || firebaseUser;

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithPhone = async (rawPhone: string, displayName?: string): Promise<{ recordCount: number }> => {
    const response = await fetch('/api/phone-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: rawPhone,
        displayName: displayName?.trim() || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.user) {
      throw new Error(data?.error || 'Không đăng nhập được bằng số điện thoại. Bác kiểm tra lại nhé.');
    }

    const profile: AppUser = {
      uid: data.user.uid,
      email: null,
      phoneNumber: data.user.phoneNumber,
      username: null,
      displayName: data.user.displayName || data.user.phoneNumber,
      photoURL: null,
      authProvider: 'phone',
    };

    setPhoneUser(profile);
    if (data.user.role) {
      setRealRole(data.user.role);
      setActiveRole(data.user.role);
    }

    try {
      localStorage.setItem(PHONE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      localStorage.removeItem('agrivision_quick_profile');
    } catch {
      // ignore storage errors
    }

    setIsAuthModalOpen(false);
    return { recordCount: Number(data.recordCount || 0) };
  };

  const impersonateRole = (newRole: UserRole) => {
    if (realRole !== 'administrator') return;
    if (newRole === realRole) {
      resetImpersonation();
      return;
    }
    setActiveRole(newRole);
    setIsImpersonating(true);
    localStorage.setItem('agrivision_admin_preview_role', newRole);
  };

  const resetImpersonation = () => {
    setActiveRole(realRole);
    setIsImpersonating(false);
    localStorage.removeItem('agrivision_admin_preview_role');
  };

  const requestElevation = async (
    targetRole: 'researcher' | 'administrator',
    organization: string,
    reason: string
  ) => {
    if (!user) {
      throw new Error('Vui lòng đăng nhập bằng số điện thoại trước khi gửi đề xuất phân quyền.');
    }

    await submitRoleUpgradeRequest(
      user.uid,
      user.email || user.phoneNumber || '',
      user.displayName || 'Bác Nông Dân',
      targetRole,
      organization,
      reason
    );
  };

  const signOut = async () => {
    try {
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
    } finally {
      setPhoneUser(null);
      setFirebaseUser(null);
      setRealRole('user');
      setActiveRole('user');
      setIsImpersonating(false);
      localStorage.removeItem(PHONE_PROFILE_STORAGE_KEY);
      localStorage.removeItem('agrivision_quick_profile');
      localStorage.removeItem('agrivision_admin_preview_role');
    }
  };

  const isRealAdmin = realRole === 'administrator';
  const isAdmin = activeRole === 'administrator';
  const isResearcher = activeRole === 'researcher' || activeRole === 'administrator';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: activeRole,
        realRole,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithPhone,
        signOut,
        impersonateRole,
        requestElevation,
        isAdmin,
        isResearcher,
        isRealAdmin,
        isImpersonating,
        resetImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
