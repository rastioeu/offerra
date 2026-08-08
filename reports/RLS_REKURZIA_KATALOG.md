# Katalóg padal na „infinite recursion" — príčina, oprava, dôkaz

**Dátum:** 8. augusta 2026 · **oprava je v DATABÁZE, teda už platí — netreba OTA ani build**

---

## Čo bolo pokazené

Prihlásený používateľ nedostal z katalógu nič:

```
GET property?status=eq.ACTIVE   →  500
{"code":"42P17","message":"infinite recursion detected in policy for relation \"property\""}
```

---

## Príčina — a nebola tam, kde si tipoval

Tipoval si limit aktívnych inzerátov. **Nebol to on** a nemohol byť:
limit som spravil ako **trigger** (`enforce_active_limit`), nie ako RLS
politiku. Trigger sa vyhodnocuje mimo politík a takto sa zacykliť nevie.

Vinník je politika, ktorú som pridal o pár minút skôr, pri uzavretí
obchodu (migrácia 20):

```sql
create policy property_select_closed_parties on offerra.property
  for select to authenticated
  using (
    status = 'CLOSED'
    and exists (select 1 from offerra.property_offer o      -- ← tu
                 where o.property_id = property.id and o.bidder_id = auth.uid())
  );
```

Cyklus vedie **cez druhú tabuľku**, preto nie je vidieť na prvý pohľad:

```
property        → politika sa pýta property_offer
property_offer  → offer_select_public sa pýta property   („je inzerát ACTIVE?")
property        → tá istá politika znova
                → …
```

Trieda chyby je presne tá, ktorú si pomenoval — **politika, ktorá sa cez
inú tabuľku pýta späť na seba.** Len konkrétny riadok bol iný.

### Prečo to neodhalili moje testy

Toto ma na tom mrzí najviac. Po tej migrácii som spustil dotaz **anonymne**
a dostal HTTP 200. Politika totiž mieri na `authenticated` — anonymný
dotaz sa k nej vôbec nedostane.

Overil som teda niečo iné, než čo bolo treba overiť. Je to ten istý zákaz
odvodzovania: **„funguje to neprihlásenému" nedokazuje „funguje to
prihlásenému".**

---

## Oprava

Vnútorné čítanie je vytiahnuté do `SECURITY DEFINER` funkcie. Tá beží ako
vlastník tabuľky, na ktorého sa RLS neuplatňuje, takže cyklus nemá kde
vzniknúť. Je to ten istý vzor, aký tu funguje od Fázy 2 pri `is_admin()`
a `offer_contact()` — len som ho tentoraz nepoužil.

```sql
create function offerra.i_have_offer_on(p_property uuid)
returns boolean language sql stable security definer
set search_path = offerra, pg_temp
as $$ select exists (select 1 from offerra.property_offer o
                      where o.property_id = p_property and o.bidder_id = auth.uid()); $$;

create policy property_select_closed_parties on offerra.property
  for select to authenticated
  using (status = 'CLOSED' and offerra.i_have_offer_on(id));
```

**Nepresúval som to do aplikačnej logiky**, ako si navrhoval ako možnosť.
Dôvod: táto politika nie je kontrola limitu, ale otázka *„smie tento
človek vidieť tento riadok?"* — a to do RLS patrí. Keby to rozhodovala
appka, uzavretý inzerát by bol čitateľný komukoľvek, kto obíde klienta.
Odstrániť treba **cyklus**, nie pravidlo.

Tvoja rada „nepoužívať sebareferenčný subquery v RLS" ostáva v platnosti —
funkcia je práve spôsob, ako ju dodržať.

---

## Dôkaz

### Katalóg znovu ide

```
PRIHLÁSENÝ katalóg:  HTTP 200 · 3 inzeráty
ANONYMNÝ katalóg:    HTTP 200 · 3 inzeráty
prihlásený ponuky:   HTTP 200
prihlásený s fotkami: HTTP 200
```

### Previerka VŠETKÝCH tabuliek, nie len tej opravenej

Bod 4 tvojho zadania. Nečítal som politiky — skúsil som každú tabuľku
tromi identitami:

```
tabuľka                anon   user  admin
app_config              401    200    200
buyer_request           200    200    200
city                    200    200    200
dismissed_hint          401    200    200
favorite                401    200    200
media                   200    200    200
notification            401    200    200
notification_preference 401    200    200
profile                 401    403    403   ← stĺpcová ochrana, nie chyba
property                200    200    200
property_offer          401    403    403   ← stĺpcová ochrana, nie chyba
rating                  401    200    200
report                  401    200    200
request_outreach        401    200    200
tenant_profile          401    200    200
viewing                 401    200    200

INSERT property   HTTP 201  bez rekurzie
INSERT report     HTTP 201  bez rekurzie
INSERT viewing    HTTP 403  bez rekurzie   (403 = správne, cudzí inzerát)

rekurzia na 0 miestach
```

Zápisy sú tam zámerne: politika s `with check`, ktorá sa pýta inej
tabuľky, vie cyklus spôsobiť rovnako ako čítanie.

Politiky z predošlej dávky, na ktoré si sa pýtal:

| Politika | Pýta sa inej tabuľky? | Riziko cyklu |
|---|---|---|
| `report_insert_own` | nie | žiadne |
| `config_read` | nie (`using (true)`) | žiadne |
| `rating_insert_party` | áno, ale cez `can_rate()` — SECURITY DEFINER | žiadne |
| `viewing_*` | áno, na `property` | žiadne — `property` sa na `viewing` nepýta |

### Trvalý test, aby sa to nevrátilo potichu

Nový `rls_recursion_test.py` — **21/21**. Prechádza všetky tabuľky tromi
identitami, tri zápisy a menovite katalóg prihláseného aj neprihláseného.
Beží odteraz v každom regresnom prechode.

---

## Čo si z toho beriem

Zapísané aj do registra:

**Každú novú RLS politiku treba overiť identitou, na ktorú MIERI.**
Politika `to authenticated` sa anonymným dotazom nedá otestovať — a práve
anonymný dotaz mi vrátil upokojujúcu 200.
