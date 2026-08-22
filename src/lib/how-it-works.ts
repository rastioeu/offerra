import type { TFunc } from '@/i18n';

/**
 * „Ako funguje Offerra" — vysvetlenie princípu appky.
 *
 * STANDING RULE (Rastio 7.8.2026, zapísané aj v CLAUDE.md §8): keď sa
 * zmení AKÁKOĽVEK mechanika appky, tento text sa musí upraviť v TOM
 * ISTOM kroku, nie dodatočne. Text, ktorý klame o tom, ako appka
 * funguje, je horší než žiadny.
 *
 * DVE ÚROVNE (Rastio 9.8.2026):
 *  - `getHowLead` + `getHowSteps` — krátka karta na hlavnej obrazovke,
 *  - `getHowSections` — PLNÁ verzia na obrazovke „Ako funguje Offerra".
 *
 * OD LOKALIZÁCIE (19.8.2026): text žije v `src/i18n/locales/*.json`
 * (domain `howItWorks`), tento súbor len skladá štruktúru (ikony,
 * poradie, počet odsekov na sekciu) a číta ju cez `t()`. Kto mení text,
 * mení JSON vo VŠETKÝCH troch jazykoch v tom istom kroku — inak appka
 * v cudzom jazyku klame o tom, ako funguje, presne to, čomu má toto
 * pravidlo zabrániť.
 */
export type HowStep = { icon: string; title: string; body: string };
export type HowSection = { icon: string; title: string; paragraphs: string[] };

export function getHowLead(t: TFunc): string {
  return t('howItWorks.lead');
}

const STEP_ICONS = ['house', 'person.circle', 'checkmark.seal', 'bubble.left.and.bubble.right', 'flag'];

/**
 * Krátka verzia na kartu. ZÁMERNE len päť bodov — karta má povedať,
 * o čom appka je, nie ju vysvetliť. Zvyšok je za „Čítať ďalej".
 */
export function getHowSteps(t: TFunc): HowStep[] {
  return STEP_ICONS.map((icon, i) => ({
    icon,
    title: t(`howItWorks.step${i}Title`),
    body: t(`howItWorks.step${i}Body`),
  }));
}

const SECTION_ICONS = [
  'house',
  'person.circle',
  'checkmark.seal',
  'bubble.left.and.bubble.right',
  'key',
  'clock',
  'checkmark.seal',
  'checkmark.seal',
  'envelope',
  'flag',
  'house',
  'magnifyingglass',
  'bell',
  'checkmark.seal',
  'house',
];
const SECTION_PARA_COUNTS = [5, 5, 3, 6, 6, 4, 4, 5, 5, 7, 3, 5, 5, 3, 3];

/**
 * Plná verzia. Poradie sleduje cestu človeka appkou: čo to je, ako sa
 * ponúka, ako sa stretnete, ako sa to uzavrie, a nakoniec pravidlá.
 */
export function getHowSections(t: TFunc): HowSection[] {
  return SECTION_ICONS.map((icon, i) => ({
    icon,
    title: t(`howItWorks.section${i}Title`),
    paragraphs: Array.from({ length: SECTION_PARA_COUNTS[i] }, (_, j) => t(`howItWorks.section${i}Para${j}`)),
  }));
}
