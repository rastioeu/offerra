/**
 * Regresný test poradia a zloženia filtrov nad katalógom.
 *
 * PREČO EXISTUJE (Rastio, 17.8.2026): filtre boli jeden zalamovaný zoznam
 * čipov, takže sa lámali podľa ŠÍRKY obrazovky, nie podľa významu — v prvom
 * riadku skončilo „Predaj · Prenájom · Byt · Dom", v druhom „Pozemok ·
 * Komerčný · Najnovšie", v treťom „Čoskoro končí · ♥". Zmiešané kategórie.
 * Poradie sa dovtedy dalo overiť len okom na telefóne.
 *
 * Prvá kontrola nižšie **naschvál vyrobí ten pôvodný stav** — bez nej by
 * test nedokazoval nič (rovnaký princíp ako `scripts/check-realtime.ts`).
 *
 * SPUSTENIE: `npx --yes tsx scripts/check-filters.ts`
 * (`tsx` NIKDY nepridávaj do `package.json` — §9, mení EAS fingerprint.)
 */
import { filterRows, type FilterRow } from '../src/lib/filter-rows';

let fails = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

function labels(row: FilterRow): string[] {
  return row.chips.map((c) => c.label);
}

/** Čo z riadkov vyjde, keď sa vysypú do jedného zalamovaného zoznamu. */
function flat(rows: FilterRow[]): string[] {
  return rows.flatMap(labels);
}

const KATALOG = filterRows({ side: 'PROPERTY', hasSort: true, canFavorite: true });
const DOPYTY = filterRows({ side: 'DEMAND', hasSort: false, canFavorite: false });

console.log('── 1. pôvodná chyba: jeden zoznam mieša kategórie ──');
{
  // Presne to, čo appka robila predtým: všetky čipy do jedného `flexWrap`
  // riadku. Na šírke telefónu sa do prvého riadku vojdú štyri.
  const asOneList = flat(KATALOG);
  const firstFour = asOneList.slice(0, 4);
  check(
    'zalamovaný zoznam by v prvom riadku zmiešal typ obchodu s typom nehnuteľnosti',
    firstFour.join(' · ') === 'Predaj · Prenájom · Byt · Dom',
    `„${firstFour.join(' · ')}" — presne to, čo Rastio nahlásil`,
  );
  check(
    'v troch riadkoch sa to už stať NEMÔŽE — prvý riadok má len typ obchodu',
    labels(KATALOG[0]).join(' · ') === 'Predaj · Prenájom',
    `1. riadok = „${labels(KATALOG[0]).join(' · ')}"`,
  );
}

console.log('\n── 2. tab NEHNUTEĽNOSTI: tri riadky v správnom poradí ──');
{
  check('sú presne TRI riadky', KATALOG.length === 3, `počet riadkov: ${KATALOG.length}`);
  check(
    'poradie kategórií: typ obchodu → typ nehnuteľnosti → triedenie',
    KATALOG.map((r) => r.kind).join(',') === 'TRANSACTION,PROPERTY_TYPE,VIEW',
    KATALOG.map((r) => `${r.kind} („${r.title}")`).join(' → '),
  );
  check(
    '1. riadok — TYP OBCHODU: Predaj · Prenájom',
    labels(KATALOG[0]).join(' · ') === 'Predaj · Prenájom',
    `„${labels(KATALOG[0]).join(' · ')}"`,
  );
  check(
    '2. riadok — TYP NEHNUTEĽNOSTI vrátane „Iné" na konci',
    labels(KATALOG[1]).join(' · ') === 'Byt · Dom · Pozemok · Komerčný priestor · Iné',
    `„${labels(KATALOG[1]).join(' · ')}"`,
  );
  check(
    '3. riadok — TRIEDENIE A OBĽÚBENÉ, srdiečko úplne posledné',
    labels(KATALOG[2]).join(' · ') === 'Najnovšie · Čoskoro končí · ♥',
    `„${labels(KATALOG[2]).join(' · ')}"`,
  );
}

