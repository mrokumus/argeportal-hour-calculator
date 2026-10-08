import en from '../locales/en.json';
import tr from '../locales/tr.json';
import type { LocalePreference } from '../types';

type LocaleKey = keyof typeof en;
type Params = Record<string, string | number>;

const locales = { en, tr } as const;

function browserLocale(): 'tr' | 'en' {
  return (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

let _strings: typeof en = { ...locales.en, ...locales[browserLocale()] };

export function setLocale(preference: LocalePreference): void {
  const locale = preference === 'auto' ? browserLocale() : preference;
  _strings = { ...locales.en, ...locales[locale] };
}

export function t(key: LocaleKey, params: Params = {}): string {
  const template = (_strings[key] ?? key) as string;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}
