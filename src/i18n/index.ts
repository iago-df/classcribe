import en, { type Dict } from './en';
import es from './es';
import { useStore } from '../store';

export type Lang = 'en' | 'es';
const dicts: Record<Lang, Dict> = { en, es };

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends readonly string[] ? never : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type Key = Leaves<Dict>;

function lookup(d: Dict, key: string): string {
  let cur: any = d;
  for (const part of key.split('.')) cur = cur?.[part];
  return typeof cur === 'string' ? cur : key;
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let s = lookup(dicts[lang], key);
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export function useT() {
  const lang = useStore((s) => s.settings.language);
  const t = (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { t, lang, dict: dicts[lang], locale: lang === 'es' ? 'es-ES' : 'en-US' };
}
