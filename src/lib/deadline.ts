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
 * TENTO SÚBOR NEMÁ ŽIADEN RUNTIME IMPORT — ani z `property.ts`, ani
 * odnikiaľ inak. To je podmienka, nie štýl: akýkoľvek import naspäť do
 * appky by vrátil presne ten istý problém. `property.ts` tieto funkcie
 * ĎALEJ RE-EXPORTUJE, takže žiadny z miest, čo ich importujú z
 * `@/lib/property`, sa meniť nemusí.
 *
 * OD LOKALIZÁCIE (19.8.2026): `import type` na `TFunc` je VÝNIMKA —
 * TypeScript typové importy sa pri kompilácii úplne vymažú (nulový runtime
 * dopad), takže test v Node (`check-deadline.mjs`) beží bez appky presne
 * tak ako predtým.
 */
import type { TFunc } from '@/i18n';

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
 * Dátum vo formáte podľa jazyka, LEN pre tento súbor — `formatDate` v
 * `property.ts` robí to isté, ale importovať si ho odtiaľ by znovu
 * pripojilo `./supabase` a zrušilo by to celý zmysel tohto súboru.
 */
function localDate(language: string, iso: string): string {
  const tag = language === 'sk' ? 'sk-SK' : language === 'de' ? 'de-DE' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/**
 * Čo sa má stať PO uzávierke (Rastio, 17.8.2026).
 *
 * PREČO TO VZNIKLO: zmerané 17.8.2026 — DVA inzeráty boli ACTIVE
 * s uzávierkou prešlou 2 a 5 dní. Sedeli v katalógu ako živé, ponuku na ne
 * už nikto podať nemohol (uzávierku drží aj RLS) a majiteľovi to nikto
 * nepovedal. Appka teda príbeh o uzávierke rozprávala len do polovice:
 * odpočet dobehol a ďalej sa NESTALO NIČ.
 */
export type DeadlineAction = 'PICK_OFFER' | 'EXTEND' | 'ARCHIVE';

export type DeadlineOutcome =
  /** Inzerát uzávierku nemá — ponuky bežia bez termínu. */
  | { kind: 'NONE' }
  /** Uzávierka beží. */
  | { kind: 'RUNNING'; label: string }
  /** Uzávierka prešla a inzerát je STÁLE živý — majiteľ sa musí rozhodnúť. */
  | {
      kind: 'AWAITING_OWNER';
      label: string;
      title: string;
      body: string;
      actions: DeadlineAction[];
      sinceDays: number;
    }
  /** Inzerát už nie je živý (uzavretý, archivovaný, koncept) — uzávierka je bezpredmetná. */
  | { kind: 'SETTLED' };

/**
 * „1 ponuku / 3 ponuky / 7 ponúk" — v AKUZATÍVE, pretože veta znie
 * „Máš …". Prvá verzia vracala nominatív a vyšlo z toho „Máš 1 ponuka";
 * našiel to test, nie Rastio. EN/DE nemajú pád, len jednotné/množné.
 */
function offersWord(t: TFunc, language: string, n: number): string {
  if (language === 'sk') {
    const key = n === 1 ? 'deadlineOfferAccOne' : n >= 2 && n <= 4 ? 'deadlineOfferAccFew' : 'deadlineOfferAccMany';
    return t(`deadline.${key}`, { count: n });
  }
  return t(n === 1 ? 'deadline.deadlineOfferAccOne' : 'deadline.deadlineOfferAccMany', { count: n });
}

function daysSince(from: number, now: number): number {
  return Math.max(0, Math.floor((now - from) / 86_400_000));
}

/**
 * Stav uzávierky vrátane TOHO, ČO S TÝM. Vracia aj slová, nie len príznaky —
 * aby sa dali overiť v Node a nevznikli dva rôzne texty na dvoch
 * obrazovkách.
 *
 * `active` je `status === 'ACTIVE'`. Zámerne boolean a nie `PropertyStatus`:
 * tento súbor nesmie mať ŽIADEN import (viď hlavička), a duplikovať sem
 * úniu stavov by znamenalo držať ju na dvoch miestach.
 */
export function deadlineOutcome({
  t,
  language,
  deadline,
  active,
  offerCount,
  now = Date.now(),
}: {
  t: TFunc;
  language: string;
  deadline: string | null;
  active: boolean;
  offerCount: number;
  now?: number;
}): DeadlineOutcome {
  if (!active) return { kind: 'SETTLED' };
  if (!deadline) return { kind: 'NONE' };

  const deadlineMs = new Date(deadline).getTime();
  if (deadlineMs > now) return { kind: 'RUNNING', label: deadlineLabel(t, language, deadline, now) ?? '' };

  const sinceDays = daysSince(deadlineMs, now);
  const when = t('deadline.offersClosedOn', { date: localDate(language, deadline) });
  const ago =
    sinceDays === 0 ? t('deadline.agoToday') : sinceDays === 1 ? t('deadline.agoOneDay') : t('deadline.agoDays', { count: sinceDays });

  return {
    kind: 'AWAITING_OWNER',
    label: t('deadline.offersEnded'),
    title: t('deadline.deadlinePassedTitle'),
    body:
      offerCount > 0
        ? t('deadline.bodyWithOffers', { when, ago, offers: offersWord(t, language, offerCount) })
        : t('deadline.bodyNoOffers', { when, ago }),
    // Bez ponúk nemá „vybrať z ponúk" čo robiť — tlačidlo, ktoré by
    // viedlo na prázdny zoznam, radšej nie je.
    actions: offerCount > 0 ? ['PICK_OFFER', 'EXTEND', 'ARCHIVE'] : ['EXTEND', 'ARCHIVE'],
    sinceDays,
  };
}

/**
 * Nová uzávierka pri predĺžení — `days` odo DNEŠKA, nie od pôvodného
 * termínu. Predĺžiť uzávierku, ktorá prešla pred 5 dňami, „o 7 dní" od
 * pôvodného termínu by dalo 2 dni, čo nikto nechce.
 */
export function extendedDeadline(days: number, now: number = Date.now()): string {
  return new Date(now + days * 86_400_000).toISOString();
}

/** O koľko dní predlžuje tlačidlo „Predĺžiť uzávierku". */
export const EXTEND_DAYS = 7;

/** Ostávajúci čas do uzávierky ponúk. `null` = bez časovača alebo už po ňom. */
export function deadlineLabel(t: TFunc, language: string, iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return t('deadline.offersEnded');
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return t('deadline.offersUntil', { date: localDate(language, iso), days });
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return t('deadline.offersClosingInHours', { hours });
}
