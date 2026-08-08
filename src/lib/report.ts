/**
 * Nahlasovanie obsahu.
 *
 * Dôvody sú v DB `check` obmedzením bez diakritiky (`NEVHODNY_OBSAH`) —
 * hodnota v databáze má byť stabilný kód, nie text pre človeka. Preklad
 * do slovenčiny je tu.
 */
export type ReportTarget = 'PROPERTY' | 'USER' | 'OFFER';
export type ReportReason =
  | 'SPAM'
  | 'PODVOD'
  | 'NEVHODNY_OBSAH'
  | 'FALOSNY_INZERAT'
  | 'REALITKA'
  | 'INE';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'FALOSNY_INZERAT', label: 'Falošný inzerát — nehnuteľnosť neexistuje' },
  // Číselník dôvodov je spoločný pre inzerát aj používateľa — cieľ drží
  // samostatný stĺpec. Jeden zápis teda pokrýva obe miesta.
  { value: 'REALITKA', label: 'Realitka/sprostredkovateľ — vydáva sa za fyzickú osobu' },
  { value: 'PODVOD', label: 'Podvod — pýta zálohu, nechce obhliadku' },
  { value: 'SPAM', label: 'Spam alebo reklama' },
  { value: 'NEVHODNY_OBSAH', label: 'Nevhodný obsah' },
  { value: 'INE', label: 'Iné' },
];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label])
) as Record<ReportReason, string>;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: 'Čaká na posúdenie',
  REVIEWED: 'Posúdené',
  ACTIONED: 'Riešené',
  DISMISSED: 'Zamietnuté',
};
