/**
 * Test limitu fotiek (Rastio, 25.9.2026: max 10, výber viacerých naraz).
 * SPUSTENIE: `npx --yes tsx scripts/check-photo-limits.ts` (bez appky a DB).
 */
import { MAX_PHOTOS, remainingSlots, takeWithinLimit } from '../src/lib/photo-limits';

let fails = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

check('limit je 10', MAX_PHOTOS === 10, `MAX_PHOTOS=${MAX_PHOTOS}`);
check('0 fotiek → 10 miest', remainingSlots(0) === 10, `${remainingSlots(0)}`);
check('3 fotky → 7 miest', remainingSlots(3) === 7, `${remainingSlots(3)}`);
check('10 fotiek → 0 miest', remainingSlots(10) === 0, `${remainingSlots(10)}`);
check('12 fotiek (staré dáta) → 0, nie záporné', remainingSlots(12) === 0, `${remainingSlots(12)}`);
check('NaN → 0', remainingSlots(NaN) === 0, `${remainingSlots(NaN)}`);

const p = takeWithinLimit([1, 2, 3, 4, 5], 3);
check('výber 5 do 3 miest → 3 prijaté, 2 mimo', p.accepted.length === 3 && p.dropped === 2, JSON.stringify(p));
const q = takeWithinLimit([1, 2], 7);
check('výber 2 do 7 miest → 2 prijaté, 0 mimo', q.accepted.length === 2 && q.dropped === 0, JSON.stringify(q));
const r = takeWithinLimit([1, 2], 0);
check('0 miest → nič neprijaté', r.accepted.length === 0 && r.dropped === 2, JSON.stringify(r));
const o = takeWithinLimit(['a', 'b', 'c'], 2);
check('poradie sa zachová', o.accepted.join('') === 'ab', o.accepted.join(''));

console.log(fails === 0 ? '\nVŠETKO OK' : `\n${fails} ZLYHALO`);
process.exit(fails === 0 ? 0 : 1);
