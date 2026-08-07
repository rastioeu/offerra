/**
 * Obľúbené inzeráty. SÚKROMNÉ — nikto nemá vidieť, čo si niekto iný
 * odložil; pri nehnuteľnostiach to prezrádza zámery aj rozpočet.
 * Drží to RLS, nie len UI.
 */
import { useCallback, useEffect, useState } from 'react';

import { db, type Media, type Property, type PropertyWithMedia } from '@/lib/property';

export function useFavoriteIds(userId: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    if (!userId) {
      setIds(new Set());
      return;
    }
    try {
      const { data, error } = await db().from('favorite').select('property_id');
      if (error) throw error;
      setIds(new Set(((data ?? []) as { property_id: string }[]).map((r) => r.property_id)));
    } catch (e: unknown) {
      console.log(`[OBĽÚBENÉ] Načítanie zlyhalo: ${String(e)}`);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Vracia nový stav, alebo `null` ak sa to nepodarilo. */
  const toggle = useCallback(
    async (propertyId: string): Promise<boolean | null> => {
      if (!userId) return null;
      const on = ids.has(propertyId);
      // Optimisticky — srdiečko musí reagovať okamžite, nie po sieti.
      setIds((prev) => {
        const next = new Set(prev);
        if (on) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });
      try {
        const { error } = on
          ? await db().from('favorite').delete().eq('property_id', propertyId).eq('user_id', userId)
          : await db().from('favorite').insert({ user_id: userId, property_id: propertyId });
        if (error) throw error;
        return !on;
      } catch (e: unknown) {
        console.log(`[OBĽÚBENÉ] Zmena zlyhala: ${String(e)}`);
        await reload(); // vrátime sa k pravde zo servera
        return null;
      }
    },
    [ids, userId, reload]
  );

  return { ids, toggle, reload };
}

/** Zoznam obľúbených aj s dátami inzerátu — do Profilu. */
export function useFavoriteProperties(userId: string | undefined) {
  const [items, setItems] = useState<PropertyWithMedia[] | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    try {
      // Dva jednoduché dotazy namiesto vnoreného embedu — ten sa tu
      // typoval ako pole a nič to nezjednodušovalo.
      const { data: favs, error: fe } = await db()
        .from('favorite')
        .select('property_id')
        .order('created_at', { ascending: false });
      if (fe) throw fe;

      const ids = ((favs ?? []) as { property_id: string }[]).map((f) => f.property_id);
      if (ids.length === 0) {
        setItems([]);
        return;
      }

      const [props, media] = await Promise.all([
        db().from('property').select('*').in('id', ids),
        db().from('media').select('*').in('property_id', ids).order('sort_order', { ascending: true }),
      ]);
      if (props.error) throw props.error;
      if (media.error) throw media.error;

      const photos = new Map<string, Media[]>();
      for (const m of (media.data ?? []) as Media[]) {
        const list = photos.get(m.property_id);
        if (list) list.push(m);
        else photos.set(m.property_id, [m]);
      }

      const byId = new Map((props.data ?? []).map((p) => [(p as Property).id, p as Property]));
      // Poradie podľa toho, kedy si to uložil — nie podľa dátumu inzerátu.
      setItems(
        ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((p) => ({ ...(p as Property), media: photos.get((p as Property).id) ?? [] }))
      );
    } catch (e: unknown) {
      console.log(`[OBĽÚBENÉ] Zoznam zlyhal: ${String(e)}`);
      setItems([]);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, reload };
}
