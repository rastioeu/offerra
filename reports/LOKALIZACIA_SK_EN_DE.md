# Lokalizácia UI do SK/EN/DE — Fáza 30 (22.8.2026)

Zadanie (Rastio, 22.8.2026, oprava predošlého zadania): kompletná
lokalizácia rozhrania appky do troch jazykov — slovenčina, angličtina,
nemčina. **Žiadny AI preklad inzerátov** — tie zostávajú v jazyku autora,
žiadne `title_sk`/`title_en` polia v DB. Predvolený jazyk podľa nastavenia
telefónu, manuálny prepínač v Nastaveniach, voľba sa pamätá.

---

## 30.1 Rozhodnutie: vlastná i18n vrstva namiesto `i18next` — 🔴 ODCHÝLKA OD ZADANIA, S DÔVODOM

Zadanie hovorilo o „štandardnom i18n riešení". `npm install` je v tomto
prostredí zablokovaný (`offerra-npm-install-blocked-libraries`, register
26.6) — `i18next`/`react-i18next` sa teda nedali reálne nainštalovať.

Namiesto čakania na build som postavil `src/i18n/index.tsx` — Context +
`AsyncStorage`, rovnaký tvar dát ako `i18next` (JSON po doménach, kľúč
`domain.key`, `{{premenná}}` interpolácia), aby sa dal neskôr 1:1 nahradiť
skutočnou knižnicou, ak Rastio bude chcieť build s `npm install`.

**Prečo nie `expo-localization`** na zistenie jazyka telefónu: nový natívny
modul → nový EAS build, appka by prestala ísť cez OTA (§9). Namiesto toho
`Intl.DateTimeFormat().resolvedOptions().locale` — je súčasť Hermes, žiadny
natívny modul, funguje aj v Node testoch.

**`package.json` sa v celej Fáze 30 NEDOTKOL** — zmerané `git diff --stat
package.json` je prázdne. Fingerprint sa teda nemenil, OTA prejde na
existujúci build bez merania cez `eas update`/`eas build:list` (§9
vyžaduje meranie len keď sa `package.json` mení).

## 30.2 Rozhodnutie: bez `profiles.language` stĺpca v DB

Voľba jazyka sa ukladá len do `AsyncStorage` (`offerra-language`), nie do
databázy. Appka má jeden demo účet a jazyk telefónu; zdieľanie voľby medzi
zariadeniami nie je v tejto fáze potrebné. Dá sa doplniť neskôr ako
samostatná zmena (nová migrácia + `profileForm`), keby to Rastio chcel.

## 30.3 Čo je hotové — ✅ OVERENÉ RUNTIME (typecheck + audit), 🟡 ČAKÁ VIZUÁLNE OVERENIE

**Rozsah:** všetky obrazovky (`src/app/**`), všetky zdieľané komponenty
(`src/components/**`), aj zdieľané `lib`/`hooks` funkcie, ktoré do UI textu
vstupujú (formátovanie cien, dátumov, štítkov stavu, validačné hlášky,
Alert/toast texty, accessibility labely). Presunuté z natvrdo napísanej
slovenčiny do `t('domain.key', params)`.

**Skloňovanie:** slovenčina má 3 tvary (izba/izby/izieb, ponuka/ponuky/
ponúk) cez `language === 'sk'` vetvu na 3 kľúče; EN/DE majú 2 (jednotné/
množné). Preverené `scripts/check-i18n.ts` sekciou 1 — zoznam týchto
zámerne SK-only kľúčov je v skripte explicitný (`SK_ONLY_KEYS`), nie
odhadnutý.

**Predvolený jazyk podľa telefónu:** SK → slovenčina, DE → nemčina,
všetko ostatné → angličtina (fallback). Manuálny prepínač je v Nastaveniach
(Slovenčina / English / Deutsch / Systémový) — `nastavenia.tsx`, sekcia
JAZYK.

**Vedomé výnimky — text ostáva len po slovensky:**

- `src/lib/legal.ts` (Podmienky používania, Ochrana osobných údajov) —
  právny text zdieľaný s vygenerovaným webom (`offerra_web`). Preklad
  právneho textu je rozhodnutie s právnym dosahom, nie technická úloha —
  čaká na Rastiovo rozhodnutie, či a ako sa má prekladať.
