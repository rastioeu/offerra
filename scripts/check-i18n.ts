/**
 * Audit lokalizácie SK/EN/DE (Fáza 30, 22.8.2026).
 *
 * Kontroluje ROBOTOM overiteľné veci — nie preklad samotný (to je na
 * Rastiovi a na testovaní na telefóne s prepnutým jazykom):
 *
 *   1. Všetky tri jazykové súbory majú ROVNAKÚ množinu kľúčov — až na
 *      zámerné výnimky: slovenčina má 3-tvarové skloňovanie (roomsOne/
 *      roomsFew/roomsMany a podobné), EN/DE len 2 (One/Many). Zoznam
 *      výnimiek je tu explicitný, nie odhadnutý — pri každej novej takej
 *      dvojici sa dopĺňa.
 *   2. Žiadna hodnota nie je prázdny reťazec (prázdny preklad je horší
 *      než chýbajúci kľúč — ten aspoň spadne na `en.json` fallback v
 *      `src/i18n/index.tsx`).
 *   3. `{{premenné}}` v hodnote pre daný kľúč sú v SK/EN/DE ROVNAKÉ —
 *      inak `t(key, params)` v jednom jazyku vypíše doslova „{{foo}}"
 *      namiesto hodnoty.
 *   4. Každý `t('domain.key')` volaný v `src/` má zodpovedajúci kľúč vo
 *      všetkých troch súboroch — chytí preklep v kľúči skôr, než ho
 *      nájde Rastio na telefóne.
 *
 * NEDOKAZUJE, že preklad je správny ani že text v appke dobre vyzerá —
 * to vyžaduje človeka a jazyk. Zelený beh znamená len „štruktúra je
 * v poriadku", nie „preklady sú hotové".
 */
// `@types/node` v repe ZÁMERNE nie je: pridať ho by zmenilo `package.json`,
// teda EAS fingerprint, a odstrihlo OTA od Rastiovho buildu (§9, incident
// 13.8.2026). Preto potlačené — nie preto, že by tu bola chyba.
// @ts-ignore
import { readFileSync, readdirSync, statSync } from 'node:fs';
// @ts-ignore
import { join } from 'node:path';

