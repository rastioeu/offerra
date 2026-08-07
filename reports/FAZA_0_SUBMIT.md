# FÁZA 0 — OFFERRA JE V TESTFLIGHTE

**Verzia:** 1.1.0
**Dátum:** 7.8.2026
**Stav:** ⏸️ **čakám na jednu vec od teba** — otestovať to na telefóne

---

## Zhrnutie v troch vetách

Prvé dva iOS buildy boli zrušené (bežali na starom commite, ešte bez
prihlasovacej obrazovky); **tretí dobehol** a obsahuje aj prihlásenie cez
Apple a Google. Po tvojom „ok submit" som ho podal — binárka je nahraná
v App Store Connect a Apple ju spracúva. Apple login si nevypýtal heslo,
použil uloženú session z minula.

---

## ✅ Podanie prebehlo

```
Submission ID       11a0c65e-ceb4-4cd4-b56c-aa839db586b6
Status              finished
ASC App ID          6799028421
Build ID            9fdf26af-b3ea-406d-bae4-40cad5de4a9f
App Version         1.0.0     Build number  1

Your binary has been successfully uploaded to App Store Connect!
```

Overené **spätne** cez `eas submit:list`, nie len podľa výstupu príkazu.

Prvé podanie zároveň vytvorilo veci, ktoré predtým neexistovali:

| Čo | Výsledok |
|---|---|
| App Store Connect záznam appky „Offerra" | ✅ `ascAppId 6799028421` |
| TestFlight skupina | ✅ `Team (Expo)`, prístup pre `rastioeu@protonmail.com` |
| App identifier nalinkovaný v ASC | ✅ `com.offerra.app` |
| ASC API kľúč pre EAS Submit | ✅ `ZTQ53HT6PX` priradený projektu |

`ascAppId` som doplnil do `eas.json` — **ďalšie podania už nebudú
potrebovať Apple login ani interaktívny režim.**

### Apple login — prečo som ťa neotravoval

`--non-interactive` zlyhalo („Set ascAppId … or re-run in interactive mode").
Interaktívny režim si vypýtal Apple ID, ale **heslo ani 2FA nie**:

```
› Restoring session /root/.app-store/auth/rastioeu@protonmail.com/cookie
› Provider Rastislav Janek (129142627)
✔ Logged in  Local session
```

Je to tá istá session, ktorú si vytvoril pri provisioning profile. Nie je to
trvalý kredenciál — keď vyprší, Apple login si to vypýta znova. Ale vďaka
`ascAppId` v `eas.json` už ho podanie nepotrebuje.

---

## ⛔ Čo od teba potrebujem

**Otestovať to na telefóne.** Apple spracúva binárku 5–10 minút a pošle ti
e-mail; potom sa build objaví v TestFlighte:

https://appstoreconnect.apple.com/apps/6799028421/testflight/ios

Zoznam je nižšie („Čo budeš testovať"). Kým to menovite nepotvrdíš,
prihlasovacia obrazovka aj 4 taby ostávajú 🟡 — nie ✅.

---

## ✅ Build — dôkaz, nie tvrdenie

```
ID                       9fdf26af-b3ea-406d-bae4-40cad5de4a9f
Platform                 iOS
Status                   finished
Profile                  production
Distribution             store
Channel                  production
SDK Version              57.0.0
Runtime Version          1.0.0
Version                  1.0.0
Build number             1
Commit                   7ed7fcf
Application Archive URL  https://expo.dev/artifacts/eas/Nfn5Ysec6SK2mnBhAGZx36RZ1z5i4V8kX9p91ZTGgRc.ipa
Started at               8/7/2026, 8:28:00 AM
Finished at              8/7/2026, 8:33:45 AM   (5 min 45 s)
```

**Že IPA naozaj existuje** (nie len že build hlási „finished"):

```
curl -sIL <Application Archive URL>
  HTTP/2 200
  content-type: application/octet-stream
  content-length: 21999010          ← 21,99 MB
```

> Pozor na hranicu dôkazu: toto dokazuje, že **súbor existuje a dá sa
> stiahnuť**. Nedokazuje, že sa appka na telefóne spustí ani že prihlásenie
> funguje. To sa dá overiť **až v TestFlighte na zariadení**.

### Build obsahuje prihlasovaciu obrazovku

Build beží na commite `7ed7fcf`, teda **za** commitmi:

| Commit | Čo |
|---|---|
| `5ba8371` | prihlasovacia obrazovka + oprava splash screenu |
| `0d50497` | prihlásenie cez Apple a Google |
| `7ed7fcf` | ← **build beží na tomto** — Supabase redirect `offerra://` |

Od buildu po `HEAD` (`b83ac52`) je rozdiel **len `eas.json`**:

```
git diff --stat 7ed7fcf..HEAD
 eas.json | 5 ++++-
```

`eas.json` je konfigurácia podania, **nie je súčasťou binárky** — build teda
nie je zastaraný a nie je dôvod ho púšťať znova.

---

## Dva zrušené buildy — pre záznam

| Build | Commit | Stav | Prečo |
|---|---|---|---|
| `1ec9874e` | `9a3beb3` | canceled | commit ešte **bez** prihlasovacej obrazovky |
| `337dcd8e` | `5ba8371` | canceled | commit ešte **bez** Apple/Google |
| `9fdf26af` | `7ed7fcf` | ✅ finished | obsahuje všetko |

Zrušenie bolo správne rozhodnutie — podať do TestFlightu build bez
prihlásenia by znamenalo, že bod 7 zadania („prihlásenie zdieľaným účtom
overené v TestFlight builde") sa nedá otestovať a build number 1 by sa
minul nadarmo.

---

## Čo budeš testovať na telefóne

Toto je zoznam, ktorý mení 🟡 na ✅. Nič z toho neviem overiť sám.

1. **Appka sa spustí** — neostane visieť na splash screene.
   *(Toto bola reálna chyba, opravená pred buildom — viď register 0.17.)*
2. **Prihlasovacia obrazovka** — vidíš dve tlačidlá: **Apple** a **Google**.
   E-mail + heslo tam **zámerne nevidno** — je skryté za **5 ťuknutí na
   logo** (rovnako ako MUTARK, kvôli App Store recenzentom).
3. **Prihlásenie cez Apple** — po ňom sa appka prepne na taby.
4. **Prihlásenie cez Google** — otvorí sa prehliadač, po potvrdení sa vráti
   späť do appky (`offerra://`) a prepne na taby.
5. **Tab „Profil"** — zobrazuje `e-mail`, `user.id` a expiráciu tokenu.
   **Odfoť to** — ten screenshot je dôkaz, že prihlásenie zdieľaným účtom
   funguje aj v natívnom builde.
6. **4 taby** — Nehnuteľnosti / Dopyty / Pridať / Profil. Sú prázdne, len
   nadpis — to je správne, logika príde vo Fáze 1.
7. **Ak niečo zlyhá** — chyba sa musí **zobraziť na obrazovke**, nie
   „nestane sa nič". Ak sa nestane nič, je to chyba a napíš mi to.

---

## Čo sa NEZMENILO

MUTARK ani Famiglia sa v tomto kroku nedotýkali — pracovalo sa výhradne
v `/root/offerra` a na EAS projekte `@rastio_eu/offerra`
(`31b8063a-…`), ktorý je od MUTARKu (`13c85c51-…`) oddelený.
