import en from '../locales/en.json';
import tr from '../locales/tr.json';

type LocaleKey = keyof typeof en;
type Params = Record<string, string | number>;

const locales = { en, tr } as const;

const langKey: 'tr' | 'en' =
  (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';

const _strings: typeof en = { ...locales.en, ...locales[langKey] };

export function t(key: LocaleKey, params: Params = {}): string {
  const template = (_strings[key] ?? key) as string;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}
