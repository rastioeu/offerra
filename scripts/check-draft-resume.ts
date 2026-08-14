/**
 * Node test bez appky/Supabase pre `src/lib/draft-resume.ts`.
 * Spusti: npx tsx scripts/check-draft-resume.ts
 */
import { pickLatestDraft, type DraftLike } from '../src/lib/draft-resume';

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

const mk = (id: string, status: string, updated_at: string): DraftLike => ({ id, status, updated_at });

check('žiadne položky → undefined', pickLatestDraft([]) === undefined);

check(
  'žiadny DRAFT medzi položkami → undefined',
  pickLatestDraft([mk('a', 'ACTIVE', '2026-08-01'), mk('b', 'REJECTED', '2026-08-02')]) === undefined
);

check(
  'jeden DRAFT → vráti ho',
  pickLatestDraft([mk('a', 'ACTIVE', '2026-08-01'), mk('b', 'DRAFT', '2026-08-02')])?.id === 'b'
);

check(
  'dva DRAFTy → vráti novšie upravený',
  pickLatestDraft([mk('a', 'DRAFT', '2026-08-01T10:00:00Z'), mk('b', 'DRAFT', '2026-08-05T10:00:00Z')])?.id === 'b'
);

check(
  'DRAFT staršie upravený než ACTIVE sa nepomýli s ACTIVE',
  pickLatestDraft([mk('a', 'ACTIVE', '2026-08-09'), mk('b', 'DRAFT', '2026-08-01')])?.id === 'b'
);

check(
  'nemení vstupné pole (bez vedľajších účinkov)',
  (() => {
    const items = [mk('a', 'DRAFT', '2026-08-01'), mk('b', 'DRAFT', '2026-08-02')];
    const before = JSON.stringify(items);
    pickLatestDraft(items);
    return JSON.stringify(items) === before;
  })()
);

console.log(`\n${pass}/${pass + fail} OK`);
if (fail > 0) process.exit(1);
