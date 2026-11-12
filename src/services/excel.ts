import XLSX from 'xlsx-js-style';
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

const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const TITLE_STYLE = {
  font: { name: 'Calibri', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '002B5B' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const META_LABEL_STYLE = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '002B5B' } },
  fill: { fgColor: { rgb: 'E0EAFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: THIN_BORDER,
};

const META_VALUE_STYLE = {
  font: { name: 'Calibri', sz: 11, bold: false, color: { rgb: '0F172A' } },
  fill: { fgColor: { rgb: 'F8FAFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: THIN_BORDER,
};

const TABLE_HEADER_STYLE = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '6495ED' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: THIN_BORDER,
};

function getStatusCellStyle(status?: AttendanceStatus, centered = true) {
  let rgbFill = 'F1F5F9';
  let rgbText = '475569';
  if (status === 'present') {
    rgbFill = 'D1FAE5';
    rgbText = '065F46';
  } else if (status === 'absent') {
    rgbFill = 'FEE2E2';
    rgbText = '991B1B';
  } else if (status === 'leave') {
    rgbFill = 'FEF3C7';
    rgbText = '92400E';
  }
  return {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: rgbText } },
    fill: { fgColor: { rgb: rgbFill } },
    alignment: { horizontal: centered ? 'center' : 'left', vertical: 'center' },
    border: THIN_BORDER,
  };
}

function getRowCellStyle(
  isEven: boolean,
  horizontal: 'left' | 'center' | 'right' = 'left',
  bold = false
) {
  return {
    font: { name: 'Calibri', sz: 11, bold, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F8FAFF' } },
    alignment: { horizontal, vertical: 'center' },
    border: THIN_BORDER,
  };
}

async function saveAndShareWorkbook(
  wb: XLSX.WorkBook,
  fileName: string
): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'base64',
    }) as string;

    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    try {
      await Filesystem.writeFile({
        path: `Attendance/${fileName}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Scoped storage fallback
    }

    await Share.share({
      title: fileName,
      text: 'Student Attendance Excel Sheet',
      url: result.uri,
      dialogTitle: 'Open or Share Excel Sheet',
    });

    return `Saved & opened share sheet for ${fileName}`;
  }

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

  const aoa: (string | number)[][] = [
    ['STUDENT ATTENDANCE SHEET', '', '', ''],
    ['Program', program.name, 'Semester', semester.name],
    ['Subject', subject.name, 'Teacher', subject.teacherName],
    ['Date', session.date, 'Total Students', sortedStudents.length],
    ['', '', '', ''],
    ['Sr. No', 'Roll No', 'Student Name', 'Status'],
  ];

  sortedStudents.forEach((student, index) => {
    const status = session.records[student.id];
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'leave') leaveCount++;

    aoa.push([
      index + 1,
      student.rollNo || '-',
      student.name,
      formatStatusLabel(status),
    ]);
  });

  const totalMarked = presentCount + absentCount + leaveCount;
  const pct =
    totalMarked > 0 && sortedStudents.length > 0
      ? Math.round((presentCount / sortedStudents.length) * 100)
      : 0;

  aoa.push(['', '', '', '']);
  aoa.push(['SUMMARY', '', '', '']);
  aoa.push(['Present', presentCount, 'Absent', absentCount]);
  aoa.push(['Leave', leaveCount, 'Attendance %', `${pct}%`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 32 }, { wch: 18 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 6 + sortedStudents.length + 1, c: 0 }, e: { r: 6 + sortedStudents.length + 1, c: 3 } },
  ];

  ws['!rows'] = aoa.map((_, idx) => ({
    hpt: idx === 0 ? 30 : idx === 5 ? 24 : 21,
  }));

  // Style Title
  for (let c = 0; c <= 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = TITLE_STYLE;
  }

  // Style Metadata rows (1..3)
  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c <= 3; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = c % 2 === 0 ? META_LABEL_STYLE : META_VALUE_STYLE;
      }
    }
  }

  // Style Table Header (row 5)
  for (let c = 0; c <= 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 5, c });
    if (ws[addr]) ws[addr].s = TABLE_HEADER_STYLE;
  }

  // Style Student Rows
  sortedStudents.forEach((student, index) => {
    const r = 6 + index;
    const isEven = index % 2 === 0;
    const c0 = XLSX.utils.encode_cell({ r, c: 0 });
    const c1 = XLSX.utils.encode_cell({ r, c: 1 });
    const c2 = XLSX.utils.encode_cell({ r, c: 2 });
    const c3 = XLSX.utils.encode_cell({ r, c: 3 });

    if (ws[c0]) ws[c0].s = getRowCellStyle(isEven, 'center');
    if (ws[c1]) ws[c1].s = getRowCellStyle(isEven, 'center');
    if (ws[c2]) ws[c2].s = getRowCellStyle(isEven, 'left', true);
    if (ws[c3]) ws[c3].s = getStatusCellStyle(session.records[student.id]);
  });

  // Style Summary Section
  const sumHeaderRow = 6 + sortedStudents.length + 1;
  for (let c = 0; c <= 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: sumHeaderRow, c });
    if (ws[addr]) ws[addr].s = TABLE_HEADER_STYLE;
  }
  for (let r = sumHeaderRow + 1; r <= sumHeaderRow + 2; r++) {
    for (let c = 0; c <= 3; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = c % 2 === 0 ? META_LABEL_STYLE : META_VALUE_STYLE;
      }
    }
  }

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
  const sortedSessions = [...sessions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

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
  const totalCols = headerRow.length;

  const padRow = (arr: (string | number)[]) => {
    const out = [...arr];
    while (out.length < totalCols) out.push('');
    return out;
  };

  const aoa: (string | number)[][] = [
    padRow(['SUBJECT ATTENDANCE REGISTER']),
    padRow(['Program', program.name, 'Semester', semester.name]),
    padRow(['Subject', subject.name, 'Teacher', subject.teacherName]),
    padRow(['Total Classes', sortedSessions.length]),
    padRow([]),
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

    aoa.push([
      idx + 1,
      student.rollNo || '-',
      student.name,
      ...dateCells,
      p,
      a,
      l,
      pct,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
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
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  for (let c = 0; c < totalCols; c++) {
    const tAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[tAddr]) ws[tAddr].s = TITLE_STYLE;

    const hAddr = XLSX.utils.encode_cell({ r: 5, c });
    if (ws[hAddr]) ws[hAddr].s = TABLE_HEADER_STYLE;
  }

  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c < Math.min(4, totalCols); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = c % 2 === 0 ? META_LABEL_STYLE : META_VALUE_STYLE;
      }
    }
  }

  sortedStudents.forEach((student, idx) => {
    const r = 6 + idx;
    const isEven = idx % 2 === 0;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      if (c >= 3 && c < 3 + sortedSessions.length) {
        const sess = sortedSessions[c - 3];
        ws[addr].s = getStatusCellStyle(sess.records[student.id]);
      } else {
        ws[addr].s = getRowCellStyle(
          isEven,
          c === 2 ? 'left' : 'center',
          c === 2
        );
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Register');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_Register.xlsx`;

  return saveAndShareWorkbook(wb, fileName);
}
