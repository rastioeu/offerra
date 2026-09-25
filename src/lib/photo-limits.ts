/**
 * Limit fotiek inzerátu a rozhodovanie, koľko sa ich ešte zmestí.
 * Čistý modul (bez React Native), aby sa dal overiť Node testom
 * (`npx --yes tsx scripts/check-photo-limits.ts`).
 *
 * Rastio, 25.9.2026: „viem pridať iba 3 fotky — uprav to na 10 a nech
 * viem vybrať z albumu aj 10 fotiek naraz". Limit v appke ani v databáze
 * predtým nebol: výber bral jednu fotku na ťuknutie, tak sa to javilo ako
 * limit. 10 je teraz skutočný strop, ktorý stráži aj hook pri pridaní.
 */
export const MAX_PHOTOS = 10;

/** Koľko fotiek sa ešte zmestí (nikdy záporné). */
export function remainingSlots(current: number, max: number = MAX_PHOTOS): number {
  if (!Number.isFinite(current)) return 0;
  return Math.max(0, max - Math.max(0, Math.floor(current)));
}

/**
 * Z toho, čo systémový výber vrátil, zoberie najviac `slots` fotiek
 * (poistka, keby výber limit nedodržal) a povie, koľko ich zostalo mimo.
 */
export function takeWithinLimit<T>(picked: T[], slots: number): { accepted: T[]; dropped: number } {
  const n = Math.max(0, Math.floor(slots));
  return { accepted: picked.slice(0, n), dropped: Math.max(0, picked.length - n) };
}
