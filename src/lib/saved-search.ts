/**
 * OFFERRA — uložené vyhľadávanie.
 *
 * Filter sa ukladá ako JSON, nie rozložený na stĺpce. Je to TEN ISTÝ
 * objekt, aký drží katalóg (`CatalogFilter`) — rozložiť ho na stĺpce by
 * znamenalo držať ten istý tvar na dvoch miestach a pri každom novom
 * filtri meniť schému databázy.
 *
 * Uložené hľadanie je SÚKROMNÉ. To, čo človek hľadá, prezrádza o ňom viac
 * než jeho inzeráty — koľko má peňazí, kam sa sťahuje, či čaká rodinu.
 */
import type { TFunc } from '@/i18n';

import { db } from './property';
import type { CatalogFilter } from './search';
import type { CatalogSort } from './property';

export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filter: CatalogFilter;
  sort: CatalogSort;
  last_seen_at: string;
  created_at: string;
};

/**
 * Návrh mena z filtra — aby človek nemusel vymýšľať názov pre niečo, čo
 * už raz opísal filtrom. Prepísať ho môže.
 */
export function suggestName(t: TFunc, filter: CatalogFilter): string {
  const parts: string[] = [];
  if (filter.transaction) parts.push(filter.transaction === 'RENT' ? t('savedSearch.rent') : t('savedSearch.sale'));
  if (filter.propertyType) {
    parts.push(
      {
        APARTMENT: t('savedSearch.apartment'),
        HOUSE: t('savedSearch.house'),
        LAND: t('savedSearch.land'),
        COMMERCIAL: t('savedSearch.commercial'),
        OTHER: t('savedSearch.other'),
      }[filter.propertyType]
    );
  }
  if (filter.city) parts.push(filter.city);
  if (filter.roomsMin != null) parts.push(t('savedSearch.roomsMinPlus', { count: filter.roomsMin }));
  if (filter.priceMax != null) parts.push(t('savedSearch.upToPrice', { price: filter.priceMax }));
  if (filter.text) parts.push(t('savedSearch.quotedText', { text: filter.text }));
  return parts.length > 0 ? parts.join(' · ').slice(0, 60) : t('savedSearch.wholeCatalog');
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await db()
    .from('saved_search')
    .select('id, user_id, name, filter, sort, last_seen_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedSearch[];
}

export async function saveSearch(
  userId: string,
  name: string,
  filter: CatalogFilter,
  sort: CatalogSort
): Promise<void> {
  const { error } = await db()
    .from('saved_search')
    .insert({ user_id: userId, name: name.trim(), filter, sort });
  if (error) throw error;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await db().from('saved_search').delete().eq('id', id);
  if (error) throw error;
}

/** Odkedy sa počítajú „nové" inzeráty. Volá sa pri otvorení hľadania. */
export async function touchSavedSearch(id: string): Promise<void> {
  const { error } = await db()
    .from('saved_search')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Koľko NOVÝCH inzerátov zodpovedá uloženému hľadaniu od posledného
 * otvorenia.
 *
 * ZÁMERNE sa počíta rovnakým dotazom, aký používa katalóg — keby mal
 * vlastnú kópiu podmienok, číslo by časom prestalo sedieť so zoznamom,
 * ktorý sa po ťuknutí otvorí. To je horšie než žiadne číslo.
 */
export async function countNewMatches(s: SavedSearch): Promise<number> {
  const f = s.filter ?? {};
  let q = db()
    .from('property')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')
    .gt('created_at', s.last_seen_at);

  if (f.transaction) q = q.eq('transaction_type', f.transaction);
  if (f.propertyType) q = q.eq('property_type', f.propertyType);
  if (f.city) q = q.eq('city', f.city);
  if (f.roomsMin != null) q = q.gte('rooms', f.roomsMin);
  if (f.areaMin != null) q = q.gte('area_m2', f.areaMin);
  if (f.priceMax != null) q = q.or(`asking_price_hint.lte.${f.priceMax},asking_price_hint.is.null`);
  if (f.priceMin != null) q = q.or(`asking_price_hint.gte.${f.priceMin},asking_price_hint.is.null`);

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
