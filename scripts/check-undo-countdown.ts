/**
 * Node test bez appky pre `src/lib/undo-countdown.ts`.
 * Spusti: npx tsx scripts/check-undo-countdown.ts
 */
import { tickUndo } from '../src/lib/undo-countdown';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL: ${name}`);
  }
}

check('5 → 4, nedokončené', JSON.stringify(tickUndo(5)) === JSON.stringify({ secondsLeft: 4, done: false }));
check('1 → dokončené', tickUndo(1).done === true);
check('1 → secondsLeft 0', tickUndo(1).secondsLeft === 0);

let s = 5;
let ticks = 0;
while (true) {
  const r = tickUndo(s);
  ticks++;
  s = r.secondsLeft;
  if (r.done) break;
  if (ticks > 10) throw new Error('nikdy nedôjde do "done" — nekonečný odpočet');
}
check('celý odpočet od 5 dobehne presne v 5 tikoch', ticks === 5);

console.log(`\n${pass}/${pass + fail} OK`);
if (fail > 0) process.exit(1);
