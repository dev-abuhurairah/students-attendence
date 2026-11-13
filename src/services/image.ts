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

function getSimpleStatus(status?: AttendanceStatus): {
  label: string;
  color: string;
} {
  if (status === 'present') return { label: 'Present', color: '#059669' };
  if (status === 'absent') return { label: 'Absent', color: '#DC2626' };
  if (status === 'leave') return { label: 'Leave', color: '#D97706' };
  return { label: '-', color: '#64748B' };
}

const FONT_BASE =
  '"Plus Jakarta Sans", "Google Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// -------------------------------------------------------------
// 1. Daily Session Attendance Image
// -------------------------------------------------------------
export interface DailyImageParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  session: AttendanceSession;
  format?: 'png' | 'jpeg';
}

export function renderDailyAttendanceCanvas({
  program,
  semester,
  subject,
  students,
  session,
}: DailyImageParams): HTMLCanvasElement {
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

  const width = 840;
  const pad = 36;
  const headerH = 120;
  const tableHeaderH = 38;
  const rowH = 38;
  const footerH = 44;

  const totalHeight =
    pad + headerH + tableHeaderH + sortedStudents.length * rowH + footerH + pad;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header Title
  ctx.fillStyle = '#002B5B';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${FONT_BASE}`;
  ctx.fillText('Daily Attendance Sheet', pad, pad + 16);

  ctx.textAlign = 'right';
  ctx.font = `600 15px ${FONT_BASE}`;
  ctx.fillText(`Date: ${session.date}`, width - pad, pad + 16);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#334155';
  ctx.font = `500 14px ${FONT_BASE}`;
  ctx.fillText(
    `${program.name} (${semester.name})  •  Subject: ${subject.name}  •  Teacher: ${subject.teacherName}`,
    pad,
    pad + 48
  );

  // Summary row
  const pctStr = calculateAttendancePercentage(
    presentCount,
    sortedStudents.length || presentCount + absentCount + leaveCount
  );
  ctx.fillStyle = '#002B5B';
  ctx.font = `600 14px ${FONT_BASE}`;
  ctx.fillText(
    `Total: ${sortedStudents.length}    Present: ${presentCount}    Absent: ${absentCount}    Attendance: ${pctStr}`,
    pad,
    pad + 80
  );

  // Divider line
  const tableY = pad + headerH - 8;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, tableY);
  ctx.lineTo(width - pad, tableY);
  ctx.stroke();

  // Table Header
  ctx.fillStyle = '#002B5B';
  ctx.font = `700 13px ${FONT_BASE}`;
  ctx.fillText('Sr.', pad + 8, tableY + 20);
  ctx.fillText('Roll No', pad + 64, tableY + 20);
  ctx.fillText('Student Name', pad + 180, tableY + 20);
  ctx.textAlign = 'right';
  ctx.fillText('Status', width - pad - 12, tableY + 20);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, tableY + tableHeaderH);
  ctx.lineTo(width - pad, tableY + tableHeaderH);
  ctx.stroke();

  // Rows
  sortedStudents.forEach((stu, idx) => {
    const ry = tableY + tableHeaderH + idx * rowH;

    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${FONT_BASE}`;
    ctx.fillText(String(idx + 1), pad + 8, ry + rowH / 2);
    ctx.fillText(stu.rollNo || '-', pad + 64, ry + rowH / 2);

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 14px ${FONT_BASE}`;
    ctx.fillText(stu.name.slice(0, 36), pad + 180, ry + rowH / 2);

    const st = getSimpleStatus(session.records[stu.id]);
    ctx.fillStyle = st.color;
    ctx.font = `700 13px ${FONT_BASE}`;
    ctx.textAlign = 'right';
    ctx.fillText(st.label, width - pad - 12, ry + rowH / 2);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, ry + rowH);
    ctx.lineTo(width - pad, ry + rowH);
    ctx.stroke();
  });

  // Footer
  const footerY = tableY + tableHeaderH + sortedStudents.length * rowH + 20;
  ctx.fillStyle = '#64748B';
  ctx.font = `500 12px ${FONT_BASE}`;
  ctx.fillText('Student Attendance App', pad, footerY);
  ctx.textAlign = 'right';
  ctx.fillText('dev-abuhurairah', width - pad, footerY);
  ctx.textAlign = 'left';

  return canvas;
}

export async function exportAttendanceImage(
  params: DailyImageParams
): Promise<string> {
  const canvas = renderDailyAttendanceCanvas(params);
  const format = params.format === 'jpeg' ? 'jpeg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  const fileName = `${sanitizeFileName(params.program.name)}_${sanitizeFileName(
    params.semester.name
  )}_${sanitizeFileName(params.subject.name)}_${params.session.date}.${ext}`;

  const base64 = dataUrl.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType,
    dialogTitle: 'Save Daily Attendance Image',
  });
}

// -------------------------------------------------------------
// 2. One Subject: Full Attendance Report Image
// -------------------------------------------------------------
export interface SubjectImageParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  sessions: AttendanceSession[];
  format?: 'png' | 'jpeg';
}

export function renderSubjectReportCanvas({
  program,
  semester,
  subject,
  students,
  sessions,
}: SubjectImageParams): HTMLCanvasElement {
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  );
  const sortedSessions = [...sessions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Dynamic width based on date count (minimum 880px)
  const dateColW = 54;
  const width = Math.max(880, 480 + sortedSessions.length * dateColW);
  const pad = 36;
  const headerH = 120;
  const tableHeaderH = 40;
  const rowH = 38;
  const footerH = 44;

  const totalHeight =
    pad + headerH + tableHeaderH + sortedStudents.length * rowH + footerH + pad;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Top Title
  ctx.fillStyle = '#002B5B';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${FONT_BASE}`;
  ctx.fillText('Subject Attendance Report', pad, pad + 16);

  ctx.textAlign = 'right';
  ctx.font = `600 15px ${FONT_BASE}`;
  ctx.fillText(`Classes: ${sortedSessions.length}`, width - pad, pad + 16);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#334155';
  ctx.font = `500 14px ${FONT_BASE}`;
  ctx.fillText(
    `${program.name} (${semester.name})  •  Subject: ${subject.name}  •  Teacher: ${subject.teacherName}`,
    pad,
    pad + 48
  );

  ctx.fillStyle = '#002B5B';
  ctx.font = `600 14px ${FONT_BASE}`;
  ctx.fillText(
    `Total Students: ${sortedStudents.length}    Total Classes: ${sortedSessions.length}`,
    pad,
    pad + 80
  );

  // Table Header
  const tableY = pad + headerH - 8;
  ctx.fillStyle = '#002B5B';
  ctx.font = `700 13px ${FONT_BASE}`;
  ctx.fillText('#', pad + 8, tableY + 20);
  ctx.fillText('Roll No', pad + 40, tableY + 20);
  ctx.fillText('Student Name', pad + 120, tableY + 20);

  let dateX = pad + 320;
  sortedSessions.forEach((sess) => {
    ctx.textAlign = 'center';
    ctx.font = `600 12px ${FONT_BASE}`;
    ctx.fillText(sess.date.slice(5), dateX + dateColW / 2, tableY + 20);
    dateX += dateColW;
  });

  ctx.textAlign = 'center';
  ctx.font = `700 13px ${FONT_BASE}`;
  ctx.fillText('P', dateX + 24, tableY + 20);
  ctx.fillText('A', dateX + 64, tableY + 20);
  ctx.fillText('Total', dateX + 110, tableY + 20);
  ctx.fillText('Attendance %', dateX + 180, tableY + 20);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, tableY + tableHeaderH);
  ctx.lineTo(width - pad, tableY + tableHeaderH);
  ctx.stroke();

  // Student Rows
  sortedStudents.forEach((stu, idx) => {
    const ry = tableY + tableHeaderH + idx * rowH;

    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${FONT_BASE}`;
    ctx.fillText(String(idx + 1), pad + 8, ry + rowH / 2);
    ctx.fillText(stu.rollNo || '-', pad + 40, ry + rowH / 2);

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 14px ${FONT_BASE}`;
    ctx.fillText(stu.name.slice(0, 24), pad + 120, ry + rowH / 2);

    let p = 0;
    let a = 0;
    let colX = pad + 320;

    sortedSessions.forEach((sess) => {
      const st = sess.records[stu.id];
      ctx.textAlign = 'center';
      if (st === 'present') {
        p++;
        ctx.fillStyle = '#059669';
        ctx.font = `700 13px ${FONT_BASE}`;
        ctx.fillText('P', colX + dateColW / 2, ry + rowH / 2);
      } else {
        a++;
        ctx.fillStyle = '#DC2626';
        ctx.font = `700 13px ${FONT_BASE}`;
        ctx.fillText('A', colX + dateColW / 2, ry + rowH / 2);
      }
      colX += dateColW;
    });

    const pct = calculateAttendancePercentage(p, sortedSessions.length);
    ctx.fillStyle = '#002B5B';
    ctx.font = `600 13px ${FONT_BASE}`;
    ctx.fillText(String(p), colX + 24, ry + rowH / 2);
    ctx.fillText(String(a), colX + 64, ry + rowH / 2);
    ctx.fillText(String(sortedSessions.length), colX + 110, ry + rowH / 2);

    ctx.font = `700 13px ${FONT_BASE}`;
    ctx.fillText(pct, colX + 180, ry + rowH / 2);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, ry + rowH);
    ctx.lineTo(width - pad, ry + rowH);
    ctx.stroke();
  });

  // Footer
  const footerY = tableY + tableHeaderH + sortedStudents.length * rowH + 20;
  ctx.fillStyle = '#64748B';
  ctx.font = `500 12px ${FONT_BASE}`;
  ctx.fillText('Student Attendance App', pad, footerY);
  ctx.textAlign = 'right';
  ctx.fillText('dev-abuhurairah', width - pad, footerY);
  ctx.textAlign = 'left';

  return canvas;
}

