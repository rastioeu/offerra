#!/usr/bin/env node
/**
 * PLATNOSŤ PONUKY (Rastio, 27.8.2026, návrh testera) — DB časť.
 *
 * Rovnaká cesta ako všetky doterajšie zmeny schémy `offerra` (Management
 * API, nie psql — CLAUDE.md §4).
 *
 * ARCHITEKTÚRA — a PREČO NIE JEDNODUCHO „stĺpec + cron":
 * -------------------------------------------------------
 * Appka nemá cron s rozlíšením sekúnd (najbližší beží raz za minútu — pozri
 * `cron.job`) a nespolieha sa na to, že `offerra.expire_offers()` (nižšie,
 * bežiaci raz za 5 minút — rovnaká perióda ako `seed-auto-forward`) stihne
 * status preklopiť skôr, než niekto stihne kliknúť „Prijať". Preto je
 * vynútenie na DVOCH miestach nezávisle:
 *
 *   1. `guard_offer_update()` — priamo pri UPDATE porovná `valid_until`
 *      s `now()`, nie so `status`. Toto je JEDINÝ skutočný zámok proti
 *      race condition (rovnaký vzor ako uzávierka ponúk na inzeráte,
 *      `offer_deadline`, ktorá funguje identicky).
 *   2. `offerra.expire_offers()` + `cron.schedule(...)` — len KOZMETIKA
 *      a NOTIFIKÁCIA (status `EXPIRED` na zobrazenie po zatvorení appky
 *      a push bidderovi). Appka na klientovi POČÍTA uplynutie VŽDY živo
 *      z `valid_until` (`src/lib/offer-validity.ts`), nikdy len z tohto
 *      stĺpca — presne z rovnakého dôvodu, ako to appka robí pri uzávierke
 *      ponúk (CLAUDE.md §10: dáta/stav sa dajú zmeškať, čas nie).
 *
 * ZMENY:
 *   - nový stĺpec `property_offer.valid_until` (nullable = bez obmedzenia)
 *   - `property_offer_status_check` → pridané 'EXPIRED'
 *   - `offer_insert_own` (RLS) → `valid_until` musí byť null alebo v budúcnosti
 *   - `guard_offer_update()` → majiteľ nesmie meniť `valid_until`; majiteľ
 *     nesmie prijať ponuku, ktorej platnosť uplynula; záujemca smie meniť
 *     `valid_until` rovnako ako sumu/správu (a len na budúci dátum)
 *   - `on_offer_decided()` → nová vetva pre `EXPIRED` (notifikácia bidderovi)
 *   - nová funkcia `offerra.expire_offers()` (SECURITY DEFINER)
 *   - nový `cron.job` `offerra-expire-offers`, beží každých 5 minút
 *   - `notification_type_check` / `notification_preference_type_check` →
 *     pridané 'PONUKA_EXPIROVANA'
 *
 * IDEMPOTENTNÉ: `add column if not exists`, `create or replace function`,
 * `drop constraint if exists` + `add constraint`, `cron.schedule` na
 * existujúci názov jobu ho len nahradí (unique `(jobname, username)`).
 *
 * SPUSTENIE
 * ---------
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-offer-validity.mjs
 *
 * PO SPUSTENÍ over: node scripts/check-offer-validity-db.mjs (rovnaký token)
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const COLUMN_SQL = `
alter table offerra.property_offer add column if not exists valid_until timestamptz;
`;

// NOVÝ stĺpec nededí stĺpcové granty tabuľky (tá ich má nastavené per-stĺpec,
// nie `all`) — bez tohto by `OFFER_PUBLIC_COLS` (appka číta `valid_until`
// verejne, rovnako ako `amount`/`status`) padalo pre `anon`/`authenticated`
// na 42501. Chýbalo to v prvom behu tejto migrácie (27.8.2026) — odhalené
// priamym dotazom na `information_schema.column_privileges` hneď po behu,
// nie odhadom.
const GRANT_SQL = `
grant select (valid_until) on offerra.property_offer to anon, authenticated;
`;

const STATUS_CHECK_SQL = `
alter table offerra.property_offer drop constraint if exists property_offer_status_check;
alter table offerra.property_offer add constraint property_offer_status_check
  check (status = any (array['PENDING','ACCEPTED','REJECTED','WITHDRAWN','EXPIRED']));
`;

// RLS: `offer_insert_own` dostáva PRIDANÚ podmienku na `valid_until`, zvyšok
// WITH CHECK je nezmenený (skopírované z aktuálneho stavu v DB, aby sa
// politika nezmenila v ničom inom).
const INSERT_POLICY_SQL = `
drop policy if exists offer_insert_own on offerra.property_offer;
create policy offer_insert_own on offerra.property_offer
  for insert
  with check (
    bidder_id = auth.uid()
    and status = 'PENDING'
    and not offerra.is_blocked()
    and (valid_until is null or valid_until > now())
    and exists (
      select 1 from offerra.property p
      where p.id = property_offer.property_id
        and p.status = 'ACTIVE'
        and p.owner_id <> auth.uid()
        and (p.offer_deadline is null or p.offer_deadline > now())
    )
  );
`;

const GUARD_SQL = `
create or replace function offerra.guard_offer_update()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'public', 'pg_temp'
as $function$
declare
  v_owner uuid;
  v_deadline timestamptz;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return new;
  end if;

  select p.owner_id, p.offer_deadline into v_owner, v_deadline
    from offerra.property p where p.id = old.property_id;

  if new.id is distinct from old.id
     or new.property_id is distinct from old.property_id
     or new.bidder_id is distinct from old.bidder_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Ponuku nemozno presunut na iny inzerat ani na ineho cloveka.';
  end if;

  if v_actor = old.bidder_id
     and old.status <> 'PENDING'
     and new.status = old.status
     and old.viewed_by_bidder_at is null
     and new.viewed_by_bidder_at is not null
     and new.amount is not distinct from old.amount
     and new.message is not distinct from old.message
     and new.viewed_by_owner_at is not distinct from old.viewed_by_owner_at then
    return new;
  end if;

  if old.status <> 'PENDING' then
    raise exception 'Ponuka je uz uzavreta (%), menit sa neda.', old.status;
  end if;

  if v_actor = v_owner then
    if new.amount is distinct from old.amount
       or new.message is distinct from old.message
       or new.valid_until is distinct from old.valid_until then
      raise exception 'Majitel nesmie menit sumu, spravu ani platnost ponuky.';
    end if;

    if new.status = old.status then
      if old.viewed_by_owner_at is not null or new.viewed_by_owner_at is null then
        raise exception 'Majitel moze ponuku len prijat, odmietnut alebo oznacit za videnu.';
      end if;
      return new;
    end if;

    if new.status not in ('ACCEPTED', 'REJECTED') then
      raise exception 'Majitel moze ponuku len prijat alebo odmietnut.';
    end if;

    -- JADRO tejto zmeny: platnost sa overuje zo ZIVEHO casu (old.valid_until
    -- vs now()), NIE zo stlpca status — cron ho preklopi az s oneskorenim
    -- do 5 minut a majitel nesmie mat sirsie okno na klik, nez ma appka na
    -- klientovi na to, aby tlacidlo skryla.
    if new.status = 'ACCEPTED' and old.valid_until is not null and old.valid_until <= now() then
      raise exception 'Platnost tejto ponuky uz uplynula, prijat sa neda.';
    end if;

  elsif v_actor = old.bidder_id then
    if new.viewed_by_owner_at is distinct from old.viewed_by_owner_at then
      raise exception 'Zaujemca nesmie menit, ci majitel ponuku videl.';
    end if;
    if new.status not in ('PENDING', 'WITHDRAWN') then
      raise exception 'Ponuku moze prijat alebo odmietnut len majitel inzeratu.';
    end if;
    if new.status = 'PENDING'
       and (new.amount is distinct from old.amount
            or new.message is distinct from old.message
            or new.valid_until is distinct from old.valid_until)
       and v_deadline is not null and v_deadline <= now() then
      raise exception 'Uzavierka ponuk uz uplynula, sumu menit nemozno.';
    end if;
    if new.valid_until is distinct from old.valid_until
       and new.valid_until is not null and new.valid_until <= now() then
      raise exception 'Platnost ponuky musi byt v buducnosti.';
    end if;

  else
    raise exception 'Tuto ponuku nemozes menit.';
  end if;

  return new;
end;
$function$;
`;

const DECIDED_SQL = `
create or replace function offerra.on_offer_decided()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'public', 'pg_temp'
as $function$
declare
  v_title text;
begin
  if new.status = old.status then return new; end if;
  select p.title into v_title from offerra.property p where p.id = new.property_id;

  if new.status = 'ACCEPTED' then
    perform offerra.push_notification(
      new.bidder_id, 'PONUKA_AKCEPTOVANA',
      'Tvoja ponuka bola prijatá',
      'Predávajúci prijal tvoju ponuku na „' || coalesce(v_title, 'inzerát') ||
      '". Kontakt je teraz odkrytý.', new.property_id, new.id);
  elsif new.status = 'REJECTED' then
    perform offerra.push_notification(
      new.bidder_id, 'PONUKA_ZAMIETNUTA',
      'Tvoja ponuka bola odmietnutá',
      'Na inzerát „' || coalesce(v_title, 'inzerát') || '".', new.property_id, new.id);
  elsif new.status = 'EXPIRED' then
    perform offerra.push_notification(
      new.bidder_id, 'PONUKA_EXPIROVANA',
      'Platnosť tvojej ponuky uplynula',
      'Platnosť tvojej ponuky na „' || coalesce(v_title, 'inzerát') ||
      '" uplynula. Ponuku už nie je možné prijať.', new.property_id, new.id);
  end if;
  return new;
end;
$function$;
`;

const EXPIRE_FN_SQL = `
create or replace function offerra.expire_offers()
 returns integer
 language plpgsql
 security definer
 set search_path to 'offerra', 'public', 'pg_temp'
as $function$
declare v_count int;
begin
  update offerra.property_offer
     set status = 'EXPIRED'
   where status = 'PENDING'
     and valid_until is not null
     and valid_until <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
`;

const CRON_SQL = `
select cron.schedule('offerra-expire-offers', '*/5 * * * *', $$select offerra.expire_offers();$$);
`;

// `my_request_outreach()` počíta „najvyššiu živú ponuku" pre kartu inzerátu
// v OSLOVENIACH DOPYTU — ten istý koncept ako `top_offer` v katalógu
// (`attachOfferStats`, use-properties.ts), len na inom mieste. Bez tejto
// zmeny by expirovaná PENDING ponuka (kým ju cron nepreklopí na EXPIRED)
// vyhrávala aj tu — presne ten istý bug, len na obrazovke, ktorú
// pôvodné zadanie nemenovalo výslovne.
const OUTREACH_TOP_OFFER_SQL = `
create or replace function offerra.my_request_outreach()
 returns table(id uuid, request_id uuid, property_id uuid, from_id uuid, from_nickname text, message text, created_at timestamp with time zone, property_title text, property_city text, property_price numeric, property_top_offer numeric, property_rooms smallint, property_area numeric, property_status text, request_description text)
 language sql
 stable security definer
 set search_path to 'offerra', 'public'
