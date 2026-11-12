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

function getStatusInfo(status?: AttendanceStatus): {
  label: string;
  bg: string;
  fg: string;
} {
  if (status === 'present') {
    return { label: 'Present', bg: '#D1FAE5', fg: '#065F46' };
  }
  if (status === 'absent') {
    return { label: 'Absent', bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (status === 'leave') {
    return { label: 'Leave', bg: '#FEF3C7', fg: '#92400E' };
  }
  return { label: 'Not Marked', bg: '#F1F5F9', fg: '#475569' };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
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

  const pct =
    sortedStudents.length > 0
      ? Math.round((presentCount / sortedStudents.length) * 100)
      : 0;

  const width = 960;
  const padding = 40;
  const headerHeight = 190;
  const summaryHeight = 64;
  const tableHeaderHeight = 46;
  const rowHeight = 48;
  const footerHeight = 50;

  const totalHeight =
    padding * 2 +
    headerHeight +
    20 +
    summaryHeight +
    20 +
    tableHeaderHeight +
    sortedStudents.length * rowHeight +
    footerHeight;

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

  // Background
  ctx.fillStyle = '#F8FAFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header Card
  const cardW = width - padding * 2;
  ctx.fillStyle = '#6495ED';
  drawRoundedRect(ctx, padding, padding, cardW, headerHeight, 28);
  ctx.fill();

  ctx.fillStyle = '#002B5B';
  ctx.font = `700 28px ${fontBase}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('STUDENT ATTENDANCE SHEET', padding + 32, padding + 44);

  ctx.font = `600 18px ${fontBase}`;
  ctx.fillText(
    `${program.name}  •  ${semester.name}`,
    padding + 32,
    padding + 86
  );

  ctx.font = `500 17px ${fontBase}`;
  ctx.fillText(`Subject: ${subject.name}`, padding + 32, padding + 120);
  ctx.fillText(`Teacher: ${subject.teacherName}`, padding + 32, padding + 150);

  ctx.textAlign = 'right';
  ctx.font = `600 17px ${fontBase}`;
  ctx.fillText(`Date: ${session.date}`, padding + cardW - 32, padding + 44);
  ctx.fillText(
    `Total: ${sortedStudents.length}`,
    padding + cardW - 32,
    padding + 150
  );
  ctx.textAlign = 'left';

  // Summary Bar
  const summaryY = padding + headerHeight + 20;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, padding, summaryY, cardW, summaryHeight, 20);
  ctx.fill();

  const summaryItems = [
    { label: `Present: ${presentCount}`, bg: '#D1FAE5', fg: '#065F46' },
    { label: `Absent: ${absentCount}`, bg: '#FEE2E2', fg: '#991B1B' },
    { label: `Leave: ${leaveCount}`, bg: '#FEF3C7', fg: '#92400E' },
    { label: `Attendance: ${pct}%`, bg: '#E0EAFF', fg: '#002B5B' },
  ];

  const pillGap = 14;
  const pillW = (cardW - 32 - pillGap * 3) / 4;
  summaryItems.forEach((item, idx) => {
    const px = padding + 16 + idx * (pillW + pillGap);
    const py = summaryY + 12;
    ctx.fillStyle = item.bg;
    drawRoundedRect(ctx, px, py, pillW, 40, 20);
    ctx.fill();

    ctx.fillStyle = item.fg;
    ctx.font = `600 15px ${fontBase}`;
    ctx.textAlign = 'center';
    ctx.fillText(item.label, px + pillW / 2, py + 20);
  });
  ctx.textAlign = 'left';

  // Table Container
  const tableY = summaryY + summaryHeight + 20;
  const tableH = tableHeaderHeight + sortedStudents.length * rowHeight;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, padding, tableY, cardW, tableH, 20);
  ctx.fill();

  // Table Header
  ctx.fillStyle = '#002B5B';
  drawRoundedRect(ctx, padding, tableY, cardW, tableHeaderHeight, 20);
  ctx.fill();
  ctx.fillRect(padding, tableY + 20, cardW, tableHeaderHeight - 20);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 15px ${fontBase}`;
  ctx.fillText('Sr.', padding + 24, tableY + 24);
  ctx.fillText('Roll No', padding + 95, tableY + 24);
  ctx.fillText('Student Name', padding + 240, tableY + 24);
  ctx.textAlign = 'center';
  ctx.fillText('Status', padding + cardW - 95, tableY + 24);
  ctx.textAlign = 'left';

  // Table Rows
  sortedStudents.forEach((stu, idx) => {
    const ry = tableY + tableHeaderHeight + idx * rowHeight;
    if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFF';
      ctx.fillRect(padding, ry, cardW, rowHeight);
    }

    ctx.fillStyle = '#002B5B';
    ctx.font = `500 15px ${fontBase}`;
    ctx.fillText(String(idx + 1), padding + 24, ry + rowHeight / 2);
    ctx.fillText(stu.rollNo || '-', padding + 95, ry + rowHeight / 2);
    ctx.font = `600 15px ${fontBase}`;
    ctx.fillText(stu.name.slice(0, 38), padding + 240, ry + rowHeight / 2);

    const st = getStatusInfo(session.records[stu.id]);
    const badgeW = 120;
    const badgeH = 30;
    const badgeX = padding + cardW - 95 - badgeW / 2;
    const badgeY = ry + (rowHeight - badgeH) / 2;

    ctx.fillStyle = st.bg;
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
    ctx.fill();

    ctx.fillStyle = st.fg;
    ctx.font = `600 13px ${fontBase}`;
    ctx.textAlign = 'center';
    ctx.fillText(st.label, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = `500 13px ${fontBase}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `Generated by Student Attendance App`,
    width / 2,
    totalHeight - padding / 2 - 4
  );
  ctx.textAlign = 'left';

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

  // Web download fallback
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return `Downloaded ${fileName}`;
}
