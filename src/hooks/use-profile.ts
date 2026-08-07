/**
 * Vlastný profil používateľa — JEDEN zdieľaný stav pre celú appku.
 *
 * CHYBA, KTORÚ TO OPRAVUJE (7.8.2026, nahlásil Rastio): pôvodne volal
 * `useProfile()` každý, kto profil potreboval — brána v `_layout.tsx`,
 * obrazovka prezývky aj Profil. Boli to TRI nezávislé stavy. Keď si
 * používateľ uložil prezývku, obnovila sa len tá inštancia na obrazovke
 * prezývky; brána o novom profile nevedela a držala ho tam ďalej. Ďalšie
 * ťuknutie na „Pokračovať" poslalo druhý INSERT → „Túto prezývku už niekto
 * má" na vlastnú prezývku, a všetko vyplnené (vrátane telefónu) sa stratilo.
 *
 * Preto je profil teraz v kontexte: jeden `reload()` vidia všetci.
 *
 * `full_name` a `phone` sa NEDAJÚ prečítať cez tabuľku — rola
 * `authenticated` na tie stĺpce nemá SELECT (stĺpcový grant v DB).
 * Preto sa načítavajú cez `offerra.my_profile()`. Zápis cez tabuľku ide.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { db } from '@/lib/property';

export type MyProfile = {
  id: string;
  nickname: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type ProfileState = {
  /** `undefined` = ešte nevieme, `null` = prihlásený bez prezývky. */
  profile: MyProfile | null | undefined;
  error: string | null;
  reload: () => Promise<void>;
};

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return e instanceof Error ? e.message : String(e);
}

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setError(null);
    try {
      const { data, error: e } = await db().rpc('my_profile');
      if (e) throw e;
      const rows = (data ?? []) as MyProfile[];
      setProfile(rows[0] ?? null);
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[PROFIL] Načítanie zlyhalo: ${m}`);
      setError(m);
      setProfile(null);
    }
  }, [userId]);

  useEffect(() => {
    setProfile(undefined);
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ profile, error, reload }), [profile, error, reload]);
  return createElement(ProfileContext.Provider, { value }, children);
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile sa dá volať len vnútri <ProfileProvider>.');
  return ctx;
}

/** Vracia chybovú hlášku, alebo `null` pri úspechu. */
export async function saveProfile(
  userId: string,
  patch: Partial<Omit<MyProfile, 'id'>>,
  isNew: boolean
): Promise<string | null> {
  try {
    const { error } = isNew
      ? await db().from('profile').insert({ id: userId, ...patch })
      : await db().from('profile').update(patch).eq('id', userId);
    if (error) throw error;
    return null;
  } catch (e: unknown) {
    const m = message(e);
    console.log(`[PROFIL] Uloženie zlyhalo: ${m}`);
    // Kolízia na primárnom kľúči = profil už existuje (dvojité odoslanie).
    // Nie je to chyba používateľa a nesmie vyzerať ako obsadená prezývka.
    if (/profile_pkey|duplicate key.*pkey/i.test(m)) {
      return null;
    }
    if (/profile_nickname_key|duplicate key/i.test(m)) {
      return 'Túto prezývku už niekto má. Skús inú.';
    }
    if (/check constraint|nickname_check/i.test(m)) {
      return 'Prezývka musí mať 3 až 20 znakov.';
    }
    return m;
  }
}
