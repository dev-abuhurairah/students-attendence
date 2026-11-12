import type { AppData } from '../types/attendance';

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

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
      teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      students: Array.isArray(parsed.students) ? parsed.students : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
