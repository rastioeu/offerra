/**
 * Meno a priezvisko z prihlasovacieho účtu (Apple / Google).
 *
 * PREČO SAMOSTATNE (Rastio, 9.8.2026): v onboardingu sa „Meno a priezvisko"
 * ťukalo ručne, hoci ho poskytovateľ prihlásenia už povedal.
 *
 * APPLE JE TU TEN DÔVOD, PREČO TO NIE JE JEDNORIADKOVKA. Apple dá meno
 * VÝHRADNE PRI PRVOM prihlásení, a to len v návratovej hodnote
 * `signInAsync` — v `identityToken` meno NIE JE, takže sa k nemu Supabase
 * nikdy nedostane a v `user_metadata` ho nenájdeme. Kto ho v tej chvíli
 * zahodí, nedostane ho už nikdy (iba po odobratí prístupu v Nastaveniach
 * iPhonu). Preto sa odkladá sem, do pamäte procesu, hneď ako dorazí —
 * profil v tej chvíli ešte nemusí existovať.
 *
 * Google je jednoduchší: meno chodí v id tokene, takže ho Supabase uloží
 * do `user_metadata` a je tam pri každom prihlásení.
 */
import type { Session, User } from '@supabase/supabase-js';

let fromProvider: string | null = null;

/** Zavolá sa hneď pri prihlásení, kým je meno ešte k dispozícii. */
export function rememberSignInName(name: string | null | undefined): void {
  const clean = (name ?? '').trim();
  if (!clean) return;
  console.log(`[AUTH] Meno z prihlásenia: ${clean}`);
  fromProvider = clean;
}

/** Pri odhlásení — meno predošlého človeka nesmie predvyplniť ďalšiemu. */
export function forgetSignInName(): void {
  fromProvider = null;
}

/** Apple: `{ givenName, familyName }`, obe môžu chýbať. */
export function appleFullName(
  parts: { givenName?: string | null; familyName?: string | null } | null | undefined
): string | null {
  const joined = [parts?.givenName, parts?.familyName]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return joined || null;
}

/** Google a e-mail: čo o mene vie Supabase z id tokenu. */
export function metadataFullName(user: User | null | undefined): string | null {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const direct = text(meta.full_name) || text(meta.name);
  if (direct) return direct;
  const joined = [text(meta.given_name), text(meta.family_name)].filter(Boolean).join(' ');
  return joined || null;
}

/**
 * Čo predvyplniť do poľa „Meno a priezvisko". Prázdny reťazec = nevieme nič
 * a pole ostane prázdne.
 *
 * Nikdy to nie je viac než NÁVRH — pole zostáva bežné, editovateľné.
 * Apple vie vrátiť aj skryté meno a niekto sa jednoducho volá inak, než
 * má napísané v účte.
 */
export function suggestedFullName(session: Session | null | undefined): string {
  return fromProvider ?? metadataFullName(session?.user) ?? '';
}
