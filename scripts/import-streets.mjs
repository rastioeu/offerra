#!/usr/bin/env node
/**
 * Import ulíc SR z Registra adries (MV SR) do `offerra.street`.
 *
 * PREČO VLASTNÁ TABUĽKA A NIE NOMINATIM ZA BEHU
 * ---------------------------------------------
 * Autocomplete pri zadávaní inzerátu strieľa dotaz na každé stlačenie
 * klávesy. Nominatim má limit 1 dotaz/sekundu a zakazuje autocomplete
 * priamo v podmienkach používania — appka by ho porušovala a pri výpadku
 * by ulica prestala fungovať. Preto sa dáta stiahnu RAZ sem a appka číta
 * len vlastnú tabuľku.
 *
 * ZDROJ
 * -----
 * data.slovensko.sk (Národný katalóg otvorených dát), dataset
 * „Register Adries - Register ulíc" → distribúcia „Ulice - konsolidované
 * dáta". Vydavateľ: Ministerstvo vnútra SR. Licencia: otvorené dáta.
 *
 * ⚠️ Staré `data.gov.sk/dataset/.../download/...` odkazy sú MŔTVE — portál
 * sa presťahoval a všetky staré cesty vracajú HTML shell novej SPA.
 * Živé sú len `data.slovensko.sk/download?id=<uuid>` (UUID nižšie).
 *
 * SPUSTENIE
 * ---------
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/import-streets.mjs
 *   … --dry-run   len stiahne, spáruje a vypíše štatistiku (nezapisuje)
 *
 * Skript je idempotentný — `on conflict (city_id, name_norm) do nothing`.
 */
import { readFileSync } from 'node:fs';

const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

/** Distribúcie Registra adries. UUID overené 8.8.2026 (HTTP 200, text/csv). */
const RA = {
  ulice: '4a452e56-d461-4d52-892e-3e2e6c4a15ac',   // Ulice - konsolidované dáta
  obce: '2903fc05-e8cb-4415-adf6-3cef7f7a02d5',    // Obce - konsolidované dáta
  okresy: 'ef176f2a-0bcb-4bc5-b449-42d47aea2025',  // Okresy - konsolidované dáta
};

/** RA značí „stále platné" dátumom v roku 3000, nie prázdnou hodnotou. */
const STILL_VALID = (r) => (r.validTo ?? '').startsWith('3000');

const DRY = process.argv.includes('--dry-run');

/** RFC4180 parser — názvy ulíc obsahujú čiarky („Febr,víťazstva"), takže
 *  split(',') by ticho rozbil riadok. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows
    .filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/** Rovnaké skladanie ako `normalizeText()` v appke, navyše zjednotenie
 *  medzier okolo pomlčky — používa sa LEN na párovanie názvov obcí,
 *  nie na `name_norm` (ten si generuje databáza cez `offerra.norm()`). */
