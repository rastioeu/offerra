-- offerra.viewing — OBHLIADKY.
--
-- Krok, ktorý v appke chýbal: v skutočnom svete si človek nehnuteľnosť
-- najprv pozrie a až potom sa rozhoduje. Obhliadka je NEZÁVISLÁ od ponuky
-- — dá sa vyžiadať pred ňou aj po nej a obe poradia musia fungovať. Preto
-- vlastná tabuľka, nie stĺpec na `property_offer`.
--
-- ─── ODKRYTIE KONTAKTU (rozhodnutie a dôvod) ────────────────────────────
-- Doteraz sa kontakt odkrýval až pri AKCEPTOVANÍ ponuky. Pri obhliadke to
-- nestačí: dohodnúť si čas a miesto sa bez spojenia nedá a majiteľ púšťa
-- cudzieho človeka do svojho bytu.
--
-- Zvolené riešenie: kontakt sa odkryje OBOM STRANÁM, ale až vo chvíli,
-- keď majiteľ obhliadku POTVRDÍ — nie pri samotnej žiadosti.
--
--   * Žiadosť je pseudonymná ako ponuka. Kto rozposiela žiadosti po celom
--     Slovensku, nezíska ani jeden telefón — bez potvrdenia sa nedozvie nič.
--   * Potvrdenie JE ten súhlas. Majiteľ sa práve rozhodol pustiť si toho
--     človeka domov; vtedy dáva zmysel, aby na seba obaja videli.
--   * Odkrýva sa OBOJSTRANNE, lebo väčšie riziko nesie majiteľ — ten musí
--     vedieť, koho púšťa dnu, nielen naopak.
--   * Presná adresa sa potvrdenému záujemcovi ukáže tiež, aj keď má
--     inzerát `address_hidden` — bez adresy sa na obhliadku nedá prísť.
--
-- Drží to `viewing_contact()` a RLS, nie UI.

