# Platnosť ponuky

**Dátum:** 27.8.2026
**Vyžiadal:** Rastio (návrh testera)
**Rozsah:** `property_offer.valid_until` (DB), `src/lib/offer-validity.ts`,
`src/components/offer-validity-picker.tsx`, `src/app/ponuka/[id].tsx`,
`src/components/offer-list.tsx`, `src/components/owner-offers.tsx`,
`src/components/property-tabs.tsx`, `src/hooks/use-properties.ts`,
`src/lib/offers.ts`, `src/lib/notifications.ts`, `notification-route.ts`,
`how-it-works.ts`, lokalizácia SK/EN/DE, `OFFERRA_REGISTER.md` (Fáza 31)

---

## 0. Odpoveď na otázku v zadaní — default platnosti

**„Bez obmedzenia" ako predvolená hodnota je správne rozhodnutie.** Rovnaký
princíp ako pri Uzávierke ponúk na inzeráte: appka nesmie nikoho ticho
obmedziť niečím, o čom pred touto fázou vôbec nevedel. Kto chce platnosť
skrátiť, urobí to vedome cez picker; kto ho nevšimne, jeho ponuka sa správa
presne tak, ako doteraz.

---

## 1. Architektúra — a prečo NIE „stĺpec + cron" samo osebe

Zdieľaná DB má `pg_cron`, ale najjemnejšia perióda je raz za minútu a naša
funkcia (aby nezaťažovala DB zbytočne často) beží raz za **5 minút** —
rovnaká perióda ako existujúci `seed-auto-forward`. To znamená: **appka sa
NESMIE spoliehať na to, že cron stihne status prekrpiť skôr, než niekto
klikne „Prijať".**

Preto je vynútenie na dvoch nezávislých miestach, presne ako pri uzávierke
ponúk (`offer_deadline`, ktorá funguje identicky):

1. **`guard_offer_update()`** (DB trigger) — pri UPDATE porovná
   `old.valid_until` priamo s `now()`. Toto je JEDINÝ skutočný zámok proti
   race condition.
2. **`offerra.expire_offers()` + `cron.job`** (`*/5 * * * *`) — len
   kozmetika (zapíše `status = 'EXPIRED'`, nech appka po zavretí nemusí
   dopočítavať sama) a notifikácia bidderovi.
3. **Appka na klientovi** (`isOfferExpired(status, validUntil)`) — počíta
   expiráciu VŽDY živo, nikdy nečaká na cron. Preto sa „PLATNOSŤ UPLYNULA"
   ukáže okamžite v momente, keď čas uplynie — nie až o 5 minút neskôr.

---

## 2. Čo bolo zlé v rozrobenej DB migrácii — zmerané, nie tušené

Migračný skript existoval už napísaný (súbežná session), ale nespustený.
Po prvom behu priamy dotaz na `information_schema.column_privileges`
ukázal:

```
valid_until grants:  postgres (SELECT/UPDATE/…), service_role (…)
                      ŽIADNY grant pre anon ani authenticated
```

Nový stĺpec **nededí** stĺpcové granty tabuľky (tá má granty nastavené
per-stĺpec, nie `all`). Bez opravy by **verejný zoznam ponúk**
(`OFFER_PUBLIC_COLS`, ktorý číta `valid_until` rovnako verejne ako
`amount`/`status`) padal na `42501` pre úplne každého, kto otvorí detail
inzerátu — teda by táto fáza appku priamo rozbila, nie len nedodala
funkciu. Opravené (`grant select (valid_until) on … to anon,
authenticated;`) a dopísané do migračného skriptu ako trvalý krok.

---

## 3. Čo je teraz

- Pri podaní ponuky je nový picker **„Platnosť ponuky"**: Bez obmedzenia /
  7 / 14 / 30 dní — rovnaký vzor ako `DeadlinePicker`, zámerne bez
  vlastného dátumu (natívny date picker = nový natívny modul = nový EAS
  build, appka pri tejto fáze ostáva čisto OTA).