as $function$
  select o.id, o.request_id, o.property_id, o.from_id,
         pr.nickname, o.message, o.created_at,
         p.title, p.city, p.asking_price_hint,
         (select max(o2.amount) from offerra.property_offer o2
           where o2.property_id = p.id and o2.status = 'PENDING'
             and (o2.valid_until is null or o2.valid_until > now())),
         p.rooms, p.area_m2, p.status,
         r.description
  from offerra.request_outreach o
  join offerra.buyer_request r on r.id = o.request_id
  left join offerra.property p on p.id = o.property_id
  left join offerra.profile pr on pr.id = o.from_id
  where r.user_id = auth.uid()
  order by o.created_at desc;
$function$;
`;

const NOTIFICATION_TYPE_SQL = `
alter table offerra.notification drop constraint if exists notification_type_check;
alter table offerra.notification add constraint notification_type_check
  check (type = any (array[
    'NOVA_PONUKA','PONUKA_AKCEPTOVANA','PONUKA_ZAMIETNUTA','PONUKA_EXPIROVANA',
    'NOVY_DOPYT_ZODPOVEDA_INZERATU','OSLOVENIE_DOPYTU','NOVA_ZHODA',
    'ZIADOST_O_OBHLIADKU','OBHLIADKA_POTVRDENA','OBHLIADKA_ZAMIETNUTA',
    'NOVA_SPRAVA','SYSTEMOVE'
  ]));