create table if not exists offerra.viewing (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references offerra.property (id) on delete cascade,
  requester_id   uuid not null references auth.users (id) on delete cascade,

  -- Čas, ktorý navrhol záujemca.
  proposed_time  timestamptz not null,
  -- Čas, na ktorom sa dohodlo. Môže byť INÝ než navrhnutý — majiteľ smie
  -- potvrdiť s posunom a záujemca to buď príjme, alebo obhliadku zruší.
  -- Zámerne bez stavu „protinávrh": štyri stavy sú zrozumiteľnejšie než
  -- päť a výsledok je ten istý.
  confirmed_time timestamptz,

  status         text not null default 'REQUESTED'
                 check (status in ('REQUESTED', 'CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table offerra.viewing is
  'Obhliadky. Kontakt sa odkrýva pri POTVRDENÍ, nie pri žiadosti — viď viewing_contact().';

-- Jedna ŽIVÁ obhliadka na dvojicu inzerát+človek. Zrušené a zamietnuté sa
-- nerátajú, takže po zrušení sa dá požiadať znova.
create unique index if not exists viewing_one_live_uk
  on offerra.viewing (property_id, requester_id)
  where status in ('REQUESTED', 'CONFIRMED');

create index if not exists viewing_property_idx on offerra.viewing (property_id, created_at desc);
create index if not exists viewing_requester_idx on offerra.viewing (requester_id, created_at desc);

-- `updated_at` drží databáza, nie klient (rovnako ako pri `property`).
create or replace function offerra.viewing_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists viewing_touch on offerra.viewing;
create trigger viewing_touch before update on offerra.viewing
  for each row execute function offerra.viewing_touch();

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table offerra.viewing enable row level security;

-- Vidí ju záujemca a majiteľ inzerátu. Nikto tretí.
drop policy if exists viewing_read on offerra.viewing;
create policy viewing_read on offerra.viewing for select to authenticated
using (
  requester_id = auth.uid()
  or exists (select 1 from offerra.property p
              where p.id = property_id and p.owner_id = auth.uid())
);

-- Požiadať smie len prihlásený, sám za seba, a NIE na vlastný inzerát —
-- obhliadka vlastného bytu nemá zmysel a v paneli by len zavadzala.
drop policy if exists viewing_insert on offerra.viewing;
create policy viewing_insert on offerra.viewing for insert to authenticated
with check (
  requester_id = auth.uid()
  and exists (select 1 from offerra.property p
               where p.id = property_id
                 and p.owner_id <> auth.uid()
                 and p.status = 'ACTIVE')
);

-- Majiteľ potvrdzuje/zamieta, záujemca ruší a označuje „bol som tam".
-- Ktorý stav smie kto nastaviť, kontroluje trigger nižšie — v policy by
-- sa to nedalo napísať zrozumiteľne.
drop policy if exists viewing_update on offerra.viewing;
create policy viewing_update on offerra.viewing for update to authenticated
using (
  requester_id = auth.uid()
  or exists (select 1 from offerra.property p
              where p.id = property_id and p.owner_id = auth.uid())
);

create or replace function offerra.viewing_guard() returns trigger
language plpgsql security definer set search_path = offerra, public as $$
declare
  is_owner boolean;
begin
  select p.owner_id = auth.uid() into is_owner
    from offerra.property p where p.id = new.property_id;

  if new.status is distinct from old.status then
    if new.status in ('CONFIRMED', 'DECLINED') and not is_owner then
      raise exception 'Obhliadku potvrdzuje alebo zamieta majiteľ inzerátu.';
    end if;
    if new.status in ('CANCELLED', 'COMPLETED') and new.requester_id <> auth.uid() then
      raise exception 'Zrušiť alebo označiť za absolvovanú ju môže ten, kto o ňu požiadal.';
    end if;
    -- „Bol som tam" má zmysel len po potvrdení.
    if new.status = 'COMPLETED' and old.status <> 'CONFIRMED' then
      raise exception 'Za absolvovanú sa dá označiť len potvrdená obhliadka.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists viewing_guard on offerra.viewing;
create trigger viewing_guard before update on offerra.viewing
  for each row execute function offerra.viewing_guard();

grant select, insert, update on offerra.viewing to authenticated;

-- ─── KONTAKT ────────────────────────────────────────────────────────────
-- Rovnaký tvar ako `offer_contact()`. Mimo CONFIRMED/COMPLETED vráti
-- prázdno — to je to podstatné, nie skrytie v UI.
create or replace function offerra.viewing_contact(p_viewing_id uuid)
returns table (nickname text, full_name text, phone text, email text, street text)
language plpgsql security definer set search_path = offerra, public, auth as $$
declare
  v offerra.viewing;
  p offerra.property;
  other uuid;
begin
  select * into v from offerra.viewing where id = p_viewing_id;
  if not found or v.status not in ('CONFIRMED', 'COMPLETED') then
    return;
  end if;

  select * into p from offerra.property where id = v.property_id;

  if v.requester_id = auth.uid() then
    other := p.owner_id;              -- záujemca vidí majiteľa
  elsif p.owner_id = auth.uid() then
    other := v.requester_id;          -- majiteľ vidí záujemcu
  else
    return;                           -- nikto tretí
  end if;

  return query
    select pr.nickname, pr.full_name, pr.phone, u.email::text,
           -- Adresa má zmysel len pre toho, kto tam ide.
           case when v.requester_id = auth.uid() then p.street else null end
      from offerra.profile pr
      join auth.users u on u.id = pr.id
     where pr.id = other;
end $$;

revoke all on function offerra.viewing_contact(uuid) from public;
grant execute on function offerra.viewing_contact(uuid) to authenticated;

-- ─── OZNÁMENIA ──────────────────────────────────────────────────────────
-- Zakladá ich DATABÁZA, nie klient — rovnaké pravidlo ako pri ponukách
-- (register 5.1): klient na `notification` nemá INSERT grant vôbec.

alter table offerra.notification add column if not exists viewing_id uuid
  references offerra.viewing (id) on delete cascade;

-- ⚠️ `notification.type` a `notification_preference.type` majú obmedzenie
-- na povolené hodnoty. Či je to ENUM alebo CHECK, sa z klienta zistiť
-- nedalo (OpenAPI je len pre service_role, na `notification_preference`
-- nemá `anon` SELECT). Blok preto zvládne OBE podoby a nič nepredpokladá.
do $$
declare
  t regtype;
  con text;
  new_types text[] := array['NOVA_OBHLIADKA', 'OBHLIADKA_POTVRDENA', 'OBHLIADKA_ZAMIETNUTA'];
  v text;
begin
  select atttypid::regtype into t
    from pg_attribute
   where attrelid = 'offerra.notification'::regclass and attname = 'type';

  if t::text <> 'text' and t::text <> 'character varying' then
    -- ENUM: pridaj chýbajúce hodnoty
    foreach v in array new_types loop
      execute format('alter type %s add value if not exists %L', t, v);
    end loop;
  else
    -- CHECK: nájdi obmedzenie na stĺpci `type` a rozšír ho
    for con in
      select conname from pg_constraint
       where conrelid = 'offerra.notification'::regclass
         and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%'
    loop
      execute format('alter table offerra.notification drop constraint %I', con);
    end loop;
    alter table offerra.notification
      add constraint notification_type_check check (type in (
        'NOVA_PONUKA', 'PONUKA_AKCEPTOVANA', 'PONUKA_ZAMIETNUTA',
        'NOVY_DOPYT_ZODPOVEDA_INZERATU', 'NOVA_ZHODA', 'SYSTEMOVE',
        'NOVA_OBHLIADKA', 'OBHLIADKA_POTVRDENA', 'OBHLIADKA_ZAMIETNUTA'
      ));

    for con in
      select conname from pg_constraint
       where conrelid = 'offerra.notification_preference'::regclass
         and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%'
    loop
      execute format('alter table offerra.notification_preference drop constraint %I', con);
    end loop;
    alter table offerra.notification_preference
      add constraint notification_preference_type_check check (type in (
        'NOVA_PONUKA', 'PONUKA_AKCEPTOVANA', 'PONUKA_ZAMIETNUTA',
        'NOVY_DOPYT_ZODPOVEDA_INZERATU', 'NOVA_ZHODA', 'SYSTEMOVE',
        'NOVA_OBHLIADKA', 'OBHLIADKA_POTVRDENA', 'OBHLIADKA_ZAMIETNUTA'
      ));
  end if;
end $$;

create or replace function offerra.viewing_notify() returns trigger
language plpgsql security definer set search_path = offerra, public as $$
declare
  p offerra.property;
  nick text;
  kedy text;
begin
  select * into p from offerra.property where id = new.property_id;
  select pr.nickname into nick from offerra.profile pr where pr.id = new.requester_id;
  kedy := to_char(coalesce(new.confirmed_time, new.proposed_time), 'DD.MM.YYYY o HH24:MI');

  if tg_op = 'INSERT' then
    -- Majiteľovi. Prezývka, nie meno — žiadosť je pseudonymná.
    if offerra.should_notify(p.owner_id, 'NOVA_OBHLIADKA') then
      insert into offerra.notification (user_id, type, title, body, property_id, viewing_id)
      values (p.owner_id, 'NOVA_OBHLIADKA',
              format('%s žiada obhliadku', coalesce(nick, 'Záujemca')),
              format('„%s" — navrhuje %s', p.title, kedy),
              p.id, new.id);
    end if;

  elsif new.status is distinct from old.status then
    if new.status = 'CONFIRMED' and offerra.should_notify(new.requester_id, 'OBHLIADKA_POTVRDENA') then
      insert into offerra.notification (user_id, type, title, body, property_id, viewing_id)
      values (new.requester_id, 'OBHLIADKA_POTVRDENA',
              'Obhliadka je potvrdená',
              format('„%s" — %s. Kontakt na majiteľa je odteraz dostupný.', p.title, kedy),
              p.id, new.id);

    elsif new.status = 'DECLINED' and offerra.should_notify(new.requester_id, 'OBHLIADKA_ZAMIETNUTA') then
      insert into offerra.notification (user_id, type, title, body, property_id, viewing_id)
      values (new.requester_id, 'OBHLIADKA_ZAMIETNUTA',
              'Obhliadka bola zamietnutá',
              format('„%s" — majiteľ navrhnutý termín neprijal.', p.title),
              p.id, new.id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists viewing_notify_ins on offerra.viewing;
create trigger viewing_notify_ins after insert on offerra.viewing
  for each row execute function offerra.viewing_notify();

drop trigger if exists viewing_notify_upd on offerra.viewing;
create trigger viewing_notify_upd after update on offerra.viewing
  for each row execute function offerra.viewing_notify();