- `src/lib/changelog.ts` („Čo je nové") — priebežný historický záznam
  podľa CLAUDE.md §7, rastie s každou fázou. Obrazovka `novinky.tsx` (nadpis,
  vysvetlenie, štítok „najnovšie") je lokalizovaná; obsah jednotlivých
  záznamov nie.
- `src/lib/errors.ts` (`errorText`, slovník `FRIENDLY` pre kódy chýb ako
  cudzí kľúč/unikátny index/RLS) a dve `throw new Error(...)` v
  `src/lib/push.ts` (chýbajúci `projectId`, neprihlásený pri zapínaní
  pushu) — technické chybové hlášky pre okrajové prípady (zlyhania DB
  triggerov, chýbajúca konfigurácia), volané z ~100 miest v appke.
  Prepnutie by vyžadovalo pridať `t` parameter do `errorText()` a upraviť
  všetky volania — mechanicky zvládnuteľné, ale mimo rozsahu tejto fázy
  vzhľadom na to, že ide o zriedkavé chybové cesty, nie hlavný tok appky.
  **Ostáva ako otvorený bod, ak ho Rastio bude chcieť doplniť.**
- Texty vygenerované z reálnych slovenských dát (názvy miest a ulíc
  z Registra adries MV SR v `city`/`street` tabuľkách, `Kraj`, prezývky,
  popisy inzerátov) sa neprekladajú — to by bol presne ten AI preklad
  obsahu, ktorý zadanie zakázalo.

## 30.4 Automatizovaná kontrola — `scripts/check-i18n.ts`, 14/14

Nový skript (vzor MUTARK `i18n-audit.mjs`) kontroluje:

1. `sk.json`/`en.json`/`de.json` majú rovnakú množinu kľúčov (mimo
   zámerných SK-only skloňovacích kľúčov).
2. Žiadny preklad nie je neúmyselne prázdny reťazec (jedna zámerná výnimka
   zdokumentovaná v skripte — nemecká veta o súhlase potrebuje slovo
   naviac, `login.legalSuffix`).
3. `{{premenné}}` v hodnote sedia vo všetkých troch jazykoch pre ten istý
   kľúč — inak by `t()` v jednom jazyku vypísal doslova `{{foo}}`.
4. Každé volanie `t('domain.key')` nájdené v `src/` (1037 rôznych) má
   zodpovedajúci kľúč v `sk.json`.

`npx --yes tsx scripts/check-i18n.ts` → **14/14 OK**.

**Čo tento skript NEDOKAZUJE** (CLAUDE.md §1 — grep a štruktúra
nedokazujú vizuálny stav): že preklad je jazykovo správny, že sa zmestí do
UI bez orezania, ani ako appka vyzerá s prepnutým jazykom telefónu.

## 30.5 Ostatné overenia — ✅ OVERENÉ RUNTIME

- `npx tsc --noEmit -p .` → **0 chýb** (celý projekt).
- `npx --yes tsx scripts/check-deadline.ts` → **beží, VŠETKO OK** (logika
  countdownu nezmenená, len prešla cez `t()`; lokálna maketa `t()` v
  skripte číta priamo `sk.json`, aby sa vyhla importu `src/i18n/index.tsx`
  s AsyncStorage/React závislosťami).
- `npx --yes tsx scripts/check-filters.ts` → **beží, VŠETKO OK**, rovnaký
  princíp lokálnej makety.
- `python3 -c "import json; json.load(...)"` na všetky tri locale súbory →
  platný JSON.
- `git diff --stat package.json` → prázdne, fingerprint nedotknutý.

## 30.6 🟡 ČO MÁ RASTIO OVERIŤ NA TELEFÓNE

Toto sú veci, ktoré sa **nedajú overiť v tomto prostredí** (žiadny
simulátor ani prehliadač, §3) — vyžadujú skutočný build/OTA a pohľad na
obrazovku:

1. **Prepnutie jazyka telefónu** (Nastavenia → Všeobecné → Jazyk a oblasť
   na iPhone) na slovenčinu/nemčinu/angličtinu/iný jazyk — appka sa má
   pri ďalšom otvorení sama nastaviť na SK/DE/EN podľa pravidla vyššie.
2. **Manuálny prepínač v Nastaveniach** (Slovenčina/English/Deutsch/
   Systémový) — voľba sa má prejaviť OKAMŽITE bez reštartu appky a
   **prežiť zatvorenie a znovuotvorenie appky**.
3. **Vizuálna kontrola v EN aj DE** aspoň na: katalóg, detail inzerátu,
   formulár nového inzerátu, admin konzola (ak má Rastio prístup),
   Nastavenia — hlavne dlhšie nemecké texty (napr. tlačidlá, štítky pri
   cenách), ktoré sa môžu orezať na malej obrazovke a to sa dá vidieť
   len na telefóne.
4. **3-tvarové skloňovanie v slovenčine** stále funguje (napr. „1 izba" /
   „3 izby" / „5 izieb", „1 ponuka" / „2 ponuky" / „5 ponúk") — logika je
   nezmenená oproti pred-lokalizačnému stavu, len prešla cez preklad.

## 30.7 IDE OTA / VYŽADUJE NOVÝ BUILD

**IDE OTA.** Žiadny natívny modul nepribudol, `package.json` nedotknutý,
fingerprint nemenený — `eas update` stačí.
