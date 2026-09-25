/**
 * Titulná fotka inzerátu, ktorú si vlastník VYBERIE (Rastio, 25.9.2026:
 * „keď niekto označí, že fotka je titulná, nech je stále titulná").
 *
 * Doteraz „titulná" nebola voľba — karta v katalógu rotovala fotky
 * (`src/lib/cover-photo.ts`) a v úprave inzerátu mala odznak prvá fotka.
 *
 * Zmena (ADITÍVNA, len schéma `offerra`; DB je zdieľaná s MUTARK, tabuľky
 * ani funkcie iných projektov sa nedotýkajú):
 *  1. `offerra.media.is_cover boolean not null default false`
 *  2. unikátny čiastočný index — najviac JEDNA titulná na inzerát
 *  3. `grant update (is_cover)` — stĺpcové právo, tabuľka ho mala len na
 *     `sort_order` a `url` (test to odhalil: bez toho funkcia padla na
 *     „permission denied for table media")
 *  4. `offerra.set_cover_photo(p_media_id uuid)` — jedným krokom označí
 *     fotku za titulnú A presunie ju na sort_order 0 (ostatné sa zoradia
 *     za ňu), takže všetky zoznamy radené podľa sort_order (detail, web,
 *     galéria) ju ukážu prvú. SECURITY INVOKER — platí RLS; ak by UPDATE
 *     politika riadok potichu odfiltrovala (cudzí inzerát, zamknutý po
 *     prijatej ponuke), funkcia to POZNÁ a hodí chybu, nie „nič sa nestalo".
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-cover-photo.mjs
 * IDEMPOTENTNÝ. Token len z prostredia, do repa sa nezapisuje (§4).
 * PO SPUSTENÍ: node scripts/check-cover-photo-db.mjs (rovnaký token).
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const SQL = `
alter table offerra.media add column if not exists is_cover boolean not null default false;

create unique index if not exists media_one_cover_per_property
  on offerra.media (property_id) where is_cover;

create or replace function offerra.set_cover_photo(p_media_id uuid)
 returns void
 language plpgsql
 security invoker
 set search_path to 'offerra', 'pg_temp'
as $function$
declare
  v_property uuid;
begin
  select property_id into v_property from offerra.media where id = p_media_id;
  if v_property is null then
    raise exception 'Fotka neexistuje.' using errcode = 'P0002';
  end if;

  -- najprv zrušiť starú titulnú (unikátny index nedovolí dve naraz)
  update offerra.media set is_cover = false where property_id = v_property and is_cover;

  -- vybraná ide na začiatok, ostatné za ňu v pôvodnom poradí
  with ordered as (
    select id, (row_number() over (order by (id = p_media_id) desc, sort_order, created_at) - 1)::smallint as rn
    from offerra.media where property_id = v_property
  )
  update offerra.media m
     set sort_order = o.rn, is_cover = (m.id = p_media_id)
    from ordered o
   where m.id = o.id;

  -- RLS môže UPDATE potichu odfiltrovať → nesmieme predstierať úspech
  if not exists (select 1 from offerra.media where id = p_media_id and is_cover) then
    raise exception 'Titulnú fotku sa nepodarilo nastaviť — nemáš oprávnenie alebo je inzerát zamknutý.' using errcode = '42501';
  end if;
end;
$function$;

-- rola authenticated má UPDATE na media len po stĺpcoch (sort_order, url) — pridávame
-- práve JEDEN nový, RLS politiky (media_update_own/locked) platia ďalej.
grant update (is_cover) on offerra.media to authenticated;

revoke all on function offerra.set_cover_photo(uuid) from public, anon;
grant execute on function offerra.set_cover_photo(uuid) to authenticated;
notify pgrst, 'reload schema';
`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Chýba SUPABASE_ACCESS_TOKEN v prostredí.');
  process.exit(1);
}
const res = await fetch(MGMT, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: SQL }),
});
const body = await res.text();
console.log(`HTTP ${res.status}: ${body}`);
process.exit(res.ok ? 0 : 1);
