/**
 * Nahlasovanie obsahu.
 *
 * Dôvody sú v DB `check` obmedzením bez diakritiky (`NEVHODNY_OBSAH`) —
 * hodnota v databáze má byť stabilný kód, nie text pre človeka. Preklad
 * je v `t()`.
 */
import type { TFunc } from '@/i18n';

export type ReportTarget = 'PROPERTY' | 'USER' | 'OFFER';
export type ReportReason =
  | 'SPAM'
  | 'PODVOD'
  | 'NEVHODNY_OBSAH'
  | 'FALOSNY_INZERAT'
  | 'REALITKA'
  | 'INE';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';

export function getReportReasons(t: TFunc): { value: ReportReason; label: string }[] {
  return [
    { value: 'FALOSNY_INZERAT', label: t('report.reasonFakeListing') },
    // Číselník dôvodov je spoločný pre inzerát aj používateľa — cieľ drží
    // samostatný stĺpec. Jeden zápis teda pokrýva obe miesta.
    { value: 'REALITKA', label: t('report.reasonAgency') },
    { value: 'PODVOD', label: t('report.reasonFraud') },
    { value: 'SPAM', label: t('report.reasonSpam') },
    { value: 'NEVHODNY_OBSAH', label: t('report.reasonInappropriate') },
    { value: 'INE', label: t('report.reasonOther') },
  ];
}

export function getReportReasonLabel(t: TFunc): Record<ReportReason, string> {
  return Object.fromEntries(
    getReportReasons(t).map((r) => [r.value, r.label])
  ) as Record<ReportReason, string>;
}

export function getReportStatusLabel(t: TFunc): Record<ReportStatus, string> {
  return {
    PENDING: t('report.statusPending'),
    REVIEWED: t('report.statusReviewed'),
    ACTIONED: t('report.statusActioned'),
    DISMISSED: t('report.statusDismissed'),
  };
}
