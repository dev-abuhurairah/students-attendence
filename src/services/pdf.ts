import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const pct =
    sortedStudents.length > 0
      ? Math.round((presentCount / sortedStudents.length) * 100)
      : 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Top Colored Header Banner
  doc.setFillColor(0, 43, 91); // #002B5B
  doc.roundedRect(14, 12, pageW - 28, 34, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('STUDENT ATTENDANCE REPORT', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${program.name}  •  ${semester.name}`, 20, 29);
  doc.text(`Subject: ${subject.name}   |   Teacher: ${subject.teacherName}`, 20, 35);
  doc.text(`Date: ${session.date}`, pageW - 20, 22, { align: 'right' });
  doc.text(`Students: ${sortedStudents.length}`, pageW - 20, 29, { align: 'right' });

  // Colored Summary Stat Boxes
  const stats = [
    { label: 'Present', value: String(presentCount), fill: [209, 250, 229], text: [6, 95, 70] },
    { label: 'Absent', value: String(absentCount), fill: [254, 226, 226], text: [153, 27, 27] },
    { label: 'Leave', value: String(leaveCount), fill: [254, 243, 199], text: [146, 64, 14] },
    { label: 'Attendance', value: `${pct}%`, fill: [224, 234, 255], text: [0, 43, 91] },
  ] as const;

  const boxGap = 4;
  const boxW = (pageW - 28 - boxGap * 3) / 4;
  stats.forEach((st, idx) => {
    const bx = 14 + idx * (boxW + boxGap);
    doc.setFillColor(st.fill[0], st.fill[1], st.fill[2]);
    doc.roundedRect(bx, 50, boxW, 16, 3, 3, 'F');

    doc.setTextColor(st.text[0], st.text[1], st.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(st.value, bx + boxW / 2, 57, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(st.label, bx + boxW / 2, 62.5, { align: 'center' });
  });

  // Colored & Formatted Table
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
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [100, 149, 237], // #6495ED
      textColor: [0, 43, 91],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'left' },
      3: { halign: 'center', cellWidth: 34, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === 'Present') {
          data.cell.styles.fillColor = [209, 250, 229];
          data.cell.styles.textColor = [6, 95, 70];
        } else if (val === 'Absent') {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
        } else if (val === 'Leave') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
        }
      }
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Student Attendance App  •  Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const fileName = `${sanitizeFileName(program.name)}_${sanitizeFileName(
    semester.name
  )}_${sanitizeFileName(subject.name)}_${session.date}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1] ?? '';

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
      text: 'Student Attendance PDF Report',
      url: result.uri,
      dialogTitle: 'Open or Share PDF Report',
    });

    return `Saved & opened share sheet for ${fileName}`;
  }

  doc.save(fileName);
  return `Downloaded ${fileName}`;
}
