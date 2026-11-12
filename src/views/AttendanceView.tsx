import React, { useMemo, useState } from 'react';
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

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const nextId = `${subject.id}__${newDate}`;
    const found = data.sessions.find((s) => s.id === nextId);
    setDraftRecords(found?.records ?? {});
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
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
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
    <div className="safe-bottom min-h-screen bg-[#F8FAFF] pb-32">
      <Header
        title={subject.name}
        subtitle={`${program.name} • ${semester.name} • ${subject.teacherName}`}
        onBack={onBack}
      />

      <main className="mx-auto w-[92%] max-w-[580px] space-y-4">
        {/* Date & Teacher Info Bar */}
        <div className="rounded-3xl bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Teacher
              </p>
              <p className="text-base font-semibold text-[#002B5B]">
                {subject.teacherName}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="mt-0.5 rounded-xl bg-[#F8FAFF] px-3 py-1.5 text-sm font-medium text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F4FF] pt-3">
            <div className="flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                P: {counts.present}
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
                A: {counts.absent}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                L: {counts.leave}
              </span>
            </div>

            {students.length > 0 && (
              <button
                type="button"
                onClick={markAllPresent}
                className="rounded-full bg-[#6495ED]/20 px-3.5 py-1.5 text-xs font-semibold text-[#002B5B] active:opacity-75"
              >
                Mark All Present
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-full bg-[#002B5B] px-4 py-2 text-center text-xs font-medium text-white">
            {statusMessage}
          </div>
        )}

        {/* Student List */}
        {students.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#002B5B]/70">
            No students found in {program.name} ({semester.name}). Go to Setup
            &gt; Students to add students first.
          </div>
        ) : (
          <div className="space-y-2.5">
            {students.map((stu, idx) => {
              const current = draftRecords[stu.id];
              return (
                <div
                  key={stu.id}
                  className="rounded-3xl bg-white p-3.5"
                >
                  <div className="mb-2.5 flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold text-[#002B5B]">
                      <span className="mr-1.5 text-xs font-medium text-[#002B5B]/50">
                        {idx + 1}.
                      </span>
                      {stu.name}
                    </p>
                    {stu.rollNo && (
                      <span className="text-xs font-medium text-[#002B5B]/60">
                        {stu.rollNo}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(stu.id, 'present')}
                      className={`rounded-full py-2.5 text-sm font-medium transition-colors ${
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
                      className={`rounded-full py-2.5 text-sm font-medium transition-colors ${
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
                      className={`rounded-full py-2.5 text-sm font-medium transition-colors ${
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
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-[#F8FAFF]/95 px-4 pt-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[580px] flex-col gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleSaveAndExport}
              className="w-full rounded-full bg-[#6495ED] py-4 text-lg font-medium text-[#002B5B] active:opacity-80 disabled:opacity-50"
            >
              {exporting ? 'Generating Excel...' : 'Generate Excel Sheet'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveOnly}
                className="rounded-full bg-[#6495ED]/20 py-2.5 text-xs font-semibold text-[#002B5B] active:opacity-75"
              >
                Save Only
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportRegister}
                className="rounded-full bg-[#6495ED]/20 py-2.5 text-xs font-semibold text-[#002B5B] active:opacity-75 disabled:opacity-50"
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
