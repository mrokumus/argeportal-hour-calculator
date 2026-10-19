import en from '../locales/en.json';
import tr from '../locales/tr.json';
import type { LocalePreference } from '../types';

type LocaleKey = keyof typeof en;
type Params = Record<string, string | number>;

const locales = { en, tr } as const;

function browserLocale(): 'tr' | 'en' {
  return (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

let _locale = browserLocale();
let _strings: typeof en = { ...locales.en, ...locales[_locale] };

export function setLocale(preference: LocalePreference): void {
  const locale = preference === 'auto' ? browserLocale() : preference;
  _locale = locale;
  _strings = { ...locales.en, ...locales[locale] };
}

export function t(key: LocaleKey, params: Params = {}): string {
  const template = (_strings[key] ?? key) as string;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/** Same-month date range in the selected interface language. */
export function formatDateRange(start: string, end: string): string {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  const month = new Intl.DateTimeFormat(_locale, { month: 'long' }).format(last);
  const days = first.getDate() === last.getDate() ? `${first.getDate()}` : `${first.getDate()}–${last.getDate()}`;
  return _locale === 'tr' ? `${days} ${month}` : `${month} ${days}`;
}
