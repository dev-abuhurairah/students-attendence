import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppData,
  AttendanceSession,
  AttendanceStatus,
  Program,
  Semester,
  Subject,
} from '../types/attendance';
import { getTodayISO } from '../services/storage';
import { exportDailyAttendanceExcel } from '../services/excel';
import { exportAttendanceImage } from '../services/image';
import { exportAttendancePdf } from '../services/pdf';
import { Header } from '../components/Header';

interface AttendanceViewProps {
  data: AppData;
  program: Program;
  semester: Semester;
  subject: Subject;
  onSaveSession: (session: AttendanceSession) => Promise<void> | void;
  onBack: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  data,
  program,
  semester,
  subject,
  onSaveSession,
  onBack,
}) => {
  const [date, setDate] = useState<string>(getTodayISO());
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Filter students for this program & semester
  const students = useMemo(
    () =>
      data.students
        .filter(
          (s) => s.programId === program.id && s.semesterId === semester.id
        )
        .sort((a, b) =>
          a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
        ),
    [data.students, program.id, semester.id]
  );

  // Check if attendance already exists for this subject + date
  const sessionId = `${subject.id}__${date}`;
  const existingSession = useMemo(
    () => data.sessions.find((s) => s.subjectId === subject.id && s.date === date),
    [data.sessions, subject.id, date]
  );

  const [draftRecords, setDraftRecords] = useState<Record<string, AttendanceStatus>>(
    () => existingSession?.records ?? {}
  );

  // When date changes or data updates, open existing attendance for editing without duplicates
  useEffect(() => {
    setDraftRecords(existingSession?.records ?? {});
  }, [date, existingSession]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = (text: string, isError = false) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setStatusMessage({ text, isError });
    timerRef.current = window.setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setDate(newDate);
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setDraftRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((stu) => {
      next[stu.id] = 'present';
    });
    setDraftRecords(next);
  };

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    students.forEach((stu) => {
      const st = draftRecords[stu.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'leave') leave++;
    });
    return { present, absent, leave };
  }, [draftRecords, students]);

  const buildSession = (): AttendanceSession => ({
    id: sessionId,
    programId: program.id,
    semesterId: semester.id,
    subjectId: subject.id,
    date,
    records: draftRecords,
    updatedAt: Date.now(),
  });

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      showToast('Cannot save attendance: No students added yet.', true);
      return;
    }

    try {
      const session = buildSession();
      await onSaveSession(session);
      showToast('Attendance saved successfully.');
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Failed to save attendance: ${err.message}`
          : 'Failed to save attendance. Please try again.',
        true
      );
    }
  };

  const handleExportDaily = async (format: 'excel' | 'pdf' | 'image') => {
    if (students.length === 0) {
      showToast('No students to export attendance for.', true);
      return;
    }

    const session = buildSession();
    try {
      await onSaveSession(session);
    } catch {
      // Continue to export
    }

    setExporting(true);
    try {
      let msg = '';
      if (format === 'excel') {
        msg = await exportDailyAttendanceExcel({
          program,
          semester,
          subject,
          students,
          session,
        });
      } else if (format === 'pdf') {
        msg = await exportAttendancePdf({
          program,
          semester,
          subject,
          students,
          session,
        });
      } else {
        msg = await exportAttendanceImage({
          program,
          semester,
          subject,
          students,
          session,
        });
      }
      showToast(msg);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Failed to save ${format} to mobile`,
        true
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF] pb-32">
      <Header
        title={subject.name}
        subtitle={`${program.name} • ${semester.name} • ${subject.teacherName}`}
        onBack={onBack}
      />

      <main className="mx-auto w-[90%] max-w-[540px] space-y-3">
        {/* Date, Teacher & Summary Bar */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Teacher
              </p>
              <p className="truncate text-sm font-semibold text-[#002B5B]">
                {subject.teacherName || 'Not Assigned'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-0.5 rounded-xl bg-[#F8FAFF] px-2.5 py-1 text-xs font-semibold text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30"
              />
            </div>
          </div>

          {/* Red instruction notice if attendance exists for this date */}
          {existingSession && (
            <div className="mt-2.5 rounded-xl bg-red-50 p-2.5 border border-red-200">
              <p className="text-xs font-semibold text-red-600">
                Attendance for {date} is already saved. Opened for editing. No duplicates will be created.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F4FF] pt-2.5">
            <div className="flex gap-1.5 text-[11px] font-semibold tabular-nums">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                Present: {counts.present}
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">
                Absent: {counts.absent}
              </span>
              {counts.leave > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  Leave: {counts.leave}
                </span>
              )}
            </div>

            {students.length > 0 && (
              <button
                type="button"
                onClick={markAllPresent}
                className="rounded-full bg-[#6495ED]/20 px-3 py-1 text-[11px] font-semibold text-[#002B5B] transition-all active:scale-95 hover:bg-[#6495ED]/30"
              >
                Mark All Present
              </button>
            )}
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`animate-toast rounded-xl px-4 py-2.5 text-center text-xs font-semibold shadow-md ${
              statusMessage.isError
                ? 'bg-red-600 text-white'
                : 'bg-[#002B5B] text-white'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Student List or Red Instruction text for empty state */}
        {students.length === 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-red-600">
              No students added for {program.name} ({semester.name}). Please add students first in Setup.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((stu, idx) => {
              const current = draftRecords[stu.id];
              return (
                <div
                  key={stu.id}
                  className="rounded-2xl bg-white p-3 shadow-sm transition-all"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#002B5B]">
                      <span className="mr-1.5 text-xs font-medium tabular-nums text-[#002B5B]/50">
                        {idx + 1}.
                      </span>
                      {stu.name}
                    </p>
                    {stu.rollNo && (
                      <span className="shrink-0 rounded-md bg-[#F0F4FF] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#002B5B]">
                        Roll #{stu.rollNo}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'present')}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        current === 'present'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'absent')}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        current === 'absent'
                          ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-600/30'
                          : 'bg-red-50 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'leave')}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        current === 'leave'
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Primary Save Attendance & Export Actions */}
        {students.length > 0 && (
          <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#E0EAFF] p-3 shadow-lg z-30">
            <div className="mx-auto max-w-[540px] space-y-2">
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={exporting}
                className="w-full rounded-full bg-[#002B5B] py-3 text-sm font-bold text-white shadow-md transition-all active:scale-98 hover:bg-[#002248]"
              >
                Save Attendance
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportDaily('excel')}
                  disabled={exporting}
                  className="flex-1 rounded-full bg-[#6495ED] py-2 text-xs font-semibold text-[#002B5B] shadow-sm transition-all active:scale-95"
                >
                  Save Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDaily('pdf')}
                  disabled={exporting}
                  className="flex-1 rounded-full bg-[#002B5B]/10 py-2 text-xs font-semibold text-[#002B5B] shadow-sm transition-all active:scale-95"
                >
                  Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDaily('image')}
                  disabled={exporting}
                  className="flex-1 rounded-full bg-[#6495ED]/20 py-2 text-xs font-semibold text-[#002B5B] shadow-sm transition-all active:scale-95"
                >
                  Save Image
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
