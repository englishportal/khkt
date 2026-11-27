import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const PHONE_USERS_FILE = path.join(DATA_DIR, 'phone_users.json');
const DIAGNOSES_FILE = path.join(DATA_DIR, 'diagnoses.json');

export interface PhoneUserRecord {
  uid: string;
  phone: string;
  displayName: string;
  role: 'user' | 'researcher' | 'administrator';
  createdAt: string;
  updatedAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonArray<T>(filePath: string): T[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(filePath: string, data: T[]) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function normalizeVietnamesePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let cleaned = input.replace(/[\s\-().]/g, '').trim();
  if (!cleaned) return null;

  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  if (!/^\d{9,11}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function createPhoneDataRouter() {
  const router = express.Router();

  // Phone-only login (creates or loads existing profile by canonical phone number)
  router.post('/phone-auth/login', (req: Request, res: Response) => {
    const normalizedPhone = normalizeVietnamesePhone(req.body?.phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Bác vui lòng nhập đúng số điện thoại (9 – 11 chữ số) nhé.',
      });
    }

    const displayNameInput =
      typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';

    const users = readJsonArray<PhoneUserRecord>(PHONE_USERS_FILE);
    const now = new Date().toISOString();
    const uid = `phone_${normalizedPhone}`;
    const existingIdx = users.findIndex((u) => u.uid === uid || u.phone === normalizedPhone);

    let profile: PhoneUserRecord;
    if (existingIdx !== -1) {
      const existing = users[existingIdx];
      profile = {
        ...existing,
        uid,
        phone: normalizedPhone,
        displayName: displayNameInput || existing.displayName || normalizedPhone,
        updatedAt: now,
      };
      users[existingIdx] = profile;
    } else {
      profile = {
        uid,
        phone: normalizedPhone,
        displayName: displayNameInput || normalizedPhone,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      };
      users.push(profile);
    }

    writeJsonArray(PHONE_USERS_FILE, users);

    const diagnoses = readJsonArray<any>(DIAGNOSES_FILE);
    const recordCount = diagnoses.filter((d) => d?.userId === uid).length;

    return res.json({
      ok: true,
      user: {
        uid: profile.uid,
        phoneNumber: profile.phone,
        displayName: profile.displayName,
        role: profile.role,
      },
      recordCount,
    });
  });

  // Fetch diagnosis history by phone userId (or all for researcher review)
  router.get('/diagnoses', (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const fetchAll = req.query.all === 'true';

    const all = readJsonArray<any>(DIAGNOSES_FILE);
    let filtered = all;

    if (!fetchAll) {
      if (!userId) {
        return res.json({ items: [] });
      }
      filtered = all.filter((item) => item && item.userId === userId);
    }

    filtered.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return res.json({ items: filtered.slice(0, 100) });
  });

  // Save a diagnosis record to server storage so any device with the same phone sees it
  router.post('/diagnoses', (req: Request, res: Response) => {
    const record = req.body;
    if (!record || typeof record !== 'object' || !record.id || !record.userId) {
      return res.status(400).json({ error: 'Thiếu thông tin bản ghi chẩn đoán.' });
    }

    const all = readJsonArray<any>(DIAGNOSES_FILE);
    const idx = all.findIndex((d) => d && d.id === record.id);
    if (idx !== -1) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }

    writeJsonArray(DIAGNOSES_FILE, all.slice(0, 500));
    return res.status(201).json({ ok: true, item: record });
  });

  // Update expert verification notes on a diagnosis
  router.patch('/diagnoses/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { verificationStatus, expertNotes, correctedDisease } = req.body || {};

    const all = readJsonArray<any>(DIAGNOSES_FILE);
    const idx = all.findIndex((d) => d && d.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy lần khám cần cập nhật.' });
    }

    all[idx] = {
      ...all[idx],
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(expertNotes !== undefined ? { expertNotes } : {}),
      ...(correctedDisease !== undefined ? { correctedDisease } : {}),
      updatedAt: new Date().toISOString(),
    };

    writeJsonArray(DIAGNOSES_FILE, all);
    return res.json({ ok: true, item: all[idx] });
  });

  // Delete a diagnosis record
  router.delete('/diagnoses/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

    const all = readJsonArray<any>(DIAGNOSES_FILE);
    const next = all.filter((d) => {
      if (!d || d.id !== id) return true;
      if (userId && d.userId && d.userId !== userId) return true;
      return false;
    });

    writeJsonArray(DIAGNOSES_FILE, next);
    return res.json({ ok: true });
  });

  return router;
}