function norm(s) {
  return (s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

const normOkres = (s) => norm(s).replace(/^okres /, '');

async function fetchCsv(name, id) {
  const r = await fetch(`https://data.slovensko.sk/download?id=${id}`);
  if (!r.ok) throw new Error(`RA ${name}: HTTP ${r.status}`);
  const ct = r.headers.get('content-type') ?? '';
  const text = await r.text();
  // Portál na neznáme cesty vracia HTML shell s HTTP 200 — bez tejto
  // kontroly by import „prešiel" s nula riadkami.
  if (!ct.includes('csv') || text.startsWith('<!doctype')) {
    throw new Error(`RA ${name}: čakal som CSV, prišlo ${ct}`);
  }
  const rows = parseCsv(text);
  console.log(`  ${name}: ${rows.length} riadkov (${(text.length / 1e6).toFixed(1)} MB)`);
  return rows;
}

function env(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Číselník obcí — číta sa cez PostgREST anon kľúčom (len SELECT). */
async function fetchCities() {
  const e = env(new URL('../.env', import.meta.url).pathname);
  const url = e.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const key = e.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const q = `select=id,name,district&limit=1000&offset=${offset}`;
    const r = await fetch(`${url}/rest/v1/city?${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'offerra' },
    });
    if (!r.ok) throw new Error(`city: HTTP ${r.status} ${await r.text()}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('chýba SUPABASE_ACCESS_TOKEN');
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${body.slice(0, 500)}`);
  return JSON.parse(body);
}

// ── 1. dáta ────────────────────────────────────────────────────────────
console.log('Sťahujem Register adries…');
const [ulice, obce, okresy] = await Promise.all([
  fetchCsv('ulice', RA.ulice), fetchCsv('obce', RA.obce), fetchCsv('okresy', RA.okresy),
]);

// Chýbajúce obce MUSIA pribudnúť pred párovaním — inak by ulice, ktoré na
// ne visia, opäť vypadli ako „obec nenapojena".
if (!DRY) {
  console.log('Dopĺňam obce chýbajúce v číselníku…');
  await sql(readFileSync(new URL('./sql/2026-08-08-city-chybajuce.sql', import.meta.url), 'utf8'));
}

console.log('Čítam offerra.city…');
const cities = await fetchCities();
console.log(`  city: ${cities.length} obcí`);

// najnovšia verzia každého objektu (RA vedie históriu verzií)
const latest = (rows) => {
  const best = new Map();
  for (const r of rows) {
    const cur = best.get(r.objectId);
    if (!cur || r.validFrom > cur.validFrom) best.set(r.objectId, r);
  }
  return best;
};
const obceById = latest(obce);
const okresyById = latest(okresy);

// ── 2. párovanie RA obec → offerra.city ────────────────────────────────
const byPair = new Map(), byName = new Map();
for (const c of cities) {
  const k = `${norm(c.name)}|${normOkres(c.district)}`;
  if (!byPair.has(k)) byPair.set(k, c);
  if (!byName.has(norm(c.name))) byName.set(norm(c.name), []);
  byName.get(norm(c.name)).push(c);
}

/** Zaniknuté jednotky, ktoré dnešný číselník nepozná pod vlastným menom. */
const MANUAL = { 'Bratislava-Prievoz': ['Ružinov', 'bratislava ii'] };

const obecToCity = new Map();
for (const [oid, o] of obceById) {
  const nm = o.municipalityName;
  let okres = normOkres(okresyById.get(o.countyIdentifier)?.countyName ?? '');
  const cand = [nm];
  if (nm.includes('-')) cand.push(nm.slice(nm.indexOf('-') + 1)); // Bratislava-Rača → Rača
  if (MANUAL[nm]) { cand.unshift(MANUAL[nm][0]); okres = MANUAL[nm][1]; }

  let hit = cand.map((x) => byPair.get(`${norm(x)}|${okres}`)).find(Boolean);
  if (!hit) hit = cand.map((x) => byName.get(norm(x))).find((l) => l?.length === 1)?.[0];
  if (hit) obecToCity.set(oid, hit.id);
}

/** Mestské časti BA/KE → zastrešujúce mesto. RA vedie ulice pod časťami,
 *  ale predávajúci často vyberie „Bratislava" — bez zrkadlenia by mu
 *  autocomplete neponúkol nič. */
const parentOf = new Map();
const umbrella = (name) => cities.find((c) => c.name === name && c.district === name)?.id;
const BA = umbrella('Bratislava'), KE = umbrella('Košice');
for (const c of cities) {
  if (/^Bratislava (I|II|III|IV|V)$/.test(c.district ?? '')) parentOf.set(c.id, BA);
  else if (/^Košice (I|II|III|IV)$/.test(c.district ?? '')) parentOf.set(c.id, KE);
}

// ── 3. dataset ─────────────────────────────────────────────────────────
const seen = new Set(), recs = [];
const skip = { obecNenapojena: 0, prazdny: 0, duplicita: 0 };
const add = (cityId, name, raId) => {
  const k = `${cityId}|${norm(name)}`;
  if (seen.has(k)) { skip.duplicita++; return; }
  seen.add(k);
  recs.push({ cityId, name, raId });
};

for (const r of ulice.filter(STILL_VALID)) {
  const cityId = obecToCity.get(r.municipalityIdentifiers);
  if (cityId == null) { skip.obecNenapojena++; continue; }
  const name = r.streetName.replace(/\s+/g, ' ').trim();
  if (!name) { skip.prazdny++; continue; }
  add(cityId, name, Number(r.objectId));
}
for (const r of [...recs]) {
  const p = parentOf.get(r.cityId);
  if (p != null) add(p, r.name, r.raId);
}

const mestUlic = new Set(recs.map((r) => r.cityId)).size;
console.log(`\nNa import: ${recs.length} ulíc v ${mestUlic} obciach`);
console.log('Preskočené:', skip);

if (DRY) { console.log('\n--dry-run — nič sa nezapisovalo.'); process.exit(0); }

// ── 4. zápis ───────────────────────────────────────────────────────────
console.log('\nMigrácia…');
await sql(readFileSync(new URL('./sql/2026-08-08-street.sql', import.meta.url), 'utf8'));

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const BATCH = 1000;
let done = 0;
for (let i = 0; i < recs.length; i += BATCH) {
  const chunk = recs.slice(i, i + BATCH);
  const values = chunk.map((r) => `(${r.cityId},${q(r.name)},${r.raId})`).join(',');
  await sql(
    `insert into offerra.street (city_id, name, ra_object_id) values ${values}
     on conflict (city_id, name_norm) do nothing;`
  );
  done += chunk.length;
  process.stdout.write(`\r  ${done}/${recs.length}`);
}

const [stat] = await sql(`
  select count(*)::int as ulic,
         count(distinct city_id)::int as obci,
         (select count(*)::int from offerra.street s
            join offerra.city c on c.id = s.city_id where c.name = 'Bratislava') as bratislava
  from offerra.street;`);
console.log(`\n\nHOTOVO — v offerra.street je ${stat.ulic} ulíc v ${stat.obci} obciach ` +
            `(Bratislava: ${stat.bratislava}).`);
