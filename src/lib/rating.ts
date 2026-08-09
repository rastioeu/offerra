/**
 * OFFERRA — uzavretie obchodu a hodnotenia.
 *
 * HODNOTENIA SÚ CELÉ VEREJNÉ — hviezdičky aj text.
 *
 * Navrhoval som text ako súkromný (obava z osočovania). Rastio rozhodol
 * inak 9.8.2026 a jeho dôvod je silnejší: zmyslom hodnotení je dôvera pre
 * BUDÚCICH záujemcov, ktorí zvažujú obchod s konkrétnym človekom — a tým
 * priemer sám nestačí. Potrebujú kontext, nie číslo.
 *
 * Prepnutie bolo čisté: v tabuľke bolo NULA hodnotení, takže nikto nič
 * nenapísal pod predošlým sľubom súkromia. Keby tam niečo bolo, spätné
 * zverejnenie by nebolo prijateľné.
 *
 * Proti osočovaniu stojí nahlasovanie a moderovanie — nie skrývanie.
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
 * Overený používateľ.
 *
 * Odznak „overený" pri niekom, koho nikto neoveril, je LOŽ — preto sa
 * nedá získať automaticky ani si ho nastaviť sám. Udeľuje ho VÝHRADNE
 * správca a spolu s ním sa ukladá, ČO presne overil. Tú vetu appka
 * ukazuje, takže odznak nikdy netvrdí viac, než sa naozaj stalo.
 */
export type Verified = { verified_at: string | null; verified_note: string | null };

export async function fetchVerified(userId: string): Promise<Verified | null> {
  const { data, error } = await db()
    .from('profile')
    .select('verified_at, verified_note')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Verified) ?? null;
}

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


/** Hodnotenie aj s prezývkou toho, kto ho napísal — na verejné zobrazenie. */
export type Review = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  rater: { nickname: string; avatar_url: string | null } | null;
};

/**
 * Verejné hodnotenia jedného človeka.
 *
 * Ťahajú sa len tie S TEXTOM — hviezdičky bez slov už hovorí priemer pri
 * prezývke a zoznam prázdnych riadkov by nikomu nepomohol.
 */
export async function fetchReviews(userId: string, limit = 10): Promise<Review[]> {
  const { data, error } = await db()
    .from('rating')
    .select('id, stars, comment, created_at, rater:rater_id(nickname, avatar_url)')
    .eq('ratee_id', userId)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}