// @ts-ignore
const ROOT = join(__dirname, '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const SRC_DIR = join(ROOT, 'src');

type Locale = Record<string, Record<string, string>>;

function loadLocale(name: string): Locale {
  return JSON.parse(readFileSync(join(LOCALES_DIR, `${name}.json`), 'utf8')) as Locale;
}

function flatten(locale: Locale): Map<string, string> {
  const out = new Map<string, string>();
  for (const [domain, keys] of Object.entries(locale)) {
    if (domain === '_') continue; // sentinel, nie skutočný obsah
    for (const [key, value] of Object.entries(keys)) {
      out.set(`${domain}.${key}`, value);
    }
  }
  return out;
}

/**
 * Kľúče, ktoré má ZÁMERNE len sk.json — slovenské 3-tvarové skloňovanie
 * (izba/izby/izieb a podobne), pre ktoré EN/DE nemajú tretí tvar.
 * `src/lib/*.ts` funkcie ako `formatRooms`/`offerCountLabel` volajú tieto
 * kľúče LEN keď `language === 'sk'` — v EN/DE sa nikdy nevyvolajú.
 */
const SK_ONLY_KEYS = new Set([
  'property.roomsFew',
  'priceDisplay.offerCountFew',
  'deadline.deadlineOfferAccFew',
  'myListingRow.offersFew',
  'dopyty.countFew',
  'offerValidity.pickerDaysFew',
]);

/**
 * Kľúče, kde je prázdny reťazec ZÁMERNÝ v niektorých jazykoch — nemčina
 * potrebuje na konci vety o súhlase s podmienkami slovo naviac
 * („...Datenschutz **zur Kenntnis**."), SK aj EN ho nepotrebujú.
 */
const ALLOWED_EMPTY = new Set(['login.legalSuffix']);

function extractParams(value: string): Set<string> {
  const out = new Set<string>();
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) out.add(m[1]);
  return out;
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function findUsedKeys(): Map<string, string[]> {
  // kľúč → zoznam súborov, kde sa volá (na hlásenie, nie na dedup)
  const used = new Map<string, string[]>();
  const re = /\bt\(\s*['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)['"]/g;
  for (const file of walkFiles(SRC_DIR)) {
    if (file.includes(`${join('src', 'i18n')}${'/'}`)) continue; // i18n modul samotný
    const text = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const key = m[1];
      const rel = file.slice(ROOT.length + 1);
      const arr = used.get(key) ?? [];
      if (!arr.includes(rel)) arr.push(rel);
      used.set(key, arr);
    }
  }
  return used;
}

let ok = 0;
let fail = 0;
function check(label: string, pass: boolean, detail?: string) {
  if (pass) {
    ok++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  ZLE  ${label}`);
  }
  if (detail) console.log(`        ${detail}`);
}

console.log('── 1. rovnaká množina kľúčov vo všetkých troch jazykoch ──');
const sk = loadLocale('sk');
const en = loadLocale('en');
const de = loadLocale('de');
const skKeys = flatten(sk);
const enKeys = flatten(en);
const deKeys = flatten(de);

for (const [name, keys] of [['en', enKeys], ['de', deKeys]] as const) {
  const missing = [...skKeys.keys()].filter((k) => !keys.has(k) && !SK_ONLY_KEYS.has(k));
  const extra = [...keys.keys()].filter((k) => !skKeys.has(k));
  check(
    `sk → ${name}: žiadne chýbajúce kľúče (mimo SK_ONLY_KEYS)`,
    missing.length === 0,
    missing.length > 0 ? missing.slice(0, 20).join(', ') : undefined
  );
  check(`sk → ${name}: žiadne kľúče navyše`, extra.length === 0, extra.length > 0 ? extra.slice(0, 20).join(', ') : undefined);
}
for (const k of SK_ONLY_KEYS) {
  check(`SK_ONLY_KEYS „${k}" naozaj existuje len v sk.json`, skKeys.has(k) && !enKeys.has(k) && !deKeys.has(k));
}

console.log('\n── 2. žiadna prázdna hodnota ──');
for (const [name, keys] of [['sk', skKeys], ['en', enKeys], ['de', deKeys]] as const) {
  const empty = [...keys.entries()]
    .filter(([k, v]) => v.trim() === '' && !ALLOWED_EMPTY.has(k))
    .map(([k]) => k);
  check(`${name}.json: žiadny neúmyselne prázdny preklad`, empty.length === 0, empty.length > 0 ? empty.join(', ') : undefined);
}

console.log('\n── 3. {{premenné}} sedia vo všetkých troch jazykoch ──');
let paramMismatches = 0;
for (const [key, skValue] of skKeys) {
  if (SK_ONLY_KEYS.has(key)) continue;
  const skParams = extractParams(skValue);
  for (const [name, keys] of [['en', enKeys], ['de', deKeys]] as const) {
    const otherValue = keys.get(key);
    if (otherValue == null) continue; // chýbajúci kľúč už nahlásila sekcia 1
    const otherParams = extractParams(otherValue);
    const same =
      skParams.size === otherParams.size && [...skParams].every((p) => otherParams.has(p));
    if (!same) {
      paramMismatches++;
      console.log(`  ZLE  ${key}: sk={${[...skParams].join(',')}} ${name}={${[...otherParams].join(',')}}`);
    }
  }
}
check('všetky {{premenné}} sedia sk↔en↔de', paramMismatches === 0);

console.log('\n── 4. každý t(\'domain.key\') volaný v kóde má preklad ──');
const used = findUsedKeys();
const missingInSk: string[] = [];
for (const [key, files] of used) {
  if (!skKeys.has(key)) missingInSk.push(`${key} (${files[0]})`);
}
check(
  `${used.size} rôznych t()-volaní nájdených v src/, všetky majú kľúč v sk.json`,
  missingInSk.length === 0,
  missingInSk.length > 0 ? missingInSk.slice(0, 20).join('\n        ') : undefined
);

console.log(`\n${'='.repeat(60)}`);
if (fail === 0) {
  console.log(`VŠETKO OK (${ok} kontrol) — štruktúra prekladov je v poriadku.`);
  console.log('POZOR: toto NEDOKAZUJE, že preklad je jazykovo správny ani ako vyzerá v appke — to overuje Rastio.');
} else {
  console.log(`ZLYHALO: ${fail} z ${ok + fail} kontrol.`);
  process.exit(1);
}
