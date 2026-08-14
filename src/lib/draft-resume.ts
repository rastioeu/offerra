/**
 * Ktorý rozpracovaný inzerát appka ponúkne na pokračovanie.
 *
 * Čistá funkcia (žiadne importy) kvôli testovateľnosti cez `npx tsx` bez
 * Supabase/appky — rovnaký dôvod ako `cover-photo.ts`.
 */
export type DraftLike = { id: string; status: string; updated_at: string };

/** Najnovšie upravený DRAFT, alebo `undefined`, ak žiadny nie je. */
export function pickLatestDraft<T extends DraftLike>(items: T[]): T | undefined {
  const drafts = items.filter((p) => p.status === 'DRAFT');
  if (drafts.length === 0) return undefined;
  return [...drafts].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
}
