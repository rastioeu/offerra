import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import de from './locales/de.json';
import en from './locales/en.json';
import sk from './locales/sk.json';

/**
 * Vlastná i18n vrstva (19.8.2026, zadanie „TRI JAZYKY ROZHRANIA") — ZÁMERNE
 * bez `i18next`/`react-i18next`. `npm install` je v tomto prostredí
 * zablokovaný (nedá sa ani vyskúšať, ani odmerať dopad na EAS fingerprint —
 * pridanie knižnice je Rastiovo rozhodnutie spolu s novým buildom, CLAUDE.md
 * §9). Tvar je vedome rovnaký ako MUTARK (`src/i18n/index.ts` tam) —
 * vnorené JSON súbory podľa obrazovky/komponentu, `{{premenná}}`
 * interpolácia, `t('domain.key')` — aby sa dalo neskôr bez veľkej prerábky
 * prejsť na knižnicu, ak Rastio schváli nový build.
 *
 * Detekcia jazyka zariadenia ide cez `Intl.DateTimeFormat().resolvedOptions()`
 * (Hermes vstavané, žiadny natívny modul) — rovnaký dôvod ako v MUTARKu:
 * `expo-localization` by bol nový natívny modul → nový build, nie OTA.
 */

export type LanguageCode = 'sk' | 'en' | 'de';
export type LanguageChoice = LanguageCode | 'system';
export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const SUPPORTED_LANGUAGES: { code: LanguageCode; native: string }[] = [
  { code: 'sk', native: 'Slovenčina' },
  { code: 'en', native: 'English' },
  { code: 'de', native: 'Deutsch' },
];

const RESOURCES: Record<LanguageCode, Record<string, Record<string, string>>> = {
  sk: sk as Record<string, Record<string, string>>,
  en: en as Record<string, Record<string, string>>,
  de: de as Record<string, Record<string, string>>,
};

const STORAGE_KEY = 'offerra-language';

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/** Jazyk zariadenia ako ISO 639-1, nie obmedzený na podporované. */
export function deviceLanguage(): string {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    return tag.split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
}

function resolveSystemLanguage(): LanguageCode {
  const device = deviceLanguage();
  return isSupportedLanguage(device) ? device : 'en';
}

function getPath(domain: Record<string, string> | undefined, key: string): string | undefined {
  if (!domain) return undefined;
  const value = domain[key];
  return typeof value === 'string' ? value : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    params[name] != null ? String(params[name]) : match,
  );
}

// Runtime hláška o chýbajúcom kľúči — dedupe za beh appky, nikdy tichý pád.
const reportedMissing = new Set<string>();

function translate(language: LanguageCode, path: string, params?: Record<string, string | number>): string {
  const [domainKey, ...rest] = path.split('.');
  const key = rest.join('.');
  const raw = getPath(RESOURCES[language]?.[domainKey], key) ?? getPath(RESOURCES.en[domainKey], key);
  if (raw == null) {
    const dedupeKey = `${language}:${path}`;
    if (!reportedMissing.has(dedupeKey)) {
      reportedMissing.add(dedupeKey);
      console.log(`[I18N] Chýbajúci preklad pre kľúč „${path}" (${language})`);
    }
    return path;
  }
  return interpolate(raw, params);
}

type I18nContextValue = {
  language: LanguageCode;
  choice: LanguageChoice;
  setLanguage: (choice: LanguageChoice) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<LanguageChoice>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'system' || isSupportedLanguage(saved)) setChoice(saved as LanguageChoice);
      })
      .catch((e: unknown) => console.log(`[I18N] Načítanie uloženého jazyka zlyhalo: ${String(e)}`))
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((next: LanguageChoice) => {
    setChoice(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((e: unknown) =>
      console.log(`[I18N] Uloženie jazyka zlyhalo: ${String(e)}`),
    );
  }, []);

  const language = choice === 'system' ? resolveSystemLanguage() : choice;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );

  const value = useMemo(() => ({ language, choice, setLanguage, t }), [language, choice, setLanguage, t]);

  // Krátky bootstrap kým sa načíta uložená voľba — appka je vtedy ešte za
  // splash screenom (root layout ho skryje až po tomto), takže sa nič
  // nepremihne v zlom jazyku.
  if (!ready) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation sa musí volať vnútri I18nProvider');
  return ctx;
}
