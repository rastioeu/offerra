/**
 * Overenie triggerov titulnej fotky NAOZAJ v DB. Beží pod rolou `authenticated`
 * s JWT vlastníka (ako appka) v transakcii, ktorú DO blok na konci zámerne
 * zruší (raise exception) → v DB sa nič nezmení. Výsledok sa číta z textu chyby.
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/check-cover-trigger.mjs
 */
const MGMT = 'https://api.supabase.com/v1/projects/vxqvpgzwefcehugmhaft/database/query';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Chýba SUPABASE_ACCESS_TOKEN'); process.exit(1); }
async function q(query) {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return { status: r.status, body: await r.text() };
}

const pick = await q(`select p.id, p.owner_id from offerra.property p
  where not offerra.has_accepted_offer(p.id) and exists (select 1 from offerra.media m where m.property_id = p.id)
  order by (select count(*) from offerra.media m where m.property_id = p.id) desc limit 1`);
const row = JSON.parse(pick.body)[0];
if (!row) { console.error('Nenašiel som vhodný inzerát:', pick.body); process.exit(1); }
console.log(`Testovací inzerát: ${row.id}`);

const SQL = `
do $$
declare
  v_prop uuid := '${row.id}';
  v_owner uuid := '${row.owner_id}';
  a uuid; b uuid; c uuid; v_cov int; v_is boolean; v_after uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- prázdny inzerát (ako čerstvo založený)
  delete from offerra.media where property_id = v_prop;
  if exists (select 1 from offerra.media where property_id = v_prop) then raise exception 'FAIL 0: nepodarilo sa vyprázdniť'; end if;

  -- 1) prvá fotka sa stane titulnou automaticky, druhá nie
  insert into offerra.media (property_id, url, sort_order) values (v_prop, 'https://x/a.jpg', 0) returning id into a;
  insert into offerra.media (property_id, url, sort_order) values (v_prop, 'https://x/b.jpg', 1) returning id into b;
  insert into offerra.media (property_id, url, sort_order) values (v_prop, 'https://x/c.jpg', 2) returning id into c;
  select count(*) filter (where is_cover) into v_cov from offerra.media where property_id = v_prop;
  select is_cover into v_is from offerra.media where id = a;
  if v_cov <> 1 or not v_is then raise exception 'FAIL 1: titulných %, prvá titulná %', v_cov, v_is; end if;

  -- 2) vlastník vyberie druhú → tá ostane titulná aj po ďalšom vklade
  perform offerra.set_cover_photo(b);
  insert into offerra.media (property_id, url, sort_order) values (v_prop, 'https://x/d.jpg', 3);
  select count(*) filter (where is_cover) into v_cov from offerra.media where property_id = v_prop;
  if v_cov <> 1 or not (select is_cover from offerra.media where id = b) then raise exception 'FAIL 2: vybraná titulná sa zmenila po vklade'; end if;

  -- 3) zmazanie TITULNEJ → titulnou sa stane prvá z ostatných (a je práve jedna)
  delete from offerra.media where id = b;
  select count(*) filter (where is_cover) into v_cov from offerra.media where property_id = v_prop;
  select id into v_after from offerra.media where property_id = v_prop and is_cover;
  if v_cov <> 1 then raise exception 'FAIL 3: po zmazaní titulnej je titulných %', v_cov; end if;
  if v_after <> (select id from offerra.media where property_id = v_prop order by sort_order, created_at limit 1) then
    raise exception 'FAIL 3b: titulnou nie je prvá z ostatných';
  end if;

  -- 4) zmazanie NETITULNEJ nič nezmení
  delete from offerra.media where id = c;
  if (select id from offerra.media where property_id = v_prop and is_cover) <> v_after then raise exception 'FAIL 4: zmena titulnej pri zmazaní netitulnej'; end if;

  -- 5) zmazanie poslednej fotky → inzerát bez fotiek, bez chyby
  delete from offerra.media where property_id = v_prop;

  raise exception 'CHECK_OK 1=prva_auto 2=vyber_drzi 3=povysenie_po_zmazani 4=netitulna_bez_zmeny 5=prazdny_ok';
end $$;`;

const r = await q(SQL);
console.log(r.body);
const ok = r.body.includes('CHECK_OK');
console.log(ok ? '\nVŠETKO OK (transakcia zrušená, v DB sa nič nezmenilo)' : '\nZLYHALO');
process.exit(ok ? 0 : 1);
