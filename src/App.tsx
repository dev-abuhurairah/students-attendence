import React, { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { AppData, AttendanceSession } from './types/attendance';
import { loadAppData, saveAppData } from './services/storage';
import { PillButton } from './components/PillButton';
import { Header } from './components/Header';
import { SetupView } from './views/SetupView';
import { AttendanceView } from './views/AttendanceView';
import { ReportsView } from './views/ReportsView';

type Screen =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'programs' }
  | { name: 'reports' }
  | { name: 'overview' }
  | { name: 'program'; programId: string }
  | { name: 'semester'; programId: string; semesterId: string }
  | {
      name: 'attendance';
      programId: string;
      semesterId: string;
      subjectId: string;
    };

export const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  const updateData = (updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveAppData(next);
      return next;
    });
  };

  const handleSaveSession = (session: AttendanceSession) => {
    updateData((prev) => {
      const exists = prev.sessions.some((s) => s.id === session.id);
      return {
        ...prev,
        sessions: exists
          ? prev.sessions.map((s) => (s.id === session.id ? session : s))
          : [...prev.sessions, session],
      };
    });
  };

  // Handle Android hardware back button cleanly
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapApp.addListener('backButton', () => {
      setScreen((curr) => {
        if (curr.name === 'attendance') {
          return {
            name: 'semester',
            programId: curr.programId,
            semesterId: curr.semesterId,
          };
        }
        if (curr.name === 'semester') {
          return { name: 'program', programId: curr.programId };
        }
        if (curr.name === 'program') {
          return { name: 'programs' };
        }
        if (
          curr.name === 'programs' ||
          curr.name === 'setup' ||
          curr.name === 'reports' ||
          curr.name === 'overview'
        ) {
          return { name: 'home' };
        }
        CapApp.exitApp();
        return curr;
      });
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, []);

  if (screen.name === 'setup') {
    return (
      <SetupView
        data={data}
        onUpdateData={updateData}
        onBackHome={() => setScreen({ name: 'home' })}
      />
    );
  }

  if (screen.name === 'reports') {
    return (
      <ReportsView data={data} onBack={() => setScreen({ name: 'home' })} />
    );
  }

  if (screen.name === 'overview') {
    return (
      <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
        <Header title="Overview" onBack={() => setScreen({ name: 'home' })} />
        <main className="mx-auto w-[90%] max-w-[540px] space-y-2.5 py-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[#002B5B]">
                {data.programs.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#002B5B]/65">
                Programs
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[#002B5B]">
                {data.semesters.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#002B5B]/65">
                Semesters
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[#002B5B]">
                {data.subjects.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#002B5B]/65">
                Subjects
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[#002B5B]">
                {data.students.length}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#002B5B]/65">
                Students
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-[#002B5B]/80">
            <p className="mb-2 font-semibold text-[#002B5B]">How to use:</p>
            <p>
              1. Open <strong>Setup</strong> to add Programs (e.g. BBA),
              Semesters, Subjects with Teachers, and Students.
            </p>
            <p className="mt-1">
              2. Your created Programs appear as buttons on the Home screen.
            </p>
            <p className="mt-1">
              3. Tap a Program &rarr; Semester &rarr; Subject to mark Present,
              Absent, or Leave and generate an Excel sheet.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (screen.name === 'programs') {
    return (
      <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
        <Header
          title="Programs"
          subtitle="Select a Program"
          onBack={() => setScreen({ name: 'home' })}
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {data.programs.length === 0 ? (
            <div className="w-[88%] rounded-2xl bg-white p-5 text-center text-sm text-[#002B5B]/70">
              No programs added yet. Go to Setup &gt; Subjects to add your first
              program (e.g. BBA).
            </div>
          ) : (
            data.programs.map((prog) => (
              <PillButton
                key={prog.id}
                label={prog.name}
                onClick={() =>
                  setScreen({ name: 'program', programId: prog.id })
                }
              />
            ))
          )}
        </main>
      </div>
    );
  }

  if (screen.name === 'program') {
    const program = data.programs.find((p) => p.id === screen.programId);
    if (!program) {
      return (
        <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
          <Header
            title="Program"
            onBack={() => setScreen({ name: 'programs' })}
          />
        </div>
      );
    }
    const semesters = data.semesters.filter(
      (s) => s.programId === program.id
    );

    return (
      <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
        <Header
          title={program.name}
          subtitle="Select Semester"
          onBack={() => setScreen({ name: 'programs' })}
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {semesters.length === 0 ? (
            <div className="w-[88%] rounded-2xl bg-white p-5 text-center text-sm text-[#002B5B]/70">
              No semesters added for {program.name} yet. Go to Setup &gt;
              Subjects to add semesters.
            </div>
          ) : (
            semesters.map((sem) => (
              <PillButton
                key={sem.id}
                label={sem.name}
                onClick={() =>
                  setScreen({
                    name: 'semester',
                    programId: program.id,
                    semesterId: sem.id,
                  })
                }
              />
            ))
          )}
        </main>
      </div>
    );
  }

  if (screen.name === 'semester') {
    const program = data.programs.find((p) => p.id === screen.programId);
    const semester = data.semesters.find((s) => s.id === screen.semesterId);
    if (!program || !semester) {
      return (
        <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
          <Header
            title="Semester"
            onBack={() => setScreen({ name: 'home' })}
          />
        </div>
      );
    }

    const subjects = data.subjects.filter(
      (sub) => sub.programId === program.id && sub.semesterId === semester.id
    );

    return (
      <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
        <Header
          title={`${program.name} — ${semester.name}`}
          subtitle="Select Subject"
          onBack={() =>
            setScreen({ name: 'program', programId: program.id })
          }
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {subjects.length === 0 ? (
            <div className="w-[88%] rounded-2xl bg-white p-5 text-center text-sm text-[#002B5B]/70">
              No subjects added for {semester.name} yet. Go to Setup &gt;
              Subjects to add subjects and teachers.
            </div>
          ) : (
            subjects.map((sub) => (
              <div key={sub.id} className="flex w-full flex-col items-center">
                <PillButton
                  label={sub.name}
                  onClick={() =>
                    setScreen({
                      name: 'attendance',
                      programId: program.id,
                      semesterId: semester.id,
                      subjectId: sub.id,
                    })
                  }
                />
                <p className="mt-1 text-center text-xs font-medium text-[#002B5B]/75">
                  Teacher: {sub.teacherName}
                </p>
              </div>
            ))
          )}
        </main>
      </div>
    );
  }

  if (screen.name === 'attendance') {
    const program = data.programs.find((p) => p.id === screen.programId);
    const semester = data.semesters.find((s) => s.id === screen.semesterId);
    const subject = data.subjects.find((sub) => sub.id === screen.subjectId);

    if (!program || !semester || !subject) {
      return (
        <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
          <Header
            title="Attendance"
            onBack={() => setScreen({ name: 'home' })}
          />
        </div>
      );
    }

    return (
      <AttendanceView
        data={data}
        program={program}
        semester={semester}
        subject={subject}
        onSaveSession={handleSaveSession}
        onBack={() =>
          setScreen({
            name: 'semester',
            programId: program.id,
            semesterId: semester.id,
          })
        }
      />
    );
  }

  // Home Screen: clean fixed buttons without crowding
  return (
    <div className="safe-bottom min-h-screen bg-[#F8FAFF]">
      <Header title="Student Attendance" />

      <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
        <PillButton
          label="Setup"
          onClick={() => setScreen({ name: 'setup' })}
        />
        <PillButton
          label="Programs"
          onClick={() => setScreen({ name: 'programs' })}
        />
        <PillButton
          label="Reports"
          onClick={() => setScreen({ name: 'reports' })}
        />
        <PillButton
          label="Overview"
          onClick={() => setScreen({ name: 'overview' })}
        />
      </main>
    </div>
  );
};

export default App;
