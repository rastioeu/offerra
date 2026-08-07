# FÁZA 1 — INZERÁTY + VIZUÁLNA IDENTITA

**Verzia:** 1.2.0
**Dátum:** 7.8.2026
**Stav:** ⏸️ **čakám na jednu vec od teba** — otestovať to na telefóne

---

## Zhrnutie v troch vetách

Vybral si identitu **A — Navy & Azure** a **vlastnú tabuľku miest**; oboje
je zapracované. Databáza, RLS, storage aj seed dáta sú hotové a overené
skutočnými dotazmi — **25 automatických kontrol, všetky prešli**. Kód
obrazoviek je hotový, zbundlený a po tvojom „OK update" **publikovaný cez
OTA** — zostáva jediné: zavrieť appku, otvoriť ju a pozrieť sa na ňu.

---

## ✅ OTA je vonku — appku stačí zavrieť a znova otvoriť

Po tvojom „OK update" som Fázu 1 publikoval. **Nový build ani nové podanie
do TestFlightu nebolo treba** — `expo-image-picker` aj `expo-image` už
v builde sú a žiadny nový natívny modul nepribudol. Presne kvôli tomuto sme
vo Fáze 0 pridávali `expo-updates`.

*(Dátumový picker som zámerne napísal v JS namiesto natívneho modulu —
inak by nový build potrebný bol.)*

```
Branch             production
Runtime version    1.0.0
Update group ID    749e32b3-ac42-49f8-99e7-8a67cf70b9e9
Commit             95264ad
```

OTA sa doručí len pri zhode kanála **aj** runtime verzie, tak som to overil
proti reálnemu buildu v TestFlighte:

| | Build `9fdf26af` (v TestFlighte) | OTA update |
|---|---|---|
| Channel / branch | `production` | `production` |
| Runtime Version | `1.0.0` | `1.0.0` |

> Hranica dôkazu: dokázané je, že update je publikovaný na správnom kanáli
> a runtime. **Nedokazuje**, že sa už stiahol na tvoj telefón.

---

## ⛔ Čo od teba potrebujem

**Zavri appku úplne a znova ju otvor** (OTA sa ťahá pri štarte), potom prejdi
zoznam nižšie. Kým to menovite nepotvrdíš, identita aj obrazovky ostávajú 🟡.

---

## 🎨 Identita — vybral si A

Návrhy: https://claude.ai/code/artifact/b4d6ac81-e6e0-4938-b2f9-1ade01a678b8

Wordmark je **kreslený v SVG krivkách, nie vysadený fontom** — logo tak
nezávisí od toho, aké fonty má zariadenie, a nikto ho nemá rovnaké.
Podpisový detail: obe „f" zdieľajú jedno prečiarknutie.

