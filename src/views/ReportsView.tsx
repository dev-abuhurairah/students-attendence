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
  const [busyFormat, setBusyFormat] = useState<string | null>(null);

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

    setBusyFormat(format);
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
      setBusyFormat(null);
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

    setBusyFormat(format);
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
      setBusyFormat(null);
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

    setBusyFormat(`${session.id}_${format}`);
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
      setBusyFormat(null);
    }
  };

  return (
    <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF] pb-24">
      <Header
        title="Attendance Reports"
        subtitle="Generate Excel, PDF & Image"
        onBack={onBack}
      />

      {/* Toast Notification */}
      {message && (
        <div
          className={`animate-toast mx-auto mb-3 w-[92%] max-w-[500px] rounded-xl px-4 py-2.5 text-center text-xs font-semibold shadow-md ${
            message.isError
              ? 'bg-red-600 text-white'
              : 'bg-[#002B5B] text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto mb-4 flex w-[92%] max-w-[500px] rounded-full bg-white p-1 shadow-xs border border-[#E0EAFF]">
        <button
          type="button"
          onClick={() => setActiveTab('subject')}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'subject'
              ? 'bg-[#002B5B] text-white shadow-xs'
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
              ? 'bg-[#002B5B] text-white shadow-xs'
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
              ? 'bg-[#002B5B] text-white shadow-xs'
              : 'text-[#002B5B]/75 hover:bg-[#F0F4FF]'
          }`}
        >
          Daily Sheets
        </button>
      </div>

      <main className="mx-auto w-[92%] max-w-[500px] space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: ONE SUBJECT REPORT GENERATOR                      */}
        {/* ======================================================== */}
        {activeTab === 'subject' && (
          <div className="space-y-4">
            {/* Filter Selection Card */}
            <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E0EAFF] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#002B5B]">
                Select Subject
              </p>

              {data.programs.length === 0 ? (
                <p className="text-xs font-semibold text-red-600">
                  No programs added yet. Please add a program first in Setup.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2.5 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
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
                        className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2.5 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
                      >
                        {subjectProgramSemesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#002B5B]/65">
                      Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2.5 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
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

              {/* Red instructions for empty states */}
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

            {/* Subject Report Generator Box (No in-app student table) */}
            {activeSubject && (
              <>
                {subjectSessions.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-xs">
                    <p className="text-sm font-semibold text-red-600">
                      No attendance found for this subject. Please take attendance first.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E0EAFF] space-y-4">
                    {/* Summary Card */}
                    <div className="border-b border-[#F0F4FF] pb-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#002B5B]/60">
                        Subject Attendance Report
                      </p>
                      <h3 className="text-lg font-bold text-[#002B5B] mt-0.5">
                        {activeSubject.name}
                      </h3>
                      <p className="text-xs text-[#002B5B]/70 mt-0.5">
                        {activeSubjectProgram?.name} • {activeSubjectSemester?.name} • Teacher: {activeSubject.teacherName || 'Not Assigned'}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <span className="rounded-xl bg-[#E0EAFF] px-3 py-1.5 text-xs font-bold text-[#002B5B]">
                          {subjectSessions.length} Classes Held
                        </span>
                        <span className="rounded-xl bg-[#F0F4FF] px-3 py-1.5 text-xs font-bold text-[#002B5B]">
                          {subjectStudents.length} Students
                        </span>
                      </div>
                    </div>

                    {/* Direct Export Buttons (Save to Mobile) */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        Generate &amp; Save to Mobile:
                      </p>

                      <button
                        type="button"
                        onClick={() => handleExportSubject('excel')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#6495ED] px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#5383db]"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" />
                          </svg>
                          <span>Generate Excel (.xlsx)</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/40 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSubject('pdf')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#002B5B] px-4 py-3 text-xs font-bold text-white shadow-xs transition-all active:scale-98 hover:bg-[#001d3d]"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v4zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z" />
                          </svg>
                          <span>Generate PDF Document</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSubject('png')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#6495ED]/20 px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#6495ED]/30"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                          <span>Generate PNG Image</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/60 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSubject('jpeg')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#002B5B]/10 px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#002B5B]/15"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                          <span>Generate JPG Image</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/60 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SEMESTER ALL-SUBJECTS REPORT GENERATOR             */}
        {/* ======================================================== */}
        {activeTab === 'semester' && (
          <div className="space-y-4">
            {/* Filter Selection Card */}
            <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E0EAFF] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#002B5B]">
                Select Semester
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
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2.5 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
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
                      className="mt-1 w-full rounded-xl bg-[#F8FAFF] p-2.5 text-xs font-semibold text-[#002B5B] border border-[#CBD5E1] outline-none"
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

            {/* Semester Generator Box (No in-app student table) */}
            {activeSemReportSemester && (
              <>
                {semReportSubjects.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-xs">
                    <p className="text-sm font-semibold text-red-600">
                      No subjects added for {activeSemReportSemester.name}. Please add subjects first.
                    </p>
                  </div>
                ) : semReportSessions.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-xs">
                    <p className="text-sm font-semibold text-red-600">
                      No attendance found for this semester. Please take attendance first.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-4 shadow-xs border border-[#E0EAFF] space-y-4">
                    {/* Summary Card */}
                    <div className="border-b border-[#F0F4FF] pb-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#002B5B]/60">
                        Semester All-Subjects Report
                      </p>
                      <h3 className="text-lg font-bold text-[#002B5B] mt-0.5">
                        {activeSemReportProgram?.name} — {activeSemReportSemester.name}
                      </h3>
                      <p className="text-xs text-[#002B5B]/70 mt-0.5">
                        Includes all {semReportSubjects.length} subjects and {semReportStudents.length} students
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-xl bg-[#E0EAFF] px-3 py-1.5 text-xs font-bold text-[#002B5B]">
                          {semReportSubjects.length} Subjects
                        </span>
                        <span className="rounded-xl bg-[#F0F4FF] px-3 py-1.5 text-xs font-bold text-[#002B5B]">
                          {semReportSessions.length} Total Sessions
                        </span>
                        <span className="rounded-xl bg-[#F0F4FF] px-3 py-1.5 text-xs font-bold text-[#002B5B]">
                          {semReportStudents.length} Students
                        </span>
                      </div>
                    </div>

                    {/* Direct Export Buttons (Save to Mobile) */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        Generate &amp; Save to Mobile:
                      </p>

                      <button
                        type="button"
                        onClick={() => handleExportSemester('excel')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#6495ED] px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#5383db]"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" />
                          </svg>
                          <span>Generate All-Subjects Excel (.xlsx)</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/40 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSemester('pdf')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#002B5B] px-4 py-3 text-xs font-bold text-white shadow-xs transition-all active:scale-98 hover:bg-[#001d3d]"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v4zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z" />
                          </svg>
                          <span>Generate All-Subjects PDF</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSemester('png')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#6495ED]/20 px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#6495ED]/30"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                          <span>Generate PNG Image</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/60 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSemester('jpeg')}
                        disabled={Boolean(busyFormat)}
                        className="w-full flex items-center justify-between rounded-xl bg-[#002B5B]/10 px-4 py-3 text-xs font-bold text-[#002B5B] shadow-xs transition-all active:scale-98 hover:bg-[#002B5B]/15"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                          <span>Generate JPG Image</span>
                        </div>
                        <span className="text-[11px] font-semibold bg-white/60 px-2 py-0.5 rounded-md">Save to Mobile</span>
                      </button>
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
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-xs">
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
                      className="rounded-2xl bg-white p-3.5 shadow-xs border border-[#E0EAFF]"
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
                        <span className="text-[11px] font-bold text-red-600 mr-1 shrink-0">
                          Save:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'excel')}
                          disabled={Boolean(busyFormat)}
                          className="rounded-full bg-[#6495ED] px-2.5 py-1 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
                        >
                          Excel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'pdf')}
                          disabled={Boolean(busyFormat)}
                          className="rounded-full bg-[#002B5B] px-2.5 py-1 text-xs font-semibold text-white transition-all active:scale-95"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'png')}
                          disabled={Boolean(busyFormat)}
                          className="rounded-full bg-[#6495ED]/20 px-2.5 py-1 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
                        >
                          PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDailySession(sess, 'jpeg')}
                          disabled={Boolean(busyFormat)}
                          className="rounded-full bg-[#002B5B]/10 px-2.5 py-1 text-xs font-semibold text-[#002B5B] transition-all active:scale-95"
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
