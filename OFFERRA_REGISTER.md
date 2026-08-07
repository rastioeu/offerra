# OFFERRA — REGISTER

Priebežný záznam stavu. Statusy podľa `CLAUDE.md` §1 (Definition of Done):
**✅ OVERENÉ RUNTIME** / **🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE** /
**🔴 NEDOKONČENÉ**.

---

## Fáza 0 — Setup (7.8.2026)

### 0.1 Referenčné čítanie MUTARK + Famiglia — ✅ OVERENÉ RUNTIME

Čítané read-only, **do oboch projektov sa nezasahovalo** (dôkaz nižšie, 0.12).

| Čo | Kde | Čo sa prevzalo |
|---|---|---|
| SDK + dependencies | `/root/mutark/package.json` | MUTARK je na `expo ~57.0.7`, RN 0.86.0, React 19.2.3 |
| app config | `/root/mutark/app.json`, `app.config.js` | štruktúra `ios.bundleIdentifier` + `appleTeamId` + plugins; `app.config.js` ako miesto pre kľúče z EAS env |
| dizajn tokeny | `/root/mutark/src/theme/tokens.ts` | štruktúra `Palette`/`Colors`/`Spacing`/`Radius`/`Type`/`Weight`/`Shadow` (paleta **vlastná**, viď 0.8) |
| Supabase klient | `/root/mutark/src/lib/supabase.ts` | `EXPO_PUBLIC_*` kľúče + `AsyncStorage` + SSR guard `typeof window === 'undefined'` — prevzaté 1:1 |
| auth flow | `/root/mutark/src/lib/auth.ts` | `makeRedirectUri({ scheme })` (natívny scheme, nie Expo proxy), `exchangeCodeForSession`, Apple/Google OAuth, skrytý demo login pre Apple Review |
| navigácia | `/root/mutark/src/app/main/_layout.tsx` | klasické `Tabs` z `expo-router/tabs` (nie `unstable-native-tabs`) |
| Settings | `/root/mutark/src/app/settings.tsx` (757 r.) | odložené na Fázu 1+ — Offerra zatiaľ nemá čo nastavovať |
| ALERTS / zvonček | `/root/mutark/src/components/app-header.tsx` + `src/hooks/use-alerts.ts` | vzor: zvonček v hlavičke, `unreadCount` → `Badge variant="dot"`, alerty klikateľné, texty skladané pri renderi cez i18n kľúče |
| upload fotiek | `/root/mutark/src/hooks/use-avatar-upload.ts` | vzor: `require('expo-image-picker')` **vnútri handlera** (nie statický import) — starší build bez natívneho modulu nesmie zhodiť obrazovku; base64 → `Uint8Array` → `storage.from().upload()` |
| Famiglia — galéria/upload | `/root/famiglia/src/app/(main)/(tabs)/profile.tsx`, `famiglie/[id].tsx` | rovnaký ImagePicker vzor; Famiglia používa route-groups `(auth)`/`(main)` — Offerra zatiaľ nepotrebuje |

### 0.2 GitHub repo — ✅ OVERENÉ RUNTIME

- Repo `https://github.com/rastioeu/offerra` **existuje** — ✅ overené
  (GitHub API `200`, `visibility: public`, vytvorené 7.8.2026 06:27 UTC,
  branch `main`, jediný commit `6a889d6 Initial commit` s 9-bajtovým
  `README.md`).
- Lokálny klon v `/root/offerra` je na tomto `main`.
- **Token** (fine-grained PAT, expirácia `2026-09-06`) uložený v
  `/root/.offerra-secrets` (`chmod 600`), **mimo repozitára**; git ho číta
  cez repo-local credential helper `/root/.offerra-git-credential.sh`.
  V `.git/config` ani nikde v repe token nie je.
- Token je správne **obmedzený len na offerra** — `GET /repos/rastioeu/mutark`
  vracia `404`. ✅ zodpovedá pravidlu „každý projekt vlastný token".
- Bolo treba **lokálne resetovať reťaz credential helperov**: globálny helper
  z `~/.gitconfig` (`password=$GITHUB_TOKEN`, premenná nenastavená) sa
  spúšťal prvý a vracal prázdne heslo. Riešené prázdnou hodnotou
  `credential.helper` v `--local` konfigurácii pred pridaním vlastného
  helpera. MUTARK ani Famiglia to neovplyvnilo.
