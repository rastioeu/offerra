/**
 * Obhliadky — dva pohľady na tú istú tabuľku.
 *
 *  - `useViewings(propertyId)` — čo sa deje na MOJOM inzeráte (majiteľ)
 *  - `useMyViewings(userId)`   — kam som sa prihlásil ja (záujemca)
 *
 * RLS pustí obom stranám len ich riadky, takže sa nedá omylom pozrieť na
 * cudzie obhliadky ani vtedy, keby sa filter v appke pokazil.
 *
 * ŽIADNY TICHÝ CATCH: chyba sa vracia volajúcemu ako `error` a obrazovka
 * ju musí zobraziť.
 */
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/lib/property';
import { errorText } from '@/lib/errors';
import type { Viewing } from '@/lib/viewings';

export function useViewings(propertyId: string | undefined) {
  const [items, setItems] = useState<Viewing[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!propertyId) return;
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('viewing')
        .select('*, requester:requester_id(nickname)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (e) throw e;
      setItems((data ?? []) as Viewing[]);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKY] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [propertyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}

export function useMyViewings(userId: string | undefined) {
  const [items, setItems] = useState<Viewing[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('viewing')
        .select('*, property:property_id(id, title, city)')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });
      if (e) throw e;
      setItems((data ?? []) as Viewing[]);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKY] Načítanie mojich zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}
