/**
 * Vzhľad appky — systémový, svetlý alebo tmavý.
 *
 * PREČO PROVIDER A NIE LEN `useColorScheme()`:
 * do 8.8.2026 sa appka riadila výhradne systémovou témou. Kto mal na
 * telefóne zapnutý tmavý režim, dostal tmavú Offerru a **nemal sa ako
 * vrátiť** — appka v tom uviazla. Systémová téma je predvoľba, nie
 * väzenie, takže voľba musí byť aj v Nastaveniach.
 *
 * PREČO JE PREDVOLENÉ `light` A NIE `system`:
 * CLAUDE.md §5 — Offerra je light-first a schválená paleta („B — Navy
 * & Azure", 7.8.2026) je svetlá. Predvoliť `system` by znamenalo, že
 * väčšine ľudí s tmavým telefónom sa appka ukáže v podobe, ktorú nikto
 * neschvaľoval. Kto chce nasledovať telefón, prepne to jedným ťuknutím.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

import type { TFunc } from '@/i18n';
import { Colors, type Palette } from '@/theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

export function getThemeModeLabel(t: TFunc): Record<ThemeMode, string> {
  return {
    system: t('theme.system'),
    light: t('theme.light'),
    dark: t('theme.dark'),
  };
}

const KEY = 'offerra.themeMode';
const DEFAULT_MODE: ThemeMode = 'light';

type Ctx = { mode: ThemeMode; setMode: (m: ThemeMode) => void; palette: Palette; effective: 'light' | 'dark' };

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  // Uložená voľba dorazí až po prvom rendere. Do vtedy platí `light` —
  // krátky záblesk svetlej je menšie zlo než záblesk tmavej u človeka,
  // ktorý si výslovne vypýtal svetlú.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (!cancelled && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setModeState(saved);
        }
      } catch (e: unknown) {
        // Nedá sa načítať — appka pobeží so svetlou. Zamlčať to ale nebudem.
        console.log(`[VZHĽAD] Uloženú voľbu sa nepodarilo načítať: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    // Prepne sa OKAMŽITE, uloženie beží za tým. Keby sa čakalo na disk,
    // prepínač by pôsobil pokazene.
    setModeState(m);
    void AsyncStorage.setItem(KEY, m).catch((e: unknown) =>
      console.log(`[VZHĽAD] Voľbu sa nepodarilo uložiť: ${String(e)}`)
    );
  }, []);

  const effective: 'light' | 'dark' =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<Ctx>(
    () => ({ mode, setMode, effective, palette: Colors[effective] }),
    [mode, setMode, effective]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** Farby pre aktuálny vzhľad. */
export function useTheme(): Palette {
  const ctx = useContext(ThemeCtx);
  // Bez providera (napr. v teste) padáme na svetlú — nikdy nie na tmavú.
  return ctx?.palette ?? Colors.light;
}

/** Voľba vzhľadu pre Nastavenia. */
export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void; effective: 'light' | 'dark' } {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return { mode: DEFAULT_MODE, setMode: () => {}, effective: 'light' };
  return { mode: ctx.mode, setMode: ctx.setMode, effective: ctx.effective };
}
