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
  1 / 3 / 7 / 14 / 30 dní — rovnaký vzor ako `DeadlinePicker`, zámerne bez
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
| logika platnosti (čistá funkcia) | `npx --yes tsx scripts/check-offer-validity.ts` | **17/17 OK** |
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
| publikovaná OTA (iOS) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` — **zhodné** |
| publikovaná OTA (Android) | `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7` |

Runtime sa zhoduje s posledným dokončeným buildom → OTA sa dostane k tebe do appky (§9). iOS update `01a042a5-1b9e-7514-a19a-de7081d9fa16` (skupina `a64e52f2-4c9c-46e8-b40f-07b37c892cd1`), Android update `01a042a5-1b9e-793f-82bf-68e8c2415820` (skupina `11c32646-c752-4f78-8396-b9472b6bd98d`). Commit `76ab468`.

---

## 7. Čo mi máš potvrdiť (slovami)

1. Pri podaní ponuky vidíš picker „Platnosť ponuky" so šiestimi voľbami a
   default je „Bez obmedzenia".
2. Pri ponuke s nastavenou platnosťou v tabe „Ponuky" beží text „Platí
   do… · ostáva X dní".
3. Nastav si testovaciu ponuku na krátku platnosť — najkratšia voľba je
   teraz 1 deň (na tvoju žiadosť pribudli aj 1 a 3 dni popri 7/14/30). Ak
   chceš otestovať ešte skôr, povedz a pripravím spôsob, ako nastaviť
   platnosť na pár minút priamo v DB pre tvoj test.
4. Po uplynutí: odznak „PLATNOSŤ UPLYNULA", tlačidlo „Prijať" chýba.
5. Do 5 minút po uplynutí príde push „Platnosť tvojej ponuky uplynula".
6. Karta v katalógu neukazuje ako „najvyššiu" sumu z expirovanej ponuky.
7. Nastavenia → Ako funguje Offerra → nový odsek o platnosti ponuky (aj
   v EN/DE, ak prepneš jazyk appky).

### 7b. Dodatok 1.9.2026 — živý stupňovitý odpočet

Toto je NOVÁ vrstva nad bodom 2 vyššie — odpočet teraz naozaj tiká, nie len
prepočíta pri otvorení obrazovky. Over pri ponuke s krátkou platnosťou
(najkratšia voľba je 1 deň — ak chceš otestovať skôr, poviem ako nastaviť
platnosť na pár minút priamo v DB):

1. **Viac než 24 h do konca** — vidíš „Platí ešte X dní", text sa
   nemusí meniť pred očami (prekresľuje sa raz za minútu, nie za sekundu).
2. **Menej než 24 h** — text má tvar `HH:MM` (napr. „23:55") a sa **naozaj
   mení** — počkaj minútu s obrazovkou otvorenou, malo by sa to znížiť o 1.
3. **Menej než 1 h** — text má tvar `HH:MM:SS` (napr. „00:47:32"), tiká **po
   sekundách pred očami** a je **farebne zvýraznený** (výraznejšia/červenšia
   farba než zvyšok textu na karte).
4. Po uplynutí sa text zmení na „Platnosť uplynula" (odznak/tlačidlo ako
   v bode 4 vyššie).
5. Otvor obrazovku s takouto ponukou a nechaj ju dlhšie otvorenú (aspoň pár
   minút, ideálne cez hranicu poslednej hodiny) — appka by sa nemala
   spomaľovať ani sekať. To je jediný spôsob, ako sa dá overiť, že appka
   nezakladá viac časovačov, než má (kód to má ošetrené, ale toto vie
   potvrdiť len beh na telefóne).

**Screenshoty ani video sem nedávaj** (stojace pravidlo appky, 17.8.2026) —
stačí slovami napísať, čo si videl podľa bodov 1–5 vyššie.

### 7c. Dodatok 2.9.2026 — odpočet aj v zoznamoch

Predtým bol odpočet len na detaile inzerátu a v podtabe „Ponuky". Teraz je
vidieť aj bez otvárania inzerátu:

1. **Katalóg (hlavná stránka)** — pri inzeráte, kde je najvyššia ponuka
   živá, je na fotke NOVÝ štítok „Najvyššia ponuka · Platí ešte X dní" (v
   rovnakom štýle ako štítok uzávierky, len v inom riadku nad ním). Over aj
   inzerát, ktorý má SÚČASNE aj uzávierku aj najvyššiu ponuku s platnosťou —
   oba štítky sa majú zobraziť nad sebou, nie prekryté.
2. **Profil → Moje inzeráty** — pri svojom inzeráte s čakajúcou ponukou,
   ktorá má nastavenú platnosť, vidíš nový riadok „Najbližšia ponuka ·
   [odpočet]" pod uzávierkou.
3. **Profil → Moje ponuky** — pri svojej podanej ponuke s platnosťou pribudol
   odpočet priamo do riadku (za dátumom). V poslednej hodine je celý riadok
   červený a tučný.
4. Vo všetkých troch nechaj obrazovku dlhšie otvorenú a over, že odpočet sa
   naozaj mení (rovnaké overenie ako v 7b bod 5) — a že appka sa
   nespomaľuje, keď máš OTVORENÝ AJ katalóg AJ Profil súčasne (prepínanie
   medzi tabmi), lebo každá obrazovka tiká nezávisle.

Rovnaké pravidlo: **žiadne screenshoty ani video** — len slovný popis podľa
bodov vyššie.

### 7d. Dodatok 2.9.2026 — oprava formátu (žiadna dvojbodka)

Opravené presne to, čo ukázal tvoj screenshot. Over na tých istých
miestach ako v 7c, že text teraz znie takto (nikde dvojbodka):

1. Viac než deň: „ostáva 3 dni" (nezmenené, len slovo „ostáva" namiesto
   „Platí ešte").
2. Menej než deň: „ostáva 4h 32m" — NIE „4:32".
3. Posledná hodina: „ostáva 47m 12s" — NIE „00:47:12".
4. Posledná minúta (pod 60 sekúnd): „ostáva 38 s" — bez „0m" pred tým.
5. Skontroluj, že to takto vyzerá na VŠETKÝCH štyroch miestach naraz:
   katalóg (badge na fotke pri najvyššej ponuke), „Moje inzeráty"
   (najbližšia ponuka), „Moje ponuky" (každá tvoja ponuka) a detail
   ponuky (`/ponuka/[id]`) — mali by sa zmeniť všetky súčasne, je to
   jedna spoločná funkcia.

Žiadne screenshoty ani video — len slovami, čo presne vidíš.

### 7e. Dodatok 2.9.2026 — odpočet ponuky preč z badge uzávierky

Presne to, čo ukázal druhý screenshot: „Najvyššia ponuka · ostáva…" na
fotke sa dalo prečítať ako uzávierku inzerátu. Over:

1. **Katalóg** — badge na fotke teraz ukazuje LEN uzávierku inzerátu
   („Ponuky do… · ostáva X dní"), presne ako predtým. Platnosť najvyššej
   ponuky odtiaľ zmizla.
2. **Katalóg, dolu pri sume** — pod „NAJVYŠŠIA PONUKA" a sumou pribudol
   malý riadok s odpočtom platnosti tej ponuky (napr. „ostáva 13h 52m").
   V poslednej hodine je zvýraznený.
3. Nájdi (alebo si vytvor testovací) inzerát, ktorý má SÚČASNE aj
   uzávierku aj platnú najvyššiu ponuku — over, že badge na fotke a text
   pri sume sú teraz zjavne o dvoch rôznych veciach, nie o čitateľne
   rovnakej.
4. **Moje inzeráty** — riadok „Najbližšia ponuka · [odpočet]" je teraz
   hneď pod riadkom s počtom ponúk, uzávierka je oddelene pod ním.

Žiadne screenshoty ani video — len slovami.
