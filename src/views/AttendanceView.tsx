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
import {
  exportDailyAttendanceExcel,
  exportSubjectRegisterExcel,
} from '../services/excel';
import { exportAttendanceImage } from '../services/image';
import { exportAttendancePdf } from '../services/pdf';
import { Header } from '../components/Header';

interface AttendanceViewProps {
  data: AppData;
  program: Program;
  semester: Semester;
  subject: Subject;
  onSaveSession: (session: AttendanceSession) => void;
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const timerRef = useRef<number | null>(null);

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

  const sessionId = `${subject.id}__${date}`;
  const existingSession = data.sessions.find((s) => s.id === sessionId);

  const [draftRecords, setDraftRecords] = useState<
    Record<string, AttendanceStatus>
  >(() => existingSession?.records ?? {});

  useEffect(() => {
    setDraftRecords(existingSession?.records ?? {});
  }, [sessionId, existingSession]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

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

  const notify = (msg: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setStatusMessage(msg);
    timerRef.current = window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const buildSession = (): AttendanceSession => ({
    id: sessionId,
    programId: program.id,
    semesterId: semester.id,
    subjectId: subject.id,
    date,
    records: draftRecords,
    updatedAt: Date.now(),
  });

  const handleSaveOnly = () => {
    onSaveSession(buildSession());
    notify('Attendance saved');
  };

  const handleSaveAndExport = async () => {
    const session = buildSession();
    onSaveSession(session);
    setExporting(true);
    try {
      const msg = await exportDailyAttendanceExcel({
        program,
        semester,
        subject,
        students,
        session,
      });
      notify(msg);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveAndExportImage = async () => {
    const session = buildSession();
    onSaveSession(session);
    setExporting(true);
    try {
      const msg = await exportAttendanceImage({
        program,
        semester,
        subject,
        students,
        session,
      });
      notify(msg);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate Image');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveAndExportPdf = async () => {
    const session = buildSession();
    onSaveSession(session);
    setExporting(true);
    try {
      const msg = await exportAttendancePdf({
        program,
        semester,
        subject,
        students,
        session,
      });
      notify(msg);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportRegister = async () => {
    const session = buildSession();
    onSaveSession(session);
    const allSubjectSessions = data.sessions
      .filter((s) => s.subjectId === subject.id && s.id !== session.id)
      .concat(session);

    setExporting(true);
    try {
      const msg = await exportSubjectRegisterExcel({
        program,
        semester,
        subject,
        students,
        sessions: allSubjectSessions,
      });
      notify(msg);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to generate Register');
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
        {/* Date & Teacher Info Bar */}
        <div className="rounded-2xl bg-white p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Teacher
              </p>
              <p className="truncate text-sm font-semibold text-[#002B5B]">
                {subject.teacherName}
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
                className="mt-0.5 rounded-xl bg-[#F8FAFF] px-2.5 py-1 text-xs font-medium text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F4FF] pt-2.5">
            <div className="flex gap-1.5 text-[11px] font-semibold tabular-nums">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                P: {counts.present}
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">
                A: {counts.absent}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                L: {counts.leave}
              </span>
            </div>

            {students.length > 0 && (
              <button
                type="button"
                onClick={markAllPresent}
                className="rounded-full bg-[#6495ED]/20 px-3 py-1 text-[11px] font-semibold text-[#002B5B] active:opacity-75"
              >
                Mark All Present
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="animate-toast rounded-full bg-[#002B5B] px-4 py-2 text-center text-xs font-medium text-white">
            {statusMessage}
          </div>
        )}

        {/* Student List */}
        {students.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center text-sm text-[#002B5B]/70">
            No students found in {program.name} ({semester.name}). Go to Setup
            &gt; Students to add students first.
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((stu, idx) => {
              const current = draftRecords[stu.id];
              return (
                <div
                  key={stu.id}
                  className="rounded-2xl bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#002B5B]">
                      <span className="mr-1.5 text-xs font-medium tabular-nums text-[#002B5B]/50">
                        {idx + 1}.
                      </span>
                      {stu.name}
                    </p>
                    {stu.rollNo && (
                      <span className="shrink-0 text-xs font-medium tabular-nums text-[#002B5B]/60">
                        {stu.rollNo}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'present')}
                      className={`rounded-full py-2 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        current === 'present'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#F0F4FF] text-[#002B5B]'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'absent')}
                      className={`rounded-full py-2 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        current === 'absent'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#F0F4FF] text-[#002B5B]'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'leave')}
                      className={`rounded-full py-2 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        current === 'leave'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#F0F4FF] text-[#002B5B]'
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
      </main>

      {/* Bottom Action Bar */}
      {students.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-[#F8FAFF]/95 px-4 pt-2.5 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[540px] flex-col gap-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={exporting}
                onClick={handleSaveAndExport}
                className="w-full rounded-full bg-[#6495ED] py-3 text-xs font-semibold text-[#002B5B] transition-all duration-150 active:scale-95 active:opacity-80 disabled:opacity-50 sm:text-sm"
              >
                {exporting ? 'Wait...' : 'Excel'}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleSaveAndExportPdf}
                className="w-full rounded-full bg-[#6495ED] py-3 text-xs font-semibold text-[#002B5B] transition-all duration-150 active:scale-95 active:opacity-80 disabled:opacity-50 sm:text-sm"
              >
                {exporting ? 'Wait...' : 'PDF'}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleSaveAndExportImage}
                className="w-full rounded-full bg-[#6495ED] py-3 text-xs font-semibold text-[#002B5B] transition-all duration-150 active:scale-95 active:opacity-80 disabled:opacity-50 sm:text-sm"
              >
                {exporting ? 'Wait...' : 'Image'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleSaveOnly}
                className="rounded-full bg-[#6495ED]/20 py-2 text-xs font-semibold text-[#002B5B] active:opacity-75"
              >
                Save Only
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportRegister}
                className="rounded-full bg-[#6495ED]/20 py-2 text-xs font-semibold text-[#002B5B] active:opacity-75 disabled:opacity-50"
              >
                Full Subject Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
