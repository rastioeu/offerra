/**
 * Odpočet undo okna — čistá funkcia (žiadne importy) kvôli testovateľnosti
 * cez `npx tsx` bez appky, rovnaký dôvod ako `cover-photo.ts`.
 */
export function tickUndo(secondsLeft: number): { secondsLeft: number; done: boolean } {
  const left = secondsLeft - 1;
  return left <= 0 ? { secondsLeft: 0, done: true } : { secondsLeft: left, done: false };
}
