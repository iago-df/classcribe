export type Shade = 0 | 1 | 2 | 3;

export interface Subject {
  id: string;
  name: string;
  abbr: string;
  shade: Shade; // colour of theory classes
  practiceShade?: Shade; // colour of practice classes, falls back to shade
  createdAt: number;
}

/** one class in the weekly timetable. day: 0 = monday … 4 = friday, times in minutes from midnight */
export interface ScheduleBlock {
  id: string;
  subjectId: string;
  day: number;
  start: number;
  end: number;
  room?: string;
  kind?: ClassKind; // theory when missing
}

export type ClassKind = 'theory' | 'practice';

/** a unit (tema) the student creates inside a subject to group its lectures */
export interface Unit {
  id: string;
  subjectId: string;
  name: string;
  createdAt: number;
}

export interface Segment {
  start: number; // seconds
  end: number;
  text: string;
}

export type NoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'formula'; text: string }
  | { type: 'exam'; text: string; at: number | null };

export type LectureStatus = 'transcribing' | 'writing' | 'ready' | 'error' | 'interrupted';

export interface Lecture {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  unitId: string | null; // one of the units the student created in the subject
  createdAt: number;
  durationMs: number;
  audioUri: string;
  status: LectureStatus;
  progress: number; // 0..1
  error?: string;
  usedSyllabus: boolean;
  seen: boolean;
  transcript?: Segment[];
  notes?: NoteBlock[];
  serverJob?: string; // set while the student's own server is handling this lecture
  waiting?: boolean; // that server can't be reached right now
}

export interface SyllabusFile {
  id: string;
  subjectId: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  current: boolean;
  createdAt: number;
  parentId: string | null; // folder it lives in, null = syllabus root
}

/** a folder in a subject's syllabus; folders can live inside folders */
export interface Folder {
  id: string;
  subjectId: string;
  parentId: string | null;
  name: string;
  createdAt: number;
}

export type AlertKind = 'exam' | 'homework' | 'notice';

export interface Alert {
  id: string;
  lectureId: string;
  subjectId: string;
  kind: AlertKind;
  quote: string;
  summary: string;
  at: number | null; // seconds into the recording
  due: string | null; // yyyy-mm-dd
  createdAt: number;
  done: boolean;
}
