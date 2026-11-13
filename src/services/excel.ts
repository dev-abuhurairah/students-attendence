import XLSX from 'xlsx-js-style';
import { Capacitor } from '@capacitor/core';
import type {
  AttendanceSession,
  AttendanceStatus,
  Program,
  Semester,
  Student,
  Subject,
} from '../types/attendance';
import { calculateAttendancePercentage } from './storage';
import { saveFileToMobile } from './fileSaver';

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
  font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
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

const SECTION_HEADER_STYLE = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '002B5B' } },
  fill: { fgColor: { rgb: 'D0E1FD' } },
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

async function exportWorkbookToFile(
  wb: XLSX.WorkBook,
  fileName: string
): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'base64',
    }) as string;

    return saveFileToMobile({
      fileName,
      base64Data: base64,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Save Attendance Excel Report',
    });
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
    ['STUDENT DAILY ATTENDANCE SHEET', '', '', ''],
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
  const pctStr = calculateAttendancePercentage(presentCount, sortedStudents.length || totalMarked);

  aoa.push(['', '', '', '']);
  aoa.push(['SUMMARY', '', '', '']);
  aoa.push(['Present', presentCount, 'Absent', absentCount]);
  aoa.push(['Leave', leaveCount, 'Attendance %', pctStr]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 32 }, { wch: 18 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    {
      s: { r: 6 + sortedStudents.length + 1, c: 0 },
      e: { r: 6 + sortedStudents.length + 1, c: 3 },
    },
  ];

  for (let c = 0; c <= 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = TITLE_STYLE;
  }

  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c <= 3; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = c % 2 === 0 ? META_LABEL_STYLE : META_VALUE_STYLE;
      }
    }
  }

  for (let c = 0; c <= 3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 5, c });
    if (ws[addr]) ws[addr].s = TABLE_HEADER_STYLE;
  }

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
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_${session.date}.xlsx`;

  return exportWorkbookToFile(wb, fileName);
}

export interface RegisterExcelParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  sessions: AttendanceSession[];
}

/**
 * Subject Attendance Report (Excel):
 * - Student name and roll number
 * - Attendance for every date (P or A)
 * - Total classes, total present, total absent
 * - Attendance percentage of every student with 2 decimal places
 */
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
    'Total Classes',
    'Total Present',
    'Total Absent',
    'Attendance %',
  ];
  const totalCols = headerRow.length;

  const padRow = (arr: (string | number)[]) => {
    const out = [...arr];
    while (out.length < totalCols) out.push('');
    return out;
  };

  const aoa: (string | number)[][] = [
    padRow(['SUBJECT ATTENDANCE REPORT']),
    padRow(['Program', program.name, 'Semester', semester.name]),
    padRow(['Subject', subject.name, 'Teacher', subject.teacherName]),
    padRow(['Total Classes Held', sortedSessions.length, 'Total Students', sortedStudents.length]),
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

    const totalClasses = sortedSessions.length;
    const pct = calculateAttendancePercentage(p, totalClasses);

    aoa.push([
      idx + 1,
      student.rollNo || '-',
      student.name,
      ...dateCells,
      totalClasses,
      p,
      a + l, // Total absent (including unexcused)
      pct,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
    ...sortedSessions.map(() => ({ wch: 12 })),
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
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

  sortedStudents.forEach((_, idx) => {
    const r = 6 + idx;
    const isEven = idx % 2 === 0;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      if (c >= 3 && c < 3 + sortedSessions.length) {
        const sess = sortedSessions[c - 3];
        ws[addr].s = getStatusCellStyle(sess.records[sortedStudents[idx].id]);
      } else {
        ws[addr].s = getRowCellStyle(
          isEven,
          c === 2 ? 'left' : 'center',
          c === 2 || c === totalCols - 1
        );
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Subject Report');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_Register.xlsx`;

  return exportWorkbookToFile(wb, fileName);
}

export interface SemesterExcelParams {
  program: Program;
  semester: Semester;
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
}

/**
 * Semester Attendance Report (Excel):
 * - Student name and roll number
 * - Present, absent, and total classes for each subject
 * - Attendance percentage of every student for each subject and overall (2 decimal places)
 */
