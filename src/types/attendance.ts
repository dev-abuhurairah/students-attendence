export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface Program {
  id: string;
  name: string;
  createdAt: number;
}

export interface Semester {
  id: string;
  programId: string;
  name: string;
  createdAt: number;
}

export interface Teacher {
  id: string;
  name: string;
  department?: string;
}

export interface Subject {
  id: string;
  programId: string;
  semesterId: string;
  name: string;
  teacherName: string;
}

export interface Student {
  id: string;
  programId: string;
  semesterId: string;
  rollNo: string;
  name: string;
}

export interface AttendanceSession {
  id: string; // `${subjectId}__${date}`
  programId: string;
  semesterId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>;
  updatedAt: number;
}

export interface AppData {
  programs: Program[];
  semesters: Semester[];
  teachers: Teacher[];
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
}
