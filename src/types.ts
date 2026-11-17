export type Shade = 0 | 1 | 2 | 3;

export interface Subject {
  id: string;
  name: string;
  abbr: string;
  shade: Shade;
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
  unit: string | null;
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
