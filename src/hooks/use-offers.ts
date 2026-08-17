/**
 * Ponuky a dopyty.
 *
 * `useOffers` je ZÁMERNE bez tokenu — zoznam ponúk na inzeráte je verejný
 * a načíta sa aj neprihlásenému. Dotazník nájomcu sa doťahuje osobitne
 * (`useTenantProfiles`), lebo verejný nie je a cudziemu vráti prázdno.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  fetchOfferMessages,
  OFFER_PUBLIC_COLS,
  type BuyerRequest,
  type MyOutreach,
  type Offer,
  type Outreach,
  type TenantProfile,
} from '@/lib/offers';
import { db, type CatalogSort } from '@/lib/property';
import { stemQuery, type CatalogFilter } from '@/lib/search';
import { errorText } from '@/lib/errors';

/** Verejný zoznam ponúk na inzeráte, zoradený podľa sumy zostupne. */
export function useOffers(propertyId: string | undefined) {
  const [offers, setOffers] = useState<Offer[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!propertyId) return;
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('property_offer')
        .select(`${OFFER_PUBLIC_COLS}, bidder:bidder_id(nickname, avatar_url)`)
        .eq('property_id', propertyId)
        .order('amount', { ascending: false });
      if (e) throw e;
      // `message` v odpovedi zámerne nie je (nie je vo výbere stĺpcov),
      // preto `Omit` — dopĺňa sa až nižšie z `offer_messages()`.
      const rows = (data ?? []) as unknown as Omit<Offer, 'message'>[];

      // Správa NIE JE súčasťou riadku — doťahuje sa osobitne a len tá,
      // na ktorú má volajúci nárok. Robí sa to tu, na jedinom mieste, aby
      // každá obrazovka ďalej čítala `o.message` a nemusela o tom vedieť.
      let messages: Record<string, string> = {};
      try {
        messages = await fetchOfferMessages(propertyId);
      } catch (me: unknown) {
        // Neprihlásený sem legitímne nedosiahne — ponuky sa musia zobraziť
        // aj tak, len bez správ. Zamlčať to ale nebudem.
        console.log(`[PONUKY] Správy nedostupné: ${errorText(me)}`);
      }
      setOffers(rows.map((o) => ({ ...o, message: messages[o.id] ?? null })));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Načítanie zlyhalo: ${m}`);
      setError(m);
      setOffers([]);
    }
  }, [propertyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { offers, error, reload };
}

/** Dotazníky nájomcu k daným ponukám. Cudziemu vráti prázdnu mapu — RLS. */
export function useTenantProfiles(offerIds: string[]) {
  const [map, setMap] = useState<Record<string, TenantProfile>>({});
  const key = offerIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (offerIds.length === 0) {
        setMap({});
        return;
      }
      try {
        const { data, error } = await db().from('tenant_profile').select('*').in('offer_id', offerIds);
        if (error) throw error;
        if (cancelled) return;
        const next: Record<string, TenantProfile> = {};
        for (const t of (data ?? []) as TenantProfile[]) next[t.offer_id] = t;
        setMap(next);
      } catch (e: unknown) {
        // Nie je to chyba používateľa — cudzí dotazník proste nevidí.
        console.log(`[DOTAZNÍK] Nedostupný: ${errorText(e)}`);
        if (!cancelled) setMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}

/** Ponuky, ktoré som odoslal ja. */
export function useMyOffers(userId: string | undefined) {
  const [items, setItems] = useState<(Offer & { property: { title: string; transaction_type: 'SALE' | 'RENT' } | null })[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('property_offer')
        .select(`${OFFER_PUBLIC_COLS}, property:property_id(title, transaction_type)`)
        .eq('bidder_id', userId)
        .order('created_at', { ascending: false });
      if (e) throw e;
      // `message` sa tu zámerne neťahá — zoznam mojich ponúk ju nezobrazuje
      // a je viazaná na inzerát, nie na používateľa.
      setItems((data ?? []).map((r) => ({ ...r, message: null })) as never);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[MOJE PONUKY] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}

/** Verejný zoznam dopytov (RLS pustí len ACTIVE), alebo moje vlastné. */
/**
 * Dopyty. `filter` je ten ISTÝ objekt ako v katalógu (`CatalogFilter`) —
 * rozhodnutie Rastia 8.8.2026 (možnosť B): rovnaká mechanika, iné slová.
 *
 * Rozdiel oproti katalógu je v NULL-och, a je podstatný: dopyt „akýkoľvek
 * typ" má `property_type = null` a dopyt bez hornej hranice `budget_max =
 * null`. Taký dopyt sedí na ČOKOĽVEK, takže ho filter NESMIE odfiltrovať —
 * inak by človek hľadajúci kupcov na byt prišiel práve o tých, ktorí sú
 * ochotní vziať čokoľvek. Preto je pri každom poli `or (… is null)`.
 */
export function useRequests(mineOf?: string, filter?: CatalogFilter, sort: CatalogSort = 'NEWEST') {
  const [items, setItems] = useState<BuyerRequest[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // Filter je objekt — bez tohto by sa `reload` menil pri každom rendere.
  const key = JSON.stringify(filter ?? null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const f = (JSON.parse(key) ?? null) as CatalogFilter | null;
      let q = db().from('buyer_request').select('*, author:user_id(nickname, avatar_url)');
      q = mineOf ? q.eq('user_id', mineOf) : q.eq('status', 'ACTIVE');

      if (f?.transaction) q = q.eq('transaction_type', f.transaction);
      if (f?.propertyType) q = q.or(`property_type.eq.${f.propertyType},property_type.is.null`);
      if (f?.city) q = q.eq('city', f.city);
      if (f?.roomsMin != null) q = q.or(`rooms_min.gte.${f.roomsMin},rooms_min.is.null`);
      if (f?.areaMin != null) q = q.or(`area_min.gte.${f.areaMin},area_min.is.null`);
      if (f?.priceMax != null) q = q.or(`budget_max.lte.${f.priceMax},budget_max.is.null`);
      if (f?.priceMin != null) q = q.or(`budget_min.gte.${f.priceMin},budget_min.is.null`);
      if (f?.text) {
        // To isté ako v katalógu: slovo po slove a cez koreň, aby
        // skloňovaný tvar („v Košiciach") našiel svoje mesto.
        for (const w of stemQuery(f.text.replace(/[%,()]/g, ' ')).split(' ')) {
          if (w) q = q.like('search_norm', `%${w}%`);
        }
      }

      // Triedenie (Rastio, 17.8.2026). Dopyty ponúkajú LEN „Najnovšie"
      // (`DEMAND_SORTS`) — `buyer_request` nemá uzávierku, takže „Čoskoro
      // končí" tu nemá podľa čoho triediť a keby ho niekto aj tak podal,
      // zoznam ostane podľa novosti. Nie je to tichý pád: iná možnosť sa
      // v Dopytoch nedá ani vybrať.
      const { data, error: e } = await q
        .order('created_at', { ascending: false })
        .limit(200);
      if (e) throw e;
      if (sort !== 'NEWEST') {
        console.log(`[DOPYTY] Triedenie ${sort} dopyty nepodporujú — zoradené podľa novosti`);
      }
      setItems((data ?? []) as BuyerRequest[]);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[DOPYTY] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [mineOf, key, sort]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}

export function useRequest(id: string | undefined) {
  const [item, setItem] = useState<BuyerRequest | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const { data, error: e } = await db()
        .from('buyer_request')
        .select('*, author:user_id(nickname, avatar_url)')
        .eq('id', id)
        .maybeSingle();
      if (e) throw e;
      setItem((data as BuyerRequest) ?? null);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[DOPYT] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItem(null);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { item, error, reload };
}

/** Oslovenia k dopytu — vidí ich len autor dopytu a ten, kto oslovil. */
/**
 * Oslovenia MOJICH dopytov — aj s inzerátom, ktorý mi ponúkajú.
 *
 * `requestId` nepovinné: bez neho vráti oslovenia VŠETKÝCH mojich dopytov
 * (to potrebuje časová os v „Moje"), s ním len jedného.
 */
export function useMyOutreach(requestId?: string) {
  const [items, setItems] = useState<MyOutreach[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data, error: e } = await db().rpc('my_request_outreach');
      if (e) throw e;
      const all = (data ?? []) as MyOutreach[];
      setItems(requestId ? all.filter((o) => o.request_id === requestId) : all);
      setError(null);
    } catch (e: unknown) {
      // ŽIADNY TICHÝ CATCH: prázdny zoznam a chyba sú dve rôzne veci
      // a používateľ musí vidieť, ktorá to je.
      const m = errorText(e);
      console.log(`[OSLOVENIA] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [requestId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, error, reload };
}

export function useOutreach(requestId: string | undefined) {
  const [items, setItems] = useState<Outreach[]>([]);

  const reload = useCallback(async () => {
    if (!requestId) return;
    try {
      const { data, error } = await db()
        .from('request_outreach')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data ?? []) as Outreach[]);
    } catch (e: unknown) {
      console.log(`[OSLOVENIA] Nedostupné: ${errorText(e)}`);
      setItems([]);
    }
  }, [requestId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, reload };
}
