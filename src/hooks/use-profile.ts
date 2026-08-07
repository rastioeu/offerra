/**
 * Vlastný profil používateľa.
 *
 * `full_name` a `phone` sa NEDAJÚ prečítať cez tabuľku — rola
 * `authenticated` na tie stĺpce nemá SELECT (stĺpcový grant v DB).
 * Preto sa načítavajú cez `offerra.my_profile()`. Zápis naopak cez
 * tabuľku ide, `UPDATE` na tie stĺpce grant má.
 *
 * `profile === null` znamená „prihlásený, ale ešte bez prezývky" — na to
 * sa vieže brána v `_layout.tsx`.
 */
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/lib/property';

export type MyProfile = {
  id: string;
  nickname: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return e instanceof Error ? e.message : String(e);
}

export function useProfile(userId: string | undefined) {
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
    void reload();
  }, [reload]);

  return { profile, error, reload };
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
    // Jediné obmedzenie, ktoré používateľ reálne trafí, je obsadená prezývka.
    if (/duplicate key|profile_nickname_key/i.test(m)) {
      return 'Túto prezývku už niekto má. Skús inú.';
    }
    if (/check constraint|nickname_check/i.test(m)) {
      return 'Prezývka musí mať 3 až 20 znakov.';
    }
    return m;
  }
}
