/**
 * Načítanie inzerátov. Tri hooky, lebo tri rôzne otázky:
 *  - `useProperties`      — verejný katalóg (RLS pustí len ACTIVE)
 *  - `useProperty`        — detail jedného
 *  - `useMyProperties`    — moje vrátane DRAFT (RLS pustí vlastníkovi)
 *
 * ŽIADNY TICHÝ CATCH: každá chyba sa vracia volajúcemu ako `error` a
 * obrazovka ju MUSÍ zobraziť. „Nestane sa nič" je zakázaná reakcia.
 */
import { useCallback, useEffect, useState } from 'react';

import { db, type Media, type Property, type PropertyWithMedia } from '@/lib/property';

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return e instanceof Error ? e.message : String(e);
}

/** Fotky sa doťahujú jedným dotazom pre celý zoznam, nie N+1 na kartu. */
async function attachMedia(rows: Property[]): Promise<PropertyWithMedia[]> {
  if (rows.length === 0) return [];
  const { data, error } = await db()
    .from('media')
    .select('*')
    .in('property_id', rows.map((r) => r.id))
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const byProperty = new Map<string, Media[]>();
  for (const m of (data ?? []) as Media[]) {
    const list = byProperty.get(m.property_id);
    if (list) list.push(m);
    else byProperty.set(m.property_id, [m]);
  }
  return rows.map((r) => ({ ...r, media: byProperty.get(r.id) ?? [] }));
}

export function useProperties() {
  const [items, setItems] = useState<PropertyWithMedia[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('property')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(200);
      if (e) throw e;
      setItems(await attachMedia((data ?? []) as Property[]));
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[KATALÓG] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}

export function useProperty(id: string | undefined) {
  const [item, setItem] = useState<PropertyWithMedia | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const { data, error: e } = await db().from('property').select('*').eq('id', id).maybeSingle();
      if (e) throw e;
      if (!data) {
        setItem(null);
        return;
      }
      const [withMedia] = await attachMedia([data as Property]);
      setItem(withMedia);
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[DETAIL] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItem(null);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { item, error, reload };
}

export function useMyProperties(userId: string | undefined) {
  const [items, setItems] = useState<PropertyWithMedia[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('property')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });
      if (e) throw e;
      setItems(await attachMedia((data ?? []) as Property[]));
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[MOJE] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}