- V zozname ponúk (tab „Ponuky") beží pri každej ponuke s platnosťou
  odpočet („Platí do… · ostáva X dní"), rovnaký tvar ako countdown
  uzávierky.
- Po uplynutí: ponuka **zostáva viditeľná**, dostane odznak „PLATNOSŤ
  UPLYNULA" (živo, nečaká na cron), tlačidlo „Prijať" pri nej v spodnom
  paneli majiteľa **sa vôbec nezobrazí** (CLAUDE.md §12a — nesľubovať
  akciu, ktorú DB aj tak odmietne), a nepočíta sa do „najvyššej ponuky" ani
  v katalógu, ani v Osloveniach dopytu (vedľajší nález — pozri §5).
- Bidder dostane push „Platnosť tvojej ponuky uplynula" (typ
  `PONUKA_EXPIROVANA`, riadi sa rovnakou `notification_preference` ako
  ostatné).
- „Ako funguje Offerra" má nový odsek v sekcii „Ponuky sú verejné, ľudia
  nie", vo všetkých troch jazykoch.

---

## 4. Dôkazy

| Čo | Ako | Výsledok |
|---|---|---|
| logika platnosti (čistá funkcia) | `npx --yes tsx scripts/check-offer-validity.ts` | **13/13 OK** |
| DB naživo — 6 scenárov vrátane race condition | `npx --yes tsx scripts/check-offer-validity-db.mjs` (real SQL, real seed dáta, syntetická ponuka zmazaná po teste) | **6/6 OK**, s reálnym textom `P0001` chyby ako dôkazom |
| lokalizácia SK/EN/DE | `npx --yes tsx scripts/check-i18n.ts` | **14/14 OK** |
| regresia uzávierky (nedotknutá touto fázou) | `check-deadline.ts` | 24/24 OK, bez zmeny |
| typy | `npx tsc --noEmit -p .` | čisté |
| Realtime pravidlo (§11) | `grep -rn "\.channel("` mimo `realtime.ts`/`use-realtime-channel.ts` | žiadny výsledok |
| `package.json` (§9) | `git diff --stat package.json` | prázdne — fingerprint nedotknutý |

### DB test naživo — presné znenie

```
1. majiteľ NESMIE prijať ponuku s prešlým valid_until (status ešte PENDING):
   ERROR P0001: Platnost tejto ponuky uz uplynula, prijat sa neda.
2. anon SMIE čítať valid_until (grant funguje)
3. offerra.expire_offers() → PENDING + prešlé valid_until → EXPIRED (n=1)
4. notifikácia PONUKA_EXPIROVANA bidderovi existuje (n=1)
5. majiteľ NESMIE prijať už EXPIRED ponuku:
   ERROR P0001: Ponuka je uz uzavreta (EXPIRED), menit sa neda.
6. INSERT s valid_until v minulosti zamietnutý:
   ERROR 42501: new row violates row-level security policy
```

**Čo dôkaz NEDOKAZUJE:** ako picker, countdown a odznak vyzerajú na
telefóne, a či push naozaj príde na zamknutú obrazovku. Preto je to
v registri (Fáza 31.3) 🟡.

---

## 5. Vedľajší nález — mimo pôvodného rozsahu zadania

Zadanie menovalo len „najvyššiu ponuku na karte v katalógu"
(`attachOfferStats`). Rovnaký koncept ale počíta aj
`offerra.my_request_outreach()` — funkcia, ktorá napĺňa kartu inzerátu
v Osloveniach dopytu (`property_top_offer`). Bez opravy by tam expirovaná
PENDING ponuka (kým ju cron nepreklopí) ešte chvíľu vyhrávala. Opravené
v tom istom kroku ako katalóg, nech appka nehovorí dvomi rôznymi číslami
o tej istej veci na dvoch obrazovkách.

---

## 6. OTA

Žiadny natívny modul nepribudol, `package.json` nedotknutý → **IDE OTA**.

| | Runtime |
|---|---|
| posledný `finished` iOS build | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS) | *(doplní sa po `eas update`)* |
| publikovaná OTA (Android) | *(doplní sa po `eas update`)* |

---

## 7. Čo mi máš potvrdiť (slovami)

1. Pri podaní ponuky vidíš picker „Platnosť ponuky" so štyrmi voľbami a
   default je „Bez obmedzenia".
2. Pri ponuke s nastavenou platnosťou v tabe „Ponuky" beží text „Platí
   do… · ostáva X dní".
3. Nastav si testovaciu ponuku na krátku platnosť (najkratšia voľba je
   7 dní — ak chceš otestovať skôr, povedz a pripravím spôsob, ako
   nastaviť platnosť na pár minút priamo v DB pre tvoj test).
4. Po uplynutí: odznak „PLATNOSŤ UPLYNULA", tlačidlo „Prijať" chýba.
5. Do 5 minút po uplynutí príde push „Platnosť tvojej ponuky uplynula".
6. Karta v katalógu neukazuje ako „najvyššiu" sumu z expirovanej ponuky.
7. Nastavenia → Ako funguje Offerra → nový odsek o platnosti ponuky (aj
   v EN/DE, ak prepneš jazyk appky).
