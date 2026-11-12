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

function getSimpleStatus(status?: AttendanceStatus): {
  label: string;
  color: string;
} {
  if (status === 'present') return { label: 'Present', color: '#059669' };
  if (status === 'absent') return { label: 'Absent', color: '#DC2626' };
  if (status === 'leave') return { label: 'Leave', color: '#D97706' };
  return { label: '-', color: '#64748B' };
}

export interface AttendanceImageParams {
  program: Program;
  semester: Semester;
  subject: Subject;
  students: Student[];
  session: AttendanceSession;
}

export function renderAttendanceCanvas({
  program,
  semester,
  subject,
  students,
  session,
}: AttendanceImageParams): HTMLCanvasElement {
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

  const width = 820;
  const pad = 36;
  const headerH = 126;
  const tableHeaderH = 40;
  const rowH = 40;
  const footerH = 34;

  const totalHeight =
    pad + headerH + tableHeaderH + sortedStudents.length * rowH + footerH + pad;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }
  ctx.scale(scale, scale);

  const fontBase =
    '"Plus Jakarta Sans", "Google Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Pure white background for maximum readability
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Simple Clean Header
  ctx.fillStyle = '#002B5B';
  ctx.textBaseline = 'middle';
  ctx.font = `700 24px ${fontBase}`;
  ctx.fillText('Attendance Sheet', pad, pad + 16);

  ctx.textAlign = 'right';
  ctx.font = `600 16px ${fontBase}`;
  ctx.fillText(session.date, width - pad, pad + 16);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#334155';
  ctx.font = `500 15px ${fontBase}`;
  ctx.fillText(
    `${program.name} (${semester.name})  •  ${subject.name}  •  ${subject.teacherName}`,
    pad,
    pad + 48
  );

  // Simple 1-line summary
  ctx.fillStyle = '#002B5B';
  ctx.font = `600 15px ${fontBase}`;
  ctx.fillText(
    `Total: ${sortedStudents.length}    Present: ${presentCount}    Absent: ${absentCount}    Leave: ${leaveCount}`,
    pad,
    pad + 82
  );

  // Divider line
  const tableY = pad + headerH - 12;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, tableY);
  ctx.lineTo(width - pad, tableY);
  ctx.stroke();

  // Simple Table Header
  ctx.fillStyle = '#002B5B';
  ctx.font = `700 14px ${fontBase}`;
  ctx.fillText('#', pad + 8, tableY + 22);
  ctx.fillText('Roll No', pad + 64, tableY + 22);
  ctx.fillText('Student Name', pad + 190, tableY + 22);
  ctx.textAlign = 'right';
  ctx.fillText('Status', width - pad - 8, tableY + 22);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, tableY + tableHeaderH);
  ctx.lineTo(width - pad, tableY + tableHeaderH);
  ctx.stroke();

  // Simple Rows
  sortedStudents.forEach((stu, idx) => {
    const ry = tableY + tableHeaderH + idx * rowH;

    ctx.fillStyle = '#475569';
    ctx.font = `500 14px ${fontBase}`;
    ctx.fillText(String(idx + 1), pad + 8, ry + rowH / 2);
    ctx.fillText(stu.rollNo || '-', pad + 64, ry + rowH / 2);

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 15px ${fontBase}`;
    ctx.fillText(stu.name.slice(0, 40), pad + 190, ry + rowH / 2);

    const st = getSimpleStatus(session.records[stu.id]);
    ctx.fillStyle = st.color;
    ctx.font = `700 14px ${fontBase}`;
    ctx.textAlign = 'right';
    ctx.fillText(st.label, width - pad - 8, ry + rowH / 2);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, ry + rowH);
    ctx.lineTo(width - pad, ry + rowH);
    ctx.stroke();
  });

  return canvas;
}

export async function exportAttendanceImage(
  params: AttendanceImageParams
): Promise<string> {
  const canvas = renderAttendanceCanvas(params);
  const dataUrl = canvas.toDataURL('image/png');
  const fileName = `${sanitizeFileName(params.program.name)}_${sanitizeFileName(
    params.semester.name
  )}_${sanitizeFileName(params.subject.name)}_${params.session.date}.png`;

  if (Capacitor.isNativePlatform()) {
    const base64 = dataUrl.split(',')[1] ?? '';

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
      text: 'Student Attendance Sheet Image',
      url: result.uri,
      dialogTitle: 'Open or Share Attendance Image',
    });

    return `Saved & opened share sheet for ${fileName}`;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return `Downloaded ${fileName}`;
}
