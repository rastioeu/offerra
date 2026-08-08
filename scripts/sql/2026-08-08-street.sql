-- offerra.street — číselník ulíc SR z Registra adries (MV SR).
--
-- Zdroj: data.slovensko.sk, dataset „Register Adries - Register ulíc",
-- distribúcia „Ulice - konsolidované dáta" (CSV). Napĺňa sa RAZ pri importe
-- skriptom `scripts/import-streets.mjs` — appka pri písaní NEVOLÁ žiadne
-- externé API, hľadá len v tejto tabuľke.
--
-- `name_norm` je GENEROVANÝ cez `offerra.norm()` — tú istú funkciu používa
-- `offerra.city.name_norm`. Nedá sa teda rozísť s tým, čo posiela klient
-- (`normalizeText()` v `src/lib/search.ts`).

create table if not exists offerra.street (
  id           bigint generated always as identity primary key,
  city_id      bigint not null references offerra.city (id) on delete cascade,
  name         text   not null,
  name_norm    text   generated always as (offerra.norm(name)) stored,
  -- objectId z Registra adries. Nie je unikátny naprieč tabuľkou: ulicu
  -- mestskej časti zrkadlíme aj pod zastrešujúce mesto (Bratislava/Košice),
  -- takže ten istý RA objekt môže mať dva riadky s rôznym city_id.
  ra_object_id bigint,
  created_at   timestamptz not null default now()
);

comment on table offerra.street is
  'Ulice SR z Registra adries MV SR (data.slovensko.sk). Read-only číselník.';

-- Jedna ulica na mesto. Zároveň to robí import idempotentným
-- (on conflict do nothing).
create unique index if not exists street_city_name_uk
  on offerra.street (city_id, name_norm);

-- Prefixové hľadanie `name_norm like 'sanc%'` v rámci mesta.
-- `text_pattern_ops` je nutné — pri inom než C collation by bežný btree
-- index LIKE-prefix nevedel obslúžiť a hľadanie by robilo seq scan.
create index if not exists street_city_prefix_idx
  on offerra.street (city_id, name_norm text_pattern_ops);

alter table offerra.street enable row level security;

-- Číselník je verejný na čítanie, zapisuje sa výhradne importom
-- (service role / Management API), nie z telefónu.
drop policy if exists street_read on offerra.street;
create policy street_read on offerra.street
  for select to anon, authenticated using (true);

grant select on offerra.street to anon, authenticated;
