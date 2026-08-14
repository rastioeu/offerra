/**
 * Úvodný walkthrough pred prvým prihlásením (Rastio, 14.8.2026).
 *
 * PREČO PROVIDER A NIE LEN `AsyncStorage.getItem()` priamo v bráne:
 * `_layout.tsx` (`decideRoute`) potrebuje vedieť, KEDY sa príznak zmenil,
 * nielen jeho hodnotu pri štarte appky — inak by po dokončení walkthroughu
 * appka smerovala späť naň, lebo brána by čítala starý (nenačítaný) stav.
 * Rovnaký dôvod, prečo je `profile` v `ProfileProvider` jeden zdieľaný
 * stav, nie kópia na obrazovku (komentár v `_layout.tsx`, 7.8.2026).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const KEY = 'offerra.walkthroughSeen';

type WalkthroughApi = {
  /** `undefined` = ešte sa nenačítalo z úložiska. */
  seen: boolean | undefined;
  markSeen: () => Promise<void>;
};

const WalkthroughCtx = createContext<WalkthroughApi | null>(null);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!cancelled) setSeen(v === '1');
      })
      .catch((e: unknown) => {
        // Chyba čítania nesmie appku navždy zamknúť na walkthroughu —
        // radšej ho preskočiť, než niekomu zablokovať prihlásenie.
        console.log(`[WALKTHROUGH] Načítanie zlyhalo: ${String(e)}`);
        if (!cancelled) setSeen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(async () => {
    setSeen(true);
    try {
      await AsyncStorage.setItem(KEY, '1');
    } catch (e: unknown) {
      console.log(`[WALKTHROUGH] Uloženie zlyhalo: ${String(e)}`);
    }
  }, []);

  return <WalkthroughCtx.Provider value={{ seen, markSeen }}>{children}</WalkthroughCtx.Provider>;
}

export function useWalkthrough(): WalkthroughApi {
  const ctx = useContext(WalkthroughCtx);
  if (!ctx) throw new Error('useWalkthrough sa musí volať vnútri WalkthroughProvider.');
  return ctx;
}
