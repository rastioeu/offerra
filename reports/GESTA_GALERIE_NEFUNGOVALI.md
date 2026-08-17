# Gestá fullscreen galérie nefungovali — príčina a oprava

**Dátum:** 17.8.2026
**Nahlásil:** Rastio (produkčný TestFlight build #5, iPhone)
**Rozsah:** `src/components/photo-lightbox.tsx`, nový `src/lib/gallery-gesture.ts`,
nový `scripts/check-gallery.ts`

---

## 1. Čo bolo nahlásené

Fullscreen galéria sa otvorí, nápoveda sa zobrazí („Potiahni do strán ·
Dvojťap priblíži · Potiahni dole zavrie"), ale:

- swipe do strán nelistuje (počítadlo ostáva `3/3`),
- swipe dole nezavrie,
- funguje len X v rohu.

Rastiova formulácia, ktorá je presná a treba ju zopakovať: **appka sľubovala
gestá, ktoré nerobili nič — to je horšie, než keby tam nápoveda nebola.**

---

## 2. Príčina — dvojitá, obe polovice čitateľné zo zdrojov gesture-handleru

Nehádal som. Obe polovice sú z kódu `react-native-gesture-handler@2.32`
v `node_modules`, s riadkami.

### 2a. `Gesture.Exclusive(doubleTap, pan)` ťah nikdy nepustil k slovu

`Exclusive` v RNGH neznamená „skús jedno, potom druhé" — prekladá sa na
`requireToFail`:

```
node_modules/react-native-gesture-handler/src/handlers/gestures/gestureComposition.ts:115
// Every group gets to wait for all groups before it
requireToFail = requireToFail.concat(gestureArrays[i]);
```

Ťah teda **nesmel začať, kým dvojťap nezlyhá.** A dvojťap bez nastaveného
`maxDistance` na pohyb prsta **nezlyhá**:

```
node_modules/react-native-gesture-handler/apple/Handlers/RNTapHandler.m:57
_maxDeltaX = NAN;
_maxDeltaY = NAN;
_maxDistSq = NAN;
```

`shouldFailUnderCustomCriteria` (`:226`) testuje každú z nich cez
`TEST_MAX_IF_NOT_NAN` — s `NAN` sa test **preskočí**. Dvojťap teda zlyhal až
na časovačoch (stovky ms). Kým prst dovtedy zdvihneš, `pan` sa neaktivuje
vôbec, `onEnd` nikdy nepríde a **swipe dole nerobí nič.** Presne to bolo
nahlásené.

### 2b. Čakajúci ťah zablokoval natívne listovanie ScrollView

Vodorovné listovanie riešil `ScrollView` s `pagingEnabled` a `Gesture.Pan`
sedel vnútri neho. RNGH povolí súbežné rozpoznávanie s pan gestom scroll
view len pre natívny handler:

```
node_modules/react-native-gesture-handler/apple/RNGestureHandler.mm:582
- (BOOL)areScrollViewRecognizersCompatible:… { … RNDummyGestureRecognizer … }
:579  return NO;     // všetko ostatné
```

Takže RNGH ťah scrollovanie **zablokoval**, a keďže sám nesmel začať (2a),
nepohnulo sa **nič ani jednou stranou.** To vysvetľuje aj to, prečo ostalo
funkčné X: obyčajný `Pressable`, mimo `GestureDetector`, a ťapov sa nič
z tohto netýka.

---

## 3. Čo príčina NEBOLA — a prečo to píšem

Môj prvý tip (a aj najčastejšia rada na internete) bol: „`GestureDetector`
je v `Modal`e bez vlastného `GestureHandlerRootView`". **Na iOSe to
neplatí** a takmer som to nahlásil ako príčinu, kým som si to neprečítal:

- `src/components/GestureHandlerRootView.tsx` (varianta pre iOS) renderuje
  **obyčajný `View`** + kontext. Natívny komponent má len Android
  (`.android.tsx`), a `apple/RNGestureHandlerRootViewComponentView.mm:7` to
  hovorí priamo: *„RNGestureHandlerRootView is Android-only."*
- RNGH si modal na iOSe ošetruje sám:
  `apple/RNGestureHandlerManager.mm:285` má vetvu
  `RCTFabricModalHostViewController` (nová architektúra = RN 0.86/SDK 57).

`GestureHandlerRootView` som **do modalu aj tak pridal** — je to potrebná
ANDROIDÍ polovica (tam natívny komponent je a bez neho gestá v modale
nefungujú), a na iOSe je to neškodný `View`. Ale nie je to tá oprava, ktorá
Rastiov problém rieši, a tvrdiť to by bolo nepravdivé.

---

## 4. Oprava — súboje sa neladia, odstraňujú sa

| Predtým | Teraz |
|---|---|
| `ScrollView` + `pagingEnabled` + `Gesture.Pan` vnútri | **žiadny ScrollView** — pás fotiek posúva jedno jediné `Gesture.Pan` cez reanimated |
| `Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan))` | `Gesture.Simultaneous(pinch, pan, doubleTap)` — nikto na nikoho nečaká |
| dvojťap bez `maxDistance` | `.maxDistance(16)` — ťahom sa dvojťap nespustí |
| rozhodovanie pomiešané s animáciami vo workletoch | rozhodovanie v `src/lib/gallery-gesture.ts`, overiteľné v Node |
| priblíženie vypínalo `scrollEnabled` | priblíženie prepína, čo robí ten istý ťah (posun fotky vs. listovanie) |

Rovnaká skladba gest (`Simultaneous` z pinch + pan + dvojťap) beží
v MUTARKu v `src/components/flat-world-map.tsx` a funguje — to bola druhá
vec, ktorá ma navedie, že problém nie je v samotnom RNGH.

Vo workletoch ostala **len aritmetika posunu.** Každé rozhodnutie (kam
odlistovať, či zavrieť, meze priblíženej fotky) je čistá funkcia mimo
obrazovky — aby existoval dôkaz podľa §1, nie „malo by fungovať".

---

## 5. Knižnica vs. vlastné riešenie (bod 2–3 zadania)

Zadanie žiadalo overiť hotovú knižnicu a nahlásiť pred implementáciou, ak
by vyžadovala nový build.

**Čo som zistil:**

- **Sesterské projekty žiadnu takú knižnicu nemajú.** `mutark` ani
  `famiglia` nemajú v `package.json` nič na galériu. Famiglia má
  `src/components/fullscreen-photo.tsx`, ale to je jedna fotka a **nulové
  gestá** — len `Pressable` na zavretie; jej `story-viewer.tsx` je rovnako
  bez gest. Takže ako vzor na listovanie a zoom nepomôžu.
- **Natívny modul by knižnica nepribudla.** `react-native-awesome-gallery`
  stojí na `reanimated` + `gesture-handler`, oboje je v appke od buildu #5.
- **ALE fingerprint (§9) sa nedal domerať.** Zmeral som toto: pridanie
  `"react-native-awesome-gallery": "^0.4.4"` do `package.json` **bez
  inštalácie** iOS runtime **nezmenilo**:

  | | iOS runtime |
  |---|---|
  | build #5 / dnešná OTA | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
  | `package.json` so záznamom knižnice (neinštalovanou) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

  (merané `eas update --branch fingerprint-test`, teda na zahodenej vetve,
  nie na produkcii; `package.json` som hneď vrátil a `git status` je čistý)

  **Toto je proti môjmu očakávaniu** — čakal som, že už samotný záznam
  fingerprint zmení. Znamená to, že fingerprint sa počíta z NAINŠTALOVANÉHO
  stavu, nie z textu `package.json`. Skutočnú odpoveď („zmení sa runtime,
  keď knižnicu naozaj nainštalujem?") som ale **nezmeral: prostredie mi
  `npm install` zablokovalo a obchádzať to nebudem.** Inštalácia knižnice
  do tohto repa je aj tak Rastiovo rozhodnutie, nie moje.

**Rozhodnutie:** išiel som bodom 4 zadania — vlastné riešenie, opravené
poriadne. Dôvody, v poradí:

1. Príčina je **známa a doložená zdrojmi** (§2), nie „gestá sú krehké".
   Vlastný kód, ktorý má odstránený súboj, nie je krehkejší než knižnica,
   ktorá ten istý súboj tiež musí obísť.
2. Oprava ide **dnes cez OTA**. Knižnica by čakala na tvoje „OK build",
   pretože jej dopad na fingerprint nemám odmeraný, a poslať OTA, ktorá sa
   na tvoj build nedostane, je incident z 13.8.2026.
3. Ak by gestá na telefóne aj po tejto oprave nesedeli, **knižnica je
   ďalší krok, nie hluchá ulička** — hlásiš, ja nainštalujem
   `react-native-awesome-gallery` a pôjde to s novým buildom, kde sa
   fingerprint aj domerá.

---

## 6. Dôkazy

| Čo | Ako | Výsledok |
|---|---|---|
| rozhodovanie gest | `npx --yes tsx scripts/check-gallery.ts` | **33/33 OK** |
| Realtime register (§11) | `npx --yes tsx scripts/check-realtime.ts` | **20/20 OK** |
| countdown logika (§10) | `npx --yes tsx scripts/check-deadline.ts` | **12/12 OK** |
| countdown dáta (§10) | SELECT ACTIVE + `offer_deadline` v budúcnosti | **3** (Prievidza 4 dni, Poprad 11, Martin 20) |
| dáta na listovanie | SELECT ACTIVE + počet fotiek | **49 z 50** inzerátov má 2+ fotky |
| typy | `npx tsc --noEmit` | čisté |
| balík | `npx expo export --platform ios` | prešlo, texty aj worklety v bundle |
| `package.json` (§9) | `git status` pred aj po meraní | nedotknutý |

`scripts/check-gallery.ts` pokrýva presne to, čo bolo nahlásené — napríklad:

```
── 3. POČÍTADLO sa MUSÍ meniť (Rastio: „zostáva 3/3") ──
  OK   ťah vpravo z 3/3 → počítadlo ide na 2/3
        postup: 3/3 → 2/3 → 1/3 → 1/3 → 2/3
  OK   na prvej fotke počítadlo STOJÍ na 1/3
── 4. ZATVORENIE potiahnutím dole ──
  OK   posun 130px dole → zatvára
  OK   posun 50px dole pomaly → NEzatvára, vracia sa
  OK   ťah NAHOR nezatvára ani pri veľkej rýchlosti
```

**Čo tento dôkaz NEDOKAZUJE:** že gesto do kódu dorazí. Test overuje
rozhodovanie, nie natívnu vrstvu ani pocit v ruke. To je vec zariadenia —
§1, a preto je galéria nižšie 🟡, nie ✅. Skript to na konci vypíše sám,
aby to nikto (ani ja) nemohol prehliadnuť.

---

## 7. Nápoveda smie sľubovať len to, čo funguje

Text je teraz: **„Potiahni do strán · Dvojťap alebo štipni priblíži ·
Potiahni dole zavrie"** — a všetky štyri gestá sú naozaj implementované
(`pan` vodorovne, `pan` dole, dvojťap, pinch). „Potiahni do strán" sa
zobrazí len pri 2+ fotkách.

Ak niektoré z nich na telefóne nepôjde, **nahlás ktoré — vypadne z textu,
nie naopak.** Nechať v appke sľub, ktorý nedrží, je vec, ktorá tento report
vyvolala.

---

## 8. OTA

Nový natívny modul nepribudol, `package.json` sa nemenil → **IDE OTA.**
`reanimated` (4.5.1), `gesture-handler` (~2.32.0) aj `worklets` (0.10.1) sú
v binárke buildu #5. Runtime publikovanej OTA musí sedieť s
`24919867e1bcc84715b1b4d6998cb6b27886e5d9` (§9) — kontrola je v registri
26.7.

---

## 9. Čo má Rastio otestovať na telefóne

Appku po prijatí OTA **reštartuj dvakrát** (prvý štart balík stiahne, druhý
spustí).

Otvor inzerát s 3+ fotkami (napr. *2-izbový byt, Nitra* — 4 fotky) a fotku
zväčši (ikona v rohu alebo ťap na fotku):

1. **Swipe do strán** — listuje medzi fotkami, počítadlo sa mení
   (`1/4 → 2/4 …`).
2. **Krátky rýchly šmyk** — má prelistovať tiež, netreba tiahnuť pol
   obrazovky.
3. **Na prvej fotke potiahni vpravo** — fotka sa má pružne vzoprieť
   a vrátiť, nie preskočiť na poslednú.
4. **Potiahni dole** — galéria sa zavrie a fotka pritom bledne.
5. **Potiahni dole len kúsok a pusti** — NEMÁ sa zavrieť, má sa vrátiť.
6. **Dvojťap** — priblíži; druhý dvojťap vráti.
7. **Štipni dvoma prstami** — priblíži plynulo; po pustení pod 1× sa vráti.
8. **Priblíženú fotku ťahaj** — posúva sa po fotke a **nelistuje**
   (zámer, nie chyba). Nápoveda pri priblížení zmizne.
9. **Dva rýchle šmyky za sebou** — má len listovať, NESMIE skočiť do
   priblíženia.
10. **X v rohu** — musí fungovať stále, aj pri priblíženej fotke.
11. Otvor inzerát **s jednou fotkou** — počítadlo ani „Potiahni do strán"
    tam nemá byť, zvyšok áno.
12. Kontrola, že sa nič nestratilo (§10): na karte v katalógu je vidieť
    **„Ponuky do… · ostáva X dní"** a **„Pridané [dátum]"**.