Vygeneroval som z tej istej geometrie: app ikonu 1024×1024 (RGB bez alfy —
Apple priehľadnosť odmieta), android adaptive sadu, splash, favicon
a wordmark na prihlasovaciu obrazovku (nahradil dočasný text „OFFERRA").

Čitateľnosť ikony som overil vykreslením v **120, 60 a 40 px**.

### Paleta — našiel som v nej tri chyby

Register z Fázy 0 sľuboval premeranie WCAG. Urobil som ho a **tri farby
neprešli** AA 4.5:1 pre bežný text:

| Token | Bolo | Je | Kontrast |
|---|---|---|---|
| `success` | `#1F8A5F` | `#1D8058` | 4.03 → **4.57** |
| `warning` | `#B7791F` | `#99651A` | 3.39 → **4.62** |

Značková azúrová `#1B73D4` má na pozadí len 4.40:1. **Nezmenil som ju** —
je to farba loga a ikony a tá musí ostať presne tá. Namiesto toho pribudol
token `link` `#1B71D0` (opticky tá istá farba, 4.53:1). Pravidlo:
**`secondary` = výplň a grafika, `link` = text.**

Výsledok kontrolného skriptu: **zlyhaní 0** (8 tokenov × 2 podklady × 2 témy
+ text na tlačidlách + obrysy polí).

---

## 🗄️ Databáza

`offerra.property` a `offerra.media` podľa Prisma návrhu. Dve odchýlky,
obe technické — nie svojvôľa:

| Zadanie | Je | Prečo |
|---|---|---|
| `transactionType` | `transaction_type` | PostgREST mapuje stĺpce 1:1; MUTARK aj Famiglia sú snake_case |
| `order` | `sort_order` | `order` je v PostgREST **vyhradený query parameter** — kolidoval by s radením |

### Mestá — prečo som odporúčal vlastnú tabuľku

MUTARK `cities` má **68 823 riadkov, ale z toho len 147 slovenských**,
všetky nad 5 000 obyvateľov, a **stĺpec „okres" nemá vôbec**.

Vlastná `offerra.city` má **2 925 obcí, 81 okresných hodnôt, 8 krajov**.
Zdroj: Wikidata (2 884 obcí s okresom a krajom) + kurátorovaný zoznam
**17 bratislavských a 22 košických mestských častí** (tie Wikidata
modeluje nekonzistentne — dotaz mi vracal kostoly a paláce).

Že okres naozaj treba, ukazuje jediný dotaz: **„Selce" existuje v troch
rôznych okresoch** — Banská Bystrica, Poltár, Krupina.

### Zmena, ktorá sa dotýkala MUTARKu

Schému bolo treba vystaviť cez PostgREST, a `db_schema` je **zdieľané
nastavenie**. Preto som meral pred aj po:

| Kontrola | Pred | Po |
|---|---|---|
| MUTARK `cities` (anon) | HTTP 200 | **HTTP 200** |
| MUTARK `profiles` (anon) | HTTP 200 | **HTTP 200** |
| MUTARK predvolená schéma stále `public` | — | ✅ |
| `offerra.property` | HTTP 406 | **HTTP 200** |

Zmena bola čisto prídavná: `public,graphql_public` → `public,graphql_public,offerra`.

---

## 🔒 RLS — 15 z 15

Testoval som **dve role**, nie jednu. `authenticated` má viac práv než
anonym, takže cudzí *prihlásený* používateľ je prísnejší test.

```
ANON:  vidí len ACTIVE (8 riadkov) · cudzí DRAFT nevidí ani pri cielenom
       dotaze na jeho id · fotky DRAFTu nevidí · nevie vytvoriť, prepísať,
       zverejniť ani zmazať nič cudzie (HTTP 401)

CUDZÍ PRIHLÁSENÝ:  cudzí DRAFT nevidí · nevie prepísať ani zmazať cudzí
       inzerát · nevie vytvoriť inzerát V MENE niekoho iného (403) ·
       nevie vytvoriť inzerát rovno ako ACTIVE (403)
       ALE: svoj vlastný DRAFT vytvoriť VIE (201) a vidí len svoje
```

Posledné dva testy tam sú zámerne — bez nich by „všetko zakázané"
vyzeralo ako úspech.

---

## 🔁 Celý reťazec formulára — 10 z 10

Prešiel som ho **prihláseným používateľom a jeho JWT**, teda rovnakými
pravidlami ako telefón — nie cez admin kľúč:

```
DRAFT vznikne → anonym ho NEVIDÍ → polia sa uložia → fotka sa nahrá do
VLASTNEJ zložky → do CUDZEJ zložky je upload zamietnutý (400) →
„Zverejniť" preplo na ACTIVE → teraz to anonym VIDÍ aj s fotkou →
fotka sa stiahne bez prihlásenia a je to naozaj JPEG 1600×1200
```

> **Hranica dôkazu:** toto dokazuje, že dátová cesta funguje celá.
> **Nedokazuje**, že formulár na telefóne vyzerá a ovláda sa správne.

---

## 🏠 Seed — 8 inzerátov

```
SALE  LAND       Súľov-Hradná     1200 m²   42 000 €  [časovač]
RENT  COMMERCIAL Žilina             95 m²    1 250 €
SALE  APARTMENT  Banská Bystrica    78 m²   BEZ CENY  [časovač]
SALE  HOUSE      Bajerovce         132 m²  132 000 €
RENT  APARTMENT  Košice             38 m²      480 €
SALE  HOUSE      Selce             168 m²  289 000 €  [časovač]
RENT  APARTMENT  Ružinov            54 m²      780 €
SALE  APARTMENT  Petržalka          72 m²  219 000 €  [časovač]
```

Mix je zámerný — pokrýva predaj aj prenájom, byt/dom/pozemok/komerciu,
inzerát **bez ceny** aj inzeráty s časovačom. 16 fotiek.

Fotky sú z **Wikimedia Commons**, len CC0 / CC BY / CC BY-SA / public
domain; licenciu a autora ku každej mám uložené. Exteriéry sú skutočné
slovenské domy a mestské budovy. Historické čiernobiele fotky som
odfiltroval automaticky podľa sýtosti.

Zmazať sa dajú jedným príkazom: `delete from offerra.property where is_seed;`

---

## Čo budeš testovať na telefóne

1. **Ikona a splash** — na ploche musí byť navy štvorec s bielym kruhom
   a modrým domom. Splash je svetlý s tou istou značkou.
2. **Prihlasovacia obrazovka** — namiesto textu „OFFERRA" je teraz
   **kreslený wordmark**.
3. **Tab Nehnuteľnosti** — 8 inzerátov s fotkami. Skontroluj, že
   „Banská Bystrica" ukazuje **„Cena neuvedená"**, nie 0 €, a že prenájmy
   majú **„/ mesiac"**.
4. **Ťuknutie na kartu** → detail s galériou (potiahni fotky do strany),
   popisom, parametrami a „Ponuky: čoskoro".
5. **Tab Pridať → „+ Nový inzerát"** → vyplň, **pridaj aspoň jednu fotku**,
   daj **Zverejniť**. Skús zverejniť aj s prázdnymi poľami — musí ti
   povedať, **čo presne chýba**, nie sa len tak nič nestať.
6. **Tvoj nový inzerát sa musí objaviť v tabe Nehnuteľnosti.** Odfoť to.
7. **Výber obce** — napíš „Selce". Musia sa ukázať **tri** s rôznymi okresmi.
8. **Ak sa niekde „nestane nič"** — je to chyba, napíš mi to.

---

## Čo sa NEZMENILO

`/root/mutark` aj `/root/famiglia` sú `git status --porcelain` prázdne,
na tých istých commitoch ako pred prácou (`c948c84`, `3d41db8`). Čítal som
z nich vzor uploadu fotiek (`use-avatar-upload.ts`) a pozeral ich logá —
**nezapisoval som do nich nič**.

Testovacie skripty (majú v sebe heslá a service role kľúč) sú **zámerne
mimo repa** — `rastioeu/offerra` je verejný.
