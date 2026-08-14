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
  /**
   * Kedy človek prešiel krokom „Upozornenia" (`profile.notif_onboarded_at`).
   * `null`/`undefined` = ešte nevidel → onboarding pokračuje tam.
   *
   * ZÁMERNE samostatné pole a nie čítanie z `profile`: `profile` je tu
   * `unknown`, aby brána nezávisela od tvaru profilu. Tá nezávislosť je
   * dôvod, prečo sa dá otestovať bez zariadenia.
   */
  notifOnboardedAt?: string | null;
  /**
   * Videl už niekedy úvodný walkthrough (Rastio, 14.8.2026)?
   * `undefined` = AsyncStorage sa ešte nenačítalo — ČAKÁME, rovnaký
   * princíp ako `profile === undefined` nižšie. Beží PRED prihlásením
   * (na rozdiel od prezývky/upozornení), takže nemôže byť stĺpec profilu.
   */
  walkthroughSeen?: boolean;
};

export type GateDecision = '/walkthrough' | '/login' | '/prezyvka' | '/upozornenia' | '/(tabs)' | null;

export function decideRoute({
  session,
  profile,
  segment,
  profileError,
  notifOnboardedAt,
  walkthroughSeen,
}: GateInput): GateDecision {
  // 1. Nevieme, či je niekto prihlásený — nerozhodujeme.
  if (session === undefined) return null;

  // 2. Neprihlásený → najprv walkthrough (len raz, kým nemá session), potom login.
  if (!session) {
    if (walkthroughSeen === undefined) return null;
    if (!walkthroughSeen) return segment === 'walkthrough' ? null : '/walkthrough';
    return segment === 'login' ? null : '/login';
  }

  // 3. Prihlásený, ale profil ešte nepoznáme — ČAKÁME.
  //    Toto je jadro opravy: `undefined` nikdy neznamená „bez prezývky".
  if (profile === undefined) return null;

  // 4. Chyba načítania profilu rieši samostatná obrazovka, nie onboarding.
  if (profileError) return null;

  // 5. Server POTVRDIL, že profil nie je → onboarding, krok 1.
  if (profile === null) return segment === 'prezyvka' ? null : '/prezyvka';

  // 6. Profil je, ale krok „Upozornenia" ešte nevidel → onboarding, krok 2.
  //    Je AŽ TU, teda po prezývke: skôr by sa appka pýtala na povolenie
  //    prv, než o sebe čokoľvek povedala. Systémový dialóg sa dá položiť
  //    raz, tak nech je položený vtedy, keď človek vie, na čo odpovedá.
  //
  //    Platí to aj pre existujúcich používateľov (`notif_onboarded_at` majú
  //    `null`, backfill sme zámerne nerobili) — nikdy nedostali možnosť si
  //    typy vybrať, tak ju dostanú teraz. Je to jedna preskočiteľná obrazovka.
  if (!notifOnboardedAt) return segment === 'upozornenia' ? null : '/upozornenia';

  // 7. Všetko máme — preč zo všetkých onboardingových obrazoviek.
  if (segment === 'walkthrough' || segment === 'login' || segment === 'prezyvka' || segment === 'upozornenia') {
    return '/(tabs)';
  }
  return null;
}
