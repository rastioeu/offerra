/**
 * Zavretie vypisovania bucketu `offerra-media` — cez Supabase Management API.
 *
 * PREČO (Rastio, 17.8.2026): bucket sa dal VYPÍSAŤ anon kľúčom, takže sa dali
 * prejsť aj fotky nezverejnených inzerátov (122 fotiek, 20 z 21 inzerátov
 * anonym cez REST nevidí). Meranie a dôvody:
 * `reports/FOTKY_EXPOZICIA.md`, register 28.5.
 *
 * ROVNAKÁ CESTA AKO VŠETKY DOTERAJŠIE DB ZMENY v tomto projekte —
 * `POST /v1/projects/{ref}/database/query` (schéma `offerra`, tabuľky, RLS,
 * migrácie), nie psql. Vzor: `scripts/import-streets.mjs`, register 0.6.
 *
 * SPUSTENIE
 * ---------
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-storage-policy.mjs
 *   … --dry-run    len vypíše, aké politiky na `storage.objects` dnes sú
 *
 * Skript je IDEMPOTENTNÝ: keď politika už existuje, nič nemení.
 * Token sa berie LEN z prostredia — do repa sa nikdy nezapisuje (§4,
 * `rastioeu/offerra` je verejný).
 *
 * PO SPUSTENÍ over:
 *   npx --yes tsx scripts/check-storage-exposure.ts     (musí prejsť)
 *   a v appke nahraj + zmaž fotku vo vlastnom inzeráte  (mazanie = iná politika)
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const POLICY = 'offerra-media: vypisat smie len vlastnik';

const DRY = process.argv.includes('--dry-run');

/**
 * `as restrictive` je tu podstatné: bežné („permissive") politiky sa
 * SČÍTAVAJÚ, takže pridanie ďalšej by nič nezavrelo. Restrictive sa spája
 * AND-om, preto sa nič nemusí rušiť — a keby čokoľvek, späť to vezme jediný
 * `drop policy`.
 *
 * `bucket_id <> 'offerra-media' or …` — iných bucketov sa to nedotkne.
 * Vlastník sa určuje z prvého segmentu cesty (`<user_id>/<property_id>/…`),
 * čo appka potrebuje na mazanie vlastných fotiek. Anonym má `auth.uid()`
 * prázdny, teda nevypíše nič.
 *
 * Verejné čítanie zverejnených fotiek (`/object/public/…`) ide MIMO RLS,
 * takže katalóg ostane s fotkami — inak by to bola regresia z Fázy 24.
 */
const CREATE_SQL = `
create policy "${POLICY}"
on storage.objects
as restrictive
for select
using (
  bucket_id <> 'offerra-media'
  or (storage.foldername(name))[1] = auth.uid()::text
);`;

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('CHYBA: chýba SUPABASE_ACCESS_TOKEN.');
    console.error('Spusti ako: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-storage-policy.mjs');
    process.exit(2);
  }
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.text();
  if (!r.ok) {
    // §2: celá surová chyba, nie „nepodarilo sa". Pri vypršanom tokene
    // vráti API 401, pri chýbajúcom práve 403 — treba vidieť ktorý.
    throw new Error(`SQL HTTP ${r.status}: ${body.slice(0, 600)}`);
  }
  return JSON.parse(body);
}

/** Politiky na `storage.objects` — vrátane toho, či sú permissive/restrictive. */
async function policies() {
  return sql(`
    select policyname, cmd, permissive, roles::text as roles
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    order by policyname;`);
}

function printPolicies(rows) {
  if (rows.length === 0) {
    console.log('  (žiadne politiky — pozor, to by znamenalo, že RLS nič nepúšťa)');
    return;
  }
  for (const p of rows) {
    console.log(
      `  · ${p.policyname}  [${p.cmd}, ${p.permissive === 'RESTRICTIVE' ? 'RESTRICTIVE' : 'permissive'}, ${p.roles}]`,
    );
  }
}

async function main() {
  console.log('── politiky na storage.objects PRED zmenou ──');
  const before = await policies();
  printPolicies(before);

  const exists = before.some((p) => p.policyname === POLICY);
  if (exists) {
    console.log(`\nPolitika „${POLICY}" už existuje — nič nemením.`);
  } else if (DRY) {
    console.log('\n--dry-run: politika NEEXISTUJE a vytvorila by sa. Nič som nezmenil.');
    return;
  } else {
    console.log(`\nVytváram politiku „${POLICY}"…`);
    await sql(CREATE_SQL);
    console.log('Hotovo.');
    console.log('\n── politiky PO zmene ──');
    printPolicies(await policies());
  }

  console.log('\nĎalej over:');
  console.log('  npx --yes tsx scripts/check-storage-exposure.ts');
  console.log('  a v appke nahraj + zmaž fotku vo vlastnom inzeráte (mazanie je iná politika)');
  console.log(`\nSpäť sa to vezme: drop policy "${POLICY}" on storage.objects;`);
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
