/**
 * Rozhodovanie brány na štarte appky — vytiahnuté z `_layout.tsx` do
 * čistej funkcie, aby sa dalo OTESTOVAŤ bez zariadenia.
 *
 * Dôvod: obrazovka prezývky naskakovala pri každom otvorení appky
 * (nahlásil Rastio 7.8.2026). Tá istá trieda chyby — rozhodnutie padlo
 * skôr, než dorazili dáta — nás už stála splash screen (0.17) aj
 * neobnovenú bránu po uložení prezývky (2.11b). Tretíkrát to chcem mať
 * pokryté testom, nie pozornosťou.
 *
 * Poradie je záväzné: **auth → profil → až potom rozhodnutie.**
 */
export type GateInput = {
  /** `undefined` = nevieme, `null` = neprihlásený. */
  session: unknown | null | undefined;
  /** `undefined` = nevieme, `null` = server potvrdil, že profil nie je. */
  profile: unknown | null | undefined;
  /** Prvý segment aktuálnej route. */
  segment: string | undefined;
  /** Nepodarilo sa načítať profil. */
  profileError?: boolean;
};

export type GateDecision = '/login' | '/prezyvka' | '/(tabs)' | null;

export function decideRoute({ session, profile, segment, profileError }: GateInput): GateDecision {
  // 1. Nevieme, či je niekto prihlásený — nerozhodujeme.
  if (session === undefined) return null;

  // 2. Neprihlásený → login.
  if (!session) return segment === 'login' ? null : '/login';

  // 3. Prihlásený, ale profil ešte nepoznáme — ČAKÁME.
  //    Toto je jadro opravy: `undefined` nikdy neznamená „bez prezývky".
  if (profile === undefined) return null;

  // 4. Chyba načítania profilu rieši samostatná obrazovka, nie onboarding.
  if (profileError) return null;

  // 5. Server POTVRDIL, že profil nie je → onboarding.
  if (profile === null) return segment === 'prezyvka' ? null : '/prezyvka';

  // 6. Všetko máme — preč z login/onboarding obrazoviek.
  if (segment === 'login' || segment === 'prezyvka') return '/(tabs)';
  return null;
}
