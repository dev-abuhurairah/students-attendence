import type {
  AppData,
  AttendanceSession,
  AttendanceStatus,
} from '../types/attendance';

const DB_NAME = 'StudentAttendanceDB';
const DB_VERSION = 1;

export interface FlatAttendanceRecord {
  id: string; // `${subjectId}__${date}__${studentId}`
  subjectId: string;
  semesterId: string;
  programId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  updatedAt: number;
}

let dbInstance: IDBDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for full attendance sessions
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('subjectId', 'subjectId', { unique: false });
          sessionStore.createIndex('semesterId', 'semesterId', { unique: false });
          sessionStore.createIndex('date', 'date', { unique: false });
        }

        // Store for individual atomic attendance records to enforce 1 record per (subject, date, student)
        if (!db.objectStoreNames.contains('records')) {
          const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
          recordsStore.createIndex('subjectId', 'subjectId', { unique: false });
          recordsStore.createIndex('studentId', 'studentId', { unique: false });
          recordsStore.createIndex('date', 'date', { unique: false });
          recordsStore.createIndex(
            'subject_date_student',
            ['subjectId', 'date', 'studentId'],
            { unique: true }
          );
        }

        // Store for full app data backup (programs, semesters, subjects, students, teachers)
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to open local database'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves an attendance session into the local database transactionally.
 * Writes both the aggregated session and the individual student records,
 * strictly preventing duplicate records for the same student, subject, and date.
 */
export async function saveSessionToDB(session: AttendanceSession): Promise<void> {
  const db = await openDatabase();
  if (!db) return; // Fallback handled by localStorage

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['sessions', 'records'], 'readwrite');
      const sessionStore = tx.objectStore('sessions');
      const recordsStore = tx.objectStore('records');

      // 1. Put the session (keyed by id = `${subjectId}__${date}`)
      sessionStore.put(session);

      // 2. Put individual records (keyed by id = `${subjectId}__${date}__${studentId}`)
      Object.entries(session.records).forEach(([studentId, status]) => {
        const record: FlatAttendanceRecord = {
          id: `${session.subjectId}__${session.date}__${studentId}`,
          subjectId: session.subjectId,
          semesterId: session.semesterId,
          programId: session.programId,
          studentId,
          date: session.date,
          status,
          updatedAt: session.updatedAt,
        };
        recordsStore.put(record);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error(tx.error?.message || 'Database transaction failed'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Persists the entire app data structure to the local IndexedDB database.
 */
export async function persistAppDataToDB(data: AppData): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['sessions', 'records', 'app_state'], 'readwrite');
      const sessionStore = tx.objectStore('sessions');
      const recordsStore = tx.objectStore('records');
      const stateStore = tx.objectStore('app_state');

      // Save app state snapshot
      stateStore.put({ key: 'current_data', data, updatedAt: Date.now() });

      // Save sessions
      data.sessions.forEach((session) => {
        sessionStore.put(session);
        Object.entries(session.records).forEach(([studentId, status]) => {
          recordsStore.put({
            id: `${session.subjectId}__${session.date}__${studentId}`,
            subjectId: session.subjectId,
            semesterId: session.semesterId,
            programId: session.programId,
            studentId,
            date: session.date,
            status,
            updatedAt: session.updatedAt,
          });
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error(tx.error?.message || 'Failed to persist app data to DB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Loads app data from the local IndexedDB database on startup.
 */
export async function loadAppDataFromDB(): Promise<AppData | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['app_state'], 'readonly');
      const stateStore = tx.objectStore('app_state');
      const request = stateStore.get('current_data');

      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(request.result.data as AppData);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to read from DB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}
