# OFFERRA — pravidlá práce

Realitná appka (Expo / React Native, SDK 57, expo-router, TypeScript).
Sesterský projekt k **MUTARK** (`/root/mutark`) a **Famiglia**
(`/root/famiglia`) — obe sú platná vzájomná referencia, ale **nikdy sa do
nich nezasahuje**, len sa z nich čítajú a preberajú vzory.

---

## ⛔ 1. DEFINITION OF DONE

Ku každej položke napíš **presne jeden** z týchto troch statusov:

| Status | Kedy |
|---|---|
| **✅ OVERENÉ RUNTIME** | mám dôkaz — curl 200, výpis servera, SELECT + screenshot |
| **🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE** | + **PRESNE napíš, čo má Rastio otestovať na telefóne** |
| **🔴 NEDOKONČENÉ** | + dôvod |

### Pravidlá dôkazu

- **Dôkaz musí dokazovať to, čo tvrdí.**
  HTTP 200 dokazuje, že súbor existuje — **NIE že je to fotka.**
  SELECT dokazuje riadok v DB — **NIE že sa zobrazí na obrazovke.**
- **`grep` a čítanie kódu nedokazuje NIČ.**
- **„Malo by fungovať" je ZAKÁZANÉ.**
- **NIKDY nedávaj ✅ ničomu, čo vyžaduje vizuálne overenie. To robí Rastio.**
- **ŽIADNE SCREENSHOTY** (Rastio, 17.8.2026: „screenshoty nechcem, nemám
  ich ako zobraziť — to platí aj do budúcna"). Vizuálne overenie je jeho
  **slovné potvrdenie**. V 🟡 bodoch preto píš, na čo sa má pozrieť a čo má
  opísať slovami — nikdy „pošli screenshot", a to ani keď si to sám napíše
  do zadania. Ako dôkaz ich nevyrábam ani ja: v tomto prostredí nie je
  prehliadač ani simulátor a nakreslený mockup nie je dôkaz stavu appky.
- **„✅ POTVRDENÉ POUŽÍVATEĽOM"** smieš napísať len ku konkrétnej obrazovke,
  ktorú Rastio **menovite** potvrdil.
- **Neodvodzuj B z A.** Ak si overil sadenie, neznamená to, že si overil
  doručenie.

---

## 🔍 2. KEĎ NIEČO NEFUNGUJE — MERAJ, NEHÁDAJ

**PRVÝ krok je vždy diagnostika, nie oprava.**

1. **Log/Alert na KAŽDÝ krok funkcie** — 1 START, 2 guard, 3 …, 6 HOTOVO
2. **catch, ktorý ukáže CELÚ surovú chybu**
3. **Žiadna oprava, kým nevieme, na ktorom kroku to padá**

### ŽIADNY TICHÝ CATCH. NIKDY.

Ak niečo zlyhá, **používateľ sa to musí dozvedieť.**
**„Nestane sa nič" je najhoršia možná reakcia appky.**

---

## 🧪 3. TESTOVANIE = TESTFLIGHT

Offerra sa **netestuje cez Expo Go.** Cieľom každého overenia na zariadení je
natívny build cez `eas build --platform ios` + `eas submit` do TestFlight.

- Lokálne overenie (Metro bundle, typecheck, Node testy proti Supabase) je
  **medzikrok, nie dôkaz funkčnosti appky** — v registri je taký bod
  najviac 🟡.
- **Pred každým `eas build` a `eas submit` sa zastav** a napíš zhrnutie do
  `reports/`. Build sa spúšťa až po Rastiovom výslovnom **„OK build"** —
  spotrebúva EAS kredit a čas.

---

## 🔑 4. KREDENCIÁLY A TAJOMSTVÁ

- Supabase kľúče **výhradne** cez `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` — lokálne `.env` (gitignorovaný), na
  builde EAS Environment Variables. **Nikdy hardcodované v repe.**
- **Repozitár `rastioeu/offerra` je VEREJNÝ** (na rozdiel od `rastioeu/mutark`,
  ktorý je private). Nič, čo je tajné — heslá demo účtov, service role kľúče,
  tokeny — sa sem nesmie dostať, ani v skriptoch, ani v reportoch.
- Každý projekt (MUTARK / Famiglia / Offerra) má **vlastný** GitHub token.
  Tokeny sa medzi projektmi **nepožičiavajú**.

---

## 🎨 5. DIZAJN

- `src/theme/tokens.ts` je **jediný zdroj pravdy** pre farby, typografiu,
  spacing, radius a tiene. Žiadna obrazovka nesmie mať vlastnú hardcodovanú
  farbu ani `fontSize`.
- Offerra je **light-first** — svetlé plochy, fotky nehnuteľností v popredí.
  Zámerne **žiadny mutarkovský dark/neon štýl.**
- Paleta („B — Navy & Azure") je schválená Rastiom 7.8.2026. Zmena palety je
  rozhodnutie Rastia, nie agenta.

---

## 📓 6. REGISTER

`OFFERRA_REGISTER.md` je priebežný záznam stavu — každá fáza má vlastnú
sekciu a každý bod v nej status podľa §1. Register sa dopĺňa priebežne, nie
spätne na konci.

---

## 📣 7. CHANGELOG — STANDING RULE

`src/lib/changelog.ts` je „Čo je nové" **pre Rastia ako používateľa appky**,
nie pracovný denník. Register a changelog nie sú to isté:

| | Pre koho | Čo obsahuje |
|---|---|---|
| `OFFERRA_REGISTER.md` | pre nás | statusy, dôkazy, HTTP kódy, názvy tabuliek |
| `src/lib/changelog.ts` | pre používateľa | čo sa zmenilo a čo mu to dá |

**Pravidlo (Rastio, 7.8.2026): každý dokončený blok práce = nový záznam
v changelogu.** Nie len v registri. Bez pripomínania.

Ku každej zmene navyše v registri označ, či:

- **IDE OTA** — len JS/assety vyžiadané z JS → stačí `eas update`,
- **VYŽADUJE NOVÝ BUILD** — pribudol natívny modul, alebo sa mení app
  ikona, splash, `app.json` natívna časť či verzia.

---

## 📖 8. „AKO FUNGUJE OFFERRA" — STANDING RULE

`src/lib/how-it-works.ts` vysvetľuje používateľovi princíp appky.

**Pravidlo (Rastio, 7.8.2026): keď sa zmení AKÁKOĽVEK mechanika appky,
tento text sa upraví v TOM ISTOM kroku — nie dodatočne.**

Text, ktorý klame o tom, ako appka funguje, je horší než žiadny. Príklad,
prečo to pravidlo vzniklo: zmena zo slepých na otvorené ponuky by inak
nechala v appke vysvetlenie, ktoré tvrdí opak.

Karta je na hlavnej obrazovke aj v Nastaveniach.

---

## ⚙️ 9. VERZIE A OTA

> ⚠️ `runtimeVersion` má v `app.json` politiku **`fingerprint`** (OPRAVENÉ
> 13.8.2026 — tento riadok predtým nesprávne tvrdil `appVersion`, čo
> priamo prispelo k incidentu nižšie). Fingerprint sa počíta z natívne
> relevantných súborov AJ z **`package.json` vrátane `scripts` poľa** —
> nielen z `dependencies`/natívnych modulov, ako by sa čakalo. Zvýšenie
> `version` v `app.json` ODSTRIHNE existujúci TestFlight build od OTA
> rovnako, ale **nie je to jediný spôsob, ako sa to dá spôsobiť omylom.**

> 🔴 **INCIDENT (13.8.2026):** pridanie `tsx` do `package.json`
> (`devDependencies` + `scripts`, kvôli spustiteľnému testu
> `check:deadline`) zmenilo fingerprint a **odstrihlo 2 OTA balíky od
> Rastiovho TestFlight buildu #5** bez toho, aby si to appka alebo agent
> všimli — žiadna chyba, žiadny pád, OTA sa len nikdy nestiahla. Objavené
> až keď sa opýtal, prečo zmeny nevidí. Podrobná diagnostika a oprava:
> `reports/COUNTDOWN_REGRESIA_A_TAB_BAR_FADE.md`.
>
> **PRAVIDLO: pred KAŽDOU zmenou `package.json` (`dependencies` AJ
> `devDependencies` AJ `scripts`) over dopad na fingerprint** —
> `npx eas-cli update --branch production --non-interactive` a porovnaj
> vypísaný `Runtime version` s runtimom posledného úspešného buildu
> (`npx eas-cli build:list --platform ios --limit 1` s `Status: finished`).
> Ak sa líši, OTA sa na existujúci build nedostane — vtedy buď zmenu
> vráť, alebo to nahlás Rastiovi PRED publikovaním ďalších balíkov, nie
> až keď sa spýta. Lokálny `@expo/fingerprint` nástroj sa v tomto
> prostredí ukázal nespoľahlivý pri opakovaných behoch — ako zdroj
> pravdy použi vždy skutočnú `eas update`/`eas build:list` odpoveď,
> nikdy len lokálne opakované meranie.
>
> 📏 **Zmerané 17.8.2026 (register 26.6):** pridanie riadku do
> `dependencies` **bez `npm install`** iOS runtime **nezmenilo** (obe
> `24919867e…`). Fingerprint teda vychádza z NAINŠTALOVANÉHO stavu, nie zo
> samotného textu `package.json` — čo je proti očakávaniu a **nie je to
> povolenie meniť `package.json` bez merania**: incident z 13.8.2026
> (`tsx`) bol nainštalovaný, a či runtime zmení reálna inštalácia knižnice,
> **zmerané nie je** (prostredie `npm install` blokuje). Pravidlo vyššie
> platí bez zmeny: merať pred každou zmenou, nie odvodzovať.

---

## 🧹 10. VECI, ČO SA STRÁCAJÚ PRI REDIZAJNE — VŽDY OVER

**Pravidlo (Rastio, 13.8.2026):** countdown štítok „Ponuky do… · ostáva
X dní" zmizol z karty v katalógu **tretí raz** — pri redizajne 8.8.2026,
pri preseedovaní katalógu 9.8.2026, a znova pri podtaboch 12.8.2026. Pri
všetkých troch nahláseniach bol samotný zobrazovací kód SPRÁVNY — problém
bol v tom, že si to nikto neoveril skôr, než to nahlásil Rastio.

**Pred označením AKEJKOĽVEK zmeny obrazovky detailu inzerátu alebo karty
v katalógu za hotovú, over, že tieto veci STÁLE FUNGUJÚ:**

- [ ] **Countdown uzávierky na karte** (`Ponuky do… · ostáva X dní`,
      `src/lib/deadline.ts` + `property-card.tsx`) — spusti
      `npx tsx scripts/check-deadline.ts` (logika) a over aj DÁTA: má aspoň jeden
      ACTIVE inzerát `offer_deadline` v budúcnosti? Bez dát je štítok
      neviditeľný aj keď je kód správny — presne to sa stalo pri 9.8.2026.
- [ ] **„Pridané [dátum]" na karte** (`property-card.tsx`, REGRESIA
      z redizajnu 9.8.2026, odvtedy opravené) — dátum pridania inzerátu
      musí byť na karte vidieť, nie len v detaile.

**Prečo je to samostatná sekcia, nie riadok v štandardnom postupe:** tieto
dve veci sa stratili TICHO — appka nespadla, typecheck prešiel, nič
nehlásilo chybu. Zmizli len vizuálne, a to sa dá overiť LEN pohľadom na
skutočnú kartu/detail, nie čítaním kódu (§1 — „grep a čítanie kódu
nedokazuje NIČ"). Zoznam sa dopĺňa, keď pribudne ďalší podobný prípad —
nie preventívne, len keď sa naozaj stane.

---

## 🔁 11. SUPABASE REALTIME — LEN CEZ `useRealtimeChannel`

**Pravidlo (Rastio, 17.8.2026):** v appke sa **NIKDY nepíše
`supabase.channel(...)` ručne.** Každý Realtime odber ide výhradne cez
`src/hooks/use-realtime-channel.ts` (čistá vrstva: `src/lib/realtime.ts`).

```ts
// ⛔ ZAKÁZANÉ — takto vznikol pád dvakrát
const ch = supabase.channel(`property-${id}`).on('postgres_changes', …).subscribe();

// ✅ JEDINÝ povolený spôsob — odbery ako DÁTA, kanál skladá register
useRealtimeChannel({
  topic: id ? `property-${id}` : null,
  bindings: [{ event: 'UPDATE', schema: 'offerra', table: 'property', filter: `id=eq.${id}` }],
  onChange: () => void reload(),
});
```

### Prečo — a prečo NIE preto, čo sa zdalo

Hláška `cannot add postgres_changes callbacks for realtime:… after
subscribe()` padla **dvakrát**: `NotificationBell` (8.8.2026) a editor
inzerátu (17.8.2026).

**Príčinou NIKDY nebolo poradie `.on()` / `.subscribe()`** — to bolo na
oboch miestach správne, v jednej reťazi. Skutočná príčina je v
`realtime-js`: `supabase.channel(topic)` pri rovnakom názve **vráti už
existujúci, často už pripojený kanál** namiesto nového. Dva nezávislí
vlastníci toho istého topicu (napr. detail + editor s tým istým `id`,
alebo `AppHeader` na štyroch namontovaných taboch) tak sadli na jeden
kanál a druhý `.on()` padol.

Preto sa oprava nedala urobiť „správnym poradím" — musela odstrániť
možnosť kolízie. Register to robí troma vecami naraz: `.on()` sa nedá
napísať po `.subscribe()` (volajúci ich nevidí), jeden kanál na topic so
**počítadlom odberateľov**, a zatvorenie až pri odchode **posledného**
odberateľa (per-instance `removeChannel` predtým vypínal Realtime aj tej
obrazovke, ktorá ostala otvorená — druhá, tichá chyba toho istého vzoru).

### Pri každej zmene Realtime kódu over

- [ ] `grep -rn "\.channel(" src/` nevráti **žiadne** volanie mimo
      `src/lib/realtime.ts` (jediné miesto, kde kanál naozaj vzniká — a to
      cez vpichnutého klienta) a `src/hooks/use-realtime-channel.ts` (kde
      sa doň vpichne `supabase`). Komentáre nepočítajú.
      K 17.8.2026 sedia len tieto dva + tri komentáre.
- [ ] `npx --yes tsx scripts/check-realtime.ts` je 20/20 — test má vlastnú
      napodobeninu `realtime-js`, ktorá pôvodný pád vie naozaj vyrobiť
      (prvá kontrola v ňom presne to dokazuje, inak by test nedokazoval nič)
- [ ] `tsx` **nepridávaj** do `package.json` — mení EAS fingerprint a
      odstrihne OTA (§9). Vždy `npx --yes tsx`.

---

## 👆 12. GESTÁ (gesture-handler) A SĽUBY V UI

**Pravidlo (Rastio, 17.8.2026):** fullscreen galéria sa otvorila, nápovedu
„Potiahni do strán · Dvojťap priblíži · Potiahni dole zavrie" zobrazila —
a **žiadne z tých gest nefungovalo.** Rastiova veta, ktorá sem patrí
celá: *„Appka teda SĽUBUJE gestá, ktoré nerobia nič — horšie než keby tam
nápoveda nebola."*

### 12a. Text v UI smie sľubovať LEN overené chovanie

- Nápoveda gesta, prázdny stav ani hint sa **nepíše dopredu.** Napíše sa až
  keď gesto funguje — a ak sa niektoré gesto nestihne alebo nepôjde,
  **vypadne z textu**, nie z overenia.
- Platí to aj naopak: keď sa gesto odstráni, v tom istom kroku sa
  odstráni aj jeho nápoveda (rovnaká logika ako §8 pre
  `how-it-works.ts` — text, ktorý klame, je horší než žiadny).

### 12b. Dve pasce v `react-native-gesture-handler`, ktoré nič nenahlásia

Obe naraz spôsobili ten pád vyššie. Ani jedna nič nevypíše — appka
nespadne, gesto sa len nikdy nestane.

- ⛔ **`Gesture.Exclusive(tap, pan)`** — `Exclusive` sa prekladá na
  `requireToFail` (`gestureComposition.ts:115`), takže ťah **čaká, kým ťap
  zlyhá**. A `Gesture.Tap()` bez `.maxDistance(...)` na pohyb prsta
  **nezlyhá**: `apple/Handlers/RNTapHandler.m:57` má
  `maxDeltaX/maxDeltaY/maxDistSq = NAN` a `shouldFailUnderCustomCriteria`
  ich s `NAN` preskočí. Ťap zlyhá až na časovači → prst je dávno hore →
  `pan` sa neaktivuje nikdy. **Používaj `Gesture.Simultaneous` a ťapu
  VŽDY nastav `.maxDistance(...)`.**
- ⛔ **`Gesture.Pan` vnútri natívneho `ScrollView`** — RNGH povolí súbežné
  rozpoznávanie s pan gestom scroll view len natívnemu handleru
  (`apple/RNGestureHandler.mm:582`), inak vracia `NO` (`:579`). Ťah tak
  scrollovanie **zablokuje**. Keď treba listovať aj ťahať, **nemiešaj to:
  urob pás cez reanimated a jedno `Gesture.Pan`** (tak je to
  v `photo-lightbox.tsx`), alebo použi
  `.simultaneousWithExternalGesture(scrollRef)`.
- ℹ️ **`GestureHandlerRootView` v `Modal`e je ANDROIDÍ vec, nie iOS-ová.**
  Na iOSe je to obyčajný `View` + kontext (natívny komponent má len
  Android — `apple/RNGestureHandlerRootViewComponentView.mm:7`
  *„RNGestureHandlerRootView is Android-only"*) a RNGH si modal ošetruje
  sám (`apple/RNGestureHandlerManager.mm:285`, vetva
  `RCTFabricModalHostViewController`). Do modalu ho dávaj — ale keď gestá
  nefungujú na iPhone, **príčina je inde**, nehádaj toto (mne to bol prvý
  tip a bol nesprávny).

### 12c. Rozhodovanie gesta patrí MIMO worklet

Logika pomiešaná s animáciami vo workletoch sa dá overiť len prstom na
telefóne — to je presne ten stav, v ktorom sa chyba vyššie dostala do
TestFlightu. Rozhodnutia (kam odlistovať, kedy zavrieť, meze priblíženia)
patria do čistého modulu (`src/lib/gallery-gesture.ts`), volajú sa cez
`runOnJS` z `onEnd`, a overuje ich Node test
(`npx --yes tsx scripts/check-gallery.ts`, 33/33). Vo worklete ostáva len
aritmetika posunu.