- **Prvý token (7.8.2026) nemal právo zápisu** — `git fetch` prešiel, `git push`
  vrátil `403 Permission denied` a `PUT /contents` vrátil
  `403 Resource not accessible by personal access token`. Nahradený novým.
  *(Poznámka pre budúcnosť: hlavička `x-accepted-github-permissions` popisuje
  oprávnenia, ktoré prijíma daný API endpoint — **nie** to, čo token má.
  Na diagnostiku práv tokenu slúži skutočný pokus o zápis, nie táto hlavička.)*
- **Push overený ✅** — nezávisle cez GitHub API, nie len podľa výstupu gitu:

  ```
  git push origin main → 6a889d6..8547d4c  main -> main  (exit 0)

  GET /repos/rastioeu/offerra/commits:
    8547d4c | 2026-08-07T07:36:41Z | docs(register): token dodaný…
    34260c7 | 2026-08-07T07:14:09Z | feat(faza-0): setup Offerra…
    6a889d6 | 2026-08-07T06:46:18Z | Initial commit

  GET /repos/rastioeu/offerra/contents/ → 14 položiek v koreni
  ```

- **Kontrola úniku tajomstiev do verejného repa ✅**

  | Kontrola | Výsledok |
  |---|---|
  | `GET contents/.env` | `404` — nie je v repe |
  | `GET contents/.offerra-secrets` | `404` — nie je v repe |
  | `git ls-files` na `.env`/`secrets` | žiadna zhoda |
  | Úplný JWT (`eyJ….…`) v ktoromkoľvek commite | žiadna zhoda |
  | `github_pat_` / `ghp_` v histórii | len zástupný text `ghp_…` v návode |
  | `service_role` v histórii | názov Postgres roly, nie kľúč |

### 0.3 Expo projekt, SDK 57 — ✅ OVERENÉ RUNTIME

- `create-expo-app@latest`, default template (TypeScript + expo-router,
  root adresár routes `src/app` — zhodné s MUTARKom).
- `expo 57.0.11` (npm dist-tag `latest`), `react-native 0.86.2`,
  `react 19.2.3`.
- **SDK 57 ako funkčná baseline — dôkaz:** Metro dev server vydal manifest
  s `"sdkVersion":"57.0.0"` a `"runtimeVersion":"exposdk:57.0.0"`, a reálne
  zostavil iOS bundle: `HTTP 200`, **8 484 223 B**, 61,8 s, bez chýb.
- `npx tsc --noEmit` → **exit 0**.
- MUTARK je na `57.0.7`, Offerra na `57.0.11` — zámerne **nezosúladené**
  (zadanie bod 3); zjednotenie až keď bude Offerra funkčná appka.

### 0.4 Bundle identifier `com.offerra.app` — ✅ OVERENÉ RUNTIME

- Zapísaný v `app.json` (`ios.bundleIdentifier` aj `android.package`).
- Verejná kontrola kolízie: iTunes Lookup API → `resultCount: 0`.
- **Registrovaný v Apple Developer portáli** — potvrdené pri prvom pokuse
  o `eas build` (7.8.2026). Dotaz na EAS vracia medzi Apple app identifiers
  účtu `rastio_eu`:
  `com.joinfamiglia.app, com.mutark.app, com.offerra.app, com.rastioeu.famiglia`
- **Nekoliduje** — identifikátor je náš, alternatívu netreba.

### 0.5 EAS projekt — ✅ OVERENÉ RUNTIME

- Vytvorený **samostatný** projekt: `@rastio_eu/offerra`,
  projectId **`31b8063a-d351-4e3c-bfc4-5c384e432b61`**.
- Oddelený od MUTARKu (`13c85c51-9492-472e-8153-cd19c1cdce9d`).
- Zapísaný do `app.json` → `extra.eas.projectId`.
- `eas.json` založený podľa MUTARK vzoru (profily `development` /
  `preview` / `production`, `appVersionSource: local`).

### 0.6 Supabase — schéma `offerra` — ✅ OVERENÉ RUNTIME

Cez **Management API** (`POST https://api.supabase.com/v1/projects/{ref}/database/query`),
nie cez psql — postup podľa `/root/mutark/reports/FAZA_11_*.md`.

- Projekt `vxqvpgzwefcehugmhaft` (zdieľaný s MUTARKom).
- Pred zmenou overené, že schéma `offerra` neexistovala (MUTARK je v `public`).
- Vytvorené: `CREATE SCHEMA offerra` + komentár + `GRANT USAGE` pre
  `anon`/`authenticated`/`service_role` + default privileges pre `service_role`.
- **Dôkaz (spätný SELECT):**
  `{"nspname":"offerra","tables":0,"anon_usage":true,"auth_usage":true}`
