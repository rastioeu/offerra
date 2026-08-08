/**
 * Obhliadky k jednému inzerátu.
 *
 * Vracia VŠETKY, ktoré volajúci smie vidieť — RLS to zúži samo: záujemcovi
 * na tú jeho, majiteľovi na všetky na jeho inzerát. Appka sa preto nemusí
 * pýtať „som vlastník?", odpoveď už je v dátach.
 */
import { useCallback, useEffect, useState } from 'react';

import { errorText } from '@/lib/errors';
import { db } from '@/lib/property';
import type { Viewing } from '@/lib/viewing';

export function useViewings(propertyId: string | undefined) {
  const [items, setItems] = useState<Viewing[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!propertyId) return;
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('viewing')
        .select('id, property_id, requester_id, status, created_at, updated_at')
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
