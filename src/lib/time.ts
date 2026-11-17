import type { ScheduleBlock } from '../types';

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** 625 -> "10:25" */
export const hhmm = (min: number) => `${pad2(min / 60)}:${pad2(min % 60)}`;

/** seconds -> "00:32:14" */
export function clock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad2(s / 3600)}:${pad2((s / 60) % 60)}:${pad2(s % 60)}`;
}

/** monday = 0 … sunday = 6 */
export const weekday = (d = new Date()) => (d.getDay() + 6) % 7;
export const minutesOfDay = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** the class happening now, or one that starts within 10 minutes / ended less than 10 minutes ago */
export function currentBlock(blocks: ScheduleBlock[], now = new Date()) {
  const day = weekday(now);
  const m = minutesOfDay(now);
  const today = blocks.filter((b) => b.day === day);
  return (
    today.find((b) => m >= b.start && m < b.end) ??
    today.find((b) => b.start - m > 0 && b.start - m <= 10) ??
    today.find((b) => m - b.end >= 0 && m - b.end <= 10) ??
    null
  );
}

export function nextBlock(blocks: ScheduleBlock[], now = new Date()) {
  const day = weekday(now);
  const m = minutesOfDay(now);
  return blocks.filter((b) => b.day === day && b.start > m).sort((a, b) => a.start - b.start)[0] ?? null;
}

export function kickerDate(locale: string, d = new Date()) {
  const wd = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
  const md = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }).replace('.', '');
  return `${wd} · ${md}`.toUpperCase();
}

export const shortDate = (locale: string, ts: number | Date) =>
  new Date(ts).toLocaleDateString(locale, { month: 'short', day: 'numeric' }).replace('.', '');

export const dueDate = (locale: string, iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }).replace(/\./g, '');
};

export const timeOf = (locale: string, ts: number) =>
  new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
