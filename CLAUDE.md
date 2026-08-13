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

> ⚠️ `runtimeVersion` má politiku `appVersion`. Zvýšenie `version`
> v `app.json` preto **odstrihne existujúci TestFlight build od OTA**,
> kým sa nespraví nový build. Verzia sa teda dvíha len spolu s buildom —
> nie pri každej OTA.

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
      `npm run check:deadline` (logika) a over aj DÁTA: má aspoň jeden
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