export async function exportSemesterAttendanceExcel({
  program,
  semester,
  subjects,
  students,
  sessions,
}: SemesterExcelParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );

  // Group sessions by subject
  const sessionsBySubject = new Map<string, AttendanceSession[]>();
  subjects.forEach((sub) => {
    sessionsBySubject.set(
      sub.id,
      sessions.filter((s) => s.subjectId === sub.id)
    );
  });

  // Calculate total classes across semester
  const totalSemesterClasses = Array.from(sessionsBySubject.values()).reduce(
    (sum, list) => sum + list.length,
    0
  );

  // Header row 1: Top group headers
  const row5: (string | number)[] = ['Sr.', 'Roll No', 'Student Name'];
  subjects.forEach((sub) => {
    row5.push(sub.name, '', '', '');
  });
  row5.push('OVERALL SUMMARY', '', '', '');

  // Header row 2: Sub-headers
  const row6: (string | number)[] = ['#', 'Roll No', 'Name'];
  subjects.forEach(() => {
    row6.push('Present', 'Absent', 'Total', 'Pct %');
  });
  row6.push('Total Present', 'Total Absent', 'Total Classes', 'Overall %');

  const totalCols = row6.length;

  const padRow = (arr: (string | number)[]) => {
    const out = [...arr];
    while (out.length < totalCols) out.push('');
    return out;
  };

  const aoa: (string | number)[][] = [
    padRow(['SEMESTER ATTENDANCE REPORT']),
    padRow(['Program', program.name, 'Semester', semester.name]),
    padRow(['Total Subjects', subjects.length, 'Total Classes Held', totalSemesterClasses]),
    padRow(['Total Students', sortedStudents.length]),
    padRow([]),
    row5,
    row6,
  ];

  sortedStudents.forEach((student, idx) => {
    const studentRow: (string | number)[] = [
      idx + 1,
      student.rollNo || '-',
      student.name,
    ];

    let overallPresent = 0;
    let overallAbsent = 0;
    let overallTotal = 0;

    subjects.forEach((sub) => {
      const subSessions = sessionsBySubject.get(sub.id) || [];
      let p = 0;
      let a = 0;

      subSessions.forEach((sess) => {
        const st = sess.records[student.id];
        if (st === 'present') p++;
        else a++; // Absent or leave
      });

      const total = subSessions.length;
      const pct = calculateAttendancePercentage(p, total);

      studentRow.push(p, a, total, pct);

      overallPresent += p;
      overallAbsent += a;
      overallTotal += total;
    });

    const overallPct = calculateAttendancePercentage(overallPresent, overallTotal);
    studentRow.push(overallPresent, overallAbsent, overallTotal, overallPct);

    aoa.push(studentRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  const colWidths: { wch: number }[] = [{ wch: 8 }, { wch: 14 }, { wch: 28 }];
  subjects.forEach(() => {
    colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 });
  });
  colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 });
  ws['!cols'] = colWidths;

  // Merges for header groups
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
  ];
  let currCol = 3;
  subjects.forEach(() => {
    merges.push({ s: { r: 5, c: currCol }, e: { r: 5, c: currCol + 3 } });
    currCol += 4;
  });
  merges.push({ s: { r: 5, c: currCol }, e: { r: 5, c: currCol + 3 } });
  ws['!merges'] = merges;

  // Title styling
  for (let c = 0; c < totalCols; c++) {
    const tAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[tAddr]) ws[tAddr].s = TITLE_STYLE;
  }

  // Metadata styling
  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c < Math.min(4, totalCols); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        ws[addr].s = c % 2 === 0 ? META_LABEL_STYLE : META_VALUE_STYLE;
      }
    }
  }

  // Row 5 group header styling
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 5, c });
    if (ws[addr]) ws[addr].s = SECTION_HEADER_STYLE;
  }

  // Row 6 subheader styling
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 6, c });
    if (ws[addr]) ws[addr].s = TABLE_HEADER_STYLE;
  }

  // Rows styling
  sortedStudents.forEach((_, idx) => {
    const r = 7 + idx;
    const isEven = idx % 2 === 0;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      ws[addr].s = getRowCellStyle(
        isEven,
        c === 2 ? 'left' : 'center',
        c === 2 || c === totalCols - 1
      );
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Semester Report');

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_All_Subjects_Report.xlsx`;

  return exportWorkbookToFile(wb, fileName);
}
