/**
 * Uzávierka ponúk — ČISTÉ funkcie, ZÁMERNE MIMO `property.ts`.
 *
 * PREČO SAMOSTATNE (Rastio, 13.8.2026 — countdown štítok na karte v katalógu
 * zmizol TRETÍ RAZ): pri každom nahlásení sa ukázalo, že kód, ktorý
 * o štítku rozhoduje, bol SPRÁVNY. Problém bol v tom, že `deadlineLabel`
 * a `deadlineUrgency` žili v `property.ts`, ktorý na úrovni modulu
 * importuje `./supabase` (AsyncStorage + env premenné) — takže sa nedali
 * spustiť v Node bez appky a bez databázy. Nikto preto nikdy nenapísal
 * test, ktorý by pri ĎALŠEJ zmene (redizajn 8.8, podtaby 12.8) OKAMŽITE
 * nahlásil, že sa niečo pokazilo. Museli sme vždy čakať, kým si to
 * manuálne všimne Rastio — a to je presne to, čo `scripts/check-deadline.mjs`
 * odteraz robí za neho, ešte pred nasadením.
 *
 * TENTO SÚBOR NEMÁ ŽIADEN IMPORT — ani z `property.ts`, ani odnikiaľ
 * inak. To je podmienka, nie štýl: akýkoľvek import naspäť do appky by
 * vrátil presne ten istý problém. `property.ts` tieto funkcie ĎALEJ
 * RE-EXPORTUJE, takže žiadny z miest, čo ich importujú z `@/lib/property`,
 * sa meniť nemusí.
 */
export type DeadlineUrgency = 'NONE' | 'OPEN' | 'SOON' | 'PASSED';

/** Hranica, od ktorej je uzávierka „naliehavá" (Rastio, 8.8.2026). */
export const SOON_DAYS = 3;

/** Uplynula uzávierka? Bez časovača nikdy. Vynucuje to aj RLS v DB. */
export function isDeadlinePassed(iso: string | null): boolean {
  return iso != null && new Date(iso).getTime() <= Date.now();
}

/**
 * Naliehavosť uzávierky — riadi FARBU štítku na karte, nie jeho text.
 *
 * `PASSED`  — už po termíne, žiadna urgencia, len fakt.
 * `SOON`    — menej než `SOON_DAYS` dni; vtedy sa štítok sfarbí varovne.
 * `OPEN`    — beží, ale pokojne.
 * `NONE`    — inzerát časovač nemá.
 */
export function deadlineUrgency(iso: string | null): DeadlineUrgency {
  if (!iso) return 'NONE';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'PASSED';
  return ms < SOON_DAYS * 86_400_000 ? 'SOON' : 'OPEN';
}

/**
 * Dátum v slovenskom tvare, LEN pre tento súbor — `formatDate` v
 * `property.ts` robí to isté, ale importovať si ho odtiaľ by znovu
 * pripojilo `./supabase` a zrušilo by to celý zmysel tohto súboru.
 */
function localDate(iso: string): string {
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Ostávajúci čas do uzávierky ponúk. `null` = bez časovača alebo už po ňom. */
export function deadlineLabel(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Príjem ponúk ukončený';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Ponuky do ${localDate(iso)} · ostáva ${days} dní`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `Ponuky sa uzatvárajú o ${hours} h`;
}
