import React, { useState } from 'react';
import type { AppData } from '../types/attendance';
import { createId } from '../services/storage';
import { PillButton } from '../components/PillButton';
import { Header } from '../components/Header';

interface SetupViewProps {
  data: AppData;
  onUpdateData: (updater: (prev: AppData) => AppData) => void;
  onBackHome: () => void;
}

type SetupTab = 'menu' | 'students' | 'teachers' | 'subjects';

export const SetupView: React.FC<SetupViewProps> = ({
  data,
  onUpdateData,
  onBackHome,
}) => {
  const [tab, setTab] = useState<SetupTab>('menu');

  // Shared Program / Semester selection for Subjects & Students
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    data.programs[0]?.id ?? ''
  );
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  // Inline creation for Program & Semester
  const [newProgramName, setNewProgramName] = useState('');
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState('');
  const [showNewSemester, setShowNewSemester] = useState(false);

  // Teacher form
  const [teacherName, setTeacherName] = useState('');
  const [teacherDept, setTeacherDept] = useState('');

  // Subject form
  const [subjectName, setSubjectName] = useState('');
  const [subjectTeacher, setSubjectTeacher] = useState('');

  // Student form
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeProgramId =
    data.programs.some((p) => p.id === selectedProgramId)
      ? selectedProgramId
      : data.programs[0]?.id ?? '';

  const programSemesters = data.semesters.filter(
    (s) => s.programId === activeProgramId
  );

  const activeSemesterId =
    programSemesters.some((s) => s.id === selectedSemesterId)
      ? selectedSemesterId
      : programSemesters[0]?.id ?? '';

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleAddProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProgramName.trim();
    if (!trimmed) return;
    const exists = data.programs.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSelectedProgramId(exists.id);
      setNewProgramName('');
      setShowNewProgram(false);
      return;
    }
    const id = createId('prog');
    onUpdateData((prev) => ({
      ...prev,
      programs: [...prev.programs, { id, name: trimmed, createdAt: Date.now() }],
    }));
    setSelectedProgramId(id);
    setSelectedSemesterId('');
    setNewProgramName('');
    setShowNewProgram(false);
    showToast(`Program "${trimmed}" added to Home`);
  };

  const handleDeleteProgram = (programId: string) => {
    onUpdateData((prev) => ({
      ...prev,
      programs: prev.programs.filter((p) => p.id !== programId),
      semesters: prev.semesters.filter((s) => s.programId !== programId),
      subjects: prev.subjects.filter((s) => s.programId !== programId),
      students: prev.students.filter((s) => s.programId !== programId),
      sessions: prev.sessions.filter((s) => s.programId !== programId),
    }));
  };

  const handleAddSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProgramId) return;
    const trimmed = newSemesterName.trim();
    if (!trimmed) return;
    const exists = programSemesters.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSelectedSemesterId(exists.id);
      setNewSemesterName('');
      setShowNewSemester(false);
      return;
    }
    const id = createId('sem');
    onUpdateData((prev) => ({
      ...prev,
      semesters: [
        ...prev.semesters,
        { id, programId: activeProgramId, name: trimmed, createdAt: Date.now() },
      ],
    }));
    setSelectedSemesterId(id);
    setNewSemesterName('');
    setShowNewSemester(false);
    showToast(`Semester "${trimmed}" added`);
  };

  const handleDeleteSemester = (semesterId: string) => {
    onUpdateData((prev) => ({
      ...prev,
      semesters: prev.semesters.filter((s) => s.id !== semesterId),
      subjects: prev.subjects.filter((s) => s.semesterId !== semesterId),
      students: prev.students.filter((s) => s.semesterId !== semesterId),
      sessions: prev.sessions.filter((s) => s.semesterId !== semesterId),
    }));
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = teacherName.trim();
    if (!trimmed) return;
    const id = createId('tch');
    onUpdateData((prev) => ({
      ...prev,
      teachers: [
        ...prev.teachers,
        { id, name: trimmed, department: teacherDept.trim() || undefined },
      ],
    }));
    setTeacherName('');
    setTeacherDept('');
    showToast(`Teacher "${trimmed}" added`);
  };

  const handleDeleteTeacher = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id),
    }));
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProgramId || !activeSemesterId) return;
    const sName = subjectName.trim();
    const tName = subjectTeacher.trim();
    if (!sName || !tName) return;

    const id = createId('sub');
    onUpdateData((prev) => {
      const teacherExists = prev.teachers.some(
        (t) => t.name.toLowerCase() === tName.toLowerCase()
      );
      return {
        ...prev,
        teachers: teacherExists
          ? prev.teachers
          : [...prev.teachers, { id: createId('tch'), name: tName }],
        subjects: [
          ...prev.subjects,
          {
            id,
            programId: activeProgramId,
            semesterId: activeSemesterId,
            name: sName,
            teacherName: tName,
          },
        ],
      };
    });
    setSubjectName('');
    setSubjectTeacher('');
    showToast(`Subject "${sName}" added`);
  };

  const handleDeleteSubject = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      sessions: prev.sessions.filter((s) => s.subjectId !== id),
    }));
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProgramId || !activeSemesterId) return;
    const sName = studentName.trim();
    if (!sName) return;

    const id = createId('stu');
    onUpdateData((prev) => ({
      ...prev,
      students: [
        ...prev.students,
        {
          id,
          programId: activeProgramId,
          semesterId: activeSemesterId,
          rollNo: rollNo.trim(),
          name: sName,
        },
      ],
    }));
    setRollNo('');
    setStudentName('');
    showToast(`Student "${sName}" added`);
  };

  const handleBulkAddStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProgramId || !activeSemesterId) return;
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const newStudents = lines.map((line) => {
      const match = line.match(/^([A-Za-z0-9-]+)\s*[-,:\t]\s*(.+)$/);
      if (match) {
        return {
          id: createId('stu'),
          programId: activeProgramId,
          semesterId: activeSemesterId,
          rollNo: match[1].trim(),
          name: match[2].trim(),
        };
      }
      return {
        id: createId('stu'),
        programId: activeProgramId,
        semesterId: activeSemesterId,
        rollNo: '',
        name: line,
      };
    });

    onUpdateData((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents],
    }));
    setBulkText('');
    setBulkMode(false);
    showToast(`${newStudents.length} students added`);
  };

  const handleDeleteStudent = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
  };

  const renderProgramSemesterPicker = () => (
    <div className="mb-5 space-y-3 rounded-3xl bg-white p-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/70">
            Program / Class
          </label>
          <button
            type="button"
            onClick={() => setShowNewProgram((v) => !v)}
            className="text-xs font-semibold text-[#6495ED]"
          >
            {showNewProgram ? 'Cancel' : '+ Add Program'}
          </button>
        </div>

        {showNewProgram ? (
          <form onSubmit={handleAddProgram} className="flex gap-2">
            <input
              type="text"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
              placeholder="e.g. BBA, BSCS"
              className="flex-1 rounded-2xl bg-[#F8FAFF] px-3.5 py-2.5 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-[#6495ED] px-4 py-2.5 text-sm font-medium text-[#002B5B]"
            >
              Add
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={activeProgramId}
              onChange={(e) => {
                setSelectedProgramId(e.target.value);
                setSelectedSemesterId('');
              }}
              className="flex-1 rounded-2xl bg-[#F8FAFF] px-3.5 py-2.5 text-sm font-medium text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30"
            >
              {data.programs.length === 0 && (
                <option value="">No program yet — tap + Add Program</option>
              )}
              {data.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {activeProgramId && (
              <button
                type="button"
                onClick={() => handleDeleteProgram(activeProgramId)}
                className="rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {activeProgramId && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/70">
              Semester
            </label>
            <button
              type="button"
              onClick={() => setShowNewSemester((v) => !v)}
              className="text-xs font-semibold text-[#6495ED]"
            >
              {showNewSemester ? 'Cancel' : '+ Add Semester'}
            </button>
          </div>

          {showNewSemester ? (
            <form onSubmit={handleAddSemester} className="flex gap-2">
              <input
                type="text"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="e.g. 3rd Semester"
                className="flex-1 rounded-2xl bg-[#F8FAFF] px-3.5 py-2.5 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
              />
              <button
                type="submit"
                className="rounded-2xl bg-[#6495ED] px-4 py-2.5 text-sm font-medium text-[#002B5B]"
              >
                Add
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={activeSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="flex-1 rounded-2xl bg-[#F8FAFF] px-3.5 py-2.5 text-sm font-medium text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30"
              >
                {programSemesters.length === 0 && (
                  <option value="">No semester yet — tap + Add Semester</option>
                )}
                {programSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {activeSemesterId && (
                <button
                  type="button"
                  onClick={() => handleDeleteSemester(activeSemesterId)}
                  className="rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (tab === 'menu') {
    return (
      <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
        <Header
          title="Setup"
          subtitle="Configure Students, Teachers & Subjects"
          onBack={onBackHome}
        />
        <main className="mx-auto flex max-w-[600px] flex-col items-center gap-5 py-6">
          <PillButton label="Students" onClick={() => setTab('students')} />
          <PillButton label="Teachers" onClick={() => setTab('teachers')} />
          <PillButton label="Subjects" onClick={() => setTab('subjects')} />
        </main>
      </div>
    );
  }

  const currentSubjects = data.subjects.filter(
    (s) => s.programId === activeProgramId && s.semesterId === activeSemesterId
  );

  const currentStudents = data.students
    .filter(
      (s) => s.programId === activeProgramId && s.semesterId === activeSemesterId
    )
    .sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));

  return (
    <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
      <Header
        title={
          tab === 'teachers'
            ? 'Teachers Setup'
            : tab === 'subjects'
              ? 'Subjects & Classes'
              : 'Students Setup'
        }
        onBack={() => setTab('menu')}
      />

      {feedback && (
        <div className="mx-auto mb-3 w-[90%] max-w-[540px] rounded-full bg-[#002B5B] px-4 py-2 text-center text-xs font-medium text-white">
          {feedback}
        </div>
      )}

      <main className="mx-auto w-[90%] max-w-[540px] pb-10">
        {tab === 'teachers' && (
          <>
            <form
              onSubmit={handleAddTeacher}
              className="mb-5 space-y-3 rounded-3xl bg-white p-4"
            >
              <h2 className="text-sm font-semibold text-[#002B5B]">
                Add Teacher
              </h2>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Teacher Name (e.g. Prof. Ahmed)"
                className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
              />
              <input
                type="text"
                value={teacherDept}
                onChange={(e) => setTeacherDept(e.target.value)}
                placeholder="Department (optional)"
                className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-[#6495ED] py-3 text-base font-medium text-[#002B5B] active:opacity-80"
              >
                Add Teacher
              </button>
            </form>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/60">
                Saved Teachers ({data.teachers.length})
              </p>
              {data.teachers.length === 0 ? (
                <p className="rounded-3xl bg-white p-5 text-center text-sm text-[#002B5B]/60">
                  No teachers added yet.
                </p>
              ) : (
                data.teachers.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#002B5B]">
                        {t.name}
                      </p>
                      {t.department && (
                        <p className="text-xs text-[#002B5B]/60">
                          {t.department}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacher(t.id)}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'subjects' && (
          <>
            {renderProgramSemesterPicker()}

            {activeProgramId && activeSemesterId && (
              <form
                onSubmit={handleAddSubject}
                className="mb-5 space-y-3 rounded-3xl bg-white p-4"
              >
                <h2 className="text-sm font-semibold text-[#002B5B]">
                  Add Subject
                </h2>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Subject Name (e.g. Financial Accounting)"
                  className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
                />
                <div>
                  <input
                    type="text"
                    required
                    list="saved-teachers-list"
                    value={subjectTeacher}
                    onChange={(e) => setSubjectTeacher(e.target.value)}
                    placeholder="Teacher Name (select or type)"
                    className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
                  />
                  <datalist id="saved-teachers-list">
                    {data.teachers.map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#6495ED] py-3 text-base font-medium text-[#002B5B] active:opacity-80"
                >
                  Add Subject
                </button>
              </form>
            )}

            {activeProgramId && activeSemesterId && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/60">
                  Subjects ({currentSubjects.length})
                </p>
                {currentSubjects.length === 0 ? (
                  <p className="rounded-3xl bg-white p-5 text-center text-sm text-[#002B5B]/60">
                    No subjects in this semester yet.
                  </p>
                ) : (
                  currentSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#002B5B]">
                          {sub.name}
                        </p>
                        <p className="text-xs text-[#002B5B]/65">
                          Teacher: {sub.teacherName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {tab === 'students' && (
          <>
            {renderProgramSemesterPicker()}

            {activeProgramId && activeSemesterId && (
              <div className="mb-5 rounded-3xl bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#002B5B]">
                    {bulkMode ? 'Bulk Add Students' : 'Add Student'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setBulkMode((v) => !v)}
                    className="text-xs font-semibold text-[#6495ED]"
                  >
                    {bulkMode ? 'Single Entry' : 'Bulk Paste'}
                  </button>
                </div>

                {bulkMode ? (
                  <form onSubmit={handleBulkAddStudents} className="space-y-3">
                    <textarea
                      rows={5}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={'One student per line:\n01 - Ali Khan\n02 - Sara Ahmed\n03 - Hamza Tariq'}
                      className="w-full rounded-2xl bg-[#F8FAFF] p-3.5 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#6495ED] py-3 text-base font-medium text-[#002B5B] active:opacity-80"
                    >
                      Add All Students
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAddStudent} className="space-y-3">
                    <input
                      type="text"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="Roll No (e.g. BBA-01)"
                      className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
                    />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Student Name"
                      className="w-full rounded-2xl bg-[#F8FAFF] px-3.5 py-3 text-sm text-[#002B5B] outline-none ring-1 ring-[#6495ED]/30 focus:ring-2 focus:ring-[#6495ED]"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#6495ED] py-3 text-base font-medium text-[#002B5B] active:opacity-80"
                    >
                      Add Student
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeProgramId && activeSemesterId && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#002B5B]/60">
                  Students ({currentStudents.length})
                </p>
                {currentStudents.length === 0 ? (
                  <p className="rounded-3xl bg-white p-5 text-center text-sm text-[#002B5B]/60">
                    No students in this semester yet.
                  </p>
                ) : (
                  currentStudents.map((stu) => (
                    <div
                      key={stu.id}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#002B5B]">
                          {stu.name}
                        </p>
                        {stu.rollNo && (
                          <p className="text-xs text-[#002B5B]/60">
                            Roll No: {stu.rollNo}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(stu.id)}
                        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
