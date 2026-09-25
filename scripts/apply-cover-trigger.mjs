/**
 * Automatická titulná fotka (Rastio, 25.9.2026: „pridaj trigger").
 * Bez tohto by nový inzerát rotoval fotky v katalógu, kým vlastník sám
 * nevyberie titulnú (stará rotácia z 13.8.2026 sa použije, keď žiadna
 * `is_cover` nie je).
 *
 *  1. BEFORE INSERT na `offerra.media`: ak inzerát ešte nemá titulnú, nová
 *     fotka ju dostane (`is_cover = true`). Advisory lock na inzerát —
 *     dva súbežné vklady prvých fotiek by inak oba videli „žiadna titulná"
 *     a druhý by padol na unikátnom indexe.
 *  2. AFTER DELETE: ak sa zmaže TITULNÁ fotka a nejaké ostanú, titulnou sa
 *     stane prvá z ostatných (podľa `sort_order`). Inak by inzerát potichu
 *     prešiel späť na rotáciu — presne to, čo vlastník nechce.
 *     SECURITY DEFINER (mení len riadky toho istého inzerátu), aby to
 *     neblokovali RLS/stĺpcové práva; funkcia je `set search_path` pevne.
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-cover-trigger.mjs
 * IDEMPOTENTNÝ. Token len z prostredia (§4).
 * PO SPUSTENÍ: node scripts/check-cover-trigger.mjs
 */
const MGMT = 'https://api.supabase.com/v1/projects/vxqvpgzwefcehugmhaft/database/query';

const SQL = `
create or replace function offerra.media_auto_cover_before_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'pg_temp'
as $function$
begin
  perform pg_advisory_xact_lock(hashtext('media_cover:' || new.property_id::text));
  if not new.is_cover
     and not exists (select 1 from offerra.media where property_id = new.property_id and is_cover) then
    new.is_cover := true;
  end if;
  return new;
end;
$function$;

create or replace function offerra.media_promote_cover_after_delete()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'pg_temp'
as $function$
begin
  if old.is_cover then
    perform pg_advisory_xact_lock(hashtext('media_cover:' || old.property_id::text));
    if not exists (select 1 from offerra.media where property_id = old.property_id and is_cover) then
      update offerra.media set is_cover = true
       where id = (select id from offerra.media where property_id = old.property_id
                    order by sort_order, created_at limit 1);
    end if;
  end if;
  return null;
end;
$function$;

revoke all on function offerra.media_auto_cover_before_insert() from public, anon, authenticated;
revoke all on function offerra.media_promote_cover_after_delete() from public, anon, authenticated;

drop trigger if exists media_auto_cover on offerra.media;
create trigger media_auto_cover before insert on offerra.media
  for each row execute function offerra.media_auto_cover_before_insert();

drop trigger if exists media_promote_cover on offerra.media;
create trigger media_promote_cover after delete on offerra.media
  for each row execute function offerra.media_promote_cover_after_delete();
`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Chýba SUPABASE_ACCESS_TOKEN'); process.exit(1); }
const res = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: SQL }) });
console.log(`HTTP ${res.status}: ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
