import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export interface AttendancePdfParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  session: AttendanceSession;
}

export async function exportAttendancePdf({
  program,
  semester,
  subject,
  students,
  session,
}: AttendancePdfParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  sortedStudents.forEach((s) => {
    const st = session.records[s.id];
    if (st === 'present') presentCount++;
    else if (st === 'absent') absentCount++;
    else if (st === 'leave') leaveCount++;
  });

  const pct = calculateAttendancePercentage(
    presentCount,
    sortedStudents.length || presentCount + absentCount + leaveCount
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Top Header Banner
  doc.setFillColor(0, 43, 91); // #002B5B
  doc.roundedRect(14, 12, pageW - 28, 34, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DAILY ATTENDANCE REPORT', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${program.name}  •  ${semester.name}`, 20, 29);
  doc.text(`Subject: ${subject.name}   |   Teacher: ${subject.teacherName}`, 20, 35);
  doc.text(`Date: ${session.date}`, pageW - 20, 22, { align: 'right' });
  doc.text(`Students: ${sortedStudents.length}`, pageW - 20, 29, { align: 'right' });

  // Summary Stat Boxes
  const stats = [
    { label: 'Present', value: String(presentCount), fill: [209, 250, 229], text: [6, 95, 70] },
    { label: 'Absent', value: String(absentCount), fill: [254, 226, 226], text: [153, 27, 27] },
    { label: 'Leave', value: String(leaveCount), fill: [254, 243, 199], text: [146, 64, 14] },
    { label: 'Attendance', value: pct, fill: [224, 234, 255], text: [0, 43, 91] },
  ] as const;

  const boxGap = 4;
  const boxW = (pageW - 28 - boxGap * 3) / 4;
  stats.forEach((st, idx) => {
    const bx = 14 + idx * (boxW + boxGap);
    doc.setFillColor(st.fill[0], st.fill[1], st.fill[2]);
    doc.roundedRect(bx, 50, boxW, 16, 3, 3, 'F');

    doc.setTextColor(st.text[0], st.text[1], st.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(st.value, bx + boxW / 2, 57, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(st.label, bx + boxW / 2, 62.5, { align: 'center' });
  });

  // Table
  autoTable(doc, {
    startY: 71,
    margin: { left: 14, right: 14 },
    head: [['Sr.', 'Roll No', 'Student Name', 'Status']],
    body: sortedStudents.map((stu, idx) => [
      String(idx + 1),
      stu.rollNo || '-',
      stu.name,
      formatStatusLabel(session.records[stu.id]),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [100, 149, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 32, halign: 'center' },
      2: { halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    didParseCell(dataHook) {
      if (dataHook.section === 'body' && dataHook.column.index === 3) {
        const txt = String(dataHook.cell.raw);
        if (txt === 'Present') {
          dataHook.cell.styles.fillColor = [209, 250, 229];
          dataHook.cell.styles.textColor = [6, 95, 70];
        } else if (txt === 'Absent') {
          dataHook.cell.styles.fillColor = [254, 226, 226];
          dataHook.cell.styles.textColor = [153, 27, 27];
        } else if (txt === 'Leave') {
          dataHook.cell.styles.fillColor = [254, 243, 199];
          dataHook.cell.styles.textColor = [146, 64, 14];
        }
      }
    },
  });

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_${session.date}.pdf`;

  const pdfOutput = doc.output('datauristring');
  const base64 = pdfOutput.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType: 'application/pdf',
    dialogTitle: 'Save Daily Attendance PDF',
  });
}

export interface SubjectPdfParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  sessions: AttendanceSession[];
}

/**
 * Subject Attendance Report (PDF):
 * - Student name and roll number
 * - Attendance for every date (P or A)
 * - Total classes, total present, total absent
 * - Attendance percentage of every student (2 decimal places)
 */
export async function exportSubjectAttendancePdf({
  program,
  semester,
  subject,
  students,
  sessions,
}: SubjectPdfParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );
  const sortedSessions = [...sessions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Use landscape if there are 4 or more dates to ensure comfortable columns
  const orientation = sortedSessions.length >= 4 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(0, 43, 91);
  doc.roundedRect(12, 10, pageW - 24, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SUBJECT ATTENDANCE REPORT', 18, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${program.name}  •  ${semester.name}`, 18, 25);
  doc.text(`Subject: ${subject.name}   |   Teacher: ${subject.teacherName}`, 18, 31);
  doc.text(`Total Classes: ${sortedSessions.length}`, pageW - 18, 19, { align: 'right' });
  doc.text(`Total Students: ${sortedStudents.length}`, pageW - 18, 25, { align: 'right' });

  // Build Table Columns
  const headers = [
    'Sr.',
    'Roll No',
    'Student Name',
    ...sortedSessions.map((s) => s.date.slice(5)), // MM-DD
    'Classes',
    'Present',
    'Absent',
    'Pct %',
  ];

  const body = sortedStudents.map((stu, idx) => {
    let p = 0;
    let a = 0;
    const dateMarks = sortedSessions.map((sess) => {
      const st = sess.records[stu.id];
      if (st === 'present') p++;
      else a++;
      return formatStatusShort(st);
    });
    const pct = calculateAttendancePercentage(p, sortedSessions.length);

    return [
      String(idx + 1),
      stu.rollNo || '-',
      stu.name,
      ...dateMarks,
      String(sortedSessions.length),
      String(p),
      String(a),
      pct,
    ];
  });

  autoTable(doc, {
    startY: 43,
    margin: { left: 12, right: 12 },
    head: [headers],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      halign: 'center',
    },
    headStyles: {
      fillColor: [100, 149, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { halign: 'left', fontStyle: 'bold' },
      [headers.length - 1]: { fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    didParseCell(dataHook) {
      if (dataHook.section === 'body') {
        const val = String(dataHook.cell.raw);
        if (val === 'P') {
          dataHook.cell.styles.textColor = [6, 95, 70];
          dataHook.cell.styles.fontStyle = 'bold';
        } else if (val === 'A') {
          dataHook.cell.styles.textColor = [153, 27, 27];
          dataHook.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_Full_Report.pdf`;

  const pdfOutput = doc.output('datauristring');
  const base64 = pdfOutput.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType: 'application/pdf',
    dialogTitle: 'Save Subject Attendance PDF',
  });
}

export interface SemesterPdfParams {
  program: Program;
  semester: Semester;
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
}

/**
 * Semester Attendance Report (PDF):
 * - Student name and roll number
 * - Present, absent, and total classes for each subject
 * - Attendance percentage of every student for each subject and overall (2 decimal places)
 */
export async function exportSemesterAttendancePdf({
  program,
  semester,
  subjects,
  students,
  sessions,
}: SemesterPdfParams): Promise<string> {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );

  const sessionsBySubject = new Map<string, AttendanceSession[]>();
  subjects.forEach((sub) => {
    sessionsBySubject.set(
      sub.id,
      sessions.filter((s) => s.subjectId === sub.id)
    );
  });

  const totalClassesAcrossSemester = Array.from(sessionsBySubject.values()).reduce(
    (acc, list) => acc + list.length,
    0
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Top Banner
  doc.setFillColor(0, 43, 91);
  doc.roundedRect(12, 10, pageW - 24, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SEMESTER ATTENDANCE REPORT (ALL SUBJECTS)', 18, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${program.name}  •  ${semester.name}`, 18, 25);
  doc.text(
    `Total Subjects: ${subjects.length}   |   Total Classes Held: ${totalClassesAcrossSemester}`,
    18,
    31
  );
  doc.text(`Total Students: ${sortedStudents.length}`, pageW - 18, 19, { align: 'right' });

  // Build table headers
  const headers = [
    'Sr.',
    'Roll No',
    'Student Name',
    ...subjects.map((sub) => `${sub.name.slice(0, 16)}\n(P / Total / %)`),
    'Overall\n(Present / Total)',
    'Overall %',
  ];

  const body = sortedStudents.map((stu, idx) => {
    let overallP = 0;
    let overallTotal = 0;

    const subjectCells = subjects.map((sub) => {
      const subSessions = sessionsBySubject.get(sub.id) || [];
      let p = 0;
      subSessions.forEach((sess) => {
        if (sess.records[stu.id] === 'present') p++;
      });
      const tot = subSessions.length;
      overallP += p;
      overallTotal += tot;

      const pct = calculateAttendancePercentage(p, tot);
      return `${p} / ${tot} (${pct})`;
    });

    const overallPct = calculateAttendancePercentage(overallP, overallTotal);

    return [
      String(idx + 1),
      stu.rollNo || '-',
      stu.name,
      ...subjectCells,
      `${overallP} / ${overallTotal}`,
      overallPct,
    ];
  });

  autoTable(doc, {
    startY: 43,
    margin: { left: 12, right: 12 },
    head: [headers],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      halign: 'center',
    },
    headStyles: {
      fillColor: [100, 149, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { halign: 'left', fontStyle: 'bold' },
      [headers.length - 1]: { fontStyle: 'bold', textColor: [0, 43, 91] },
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
  });

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_All_Subjects_Report.pdf`;

  const pdfOutput = doc.output('datauristring');
  const base64 = pdfOutput.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType: 'application/pdf',
    dialogTitle: 'Save Semester Attendance PDF',
  });
}
