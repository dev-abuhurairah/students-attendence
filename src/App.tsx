import React, { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { AppData, AttendanceSession } from './types/attendance';
import {
  hydrateFromDatabase,
  loadAppData,
  saveAppData,
  saveAttendanceSession,
} from './services/storage';
import { PillButton } from './components/PillButton';
import { Header } from './components/Header';
import { SetupView } from './views/SetupView';
import { AttendanceView } from './views/AttendanceView';
import { ReportsView } from './views/ReportsView';
import { FloatingNavBar, type NavTab } from './components/FloatingNavBar';

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

  // Hydrate from IndexedDB on startup
  useEffect(() => {
    void hydrateFromDatabase().then((dbData) => {
      if (dbData && dbData.programs.length > 0) {
        setData(dbData);
      }
    });
  }, []);

  const updateData = (updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveAppData(next);
      return next;
    });
  };

  const handleSaveSession = async (session: AttendanceSession) => {
    const nextData = await saveAttendanceSession(data, session);
    setData(nextData);
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

  // -------------------------------------------------------------
  // Views
  // -------------------------------------------------------------
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
      <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
        <Header title="Overview" onBack={() => setScreen({ name: 'home' })} />
        <main className="mx-auto w-[90%] max-w-[540px] space-y-3 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-[#E0EAFF]">
              <p className="text-2xl font-bold tabular-nums text-[#002B5B]">
                {data.programs.length}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#002B5B]/65">
                Programs
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-[#E0EAFF]">
              <p className="text-2xl font-bold tabular-nums text-[#002B5B]">
                {data.semesters.length}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#002B5B]/65">
                Semesters
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-[#E0EAFF]">
              <p className="text-2xl font-bold tabular-nums text-[#002B5B]">
                {data.subjects.length}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#002B5B]/65">
                Subjects
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-[#E0EAFF]">
              <p className="text-2xl font-bold tabular-nums text-[#002B5B]">
                {data.students.length}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#002B5B]/65">
                Students
              </p>
            </div>
          </div>

          {/* Guide Instructions in Red Text */}
          <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm border border-[#E0EAFF]">
            <p className="mb-2 font-bold uppercase tracking-wider text-red-600">
              Guide Instructions:
            </p>
            <p className="font-semibold text-red-600">
              1. Open Setup to add Programs (e.g. BSCS, BBA), Semesters, Subjects with Teachers, and Students.
            </p>
            <p className="mt-1.5 font-semibold text-red-600">
              2. Tap Programs to select Semester and Subject to mark attendance date by date.
            </p>
            <p className="mt-1.5 font-semibold text-red-600">
              3. Open Reports to view and export full Single-Subject and All-Subjects Semester reports to Excel, PDF, or Mobile Gallery.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (screen.name === 'programs') {
    return (
      <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
        <Header
          title="Programs"
          subtitle="Select a Program"
          onBack={() => setScreen({ name: 'home' })}
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {data.programs.length === 0 ? (
            <div className="w-[88%] rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">
                No programs added yet. Please add a program first in Setup.
              </p>
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
        <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
          <Header
            title="Program"
            onBack={() => setScreen({ name: 'programs' })}
          />
          <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
            <div className="w-[88%] rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">
                Program not found. Please select a valid program.
              </p>
            </div>
          </main>
        </div>
      );
    }
    const semesters = data.semesters.filter(
      (s) => s.programId === program.id
    );

    return (
      <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
        <Header
          title={program.name}
          subtitle="Select Semester"
          onBack={() => setScreen({ name: 'programs' })}
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {semesters.length === 0 ? (
            <div className="w-[88%] rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">
                No semesters added. Please add semesters first in Setup.
              </p>
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
        <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
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
      <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
        <Header
          title={`${program.name} — ${semester.name}`}
          subtitle="Select Subject"
          onBack={() =>
            setScreen({ name: 'program', programId: program.id })
          }
        />
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
          {subjects.length === 0 ? (
            <div className="w-[88%] rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">
                No subjects added. Please add subjects first in Setup.
              </p>
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
                <p className="mt-1 text-center text-xs font-semibold text-[#002B5B]/75">
                  Teacher: {sub.teacherName || 'Not Assigned'}
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
        <div className="safe-bottom animate-screen-enter min-h-screen bg-[#F8FAFF]">
          <Header
            title="Attendance"
            onBack={() => setScreen({ name: 'home' })}
          />
          <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-4">
            <div className="w-[88%] rounded-2xl border border-red-200 bg-red-50 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-red-600">
                Program, semester, or subject not found.
              </p>
            </div>
          </main>
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

  // -------------------------------------------------------------
  // Home Screen: floating navigation bar with dev-abuhurairah
  // -------------------------------------------------------------
  return (
    <div className="safe-bottom animate-screen-enter relative min-h-screen bg-[#F8FAFF] pb-24">
      <Header title="Student Attendance" />

      <main className="mx-auto flex max-w-[560px] flex-col items-center gap-3.5 py-6">
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

        {/* Quick red guidance notice if initial setup is empty */}
        {data.programs.length === 0 && (
          <div className="w-[88%] mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-center shadow-sm">
            <p className="text-xs font-semibold text-red-600">
              No programs or classes added yet. Please tap Setup to get started.
            </p>
          </div>
        )}
      </main>

      {/* Floating Centered Rounded Navigation Bar with dev-abuhurairah */}
      <FloatingNavBar
        currentTab="home"
        onSelectTab={(tab: NavTab) => {
          if (tab === 'home') setScreen({ name: 'home' });
          else if (tab === 'setup') setScreen({ name: 'setup' });
          else if (tab === 'programs') setScreen({ name: 'programs' });
          else if (tab === 'reports') setScreen({ name: 'reports' });
          else if (tab === 'overview') setScreen({ name: 'overview' });
        }}
      />
    </div>
  );
};

export default App;
