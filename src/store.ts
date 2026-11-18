import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert, Lecture, ScheduleBlock, Shade, Subject, SyllabusFile, Unit } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function abbreviate(name: string) {
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words[0].length <= 3) return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  return (words[0] ?? '???').slice(0, 3).toUpperCase();
}

interface Settings {
  language: 'en' | 'es';
  scheduleLocked?: boolean;
}

interface State {
  subjects: Subject[];
  blocks: ScheduleBlock[];
  lectures: Lecture[];
  units: Unit[];
  files: SyllabusFile[];
  alerts: Alert[];
  settings: Settings;

  addSubject: (name: string, shade?: Shade) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;

  upsertBlock: (b: ScheduleBlock) => void;
  removeBlock: (id: string) => void;

  addLecture: (l: Lecture) => void;
  updateLecture: (id: string, patch: Partial<Lecture>) => void;
  removeLecture: (id: string) => void;
  moveLectures: (ids: string[], unitId: string | null) => void;

  addUnit: (subjectId: string, name: string) => Unit;
  renameUnit: (id: string, name: string) => void;
  removeUnit: (id: string) => void;

  addFile: (f: SyllabusFile) => void;
  updateFile: (id: string, patch: Partial<SyllabusFile>) => void;
  removeFile: (id: string) => void;

  setAlertsFor: (lectureId: string, alerts: Alert[]) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;

  setLanguage: (l: Settings['language']) => void;
  setScheduleLocked: (locked: boolean) => void;
  wipe: () => void;
}

const empty = { subjects: [], blocks: [], lectures: [], units: [], files: [], alerts: [] };

/** v1 kept the AI's unit name on each lecture; v2 has real units the student owns */
function migrate(state: Record<string, any>, version: number) {
  if (version < 2) {
    const units: Unit[] = [];
    state.lectures = (state.lectures ?? []).map((l: any) => {
      let unitId: string | null = null;
      if (l.unit) {
        let u = units.find((x) => x.subjectId === l.subjectId && x.name === l.unit);
        if (!u) units.push((u = { id: uid(), subjectId: l.subjectId, name: l.unit, createdAt: l.createdAt ?? Date.now() }));
        unitId = u.id;
      }
      const { unit, ...rest } = l;
      return { ...rest, unitId };
    });
    state.units = units;
  }
  return state;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      settings: { language: 'en' },

      addSubject: (name, shade) => {
        const existing = get().subjects;
        const s: Subject = {
          id: uid(),
          name: name.trim(),
          abbr: abbreviate(name),
          shade: shade ?? (existing.length % 4) as Shade,
          createdAt: Date.now(),
        };
        set({ subjects: [...existing, s] });
        return s;
      },
      updateSubject: (id, patch) =>
        set((st) => ({
          subjects: st.subjects.map((s) =>
            s.id === id ? { ...s, ...patch, abbr: patch.name ? abbreviate(patch.name) : s.abbr } : s,
          ),
        })),
      removeSubject: (id) =>
        set((st) => ({
          subjects: st.subjects.filter((s) => s.id !== id),
          blocks: st.blocks.filter((b) => b.subjectId !== id),
          lectures: st.lectures.filter((l) => l.subjectId !== id),
          units: st.units.filter((u) => u.subjectId !== id),
          files: st.files.filter((f) => f.subjectId !== id),
          alerts: st.alerts.filter((a) => a.subjectId !== id),
        })),

      upsertBlock: (b) =>
        set((st) => ({
          blocks: st.blocks.some((x) => x.id === b.id) ? st.blocks.map((x) => (x.id === b.id ? b : x)) : [...st.blocks, b],
        })),
      removeBlock: (id) => set((st) => ({ blocks: st.blocks.filter((b) => b.id !== id) })),

      addLecture: (l) => set((st) => ({ lectures: [l, ...st.lectures] })),
      updateLecture: (id, patch) =>
        set((st) => ({ lectures: st.lectures.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLecture: (id) =>
        set((st) => ({
          lectures: st.lectures.filter((l) => l.id !== id),
          alerts: st.alerts.filter((a) => a.lectureId !== id),
        })),
      moveLectures: (ids, unitId) =>
        set((st) => ({ lectures: st.lectures.map((l) => (ids.includes(l.id) ? { ...l, unitId } : l)) })),

      addUnit: (subjectId, name) => {
        const u: Unit = { id: uid(), subjectId, name: name.trim(), createdAt: Date.now() };
        set((st) => ({ units: [...st.units, u] }));
        return u;
      },
      renameUnit: (id, name) => set((st) => ({ units: st.units.map((u) => (u.id === id ? { ...u, name: name.trim() } : u)) })),
      // its lectures stay in the subject, just without a unit
      removeUnit: (id) =>
        set((st) => ({
          units: st.units.filter((u) => u.id !== id),
          lectures: st.lectures.map((l) => (l.unitId === id ? { ...l, unitId: null } : l)),
        })),

      addFile: (f) => set((st) => ({ files: [...st.files, f] })),
      updateFile: (id, patch) => set((st) => ({ files: st.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFile: (id) => set((st) => ({ files: st.files.filter((f) => f.id !== id) })),

      setAlertsFor: (lectureId, alerts) =>
        set((st) => ({ alerts: [...st.alerts.filter((a) => a.lectureId !== lectureId), ...alerts] })),
      toggleAlert: (id) => set((st) => ({ alerts: st.alerts.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) })),
      removeAlert: (id) => set((st) => ({ alerts: st.alerts.filter((a) => a.id !== id) })),

      setLanguage: (language) => set((st) => ({ settings: { ...st.settings, language } })),
      setScheduleLocked: (scheduleLocked) => set((st) => ({ settings: { ...st.settings, scheduleLocked } })),
      wipe: () => set({ ...empty }),
    }),
    {
      name: 'classcribe',
      version: 2,
      migrate: (persisted, version) => migrate(persisted as Record<string, any>, version) as unknown as State,
      storage: createJSONStorage(() => AsyncStorage),
      // anything that was mid-processing when the app died can't resume on its own
      onRehydrateStorage: () => (state) => {
        state?.lectures.forEach((l) => {
          if (l.status === 'transcribing' || l.status === 'writing') state.updateLecture(l.id, { status: 'interrupted' });
        });
      },
    },
  ),
);
