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

import type { CatalogFilter } from '@/lib/search';
import { db, sortProperties, type CatalogSort, type Media, type Property, type PropertyWithMedia } from '@/lib/property';
import { errorText } from '@/lib/errors';

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

/**
 * Súhrn ponúk pre karty v katalógu — najvyššia ŽIVÁ ponuka a ich počet.
 * Jeden dotaz na celú stránku, nie jeden na kartu.
 */
async function attachOfferStats(rows: PropertyWithMedia[]): Promise<PropertyWithMedia[]> {
  if (rows.length === 0) return rows;
  const { data, error } = await db()
    .from('property_offer')
    .select('property_id, amount, status')
    .in('property_id', rows.map((r) => r.id));
  if (error) throw error;

  // ŽIVÁ ponuka = tá, ktorá ešte stojí. Stiahnutá ani odmietnutá sa
  // nepočíta — inak by karta hlásila „2 ponuky" pri inzeráte, kde obe
  // dávno padli. Rovnaká definícia ako v detaile (`price-display`).
  const best = new Map<string, { top: number | null; count: number }>();
  for (const o of (data ?? []) as { property_id: string; amount: number; status: string }[]) {
    if (o.status !== 'PENDING' && o.status !== 'ACCEPTED') continue;
    const cur = best.get(o.property_id) ?? { top: null, count: 0 };
    cur.count += 1;
    if (cur.top == null || o.amount > cur.top) cur.top = o.amount;
    best.set(o.property_id, cur);
  }
  return rows.map((r) => ({
    ...r,
    top_offer: best.get(r.id)?.top ?? null,
    offer_count: best.get(r.id)?.count ?? 0,
  }));
}

export function useProperties(filter?: CatalogFilter, sort: CatalogSort = 'NEWEST') {
  const [items, setItems] = useState<PropertyWithMedia[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // Filter je objekt — bez tohto by sa `reload` menil pri každom rendere.
  const key = JSON.stringify(filter ?? null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const f = (JSON.parse(key) ?? null) as CatalogFilter | null;
      let q = db().from('property').select('*').eq('status', 'ACTIVE');

      if (f?.transaction) q = q.eq('transaction_type', f.transaction);
      if (f?.propertyType) q = q.eq('property_type', f.propertyType);
      if (f?.city) q = q.eq('city', f.city);
      if (f?.roomsMin != null) q = q.gte('rooms', f.roomsMin);
      if (f?.areaMin != null) q = q.gte('area_m2', f.areaMin);
      // Inzerát BEZ ceny sa cenovým filtrom nesmie stratiť — je to celá
      // pointa Offerry, že cena je nepovinná. Preto `or` s `is null`.
      if (f?.priceMax != null) q = q.or(`asking_price_hint.lte.${f.priceMax},asking_price_hint.is.null`);
      if (f?.priceMin != null) q = q.or(`asking_price_hint.gte.${f.priceMin},asking_price_hint.is.null`);
      if (f?.text) {
        const t = f.text.replace(/[%,()]/g, ' ').trim();
        if (t) q = q.or(`title.ilike.*${t}*,description.ilike.*${t}*,city.ilike.*${t}*`);
      }

      // Server radí od najnovšieho — to je predvolené poradie katalógu.
      // „Čoskoro končí" sa dorovná v `sortProperties`, lebo SQL by dalo
      // hore inzeráty, ktorým termín DÁVNO vypršal (viď komentár tam).
      const { data, error: e } = await q.order('created_at', { ascending: false }).limit(200);
      if (e) throw e;
      const rows = await attachOfferStats(await attachMedia((data ?? []) as Property[]));
      setItems(sortProperties(rows, sort));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[KATALÓG] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [key, sort]);

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
      const m = errorText(e);
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
      const m = errorText(e);
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
