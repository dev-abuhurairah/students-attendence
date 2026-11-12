import { describe, expect, it, vi } from 'vitest';
import XLSX from 'xlsx-js-style';
import {
  exportDailyAttendanceExcel,
  exportSubjectRegisterExcel,
} from './excel';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

vi.mock('xlsx-js-style', async () => {
  const actual = await vi.importActual<{ default: typeof XLSX }>('xlsx-js-style');
  return {
    default: {
      ...actual.default,
      writeFile: vi.fn(),
    },
  };
});

describe('Excel export service', () => {
  const program = { id: 'p1', name: 'BBA', createdAt: 1 };
  const semester = { id: 'sem1', programId: 'p1', name: '3rd Semester', createdAt: 1 };
  const subject = {
    id: 'sub1',
    programId: 'p1',
    semesterId: 'sem1',
    name: 'Financial Accounting',
    teacherName: 'Prof. Ahmed',
  };
  const students = [
    { id: 's1', programId: 'p1', semesterId: 'sem1', rollNo: '01', name: 'Ali Khan' },
    { id: 's2', programId: 'p1', semesterId: 'sem1', rollNo: '02', name: 'Sara Tariq' },
    { id: 's3', programId: 'p1', semesterId: 'sem1', rollNo: '03', name: 'Hamza Raza' },
  ];

  it('generates daily attendance excel file', async () => {
    const session = {
      id: 'sub1__2026-11-12',
      programId: 'p1',
      semesterId: 'sem1',
      subjectId: 'sub1',
      date: '2026-11-12',
      records: {
        s1: 'present' as const,
        s2: 'absent' as const,
        s3: 'leave' as const,
      },
      updatedAt: 1,
    };

    const result = await exportDailyAttendanceExcel({
      program,
      semester,
      subject,
      students,
      session,
    });

    expect(result).toBe('Downloaded BBA_3rd_Semester_Financial_Accounting_2026-11-12.xlsx');
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
  });

  it('generates subject register excel file', async () => {
    const sessions = [
      {
        id: 'sub1__2026-11-12',
        programId: 'p1',
        semesterId: 'sem1',
        subjectId: 'sub1',
        date: '2026-11-12',
        records: { s1: 'present' as const, s2: 'present' as const },
        updatedAt: 1,
      },
    ];

    const result = await exportSubjectRegisterExcel({
      program,
      semester,
      subject,
      students,
      sessions,
    });

    expect(result).toBe('Downloaded BBA_3rd_Semester_Financial_Accounting_Register.xlsx');
  });
});
