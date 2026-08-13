/**
 * Odznaky na podtaboch detailu inzerátu — nová aktivita, ktorú prihlásený
 * ešte nevidel (Rastio, 13.8.2026).
 *
 * ŠTYRI TABY, ŠTYRI RÔZNE „VIDENÉ" MECHANIZMY, JEDNA RPC. Správy majú
 * presné sledovanie na úrovni JEDNOTLIVEJ SPRÁVY (`message.read_at`) —
 * odznak preň sa z neho len ČÍTA, nemá vlastný „mark viewed" v tomto
 * súbore. Ponuky, obhliadka a hodnotenia majú nový stĺpec s razítkom
 * a vlastnú RPC na jeho zapísanie — všetko v `offerra.tab_badges()`
 * a `mark_*_viewed()` v databáze, nie tu: appka len volá a zobrazuje.
 */
import { db } from './property';

export type TabBadges = {
  offers: boolean;
  messages: boolean;
  viewing: boolean;
  ratings: boolean;
};

const EMPTY: TabBadges = { offers: false, messages: false, viewing: false, ratings: false };

export async function fetchTabBadges(propertyId: string): Promise<TabBadges> {
  const { data, error } = await db().rpc('tab_badges', { p_property_id: propertyId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as Partial<TabBadges> | undefined;
  return row ? { ...EMPTY, ...row } : EMPTY;
}

/** Vlastník: nová REQUESTED žiadosť. Žiadateľ: jeho žiadosť bola rozhodnutá. */
export async function markViewingViewed(propertyId: string): Promise<void> {
  const { error } = await db().rpc('mark_viewing_viewed', { p_property_id: propertyId });
  if (error) throw error;
}

/** Nové hodnotenie o mne k tomuto konkrétnemu inzerátu. */
export async function markRatingsViewed(propertyId: string): Promise<void> {
  const { error } = await db().rpc('mark_ratings_viewed', { p_property_id: propertyId });
  if (error) throw error;
}
