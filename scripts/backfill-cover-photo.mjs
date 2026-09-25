/**
 * Staré inzeráty dostanú pevnú titulnú fotku (Rastio, 25.9.2026: „aplikuj to
 * aj na staré inzeráty"). Inzerát, ktorý nemá `is_cover` ani na jednej fotke,
 * dostane titulnú = jeho prvú fotku podľa poradia (`sort_order`, potom
 * `created_at`) — tú istú, ktorú editor doteraz označoval ako titulnú.
 * Vďaka tomu karta v katalógu prestane pre tieto inzeráty rotovať.
 *
 * - IDEMPOTENTNÉ: inzerát, ktorý už titulnú má (vybral si ju vlastník), sa
 *   nedotkne.
 * - ZÁLOHA: pred zápisom uloží zoznam ID, ktorým nastaví `is_cover`, do
 *   súboru (`--backup <cesta>`); návrat = `--rollback <cesta>`.
 * - Mení len `offerra.media.is_cover`.
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/backfill-cover-photo.mjs --backup /cesta/záloha.json
 *            SUPABASE_ACCESS_TOKEN=sbp_… node scripts/backfill-cover-photo.mjs --rollback /cesta/záloha.json
 * Token len z prostredia (§4).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MGMT = 'https://api.supabase.com/v1/projects/vxqvpgzwefcehugmhaft/database/query';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Chýba SUPABASE_ACCESS_TOKEN'); process.exit(1); }

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

async function q(query) {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const body = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body}`);
  return JSON.parse(body);
}

const rollback = flag('--rollback');
if (rollback) {
  const ids = JSON.parse(readFileSync(rollback, 'utf8')).ids;
  const list = ids.map((i) => `'${i}'`).join(',');
  const res = await q(`update offerra.media set is_cover = false where id in (${list}) returning id`);
  console.log(`Rollback: is_cover zrušené na ${res.length} riadkoch.`);
  process.exit(0);
}

const backup = flag('--backup');
if (!backup) { console.error('Zadaj --backup <cesta> (alebo --rollback <cesta>).'); process.exit(1); }

const FIRST = `
  select distinct on (property_id) id, property_id
    from offerra.media
   where property_id not in (select property_id from offerra.media where is_cover)
   order by property_id, sort_order, created_at`;

const targets = await q(FIRST);
console.log(`Inzerátov bez titulnej fotky: ${targets.length}`);
writeFileSync(backup, JSON.stringify({ at: new Date().toISOString(), ids: targets.map((t) => t.id) }, null, 2));
console.log(`Záloha uložená: ${backup}`);
if (targets.length === 0) process.exit(0);

const res = await q(`
  update offerra.media m set is_cover = true
    from (${FIRST}) f
   where m.id = f.id
  returning m.id`);
console.log(`Nastavené: ${res.length}`);
