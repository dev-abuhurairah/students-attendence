import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type {
  AttendanceSession,
  AttendanceStatus,
  Program,
  Semester,
  Student,
  Subject,
} from '../types/attendance';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function formatStatusLabel(status?: AttendanceStatus): string {
  if (status === 'present') return 'Present';
  if (status === 'absent') return 'Absent';
  if (status === 'leave') return 'Leave';
  return 'Not Marked';
}

function formatStatusShort(status?: AttendanceStatus): string {
  if (status === 'present') return 'P';
  if (status === 'absent') return 'A';
  if (status === 'leave') return 'L';
  return '-';
}

async function saveAndShareWorkbook(wb: XLSX.WorkBook, fileName: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string;

    // Write into Cache so Android FileProvider can share it cleanly on all modern Android versions
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    // Also try saving a copy in Documents/Attendance for easy local access
    try {
      await Filesystem.writeFile({
        path: `Attendance/${fileName}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Scoped storage on some Android versions may restrict Documents; Cache + Share still works
    }

    await Share.share({
      title: fileName,
      text: 'Student Attendance Excel Sheet',
      url: result.uri,
      dialogTitle: 'Open or Share Excel Sheet',
    });

    return `Saved & opened share sheet for ${fileName}`;
  }

  // Web browser fallback
  XLSX.writeFile(wb, fileName);
  return `Downloaded ${fileName}`;
}

export interface DailyExcelParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  session: AttendanceSession;
}

export async function exportDailyAttendanceExcel({
  program,
  semester,
  subject,
  students,
  session,
}: DailyExcelParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  const rows: (string | number)[][] = [
    ['STUDENT ATTENDANCE SHEET'],
    ['Program', program.name, 'Semester', semester.name],
    ['Subject', subject.name, 'Teacher', subject.teacherName],
    ['Date', session.date, 'Total Students', sortedStudents.length],
    [],
    ['Sr. No', 'Roll No', 'Student Name', 'Status'],
  ];

  sortedStudents.forEach((student, index) => {
    const status = session.records[student.id];
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'leave') leaveCount++;

    rows.push([index + 1, student.rollNo || '-', student.name, formatStatusLabel(status)]);
  });

  const totalMarked = presentCount + absentCount + leaveCount;
  const pct = totalMarked > 0 ? Math.round((presentCount / sortedStudents.length) * 100) : 0;

  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Present', presentCount]);
  rows.push(['Absent', absentCount]);
  rows.push(['Leave', leaveCount]);
  rows.push(['Attendance %', `${pct}%`]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_${session.date}.xlsx`;

  return saveAndShareWorkbook(wb, fileName);
}

export interface RegisterExcelParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  sessions: AttendanceSession[];
}

export async function exportSubjectRegisterExcel({
  program,
  semester,
  subject,
  students,
  sessions,
}: RegisterExcelParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );
  const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  const headerRow = [
    'Sr. No',
    'Roll No',
    'Student Name',
    ...sortedSessions.map((s) => s.date),
    'Present',
    'Absent',
    'Leave',
    'Attendance %',
  ];

  const rows: (string | number)[][] = [
    ['SUBJECT ATTENDANCE REGISTER'],
    ['Program', program.name, 'Semester', semester.name],
    ['Subject', subject.name, 'Teacher', subject.teacherName],
    ['Total Classes', sortedSessions.length],
    [],
    headerRow,
  ];

  sortedStudents.forEach((student, idx) => {
    let p = 0;
    let a = 0;
    let l = 0;

    const dateCells = sortedSessions.map((sess) => {
      const st = sess.records[student.id];
      if (st === 'present') p++;
      else if (st === 'absent') a++;
      else if (st === 'leave') l++;
      return formatStatusShort(st);
    });

    const total = sortedSessions.length;
    const pct = total > 0 ? `${Math.round((p / total) * 100)}%` : '0%';

    rows.push([idx + 1, student.rollNo || '-', student.name, ...dateCells, p, a, l, pct]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
    ...sortedSessions.map(() => ({ wch: 12 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Register');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_Register.xlsx`;

  return saveAndShareWorkbook(wb, fileName);
}