alter table offerra.notification_preference drop constraint if exists notification_preference_type_check;
alter table offerra.notification_preference add constraint notification_preference_type_check
  check (type = any (array[
    'NOVA_PONUKA','PONUKA_AKCEPTOVANA','PONUKA_ZAMIETNUTA','PONUKA_EXPIROVANA',
    'NOVY_DOPYT_ZODPOVEDA_INZERATU','OSLOVENIE_DOPYTU','NOVA_ZHODA',
    'ZIADOST_O_OBHLIADKU','OBHLIADKA_POTVRDENA','OBHLIADKA_ZAMIETNUTA',
    'NOVA_SPRAVA','SYSTEMOVE'
  ]));
`;

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('CHYBA: chýba SUPABASE_ACCESS_TOKEN.');
    console.error('Spusti ako: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-offer-validity.mjs');
    process.exit(2);
  }
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.text();
  if (!r.ok) {
    throw new Error(`SQL HTTP ${r.status}: ${body.slice(0, 800)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  console.log('1/10 Stĺpec property_offer.valid_until …');
  await sql(COLUMN_SQL);
  console.log('2/10 GRANT select (valid_until) na anon/authenticated …');
  await sql(GRANT_SQL);
  console.log('3/10 property_offer_status_check (+ EXPIRED) …');
  await sql(STATUS_CHECK_SQL);
  console.log('4/10 RLS offer_insert_own (+ valid_until v budúcnosti) …');
  await sql(INSERT_POLICY_SQL);
  console.log('5/10 offerra.guard_offer_update() …');
  await sql(GUARD_SQL);
  console.log('6/10 offerra.on_offer_decided() (+ vetva EXPIRED) …');
  await sql(DECIDED_SQL);
  console.log('7/10 offerra.expire_offers() …');
  await sql(EXPIRE_FN_SQL);
  console.log('8/10 cron.job offerra-expire-offers (*/5 * * * *) …');
  await sql(CRON_SQL);
  console.log('9/10 offerra.my_request_outreach() (top_offer vylučuje expirované) …');
  await sql(OUTREACH_TOP_OFFER_SQL);
  console.log('10/10 notification_type_check / notification_preference_type_check (+ PONUKA_EXPIROVANA) …');
  await sql(NOTIFICATION_TYPE_SQL);
  console.log('Hotovo. Over: node scripts/check-offer-validity-db.mjs');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