- **Bez tabuliek** — podľa zadania, dátový model príde v ďalšom bloku.
- ⚠️ Schéma **nie je** vystavená cez PostgREST (`db_schema` projektu sa
  zámerne nemenil — je to zdieľané nastavenie s MUTARKom). Doriešiť vo Fáze 1,
  keď budú tabuľky.

### 0.7 Supabase — bucket `offerra-media` — ✅ OVERENÉ RUNTIME

- Vytvorený cez Storage API (service role): `offerra-media`,
  `public: false`, limit **10 MB**, MIME `image/jpeg,png,webp,heic`.
- Základné RLS na `storage.objects` (4 policy: select/insert/update/delete),
  vzor „prvý segment cesty = `auth.uid()`".
- **Dôkaz (spätný SELECT):**
  `{"id":"offerra-media","public":false,"file_size_limit":10485760,"offerra_policies":4,"objects":0}`
- Doplní sa pri dátovom modeli (verejné čítanie inzerátových fotiek zatiaľ
  **nie je** zapnuté — vedomé rozhodnutie, dá sa prepnúť).

### 0.8 Prihlásenie zdieľaným účtom (lokálne) — ✅ OVERENÉ RUNTIME

Test spustený proti **Offerra konfigurácii** (jej `.env`, jej anon key),
účtom, ktorý existuje v MUTARKu (`applereview@mutark.app`).

```
[OFFERRA] Supabase URL z .env  : https://vxqvpgzwefcehugmhaft.supabase.co
[OFFERRA] anon key (prefix)    : eyJhbGciOiJIUzI1NiIsInR5… (dĺžka 208)

=== DÔKAZ: PLATNÁ SESSION V OFFERRA KLIENTOVI ===
user.id        : 6b861952-7bc9-4c71-bac5-cfae73305fc8
user.email     : applereview@mutark.app
created_at     : 2026-07-18T19:43:03.668835Z
token_type     : bearer
access_token   : eyJhbGciOiJFUzI1NiIsImtpZCI6IjNj… (dĺžka 802)
expires_at     : 2026-08-07T08:03:12.000Z

getUser(access_token) → ✅ platný, id=6b861952-7bc9-4c71-bac5-cfae73305fc8
JWT iss        : https://vxqvpgzwefcehugmhaft.supabase.co/auth/v1
JWT role       : authenticated
JWT aud        : authenticated
```

Token nebol len **vydaný** — bol serverom aj **prijatý** (`getUser`), čo
dokazuje, že zdieľaný Auth projekt akceptuje session z novej appky.

⚠️ Testovací skript **zámerne nie je v repe** — obsahuje heslo demo účtu a
`rastioeu/offerra` je verejný repozitár.

