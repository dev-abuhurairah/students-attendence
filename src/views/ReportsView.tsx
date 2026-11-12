import React, { useState } from 'react';
import type { AppData, AttendanceSession } from '../types/attendance';
import { exportDailyAttendanceExcel } from '../services/excel';
import { Header } from '../components/Header';

interface ReportsViewProps {
  data: AppData;
  onBack: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onBack }) => {
  const [message, setMessage] = useState<string | null>(null);

  const sortedSessions = [...data.sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt
  );

  const handleExportSession = async (session: AttendanceSession) => {
    const program = data.programs.find((p) => p.id === session.programId);
    const semester = data.semesters.find((s) => s.id === session.semesterId);
    const subject = data.subjects.find((s) => s.id === session.subjectId);

    if (!program || !semester || !subject) {
      setMessage('Program, semester, or subject no longer exists.');
      return;
    }

    const students = data.students.filter(
      (stu) => stu.programId === program.id && stu.semesterId === semester.id
    );

    try {
      const msg = await exportDailyAttendanceExcel({
        program,
        semester,
        subject,
        students,
        session,
      });
      setMessage(msg);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Could not export Excel sheet'
      );
    }
  };

  return (
    <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
      <Header
        title="Excel Reports"
        subtitle="Saved Attendance Sheets"
        onBack={onBack}
      />

      {message && (
        <div className="mx-auto mb-3 w-[90%] max-w-[540px] rounded-full bg-[#002B5B] px-4 py-2 text-center text-xs font-medium text-white">
          {message}
        </div>
      )}

      <main className="mx-auto w-[90%] max-w-[540px] space-y-3 pb-10">
        {sortedSessions.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#002B5B]/65">
            No attendance has been saved yet. Open a Program &gt; Semester &gt;
            Subject to mark attendance and generate an Excel sheet.
          </div>
        ) : (
          sortedSessions.map((sess) => {
            const program = data.programs.find((p) => p.id === sess.programId);
            const semester = data.semesters.find(
              (s) => s.id === sess.semesterId
            );
            const subject = data.subjects.find((s) => s.id === sess.subjectId);

            const values = Object.values(sess.records);
            const pCount = values.filter((v) => v === 'present').length;
            const aCount = values.filter((v) => v === 'absent').length;
            const lCount = values.filter((v) => v === 'leave').length;

            return (
              <div
                key={sess.id}
                className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[#002B5B]">
                    {subject?.name ?? 'Unknown Subject'}
                  </p>
                  <p className="truncate text-xs text-[#002B5B]/65">
                    {program?.name ?? '-'} • {semester?.name ?? '-'} •{' '}
                    {sess.date}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#002B5B]/80">
                    P: {pCount} · A: {aCount} · L: {lCount}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportSession(sess)}
                  className="shrink-0 rounded-full bg-[#6495ED] px-4 py-2.5 text-xs font-semibold text-[#002B5B] active:opacity-80"
                >
                  Excel
                </button>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};
