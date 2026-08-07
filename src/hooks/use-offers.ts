/**
 * Ponuky a dopyty.
 *
 * `useOffers` je ZÁMERNE bez tokenu — zoznam ponúk na inzeráte je verejný
 * a načíta sa aj neprihlásenému. Dotazník nájomcu sa doťahuje osobitne
 * (`useTenantProfiles`), lebo verejný nie je a cudziemu vráti prázdno.
 */
import { useCallback, useEffect, useState } from 'react';

import type { BuyerRequest, Offer, Outreach, TenantProfile } from '@/lib/offers';
import { db } from '@/lib/property';

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return e instanceof Error ? e.message : String(e);
}

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
        .select('*, bidder:bidder_id(nickname, avatar_url)')
        .eq('property_id', propertyId)
        .order('amount', { ascending: false });
      if (e) throw e;
      setOffers((data ?? []) as Offer[]);
    } catch (e: unknown) {
      const m = message(e);
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
        console.log(`[DOTAZNÍK] Nedostupný: ${message(e)}`);
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
        .select('*, property:property_id(title, transaction_type)')
        .eq('bidder_id', userId)
        .order('created_at', { ascending: false });
      if (e) throw e;
      setItems((data ?? []) as never);
    } catch (e: unknown) {
      const m = message(e);
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
export function useRequests(mineOf?: string) {
  const [items, setItems] = useState<BuyerRequest[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      let q = db().from('buyer_request').select('*, author:user_id(nickname, avatar_url)');
      q = mineOf ? q.eq('user_id', mineOf) : q.eq('status', 'ACTIVE');
      const { data, error: e } = await q.order('created_at', { ascending: false }).limit(200);
      if (e) throw e;
      setItems((data ?? []) as BuyerRequest[]);
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[DOPYTY] Načítanie zlyhalo: ${m}`);
      setError(m);
      setItems([]);
    }
  }, [mineOf]);

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
      const m = message(e);
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
      console.log(`[OSLOVENIA] Nedostupné: ${message(e)}`);
      setItems([]);
    }
  }, [requestId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, reload };
}
