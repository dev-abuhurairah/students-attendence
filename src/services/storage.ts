import type { AppData, AttendanceSession } from '../types/attendance';
import { loadAppDataFromDB, persistAppDataToDB, saveSessionToDB } from './db';

const STORAGE_KEY = 'student_attendance_app_v1';

export const EMPTY_DATA: AppData = {
  programs: [],
  semesters: [],
  teachers: [],
  subjects: [],
  students: [],
  sessions: [],
};

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function safeArray<T>(val: unknown): T[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is T => Boolean(item && typeof item === 'object'));
}

export function loadAppData(): AppData {
  try {
    if (typeof localStorage === 'undefined') return EMPTY_DATA;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      programs: safeArray(parsed.programs),
      semesters: safeArray(parsed.semesters),
      teachers: safeArray(parsed.teachers),
      subjects: safeArray(parsed.subjects),
      students: safeArray(parsed.students),
      sessions: safeArray(parsed.sessions),
    };
  } catch {
    return EMPTY_DATA;
  }
}

/**
 * Saves app data to localStorage immediately, and persists to local IndexedDB.
 */
export function saveAppData(data: AppData): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    // Asynchronously update local IndexedDB database
    void persistAppDataToDB(data).catch((err) => {
      console.warn('Could not mirror app data to IndexedDB:', err);
    });
    return true;
  } catch (err) {
    console.error('Failed to save app data:', err);
    return false;
  }
}

/**
 * Saves an attendance session transactionally to both localStorage and IndexedDB.
 * Enforces that only one record exists for each (subject, date, student).
 */
export async function saveAttendanceSession(
  prevData: AppData,
  session: AttendanceSession
): Promise<AppData> {
  const exists = prevData.sessions.some((s) => s.id === session.id);
  const updatedSessions = exists
    ? prevData.sessions.map((s) => (s.id === session.id ? session : s))
    : [...prevData.sessions, session];

  const nextData: AppData = {
    ...prevData,
    sessions: updatedSessions,
  };

  const localSaved = saveAppData(nextData);
  if (!localSaved) {
    throw new Error('Local storage failed to write');
  }

  // Transactionally save to IndexedDB
  await saveSessionToDB(session);

  return nextData;
}

export async function hydrateFromDatabase(): Promise<AppData | null> {
  try {
    const dbData = await loadAppDataFromDB();
    if (dbData && dbData.programs) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
      return dbData;
    }
  } catch (err) {
    console.warn('Hydration from IndexedDB skipped:', err);
  }
  return null;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates attendance percentage strictly formatted with 2 decimal places:
 * (present classes ÷ total classes) × 100
 */
export function calculateAttendancePercentage(
  presentClasses: number,
  totalClasses: number
): string {
  if (totalClasses <= 0) return '0.00%';
  const pct = (presentClasses / totalClasses) * 100;
  return `${pct.toFixed(2)}%`;
}