console.log('\n── 3. tab DOPYTY: iné slová v 1. riadku, rovnaká štruktúra ──');
{
  check(
    '1. riadok — smer trhu z pohľadu hľadajúceho: Kúpim · Hľadám prenájom',
    labels(DOPYTY[0]).join(' · ') === 'Kúpim · Hľadám prenájom',
    `„${labels(DOPYTY[0]).join(' · ')}"`,
  );
  check(
    '2. riadok je ROVNAKÝ ako v katalógu (typ nehnuteľnosti sa smerom trhu nemení)',
    labels(DOPYTY[1]).join(' · ') === labels(KATALOG[1]).join(' · '),
    `„${labels(DOPYTY[1]).join(' · ')}"`,
  );
  check(
    'poradie prvých dvoch riadkov je rovnaké ako v katalógu',
    DOPYTY.slice(0, 2).map((r) => r.kind).join(',') === 'TRANSACTION,PROPERTY_TYPE',
    DOPYTY.map((r) => r.kind).join(' → '),
  );
  // Dopyty nemajú ani triedenie (`buyer_request` nemá uzávierku, rozhodnuté
  // 8.8.2026), ani obľúbené. Prázdny tretí riadok by nechal v UI medzeru,
  // ktorá vyzerá ako chyba.
  check(
    'PRÁZDNY tretí riadok sa NEVYKRESLÍ (žiadna medzera bez obsahu)',
    DOPYTY.length === 2 && !DOPYTY.some((r) => r.kind === 'VIEW'),
    `počet riadkov v Dopytoch: ${DOPYTY.length} (${DOPYTY.map((r) => r.kind).join(', ')})`,
  );
}

console.log('\n── 4. žiadny riadok nesmie miešať kategórie ──');
{
  const ALLOWED: Record<string, string[]> = {
    TRANSACTION: ['TRANSACTION'],
    PROPERTY_TYPE: ['PROPERTY_TYPE'],
    VIEW: ['SORT', 'FAVORITES'],
  };
  for (const set of [
    { name: 'Nehnuteľnosti', rows: KATALOG },
    { name: 'Dopyty', rows: DOPYTY },
  ]) {
    const bad = set.rows.filter((r) => r.chips.some((c) => !ALLOWED[r.kind].includes(c.kind)));
    check(
      `${set.name}: každý čip patrí do kategórie svojho riadku`,
      bad.length === 0,
      bad.length === 0 ? 'žiadne premiešanie' : `premiešané riadky: ${bad.map((r) => r.kind).join(', ')}`,
    );
  }
}

console.log('\n── 5. prihlásenie a triedenie menia LEN tretí riadok ──');
{
  const neprihlaseny = filterRows({ side: 'PROPERTY', hasSort: true, canFavorite: false });
  check(
    'neprihlásený: srdiečko nie je, triedenie ostáva',
    labels(neprihlaseny[2]).join(' · ') === 'Najnovšie · Čoskoro končí',
    `3. riadok = „${labels(neprihlaseny[2]).join(' · ')}"`,
  );
  check(
    'neprihlásenému sa prvé dva riadky nemenia',
    neprihlaseny
      .slice(0, 2)
      .map((r) => labels(r).join('·'))
      .join('|') ===
      KATALOG.slice(0, 2)
        .map((r) => labels(r).join('·'))
        .join('|'),
    'typ obchodu aj typ nehnuteľnosti sú rovnaké ako pre prihláseného',
  );
  const lenSrdiecko = filterRows({ side: 'PROPERTY', hasSort: false, canFavorite: true });
  check(
    'bez triedenia ostane v treťom riadku samotné srdiečko',
    labels(lenSrdiecko[2]).join(' · ') === '♥',
    `3. riadok = „${labels(lenSrdiecko[2]).join(' · ')}"`,
  );
  const nic = filterRows({ side: 'PROPERTY', hasSort: false, canFavorite: false });
  check(
    'bez triedenia aj bez srdiečka ostanú DVA riadky, nie prázdny tretí',
    nic.length === 2,
    `počet riadkov: ${nic.length}`,
  );
}

console.log('\n── 6. čítačka obrazovky dostane názvy kategórií ──');
{
  check(
    'každý riadok má názov kategórie',
    KATALOG.every((r) => r.title.length > 2),
    KATALOG.map((r) => `„${r.title}"`).join(' · '),
  );
  check(
    'srdiečko má slovný popis (samotný znak by čítačka neprečítala)',
    KATALOG[2].chips.some((c) => c.kind === 'FAVORITES' && c.accessibilityLabel === 'Iba obľúbené'),
    'accessibilityLabel = „Iba obľúbené"',
  );
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Poradie filtrov je pokazené.`);
  process.exit(1);
}
console.log('VŠETKO OK — poradie a zloženie filtrov je v poriadku.');
console.log('POZOR: toto NEDOKAZUJE, ako riadky VYZERAJÚ (medzera, linka) — to overuje Rastio.');
