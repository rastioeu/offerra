/**
 * Overenie `offerra.set_cover_photo` NAOZAJ v DB (nie čítaním kódu):
 * beží pod rolou `authenticated` s JWT vlastníka, potom cudzieho používateľa.
 * Celé je to v jednej transakcii, ktorú DO blok na konci ZÁMERNE zruší
 * (raise exception) → v DB sa nič nezmení. Výsledok sa číta z textu chyby.
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/check-cover-photo-db.mjs
 */
const MGMT = 'https://api.supabase.com/v1/projects/vxqvpgzwefcehugmhaft/database/query';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Chýba SUPABASE_ACCESS_TOKEN'); process.exit(1); }

async function q(query) {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return { status: r.status, body: await r.text() };
}

const pick = await q(`
  select p.id as property_id, p.owner_id, p.status, count(*) n
    from offerra.media m join offerra.property p on p.id = m.property_id
   where not offerra.has_accepted_offer(p.id)
   group by p.id, p.owner_id, p.status having count(*) >= 3
   order by (p.status = 'ACTIVE') desc limit 1`);
const row = JSON.parse(pick.body)[0];
if (!row) { console.error('Nenašiel som inzerát s ≥3 fotkami bez prijatej ponuky:', pick.body); process.exit(1); }
console.log(`Testovací inzerát: ${row.property_id} (${row.n} fotiek, stav ${row.status})`);
if (row.status !== 'ACTIVE') console.log('POZOR: nie je ACTIVE → cudzí ho nevidí, otestuje sa len vetva „Fotka neexistuje".');

const SQL = `
do $$
declare
  v_prop uuid := '${row.property_id}';
  v_owner uuid := '${row.owner_id}';
  v_ids uuid[];
  v_last uuid; v_mid uuid; v_first uuid;
  v_cnt int; v_cov int; v_ord text; v_stranger_blocked boolean := false; v_msg text;
begin
  select array_agg(id order by sort_order, created_at) into v_ids from offerra.media where property_id = v_prop;
  v_first := v_ids[1]; v_mid := v_ids[2]; v_last := v_ids[array_length(v_ids,1)];

  -- 1) vlastník
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform offerra.set_cover_photo(v_last);
  select count(*) filter (where is_cover), count(*) into v_cov, v_cnt from offerra.media where property_id = v_prop;
  if v_cov <> 1 then raise exception 'FAIL 1: titulných je %', v_cov; end if;
  if (select sort_order from offerra.media where id = v_last) <> 0 then raise exception 'FAIL 1b: vybraná nie je na sort_order 0'; end if;
  select string_agg(sort_order::text, ',' order by sort_order) into v_ord from offerra.media where property_id = v_prop;

  -- 2) zmena titulnej na inú → stará prestane byť titulná
  perform offerra.set_cover_photo(v_mid);
  select count(*) filter (where is_cover) into v_cov from offerra.media where property_id = v_prop;
  if v_cov <> 1 or not (select is_cover from offerra.media where id = v_mid) or (select is_cover from offerra.media where id = v_last) then
    raise exception 'FAIL 2: zmena titulnej';
  end if;

  -- 3) cudzí používateľ musí dostať CHYBU, nie tiché nič
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform offerra.set_cover_photo(v_first);
  exception when others then
    v_stranger_blocked := true; v_msg := sqlerrm;
  end;
  if not v_stranger_blocked then raise exception 'FAIL 3: cudzí používateľ nastavil titulnú'; end if;

  raise exception 'CHECK_OK fotiek=% poradie_po_kroku1=% cudzi_zablokovany=% (%)', v_cnt, v_ord, v_stranger_blocked, v_msg;
end $$;`;

const r = await q(SQL);
console.log(r.body);
const ok = r.body.includes('CHECK_OK');
console.log(ok ? '\nVŠETKO OK (transakcia zrušená, v DB sa nič nezmenilo)' : '\nZLYHALO');
process.exit(ok ? 0 : 1);