export async function exportSubjectReportImage(
  params: SubjectImageParams
): Promise<string> {
  const canvas = renderSubjectReportCanvas(params);
  const format = params.format === 'jpeg' ? 'jpeg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  const fileName = `${sanitizeFileName(params.program.name)}_${sanitizeFileName(
    params.semester.name
  )}_${sanitizeFileName(params.subject.name)}_Report.${ext}`;

  const base64 = dataUrl.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType,
    dialogTitle: 'Save Subject Attendance Image',
  });
}

// -------------------------------------------------------------
// 3. One Semester: All Subjects Attendance Report Image
// -------------------------------------------------------------
export interface SemesterImageParams {
  program: Program;
  semester: Semester;
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
  format?: 'png' | 'jpeg';
}

export function renderSemesterReportCanvas({
  program,
  semester,
  subjects,
  students,
  sessions,
}: SemesterImageParams): HTMLCanvasElement {
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

  const totalSemesterClasses = Array.from(sessionsBySubject.values()).reduce(
    (acc, list) => acc + list.length,
    0
  );

  const subColW = 120;
  const width = Math.max(900, 420 + subjects.length * subColW + 160);
  const pad = 36;
  const headerH = 120;
  const tableHeaderH = 42;
  const rowH = 38;
  const footerH = 44;

  const totalHeight =
    pad + headerH + tableHeaderH + sortedStudents.length * rowH + footerH + pad;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header Title
  ctx.fillStyle = '#002B5B';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${FONT_BASE}`;
  ctx.fillText('Semester Attendance Report', pad, pad + 16);

  ctx.textAlign = 'right';
  ctx.font = `600 15px ${FONT_BASE}`;
  ctx.fillText(`Total Classes: ${totalSemesterClasses}`, width - pad, pad + 16);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#334155';
  ctx.font = `500 14px ${FONT_BASE}`;
  ctx.fillText(
    `${program.name}  •  ${semester.name}  •  ${subjects.length} Subjects`,
    pad,
    pad + 48
  );

  ctx.fillStyle = '#002B5B';
  ctx.font = `600 14px ${FONT_BASE}`;
  ctx.fillText(
    `Total Students: ${sortedStudents.length}    Total Subjects: ${subjects.length}`,
    pad,
    pad + 80
  );

  // Table Header
  const tableY = pad + headerH - 8;
  ctx.fillStyle = '#002B5B';
  ctx.font = `700 13px ${FONT_BASE}`;
  ctx.fillText('#', pad + 8, tableY + 20);
  ctx.fillText('Roll No', pad + 40, tableY + 20);
  ctx.fillText('Student Name', pad + 120, tableY + 20);

  let colX = pad + 300;
  subjects.forEach((sub) => {
    ctx.textAlign = 'center';
    ctx.font = `700 12px ${FONT_BASE}`;
    ctx.fillText(sub.name.slice(0, 16), colX + subColW / 2, tableY + 14);
    ctx.font = `500 10px ${FONT_BASE}`;
    ctx.fillText('(P / Total / %)', colX + subColW / 2, tableY + 28);
    colX += subColW;
  });

  ctx.textAlign = 'center';
  ctx.font = `700 13px ${FONT_BASE}`;
  ctx.fillText('Overall (P / Tot)', colX + 70, tableY + 14);
  ctx.fillText('Overall %', colX + 70, tableY + 28);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, tableY + tableHeaderH);
  ctx.lineTo(width - pad, tableY + tableHeaderH);
  ctx.stroke();

  // Rows
  sortedStudents.forEach((stu, idx) => {
    const ry = tableY + tableHeaderH + idx * rowH;

    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${FONT_BASE}`;
    ctx.fillText(String(idx + 1), pad + 8, ry + rowH / 2);
    ctx.fillText(stu.rollNo || '-', pad + 40, ry + rowH / 2);

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 14px ${FONT_BASE}`;
    ctx.fillText(stu.name.slice(0, 22), pad + 120, ry + rowH / 2);

    let overallP = 0;
    let overallTot = 0;
    let currX = pad + 300;

    subjects.forEach((sub) => {
      const subSessions = sessionsBySubject.get(sub.id) || [];
      let p = 0;
      subSessions.forEach((sess) => {
        if (sess.records[stu.id] === 'present') p++;
      });
      const tot = subSessions.length;
      overallP += p;
      overallTot += tot;

      const pct = calculateAttendancePercentage(p, tot);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#002B5B';
      ctx.font = `500 12px ${FONT_BASE}`;
      ctx.fillText(`${p}/${tot} (${pct})`, currX + subColW / 2, ry + rowH / 2);
      currX += subColW;
    });

    const overallPct = calculateAttendancePercentage(overallP, overallTot);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#002B5B';
    ctx.font = `700 13px ${FONT_BASE}`;
    ctx.fillText(`${overallP}/${overallTot}  ${overallPct}`, currX + 70, ry + rowH / 2);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, ry + rowH);
    ctx.lineTo(width - pad, ry + rowH);
    ctx.stroke();
  });

  // Footer
  const footerY = tableY + tableHeaderH + sortedStudents.length * rowH + 20;
  ctx.fillStyle = '#64748B';
  ctx.font = `500 12px ${FONT_BASE}`;
  ctx.fillText('Student Attendance App', pad, footerY);
  ctx.textAlign = 'right';
  ctx.fillText('dev-abuhurairah', width - pad, footerY);
  ctx.textAlign = 'left';

  return canvas;
}

export async function exportSemesterReportImage(
  params: SemesterImageParams
): Promise<string> {
  const canvas = renderSemesterReportCanvas(params);
  const format = params.format === 'jpeg' ? 'jpeg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const dataUrl = canvas.toDataURL(mimeType, 0.95);

  const fileName = `${sanitizeFileName(params.program.name)}_${sanitizeFileName(
    params.semester.name
  )}_All_Subjects_Report.${ext}`;

  const base64 = dataUrl.split(',')[1] || '';

  return saveFileToMobile({
    fileName,
    base64Data: base64,
    mimeType,
    dialogTitle: 'Save Semester Attendance Image',
  });
}
