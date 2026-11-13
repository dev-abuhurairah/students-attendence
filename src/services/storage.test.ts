import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateAttendancePercentage,
  EMPTY_DATA,
  saveAttendanceSession,
} from './storage';
import type { AppData, AttendanceSession } from '../types/attendance';

// Simple in-memory localStorage mock for node test runner
const memoryStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStorage.set(key, value),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Storage and Attendance Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const baseData: AppData = {
    ...EMPTY_DATA,
    programs: [{ id: 'p1', name: 'BBA', createdAt: 1 }],
    semesters: [{ id: 'sem1', programId: 'p1', name: '1st Semester', createdAt: 1 }],
    subjects: [
      {
        id: 'sub1',
        programId: 'p1',
        semesterId: 'sem1',
        name: 'Principles of Management',
        teacherName: 'Sir Kashif',
      },
    ],
    students: [
      { id: 'stu1', programId: 'p1', semesterId: 'sem1', rollNo: '01', name: 'Ali' },
      { id: 'stu2', programId: 'p1', semesterId: 'sem1', rollNo: '02', name: 'Bilal' },
    ],
    sessions: [],
  };

  it('saves attendance date by date without creating duplicates', async () => {
    const sessionDate1: AttendanceSession = {
      id: 'sub1__2026-11-10',
      programId: 'p1',
      semesterId: 'sem1',
      subjectId: 'sub1',
      date: '2026-11-10',
      records: { stu1: 'present', stu2: 'absent' },
      updatedAt: 100,
    };

    const sessionDate2: AttendanceSession = {
      id: 'sub1__2026-11-11',
      programId: 'p1',
      semesterId: 'sem1',
      subjectId: 'sub1',
      date: '2026-11-11',
      records: { stu1: 'present', stu2: 'present' },
      updatedAt: 200,
    };

    // Save Date 1
    const dataAfterDay1 = await saveAttendanceSession(baseData, sessionDate1);
    expect(dataAfterDay1.sessions.length).toBe(1);
    expect(dataAfterDay1.sessions[0].records.stu1).toBe('present');

    // Save Date 2
    const dataAfterDay2 = await saveAttendanceSession(dataAfterDay1, sessionDate2);
    expect(dataAfterDay2.sessions.length).toBe(2);

    // Editing Date 1: should update in place without creating a duplicate
    const updatedSessionDate1: AttendanceSession = {
      ...sessionDate1,
      records: { stu1: 'absent', stu2: 'present' },
      updatedAt: 300,
    };

    const dataAfterEdit = await saveAttendanceSession(dataAfterDay2, updatedSessionDate1);
    // Still exactly 2 sessions!
    expect(dataAfterEdit.sessions.length).toBe(2);
    const retrievedDay1 = dataAfterEdit.sessions.find((s) => s.id === 'sub1__2026-11-10');
    expect(retrievedDay1?.records.stu1).toBe('absent');
    expect(retrievedDay1?.records.stu2).toBe('present');

    // Ensure there is only 1 record per student for this subject and date
    expect(Object.keys(retrievedDay1!.records).length).toBe(2);
  });

  it('calculates attendance percentage with exact 2 decimal places', () => {
    expect(calculateAttendancePercentage(7, 8)).toBe('87.50%');
    expect(calculateAttendancePercentage(0, 10)).toBe('0.00%');
    expect(calculateAttendancePercentage(10, 10)).toBe('100.00%');
  });
});
