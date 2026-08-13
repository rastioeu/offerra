# Countdown štítok — prečo sa stále stráca — a tab bar fade

**Dátum:** 13. 8. 2026
**Zadanie:** Rastio — dve súvisiace nahlásenia:
1. countdown badge na karte v katalógu chýba tretí raz — nájsť PREČO, nie
   len opraviť
2. tab bar sa scrolluje, ale bez viditeľného náznaku (druhé kolo)
**Nasadenie:** **IDE OTA** pre appku. Databáza: 5 seed inzerátov dostalo
`offer_deadline` (bez zmeny kódu).

---

## 1. COUNTDOWN — PREČO SA TO OPAKUJE

### Diagnostika, nie hádanie (§2)

Prešiel som celý reťazec: `property-card.tsx` → `deadlineLabel()` →
`deadlineUrgency()` → `PhotoBadge`. **Kód bol pri všetkých troch
nahláseniach správny.** Podmienka `{deadline || item.media.length > 1 ? …}`
je nezmenená, `PhotoBadge` má stále všetky tri farebné tóny (`muted`/
`warm`/`urgent`), nič nebolo premenované ani presunuté.

**Skutočná príčina:**

```sql
select count(*), count(offer_deadline) from offerra.property where status='ACTIVE';
→ 50 aktívnych inzerátov, 0 s vyplnenou uzávierkou
```

**Nula.** Countdown štítok nemal ČO zobraziť — nie preto, že appka
zabudla, ako sa zobrazuje, ale preto, že **dáta, na ktorých bol vidieť,
sú test/seed hodnoty a každé veľké preseedovanie katalógu ich stratí**,
lebo im ich žiadny súčasný seed skript znova nenastaví.

Dôkaz z histórie: `reports/POCITADLO_FOTIEK_A_TRIEDENIE.md` (8.8.2026)
opisuje presne toto — vtedy bol nastavený deadline na 5 konkrétnych
inzerátoch, aby bol štítok vidieť. Všetkých päť má dnes `created_at`
`2026-08-09 15:56:36` (rovnaká sekunda ako celý katalóg) — teda vznikli
pri **veľkom preseedovaní 9.8.2026**, ktoré nahradilo pôvodné dáta a
uzávierky s nimi. Odvtedy ich nemal kto vrátiť späť, až kým si Rastio
opäť nevšimol, že štítok chýba.

**Toto NIE JE krehká podmienka v komponente, na ktorú sa pýtal bod 1
zadania.** Je to dátová závislosť: zobrazovací kód je nezmenený tri
redizajny po sebe, mení sa len to, či niekto zabudne dáta znova naplniť.

### Bod 2 zadania: automatizovaný test

Appka **nemá** test infraštruktúru (`package.json` mal len `typescript`
a `@types/react`). Podľa tvojej vlastnej inštrukcie („ak nemá, aspoň…")
som pridal **oboje**:

**A) Skutočný, spustiteľný regresný test.** `deadlineLabel`,
`deadlineUrgency`, `isDeadlinePassed` sa presunuli z `property.ts` do
nového **`src/lib/deadline.ts` — súboru BEZ AKÉHOKOĽVEK IMPORTU.**

To je dôvod, prečo doteraz nikto test nenapísal: `property.ts` na úrovni
modulu importuje `./supabase` (AsyncStorage + env premenné), takže sa
nedal spustiť v Node bez appky. Presunutím čistej logiky preč (rovnaký
trik ako pri `missingForPublish` → `listing-form.ts`, 9.8.2026) vznikol
súbor, ktorý sa dá testovať holým Node-om.

`property.ts` tieto funkcie ďalej **re-exportuje** — žiadne z 16 miest,
čo ich importujú z `@/lib/property`, sa meniť nemuselo.

Pridal som spustiteľný test `npx tsx scripts/check-deadline.ts` —
**12 kontrol**, žiadna appka, žiadna databáza:

```
── karta MUSÍ dostať text a farbu, keď má inzerát uzávierku ──
  OK  budúca uzávierka (10 dní) → štítok NIE JE null
  OK  text obsahuje "ostáva" a počet dní
  OK  < 3 dni → urgencia SOON (červený štítok)
  OK  > 3 dni → urgencia OPEN (pokojná farba)
  OK  uplynutá uzávierka → štítok stále NIE JE null
  OK  uplynutá uzávierka → text "ukončený"
  OK  uplynutá uzávierka → urgencia PASSED (sivý štítok)
  OK  isDeadlinePassed() súhlasí s deadlineUrgency()
  OK  menej než deň → hodinový tvar, nie „0 dní"

── karta NESMIE nič vypísať, keď inzerát uzávierku NEMÁ ──
  OK  žiadna uzávierka → deadlineLabel je null
  OK  žiadna uzávierka → urgencia NONE
  OK  žiadna uzávierka → isDeadlinePassed je false

VŠETKO OK
```

Beží cez **`npx tsx`** (jediný spôsob, ako spustiť TypeScript priamo
v Node bez natívneho modulu), **zámerne NIE ako devDependency projektu.**
Prvý pokus pridať `tsx` do `package.json` (aj len ako `devDependencies`
a npm skript) **zmenil EAS fingerprint** — `package.json`'s `scripts`
pole je jeho súčasťou, hoci nemá nič spoločné s natívnym kódom — a
odstrihol dve OTA od Rastiovho telefónu. Opravené a zdokumentované
samostatne nižšie (§ „Vedľajšia chyba, ktorú som spôsobil"). `npx tsc
--noEmit` — bez chýb.

**B) Trvalá položka v CLAUDE.md.** Nová sekcia **§10 „Veci, čo sa strácajú
pri redizajne"** — countdown štítok a „Pridané [dátum]" na karte (druhá
vec, čo bola v minulosti nahlásená ako REGRESIA — komentár v
`property-card.tsx` z 9.8.2026 to hovorí priamo). Zoznam sa dopĺňa, len
keď sa naozaj stane ďalší prípad — nevymýšľal som preventívny zoznam vecí,
ktoré sa NIKDY nestratili.

**Čo test NEROBÍ:** nekontroluje DÁTA v databáze (to nie je úloha pre
Node test bez appky) — kontroluje LOGIKU. Kontrolu dát rieši checklist
položka v CLAUDE.md §10 („over aj DÁTA").

### Bod 3 zadania: oprava teraz

Kód netreba opravovať — je správny. **Dáta áno.** Nastavil som
`offer_deadline` na **5 seed inzerátoch** (nie na tvojich vlastných —
zámerne, vysvetlenie nižšie), rovnakým vzorom ako 8.8.2026 — tri stavy
naraz, nech je vidno všetky farby štítku:

| Inzerát | Uzávierka | Urgencia | Štítok |
|---|---|---|---|
| Obchodný priestor na prenájom, Trenčín | včera (−1 deň) | PASSED | sivý, „Príjem ponúk ukončený" |
| Stavebný pozemok, Zvolen | o 2 dni | **SOON** | **červený** |
| Stavebný pozemok, Prievidza | o 9 dní | OPEN | terakota |
| Obchodný priestor na prenájom, Poprad | o 16 dní | OPEN | terakota |
| Obchodný priestor na predaj, Martin | o 25 dní | OPEN | terakota |

**Prečo nie na tvojich vlastných inzerátoch:** dátum uzávierky je reálny
biznis atribút, nie testovacie dáta — je to niečo, čo by si mal zvoliť
ty cez `DeadlinePicker` vo formulári (ten funguje, `formToPatch`/
`formFromProperty` uzávierku správne prenášajú, overil som round-trip).
Nastaviť ti ho sám bez toho, aký dátum chceš, by bolo to isté rozhodnutie
za teba, akému som sa vyhol pri otázke o seedovaní chatu minule. Ak chceš
uzávierku aj na svojich inzerátoch, nastav si ju vo formulári — teraz je
overené, že sa uloží aj zobrazí.

### ✅ OVERENÉ RUNTIME

```
select count(*) as active_with_deadline from property where status='ACTIVE';
→ 5
```

`npx tsx scripts/check-deadline.ts` — 12/12. `npx tsc --noEmit` — bez chýb.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

- [ ] Katalóg → karty **Trenčín** (sivý „ukončený"), **Zvolen**
      (**červený**, o 2 dni), **Prievidza/Poprad/Martin** (terakota).
- [ ] Prepni triedenie na **„Čoskoro končí"** → Zvolen musí byť hore.

---

## 2. TAB BAR — DRUHÉ KOLO

### Prečo prvá oprava nestačila

Spoliehala sa na to, že `overflow: hidden` na vonkajšom `View` sám od
seba odreže posledný tab **napoly**. To nie je zaručené — závisí od
náhodnej zhody medzi šírkou obrazovky a súčtom šírok tabov. Na tvojom
telefóne vyšlo presne to horšie: „Hypotéka" dosadla **presne na okraj**,
piaty tab bol 0 % viditeľný, žiadny signál.

### Oprava, ktorá sa nespolieha na náhodu

`canScrollRight` sa teraz počíta zo **skutočných rozmerov** ScrollView
(`onLayout` = šírka viewportu, `onContentSizeChange` = šírka obsahu,
`onScroll` = aktuálny posun) — nie z toho, ako to náhodou vyjde. Kým
platí `obsah − viewport − posun > 2px`, na pravom okraji je viditeľný
**fade**.

**Fade bez `expo-linear-gradient`.** Skutočný gradient by vyžadoval nový
natívny modul, teda nový build (§3/§9) — len kvôli vizuálnemu detailu.
Namiesto neho `ScrollFade`: šesť tenkých pásov **rovnakej farby ako
pozadie lišty**, s rastúcou nepriehľadnosťou smerom k okraju (0,08 →
1,0). Vyzerá, že obsah do pozadia lišty postupne dotečie — vizuálne to
isté, čo skutočný gradient robí, bez natívneho kódu.

Toto funguje **nezávisle** od toho, či posledný tab vyjde odrezaný alebo
nie — je to primárny signál. Odrezaný text (keď náhodou vyjde) je bonus,
nie jediná poistka.

Skratky názvov („Hyp.", „Obhl.") som opäť nepoužil — presne ako si
navrhol, fade + prípadné orezanie stačí.

### ✅ OVERENÉ (logika)

`canScrollRight` je odvodená hodnota z troch meraní, nie z odhadu — to je
overiteľné čítaním kódu ako logický fakt (nie ako dôkaz vzhľadu, §1). Pre
vzhľad pozri diagram nižšie.

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

`reports/tab_bar_fade_pred_po.png` — **nie je to screenshot appky**,
kresba z hodnôt v `tokens.ts` s presne tou istou matematikou rozloženia,
akú počíta React Native — vrátane presného prípadu, ktorý si nahlásil
(4 taby doliehajúce na okraj bez zvyšku).

- [ ] Otvor detail SALE inzerátu (5 tabov) → na pravom okraji lišty je
      **viditeľný fade** smerom k okraju.
- [ ] Scrolluj úplne doprava → fade **zmizne** (nie je čo ďalej scrollovať).
- [ ] Scrolluj naspäť doľava → fade sa **vráti**.
- [ ] Fade nebráni ťuknutiu na posledný viditeľný tab (`pointerEvents="none"`).
- [ ] PRENÁJOM (4 taby) — over, že fade sa správa rovnako konzistentne.
- [ ] Skús to na viacerých šírkach obrazovky (rôzne telefóny), ak máš k
      dispozícii — presne preto prvá oprava zlyhala len na NIEKTORÝCH.

---

## VEDĽAJŠIA CHYBA, KTORÚ SOM SPÔSOBIL A OPRAVIL: `tsx` odstrihlo OTA od telefónu

**Toto je dôležité a treba to povedať nahlas, nie zamlčať.**

Pri pridávaní `npm run check:deadline` som `tsx` nainštaloval ako
`devDependency` (`npm install --save-dev tsx`) a pridal doň dva riadky do
`package.json` → `scripts`. Netušil som, že **`scripts` pole v
`package.json` je súčasťou EAS fingerprintu** — logiky, ktorá rozhoduje,
či OTA update dorazí na existujúci build, alebo ho appka ignoruje ako
nekompatibilný.

**Dôsledok:** touto zmenou (v commite `45c01b3`) sa runtime appky posunul
z `24919867e1…` na `c45bf547…` (iOS) / z `eaadbb7eca8…` na `eb53a81c6…`
(Android). **Tvoj telefón beží na TestFlight builde #5 s runtimom
`24919867e1…`** — takže **dve OTA, ktoré som medzitým publikoval (tento
countdown/tab-bar balík a nasledujúci obhliadka/Moje/odznaky balík),
by sa na tvoj telefón NIKDY nestiahli.** Nie je to hypotéza — overil
som to priamo cez `eas build:list` (skutočný záznam tvojho buildu #5)
aj cez opakované skutočné `eas update` publikácie z čistých git
checkoutov.

**Diagnostika bola dlhšia, než mala byť**, lebo lokálny nástroj
`@expo/fingerprint` sa v tomto prostredí správal nespoľahlivo pri
opakovaných behoch (rovnaký stav súborov, iný výsledok) — musel som sa
preto spoľahnúť výhradne na **skutočné `eas update` publikácie** ako
zdroj pravdy, nie na lokálne opakované merania.

**Oprava:**
1. `tsx` odstránené z `package.json` úplne — `devDependencies` aj
   `scripts`. Test sa teraz spúšťa priamo cez `npx tsx
   scripts/check-deadline.ts` (nefetchuje sa do projektu, nemení
   `package.json` vôbec).
2. Overené: čistý checkout commitu `21e10ff` (posledný known-good) dáva
   cez skutočný `eas update` runtime `24919867e1…/eaadbb7eca8…` —
   presne to, čo má tvoj build #5.
3. **Republikoval som OBIDVA orphanované balíky** (tento aj
   obhliadka/Moje/odznaky) pod opraveným, správnym runtimom.

   ✅ **OVERENÉ RUNTIME** — skutočný výstup `eas update` (13.8.2026, commit
   `23b09ae`):

   ```
   Branch           production
   Runtime version  24919867e1bcc84715b1b4d6998cb6b27886e5d9
   Platform         ios
   Update group ID  cfc45a72-f844-4f49-ae01-0e88dd44179e

   Branch             production
   Runtime version    eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7
   Platform           android
   Update group ID    aec94606-286e-4ae2-bfd0-ee54d5919456
   ```

   Toto je **presne** ten istý runtime ako tvoj TestFlight build #5. Balík
   je teda publikovaný pod runtimom, ktorý appka na telefóne vie
   stiahnuť — to je dôkaz, že publikácia je pod správnym runtimom, **nie**
   dôkaz, že appka na tvojom telefóne balík už stiahla a zobrazila (to
   viem overiť len ja zo servera, nie z telefónu — to potvrdíš len ty).

**Čo by som mal robiť inak nabudúce:** žiadny nový balík do
`package.json` (`dependencies` AJ `devDependencies`) bez toho, aby som si
najprv overil dopad na fingerprint — aj `devDependencies` naň majú vplyv,
nielen `dependencies`. Zapisujem to ako trvalé pravidlo nižšie.

### 🟡 Over prosím

- [ ] Appka na tvojom telefóne (bez ručného zásahu, len bežné otvorenie)
      dostane tento aj predošlý balík zmien cez OTA — countdown štítok,
      tab bar fade, obhliadka s potvrdením, Moje zjednotené, odznaky.
- [ ] Ak nedostane do pár minút, daj vedieť — bude to znamenať, že
      diagnostika ešte nie je úplná a treba to riešiť ďalej, nie
      predstierať, že je to hotové.

---

## KONTROLA PRED HOTOVO

| bod | stav |
|---|---|
| Nájdená príčina opakovanej straty countdown štítku | ✅ dátová, nie kódová — zdokumentované s dôkazom |
| Automatizovaný test na countdown | ✅ `npx tsx scripts/check-deadline.ts`, 12/12, Node bez appky |
| Trvalé pravidlo v CLAUDE.md | ✅ §10 |
| Countdown späť na karte v aktuálnom dizajne | ✅ **OVERENÉ RUNTIME** (5 inzerátov) / 🟡 vzhľad |
| Posledný viditeľný tab má fade náznak pokračovania — screenshot | 🟡 kresba priložená, nie screenshot appky |
| Scroll funguje plynulo, jasný náznak | ✅ logika (nezávislá od náhody) / 🟡 plynulosť na zariadení |
| Nový používateľ na prvý pohľad pozná scroll | 🟡 **nemám ako otestovať na niekom, kto appku nepozná** — mimo môjho dosahu, over prosím ty |

`npx tsc --noEmit` — bez chýb.
