import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { errorText } from '@/lib/errors';

export type SessionState = {
  /** `undefined` = ešte sa načítava, `null` = nikto nie je prihlásený. */
  session: Session | null | undefined;
};

/**
 * Jediný zdroj pravdy o prihlásení. Načíta uloženú session pri štarte
 * (AsyncStorage) a ďalej počúva na zmeny — prihlásenie, odhlásenie aj
 * automatické obnovenie tokenu.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // CLAUDE.md §2 — žiadny tichý catch. Nedá sa načítať uložená
          // session → správame sa ako neprihlásený, ale je to v logu.
          console.log(`[AUTH] Načítanie session zlyhalo: ${error.message}`);
        }
        setSession(data.session ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.log(`[AUTH] Neočakávaná chyba pri načítaní session: ${errorText(e)}`);
        setSession(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      console.log(`[AUTH] Zmena stavu: ${event}`);
      setSession(next ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session };
}