### 0.16 Prihlasovacia obrazovka — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Doplnené 7.8.2026 na Rastiovu žiadosť — **rozšírenie rozsahu Fázy 0**.
Dôvod: bez prihlasovacej obrazovky sa nedal splniť bod 7 zadania
(„prihlásenie zdieľaným účtom overené znovu v TestFlight builde").

- `src/lib/auth.ts` — `signInWithEmail`, `signOut`. Žiadny tichý catch:
  chyba sa vracia volajúcemu ako text **a** loguje sa.
- `src/hooks/use-session.ts` — jediný zdroj pravdy o prihlásení
  (`getSession` pri štarte + `onAuthStateChange`).
- `src/app/login.tsx` — e-mail + heslo, chybová hláška viditeľná
  používateľovi, stav `busy`.
- `src/app/_layout.tsx` — brána: bez session → `/login`, so session →
  `/(tabs)`.
- `src/app/(tabs)/profil.tsx` — **dôkazová obrazovka**: zobrazuje
  `user.email`, `user.id` a expiráciu tokenu priamo na displeji, aby
  screenshot z TestFlightu sám o sebe stačil ako dôkaz.

**Zámerne len e-mail/heslo.** Apple aj Google potrebujú v zdieľanom Supabase
Auth projekte zaregistrovať redirect pre schému `offerra` a bundle id
`com.offerra.app` — to je zásah do konfigurácie, ktorú používa aj MUTARK,
a patrí do Fázy 1 s rozmyslom, nie do setupu.

Overené runtime: `npx tsc --noEmit` → **exit 0**; produkčný iOS bundle
(`dev=false`) `HTTP 200`, **7 438 875 B**, 67 s, bez chýb.

### 0.17 Chyba nájdená pred buildom: splash screen navždy — ✅ OPRAVENÉ

`src/app/_layout.tsx` volal `SplashScreen.preventAutoHideAsync()`, ale
**`hideAsync()` nikdy**. Appka by ostala navždy na splash screene.

Podstatné na tom je, že **žiadna dovtedajšia kontrola by to nezachytila** —
`tsc` prejde, Metro bundle sa zostaví, veľkosť sedí. Prejavilo by sa to až
na zariadení ako „appka sa nespustí", teda po ~25 minútach buildu a podaní
do TestFlightu. Presne tá trieda chyby, kvôli ktorej `CLAUDE.md` §1 zakazuje
dávať ✅ bez behu na zariadení.

Opravené: `hideAsync()` sa volá až keď je stav session známy (nie
`undefined`), aby nepreblikla nesprávna obrazovka.

### 0.9 Skeleton — 4 taby — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- `src/app/(tabs)/_layout.tsx` — klasické `Tabs` (ako MUTARK), 4 obrazovky:
  **Nehnuteľnosti** (`index`) / **Dopyty** (`dopyty`) / **Pridať** (`pridat`)
  / **Profil** (`profil`).
- Každá obrazovka je `ScreenPlaceholder` — len nadpis + poznámka, **žiadna
  logika** (podľa zadania).
- Demo súbory zo šablóny odstránené.
- **Dôkaz zatiaľ len nepriamy:** `tsc --noEmit` exit 0 + iOS bundle sa
  zostavil (0.3). **Že 4 taby naozaj vidno, sa potvrdí až v TestFlight
  builde** — podľa `CLAUDE.md` §3 to nie je ✅, kým to Rastio nevidí.

### 0.10 `src/theme/tokens.ts` — ✅ OVERENÉ RUNTIME (štruktúra), paleta schválená

- Štruktúra zhodná s MUTARKom, paleta **vlastná**.
- Rastiovi predložené 3 návrhy (A Terracotta & Sand / B Navy & Azure /
  C Emerald & Stone); **schválené B — Navy & Azure** (7.8.2026), až potom
  zapísané natvrdo.
- Light-first: `background #F5F7FA`, `surface #FFFFFF`,
  `primary #103A6B` (navy), `secondary #1B73D4` (azure).
- ⚠️ Poznámka v tokenoch: dark `background #0D1520` je blízko MUTARKovmu
  `#0B1020`. Offerra je light-first, takže dark je doplnková téma; ak by
  appky vizuálne splývali, mení sa **Offerra** token, nie MUTARK.
- Presné WCAG premeranie celej palety = úloha Fázy 1.

### 0.11 Kredenciály pre TestFlight — čiastočne ✅

| Kredenciál | Stav |
|---|---|
| EAS account prístup | ✅ `EXPO_TOKEN` v `/root/.bashrc`, `eas whoami` → `rastio_eu` |
| Apple Developer Team ID | ✅ `TC4V762X67` — „Rastislav Janek (Individual)", potvrdené aj v EAS (`appleTeams`) |
| App Store Connect API kľúč | ✅ na EAS účte: `ZTQ53HT6PX` („[Expo] EAS Submit"), issuer `7cc9c1f2-…` |
| iOS distribučný certifikát | ✅ na EAS účte, platný do **2027-07-09** |
| App Store Connect app record pre `com.offerra.app` | 🔴 **neexistuje** — vytvorí ho `eas submit` pri prvom podaní (MUTARK má `ascAppId 6791256971`, Offerra zatiaľ žiadne) |

### 0.12 MUTARK a Famiglia nezmenené — ✅ OVERENÉ RUNTIME

```
=== MUTARK status ===   (prázdne = čisté)
c948c84 2026-08-07 06:32:46 +0000 docs(K129): register — OTA publikovaná

=== FAMIGLIA status === (prázdne = čisté)
3d41db8 2026-07-14 18:14:53 +0000 docs: report 1.2.18 — REEL + bezpečnosť…
```

`git status --porcelain` v oboch bez jediného riadku — do žiadneho z nich
sa nezapisovalo, len čítalo.

---

### 0.13 EAS Environment Variables — ✅ OVERENÉ RUNTIME

Bez nich by build prešiel, ale appka by po štarte spadla na guard
v `src/lib/supabase.ts` — `.env` je gitignorovaný a na build server sa
nedostane. Rovnaký vzor ako MUTARK (kľúče cez EAS env, nie v repe).

- Vytvorené pre `production`, `preview` aj `development`:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (visibility `plaintext` — `EXPO_PUBLIC_*` sa aj tak zapekajú do klientskeho
  bundlu, „secret" by tu bol falošný pocit bezpečia).
- **Dôkaz:** `eas env:list production` ich vypisuje s očakávanými hodnotami
  a build log ich potvrdil:
  `Environment variables … loaded from the "production" environment on EAS:
  EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL`

### 0.14 `eas build --platform ios` — 🟡 BEŽÍ

**Build ID:** `1ec9874e-79f1-4abd-bedf-c42a6db8d46c`
**Logy:** https://expo.dev/accounts/rastio_eu/projects/offerra/builds/1ec9874e-79f1-4abd-bedf-c42a6db8d46c
Profil `production`, spustený 7.8.2026 08:01 UTC, stav `IN_PROGRESS`.

Kredenciály pred spustením overené (nie predpokladané):

```
Provisioning Profile
  Developer Portal ID   6D5QB4GLWG
  Status                active
  Expiration            Fri, 09 Jul 2027 11:53:07 UTC
  Apple Team            TC4V762X67 (Rastislav Janek (Individual))

All credentials are ready to build @rastio_eu/offerra (com.offerra.app)
```

#### Prvý pokus (zlyhaný) — pre záznam

Prvé spustenie `--non-interactive` zlyhalo:

```
Distribution Certificate is not validated for non-interactive builds.
Failed to set up credentials.
Credentials are not set up. Run this command again in interactive mode.
```

**Príčina** — zistená dotazom na EAS, nie odhadom:

| Vec | Stav |
|---|---|
| Apple Team `TC4V762X67` | ✅ |
| ASC API kľúč `ZTQ53HT6PX`, rola **ADMIN** | ✅ |
| Distribučný certifikát (do 2027-07-09) | ✅ |
| App identifier `com.offerra.app` | ✅ registrovaný |
| **Provisioning profile pre `com.offerra.app`** | 🔴 **neexistuje** |

Profily existujú len pre `com.mutark.app` a `com.joinfamiglia.app`.
Vytvorenie nového vyžaduje prihlásenie do Apple účtu — overené spustením
`eas credentials:configure-build -p ios -e production` v PTY (bez odoslania
odpovede), ktoré sa pýta:

```
? Do you want to log in to your Apple account? › (Y/n)
```

Apple ID nie je uložené nikde na stroji — `.mutark-secrets` má len
Sign-in-with-Apple kľúče (`APPLE_KEY_ID`, `APPLE_SERVICES_ID`,
`APPLE_CLIENT_SECRET_JWT`), tie na Developer portál neslúžia.

**Vyriešené:** Rastio sa prihlásil do Apple účtu interaktívne
(`eas credentials -p ios`) a EAS profil vytvoril — Developer Portal ID
`6D5QB4GLWG`, „Updated 2 minutes ago". Apple ID je `rastioeu@protonmail.com`
(uložená session `/root/.app-store/auth/…/cookie` z 18.7.2026).
Je to jednorazová vec pre tento bundle id.

### 0.15 `expo-updates` / EAS Update — ✅ OVERENÉ RUNTIME

`eas.json` mal vo všetkých profiloch `"channel"`, ale `expo-updates` nebolo
nainštalované — build to hlásil ako varovanie a kanál bol nefunkčný.
Doplnené **pred** prvým buildom (rozhodnutie Rastia 7.8.2026), aby prvý
TestFlight build už vedel OTA a drobné opravy nevyžadovali nový build.

- `expo-updates ~57.0.12`
- `app.json` → `updates.url = https://u.expo.dev/31b8063a-…`
- `app.json` → `runtimeVersion` policy `appVersion`
- `npx tsc --noEmit` → **exit 0**

---

## Čo blokuje postup

Nič blokujúce. Beží iOS build (0.14); po ňom nasleduje `eas submit`
do TestFlightu a overenie prihlásenia na fyzickom zariadení.

> Token expiruje **6.9.2026**. Po tomto dátume push prestane fungovať —
> vtedy stačí prepísať hodnotu v `/root/.offerra-secrets`, nič iné.

---

## Otvorené na Fázu 1

- `RECORD_AUDIO` v `android.permissions` (pridal ho `expo-image-picker`) —
  pre realitnú appku zbytočné, pred prvým store buildom pridať do
  `blockedPermissions`.
- Vystavenie schémy `offerra` cez PostgREST (`db_schema`) — zdieľané
  nastavenie s MUTARKom, riešiť opatrne až s tabuľkami.
- Verejné čítanie `offerra-media` pre fotky inzerátov.
- Dátový model v schéme `offerra`.
- Auth flow (Apple/Google) — vzor je prečítaný, kód zatiaľ neprenesený.
