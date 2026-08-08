/**
 * OFFERRA — uzavretie obchodu a hodnotenia.
 *
 * PREČO JE TEXT HODNOTENIA NEVEREJNÝ:
 * hviezdičky sú verejné (priemer + počet), samotný komentár vidí len ten,
 * koho sa týka, a jeho autor. Verejné voľné pole pripnuté k menovanému
 * človeku je priestor na osočovanie, ktorý Offerra pri svojej veľkosti
 * neustráži — a nepravdivá veta o konkrétnom človeku napácha viac škody
 * než koľko úžitku prinesie. Dôveru nesie PRIEMER, nie cudzie vety.
 *
 * Rozhodol som o tom sám (8.8.2026) a je to zapísané aj v reporte.
 */
import { db } from './property';

export type Rating = {
  id: string;
  property_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

/** Priemer a počet pre jedného človeka. */
export type RatingSummary = { user_id: string; stars_avg: number; rating_count: number };

/**
 * Uzavretie obchodu. `offerId` môže byť `null` — obchod sa dá uzavrieť aj
 * mimo Offerry a zamlčať to by znamenalo, že inzerát visí naveky.
 *
 * Robí to JEDNA funkcia v databáze, nie štyri dotazy z appky: mení sa
 * stav inzerátu, víťazná ponuka, konečná suma aj stav ostatných ponúk.
 * Pád medzi dotazmi by nechal obchod v polovici.
 */
export async function closeDeal(
  propertyId: string,
  offerId: string | null,
  finalAmount: number | null
): Promise<void> {
  const { error } = await db().rpc('close_deal', {
    p_property_id: propertyId,
    p_offer_id: offerId,
    p_final_amount: finalAmount,
  });
  if (error) throw error;
}

/** Smiem hodnotiť tohto človeka za tento obchod? Odpovedá DB, nie appka. */
export async function canRate(propertyId: string, rateeId: string): Promise<boolean> {
  const { data, error } = await db().rpc('can_rate', { p_property: propertyId, p_ratee: rateeId });
  if (error) throw error;
  return data === true;
}

export async function saveRating(
  propertyId: string,
  rateeId: string,
  raterId: string,
  stars: number,
  comment: string | null
): Promise<void> {
  const { error } = await db()
    .from('rating')
    .upsert(
      { property_id: propertyId, rater_id: raterId, ratee_id: rateeId, stars, comment },
      { onConflict: 'property_id,rater_id' }
    );
  if (error) throw error;
}

/**
 * Priemery pre viacerých ľudí naraz. Zoznam ponúk ich potrebuje desať
 * a desať dotazov by bolo desaťkrát to isté.
 */
export async function fetchRatings(userIds: string[]): Promise<Record<string, RatingSummary>> {
  if (userIds.length === 0) return {};
  const { data, error } = await db().rpc('user_ratings', { p_users: userIds });
  if (error) throw error;
  const map: Record<string, RatingSummary> = {};
  for (const r of (data ?? []) as RatingSummary[]) map[r.user_id] = r;
  return map;
}

/** „4,6 ★ (12)". `null`, keď človek ešte hodnotenie nemá — nula by klamala. */
export function ratingLabel(s: RatingSummary | undefined): string | null {
  if (!s || !s.rating_count) return null;
  return `${String(s.stars_avg).replace('.', ',')} ★ (${s.rating_count})`;
}
