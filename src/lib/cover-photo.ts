/**
 * Titulná fotka karty v katalógu — rotuje raz za SPUSTENIE appky, nie pri
 * každom scrolle (Rastio, 13.8.2026). Cieľ: appka pôsobí živšie a ukáže
 * viac z fotiek KAŽDÉHO inzerátu bez toho, aby bolo treba otvoriť detail.
 *
 * `SESSION_SEED` sa vygeneruje raz, keď sa tento modul načíta — teda raz za
 * spustenie appky (JS bundle sa načíta nanovo pri každom cold starte).
 * Rovnaký inzerát má POČAS JEDNÉHO SPUSTENIA vždy tú istú titulku — inak by
 * „poskakovala" pri každom prekreslení zoznamu (scroll, obnovenie, zmena
 * filtra). Mení sa až pri ĎALŠOM otvorení appky.
 *
 * Bez importov — čisté funkcie, testovateľné v Node (rovnaký dôvod ako
 * `deadline.ts`).
 */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const SESSION_SEED = Math.floor(Math.random() * 1_000_000);

/**
 * Index fotky, ktorá sa má ukázať ako titulná. `seed` je voliteľný len
 * kvôli testu (deterministický vstup) — appka ho vždy volá bez neho a
 * dostane `SESSION_SEED` tohto spustenia.
 */
export function coverPhotoIndex(propertyId: string, mediaCount: number, seed: number = SESSION_SEED): number {
  if (mediaCount <= 1) return 0;
  return (hashString(propertyId) + seed) % mediaCount;
}
