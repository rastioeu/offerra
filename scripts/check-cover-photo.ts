/**
 * Regresný test pre rotujúcu titulnú fotku karty v katalógu (Rastio,
 * 13.8.2026): pri viacerých fotkách má karta ukázať INÚ ako vždy prvú, ale
 * len naprieč SPUSTENIAMI appky — počas jedného spustenia sa titulka pre
 * daný inzerát nesmie meniť (inak by „poskakovala" pri každom scrolle).
 *
 * SPUSTENIE: `npx tsx scripts/check-cover-photo.ts` (žiadna appka, žiadna databáza).
 */
import { coverPhotoIndex } from '../src/lib/cover-photo';

let fails = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

console.log('── jedna fotka alebo žiadna → index vždy 0 ──');
{
  const a = coverPhotoIndex('prop-1', 1, 12345);
  const b = coverPhotoIndex('prop-1', 0, 999);
  check('1 fotka → index 0', a === 0, `index = ${a}`);
  check('0 fotiek → index 0 (nespadne)', b === 0, `index = ${b}`);
}

console.log('\n── v RÁMCI JEDNÉHO seedu (= jedno spustenie appky) je index STÁLY ──');
{
  const seed = 42;
  const runs = Array.from({ length: 5 }, () => coverPhotoIndex('prop-abc', 6, seed));
  const stable = runs.every((r) => r === runs[0]);
  check('rovnaký inzerát, rovnaký seed, 5× volanie → vždy ten istý index',
    stable, `indexy = ${JSON.stringify(runs)}`);
}

console.log('\n── index je vždy v platnom rozsahu [0, mediaCount) ──');
{
  let ok = true;
  const ids = ['a', 'bb', 'ccc-property-uuid-1234', '', 'x'.repeat(50)];
  for (const id of ids) {
    for (const count of [2, 3, 5, 10]) {
      for (const seed of [0, 1, 42, 999999]) {
        const idx = coverPhotoIndex(id, count, seed);
        if (idx < 0 || idx >= count) ok = false;
      }
    }
  }
  check('žiadny index nevyšiel mimo [0, mediaCount)', ok, 'skontrolovaných 5×4×4 kombinácií');
}

console.log('\n── RÔZNE seedy (= rôzne spustenia) dajú pre ten istý inzerát ROZDIELNE indexy ──');
{
  const seeds = Array.from({ length: 20 }, (_, i) => i * 137);
  const indexes = new Set(seeds.map((s) => coverPhotoIndex('prop-xyz', 8, s)));
  check('20 rôznych seedov → aspoň 2 rôzne indexy (nie je to vždy tá istá fotka)',
    indexes.size >= 2, `unikátne indexy = ${indexes.size}/20`);
}

console.log('\n── RÔZNE inzeráty v tom istom seede (= tom istom spustení) sa nezhodujú vždy na tej istej fotke ──');
{
  const seed = 777;
  const ids = Array.from({ length: 15 }, (_, i) => `property-${i}`);
  const indexes = new Set(ids.map((id) => coverPhotoIndex(id, 5, seed)));
  check('15 rôznych inzerátov → aspoň 2 rôzne indexy (nie je to vždy fotka č. 1 pre všetky)',
    indexes.size >= 2, `unikátne indexy = ${indexes.size}/15`);
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Rotujúca titulná fotka je pokazená.`);
  process.exit(1);
}
console.log('VŠETKO OK — logika rotujúcej titulnej fotky je v poriadku.');
