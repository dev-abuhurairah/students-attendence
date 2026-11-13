import React, { useMemo, useState } from 'react';
import type { AppData, AttendanceSession } from '../types/attendance';
import {
  exportDailyAttendanceExcel,
  exportSemesterAttendanceExcel,
  exportSubjectRegisterExcel,
} from '../services/excel';
import {
  exportAttendanceImage,
  exportSemesterReportImage,
  exportSubjectReportImage,
} from '../services/image';
import {
  exportAttendancePdf,
  exportSemesterAttendancePdf,
  exportSubjectAttendancePdf,
} from '../services/pdf';
import { calculateAttendancePercentage } from '../services/storage';
import { Header } from '../components/Header';

interface ReportsViewProps {
  data: AppData;
  onBack: () => void;
}

type ReportTab = 'subject' | 'semester' | 'daily';

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('subject');
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  // Selections for Subject Report
  const [subjectProgramId, setSubjectProgramId] = useState<string>(
    data.programs[0]?.id ?? ''
  );
  const subjectProgramSemesters = useMemo(
    () => data.semesters.filter((s) => s.programId === subjectProgramId),
    [data.semesters, subjectProgramId]
  );
  const [subjectSemesterId, setSubjectSemesterId] = useState<string>(
    subjectProgramSemesters[0]?.id ?? ''
  );
  const semesterSubjects = useMemo(
    () =>
      data.subjects.filter(
        (sub) =>
          sub.programId === subjectProgramId &&
          sub.semesterId === subjectSemesterId
      ),
    [data.subjects, subjectProgramId, subjectSemesterId]
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    semesterSubjects[0]?.id ?? ''
  );

  // Selections for Semester Report
  const [semReportProgramId, setSemReportProgramId] = useState<string>(
    data.programs[0]?.id ?? ''
  );
  const semReportSemesters = useMemo(
    () => data.semesters.filter((s) => s.programId === semReportProgramId),
    [data.semesters, semReportProgramId]
  );
  const [semReportSemesterId, setSemReportSemesterId] = useState<string>(
    semReportSemesters[0]?.id ?? ''
  );

  const showToast = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // Data resolution for Subject Report
  // -------------------------------------------------------------
  const activeSubjectProgram = data.programs.find(
    (p) => p.id === subjectProgramId
  );
  const activeSubjectSemester = data.semesters.find(
    (s) => s.id === subjectSemesterId
  );
  const activeSubject = data.subjects.find((s) => s.id === selectedSubjectId);

  const subjectStudents = useMemo(() => {
    if (!activeSubjectProgram || !activeSubjectSemester) return [];
    return data.students
      .filter(
        (stu) =>
          stu.programId === activeSubjectProgram.id &&
          stu.semesterId === activeSubjectSemester.id
      )
      .sort((a, b) =>
        a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
      );
  }, [data.students, activeSubjectProgram, activeSubjectSemester]);

  const subjectSessions = useMemo(() => {
    if (!activeSubject) return [];
    return data.sessions
      .filter((s) => s.subjectId === activeSubject.id)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.sessions, activeSubject]);

  // -------------------------------------------------------------
  // Data resolution for Semester Report
  // -------------------------------------------------------------
  const activeSemReportProgram = data.programs.find(
    (p) => p.id === semReportProgramId
  );
  const activeSemReportSemester = data.semesters.find(
    (s) => s.id === semReportSemesterId
  );

  const semReportSubjects = useMemo(() => {
    if (!activeSemReportProgram || !activeSemReportSemester) return [];
    return data.subjects.filter(
      (sub) =>
        sub.programId === activeSemReportProgram.id &&
        sub.semesterId === activeSemReportSemester.id
    );
  }, [data.subjects, activeSemReportProgram, activeSemReportSemester]);

  const semReportStudents = useMemo(() => {
    if (!activeSemReportProgram || !activeSemReportSemester) return [];
    return data.students
      .filter(
        (stu) =>
          stu.programId === activeSemReportProgram.id &&
          stu.semesterId === activeSemReportSemester.id
      )
      .sort((a, b) =>
        a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
      );
  }, [data.students, activeSemReportProgram, activeSemReportSemester]);

  const semReportSessions = useMemo(() => {
    const subIds = new Set(semReportSubjects.map((s) => s.id));
    return data.sessions.filter((sess) => subIds.has(sess.subjectId));
  }, [data.sessions, semReportSubjects]);

  // -------------------------------------------------------------
  // Export handlers for Subject Report
  // -------------------------------------------------------------
  const handleExportSubject = async (
    format: 'excel' | 'pdf' | 'png' | 'jpeg'
  ) => {
    if (
      !activeSubjectProgram ||
      !activeSubjectSemester ||
      !activeSubject ||
      subjectSessions.length === 0
    ) {
      showToast('No attendance found for this subject to export.', true);
      return;
    }

    setBusy(true);
    try {
      let msg = '';
      if (format === 'excel') {
        msg = await exportSubjectRegisterExcel({
          program: activeSubjectProgram,
          semester: activeSubjectSemester,
          subject: activeSubject,
          students: subjectStudents,
          sessions: subjectSessions,
        });
      } else if (format === 'pdf') {
        msg = await exportSubjectAttendancePdf({
          program: activeSubjectProgram,
          semester: activeSubjectSemester,
          subject: activeSubject,
          students: subjectStudents,
          sessions: subjectSessions,
        });
      } else {
        msg = await exportSubjectReportImage({
          program: activeSubjectProgram,
          semester: activeSubjectSemester,
          subject: activeSubject,
          students: subjectStudents,
          sessions: subjectSessions,
          format,
        });
      }
      showToast(msg);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Failed to save ${format} report`,
        true
      );
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------
  // Export handlers for Semester Report
  // -------------------------------------------------------------
  const handleExportSemester = async (
    format: 'excel' | 'pdf' | 'png' | 'jpeg'
  ) => {
    if (
      !activeSemReportProgram ||
      !activeSemReportSemester ||
      semReportSubjects.length === 0 ||
      semReportSessions.length === 0
    ) {
      showToast('No attendance found for this semester to export.', true);
      return;
    }

    setBusy(true);
    try {
      let msg = '';
      if (format === 'excel') {
        msg = await exportSemesterAttendanceExcel({
          program: activeSemReportProgram,
          semester: activeSemReportSemester,
          subjects: semReportSubjects,
          students: semReportStudents,
          sessions: semReportSessions,
        });
      } else if (format === 'pdf') {
        msg = await exportSemesterAttendancePdf({
          program: activeSemReportProgram,
          semester: activeSemReportSemester,
          subjects: semReportSubjects,
          students: semReportStudents,
          sessions: semReportSessions,
        });
      } else {
        msg = await exportSemesterReportImage({
          program: activeSemReportProgram,
          semester: activeSemReportSemester,
          subjects: semReportSubjects,
          students: semReportStudents,
          sessions: semReportSessions,
          format,
        });
      }
      showToast(msg);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Failed to save ${format} report`,
        true
      );
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------
  // Export handler for Daily Sessions
  // -------------------------------------------------------------
  const handleExportDailySession = async (
    session: AttendanceSession,
    format: 'excel' | 'pdf' | 'png' | 'jpeg'
  ) => {
    const program = data.programs.find((p) => p.id === session.programId);
    const semester = data.semesters.find((s) => s.id === session.semesterId);
    const subject = data.subjects.find((s) => s.id === session.subjectId);

    if (!program || !semester || !subject) {
      showToast('Program, semester, or subject not found.', true);
      return;
    }

    const students = data.students.filter(
      (stu) => stu.programId === program.id && stu.semesterId === semester.id
    );

    setBusy(true);
    try {
      const payload = { program, semester, subject, students, session };
      let msg = '';
      if (format === 'excel') {
        msg = await exportDailyAttendanceExcel(payload);
      } else if (format === 'pdf') {
        msg = await exportAttendancePdf(payload);
      } else {
        msg = await exportAttendanceImage({ ...payload, format });
      }
      showToast(msg);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `Could not save ${format} report`,
        true
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF] pb-24">
      <Header
        title="Attendance Reports"
        subtitle="Subject, Semester & Daily Reports"
        onBack={onBack}
      />

      {/* Toast Notification */}
      {message && (
        <div
          className={`animate-toast mx-auto mb-3 w-[90%] max-w-[540px] rounded-xl px-4 py-2.5 text-center text-xs font-semibold shadow-md ${
            message.isError
              ? 'bg-red-600 text-white'
              : 'bg-[#002B5B] text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto mb-4 flex w-[90%] max-w-[540px] rounded-full bg-white p-1 shadow-sm border border-[#E0EAFF]">
        <button
          type="button"
          onClick={() => setActiveTab('subject')}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'subject'
              ? 'bg-[#002B5B] text-white shadow-sm'
              : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
          }`}
        >
          Subject Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('semester')}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'semester'
              ? 'bg-[#002B5B] text-white shadow-sm'
              : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
          }`}
        >
          Semester Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'daily'
              ? 'bg-[#002B5B] text-white shadow-sm'
              : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
          }`}
        >
          Daily Sheets
        </button>
      </div>

      <main className="mx-auto w-[90%] max-w-[540px] space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: ONE SUBJECT FULL ATTENDANCE REPORT                 */}
        {/* ======================================================== */}
        {activeTab === 'subject' && (
          <div className="space-y-4">
            {/* Filter Card */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#E0EAFF] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#002B5B]">
                Select Subject for Report
              </p>

              {/* Red instruction text if setup is missing */}
              {data.programs.length === 0 ? (
                <p className="text-xs font-semibold text-red-600">
                  No programs added yet. Please add a program first in Setup.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Program
                    </label>
                    <select
                      value={subjectProgramId}
                      onChange={(e) => {
                        setSubjectProgramId(e.target.value);
                        const sems = data.semesters.filter(
                          (s) => s.programId === e.target.value
                        );
                        setSubjectSemesterId(sems[0]?.id ?? '');
                        const subs = data.subjects.filter(
                          (sub) =>
                            sub.programId === e.target.value &&
                            sub.semesterId === (sems[0]?.id ?? '')
                        );
                        setSelectedSubjectId(subs[0]?.id ?? '');
                      }}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                    >
                      {data.programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Semester
                    </label>
                    <select
                      value={subjectSemesterId}
                      onChange={(e) => {
                        setSubjectSemesterId(e.target.value);
                        const subs = data.subjects.filter(
                          (sub) =>
                            sub.programId === subjectProgramId &&
                            sub.semesterId === e.target.value
                        );
                        setSelectedSubjectId(subs[0]?.id ?? '');
                      }}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                    >
                      {subjectProgramSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                    >
                      {semesterSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Instructions in red text */}
              {data.programs.length > 0 && subjectProgramSemesters.length === 0 && (
                <p className="text-xs font-semibold text-red-600">
                  No semesters added for this program. Please add semesters first in Setup.
                </p>
              )}
              {subjectProgramSemesters.length > 0 && semesterSubjects.length === 0 && (
                <p className="text-xs font-semibold text-red-600">
                  No subjects added for this semester. Please add subjects first in Setup.
                </p>
              )}
            </div>

            {/* If Subject is chosen, check if attendance exists */}
            {activeSubject && (
              <>
                {subjectSessions.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-red-600">
                      No attendance found for this subject. Please take attendance first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header info & Stats Card */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#E0EAFF]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#002B5B]">
                            {activeSubject.name}
                          </h3>
                          <p className="text-xs text-[#002B5B]/70">
                            Teacher: {activeSubject.teacherName || 'Not Assigned'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-[#E0EAFF] px-2.5 py-1 text-xs font-bold text-[#002B5B]">
                            {subjectSessions.length} Classes Held
                          </span>
                        </div>
                      </div>

                      {/* Export & Save to Mobile Button Row */}
                      <div className="mt-4 pt-3 border-t border-[#F0F4FF] space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                          Export &amp; Save Report to Mobile Storage / Gallery
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleExportSubject('excel')}
                            disabled={busy}
                            className="rounded-xl bg-[#6495ED] py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#5383db]"
                          >
                            Save Excel (.xlsx)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSubject('pdf')}
                            disabled={busy}
                            className="rounded-xl bg-[#002B5B] py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-[#001d3d]"
                          >
                            Save PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSubject('png')}
                            disabled={busy}
                            className="rounded-xl bg-[#6495ED]/20 py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#6495ED]/30"
                          >
                            Save PNG Image
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSubject('jpeg')}
                            disabled={busy}
                            className="rounded-xl bg-[#002B5B]/10 py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#002B5B]/15"
                          >
                            Save JPG Image
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table View of Subject Attendance */}
                    <div className="rounded-2xl bg-white p-3 shadow-sm border border-[#E0EAFF] overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E0EAFF] text-[#002B5B]">
                            <th className="py-2 px-1 text-center font-bold">#</th>
                            <th className="py-2 px-2 font-bold">Roll No</th>
                            <th className="py-2 px-2 font-bold min-w-[120px]">
                              Student Name
                            </th>
                            {subjectSessions.map((s) => (
                              <th
                                key={s.id}
                                className="py-2 px-1.5 text-center font-semibold text-[11px]"
                              >
                                {s.date.slice(5)}
                              </th>
                            ))}
                            <th className="py-2 px-1 text-center font-bold text-emerald-700">
                              P
                            </th>
                            <th className="py-2 px-1 text-center font-bold text-red-700">
                              A
                            </th>
                            <th className="py-2 px-1.5 text-center font-bold">
                              Total
                            </th>
                            <th className="py-2 px-2 text-center font-bold text-[#002B5B]">
                              Attendance %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F4FF]">
                          {subjectStudents.map((stu, idx) => {
                            let p = 0;
                            let a = 0;
                            const datesMarks = subjectSessions.map((sess) => {
                              const st = sess.records[stu.id];
                              if (st === 'present') p++;
                              else a++;
                              return st === 'present' ? 'P' : 'A';
                            });

                            const pct = calculateAttendancePercentage(
                              p,
                              subjectSessions.length
                            );

                            return (
                              <tr key={stu.id} className="hover:bg-[#F8FAFF]">
                                <td className="py-2 px-1 text-center text-[#002B5B]/60 font-medium">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2 font-semibold tabular-nums text-[#002B5B]">
                                  {stu.rollNo || '-'}
                                </td>
                                <td className="py-2 px-2 font-semibold text-[#002B5B]">
                                  {stu.name}
                                </td>
                                {datesMarks.map((mark, mIdx) => (
                                  <td
                                    key={mIdx}
                                    className={`py-2 px-1.5 text-center font-bold ${
                                      mark === 'P'
                                        ? 'text-emerald-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {mark}
                                  </td>
                                ))}
                                <td className="py-2 px-1 text-center font-bold text-emerald-700">
                                  {p}
                                </td>
                                <td className="py-2 px-1 text-center font-bold text-red-700">
                                  {a}
                                </td>
                                <td className="py-2 px-1.5 text-center font-semibold text-[#002B5B]">
                                  {subjectSessions.length}
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-[#002B5B]">
                                  {pct}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ONE SEMESTER ALL SUBJECTS ATTENDANCE REPORT       */}
        {/* ======================================================== */}
        {activeTab === 'semester' && (
          <div className="space-y-4">
            {/* Filter Card */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#E0EAFF] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#002B5B]">
                Select Semester for All-Subjects Report
              </p>

              {data.programs.length === 0 ? (
                <p className="text-xs font-semibold text-red-600">
                  No programs added yet. Please add a program first in Setup.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Program
                    </label>
                    <select
                      value={semReportProgramId}
                      onChange={(e) => {
                        setSemReportProgramId(e.target.value);
                        const sems = data.semesters.filter(
                          (s) => s.programId === e.target.value
                        );
                        setSemReportSemesterId(sems[0]?.id ?? '');
                      }}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                    >
                      {data.programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Semester
                    </label>
                    <select
                      value={semReportSemesterId}
                      onChange={(e) => setSemReportSemesterId(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                    >
                      {semReportSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {data.programs.length > 0 && semReportSemesters.length === 0 && (
                <p className="text-xs font-semibold text-red-600">
                  No semesters added. Please add semesters first in Setup.
                </p>
              )}
            </div>

            {/* If semester is selected */}
            {activeSemReportSemester && (
              <>
                {semReportSubjects.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-red-600">
                      No subjects added for {activeSemReportSemester.name}. Please add subjects first.
                    </p>
                  </div>
                ) : semReportSessions.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-red-600">
                      No attendance found for this semester. Please take attendance first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header info & Stats */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#E0EAFF]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#002B5B]">
                            {activeSemReportSemester.name} — All Subjects
                          </h3>
                          <p className="text-xs text-[#002B5B]/70">
                            {semReportSubjects.length} Subjects •{' '}
                            {semReportStudents.length} Students
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-[#E0EAFF] px-2.5 py-1 text-xs font-bold text-[#002B5B]">
                            {semReportSessions.length} Total Sessions
                          </span>
                        </div>
                      </div>

                      {/* Export & Save to Mobile Button Row */}
                      <div className="mt-4 pt-3 border-t border-[#F0F4FF] space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                          Export &amp; Save Semester Report to Mobile Storage / Gallery
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleExportSemester('excel')}
                            disabled={busy}
                            className="rounded-xl bg-[#6495ED] py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#5383db]"
                          >
                            Save Excel (.xlsx)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSemester('pdf')}
                            disabled={busy}
                            className="rounded-xl bg-[#002B5B] py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-[#001d3d]"
                          >
                            Save PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSemester('png')}
                            disabled={busy}
                            className="rounded-xl bg-[#6495ED]/20 py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#6495ED]/30"
                          >
                            Save PNG Image
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSemester('jpeg')}
                            disabled={busy}
                            className="rounded-xl bg-[#002B5B]/10 py-2 text-xs font-bold text-[#002B5B] shadow-sm transition-all active:scale-95 hover:bg-[#002B5B]/15"
                          >
                            Save JPG Image
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* All Subjects Table View */}
                    <div className="rounded-2xl bg-white p-3 shadow-sm border border-[#E0EAFF] overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E0EAFF] text-[#002B5B]">
                            <th className="py-2 px-1 text-center font-bold">#</th>
                            <th className="py-2 px-2 font-bold">Roll No</th>
                            <th className="py-2 px-2 font-bold min-w-[120px]">
                              Student Name
                            </th>
                            {semReportSubjects.map((sub) => (
                              <th
                                key={sub.id}
                                className="py-2 px-2 text-center font-bold min-w-[90px]"
                              >
                                {sub.name}
                                <div className="text-[10px] font-normal text-[#002B5B]/60">
                                  P / Total (%)
                                </div>
                              </th>
                            ))}
                            <th className="py-2 px-2 text-center font-bold min-w-[90px] bg-[#F0F4FF] rounded-r-lg">
                              Overall
                              <div className="text-[10px] font-normal text-[#002B5B]/60">
                                Total P / Tot (%)
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F4FF]">
                          {semReportStudents.map((stu, idx) => {
                            let overallP = 0;
                            let overallTotal = 0;

                            const subData = semReportSubjects.map((sub) => {
                              const sSessions = semReportSessions.filter(
                                (s) => s.subjectId === sub.id
                              );
                              let p = 0;
                              sSessions.forEach((sess) => {
                                if (sess.records[stu.id] === 'present') p++;
                              });
                              const tot = sSessions.length;
                              overallP += p;
                              overallTotal += tot;
                              const pct = calculateAttendancePercentage(p, tot);
                              return { p, tot, pct };
                            });

                            const overallPct = calculateAttendancePercentage(
                              overallP,
                              overallTotal
                            );

                            return (
                              <tr key={stu.id} className="hover:bg-[#F8FAFF]">
                                <td className="py-2 px-1 text-center text-[#002B5B]/60 font-medium">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2 font-semibold tabular-nums text-[#002B5B]">
                                  {stu.rollNo || '-'}
                                </td>
                                <td className="py-2 px-2 font-semibold text-[#002B5B]">
                                  {stu.name}
                                </td>
                                {subData.map((sd, sIdx) => (
                                  <td
                                    key={sIdx}
                                    className="py-2 px-2 text-center tabular-nums"
                                  >
                                    <span className="font-semibold text-[#002B5B]">
                                      {sd.p}/{sd.tot}
                                    </span>
                                    <span className="ml-1 text-[11px] font-bold text-[#6495ED]">
                                      ({sd.pct})
                                    </span>
                                  </td>
                                ))}
                                <td className="py-2 px-2 text-center tabular-nums bg-[#F0F4FF]/50 font-bold text-[#002B5B]">
                                  {overallP}/{overallTotal}{' '}
                                  <span className="text-emerald-700">
                                    ({overallPct})
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DAILY ATTENDANCE SHEETS                            */}
        {/* ======================================================== */}
        {activeTab === 'daily' && (
          <div className="space-y-3">
            {data.sessions.length === 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
                <p className="text-sm font-semibold text-red-600">
                  No attendance found yet. Please take attendance first.
                </p>
              </div>
            ) : (
              [...data.sessions]
                .sort(
                  (a, b) =>
                    b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt
                )
                .map((sess) => {
                  const prog = data.programs.find((p) => p.id === sess.programId);
                  const sem = data.semesters.find((s) => s.id === sess.semesterId);
                  const sub = data.subjects.find((s) => s.id === sess.subjectId);

                  const values = Object.values(sess.records);
                  const pCount = values.filter((v) => v === 'present').length;
                  const aCount = values.filter((v) => v === 'absent').length;
                  const lCount = values.filter((v) => v === 'leave').length;

                  return (
                    <div
                      key={sess.id}
                      className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#E0EAFF]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#002B5B]">
                            {sub?.name ?? 'Unknown Subject'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#002B5B]/65">
                            {prog?.name ?? '-'} • {sem?.name ?? '-'} •{' '}
                            <span className="tabular-nums font-semibold">
                              {sess.date}
                            </span>
                          </p>
                          <p className="mt-1 text-xs font-semibold tabular-nums text-[#002B5B]/80">
                            Present: {pCount} · Absent: {aCount}
                            {lCount > 0 && ` · Leave: ${lCount}`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 border-t border-[#F0F4FF] pt-2.5">
                        <span className="text-[11px] font-bold text-red-600 mr-1">
                          Save:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'excel')}
                          disabled={busy}
                          className="rounded-full bg-[#6495ED] px-3 py-1.5 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
                        >
                          Excel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'pdf')}
                          disabled={busy}
                          className="rounded-full bg-[#002B5B] px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'png')}
                          disabled={busy}
                          className="rounded-full bg-[#6495ED]/20 px-3 py-1.5 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
                        >
                          PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'jpeg')}
                          disabled={busy}
                          className="rounded-full bg-[#002B5B]/10 px-3 py-1.5 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
                        >
                          JPG
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
