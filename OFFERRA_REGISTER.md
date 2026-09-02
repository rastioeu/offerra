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

**Apple + Google doplnené 7.8.2026** (Rastio: „apple alebo google je kvôli
overeniu"). Nie sú tam kvôli pohodliu — pri nehnuteľnostiach má za inzerátom
stáť overený človek. Preto sú to **jediné dve viditeľné cesty**;
e-mail/heslo je **skryté za 5 ťuknutí na logo**, rovnaký vzor ako MUTARK
(K12 — App Store recenzenti nemajú na review zariadení Apple/Google účet).

- `signInWithApple()` — natívny Sign in with Apple → `signInWithIdToken`.
  `expo-apple-authentication` sa načítava `require()`-om **v handleri**, nie
  statickým importom (build bez natívneho modulu by inak zhodil obrazovku pri
  otvorení — poistka prevzatá z MUTARKovho `use-avatar-upload.ts`).
  Zrušenie používateľom (`ERR_REQUEST_CANCELED`) sa **netvári ako chyba**.
- `signInWithGoogle()` — browserový OAuth cez `offerra://` redirect,
  vzor z MUTARKovho `src/lib/auth.ts`. **Nepotrebuje vlastný Google client
  id** — použije sa ten istý Supabase Google client ako pri MUTARKu.

Overené runtime: `tsc --noEmit` → **exit 0**; produkčný iOS bundle
(`dev=false`) `HTTP 200`, **7 438 875 B**, bez chýb.

### 0.18 Supabase Auth — redirect + Apple client pre Offerru — ✅ OVERENÉ RUNTIME

Aplikované 7.8.2026 cez `PATCH /v1/projects/{ref}/config/auth` (`http=200`).
Zmena bola čisto **prídavná** — nič sa neprepisovalo ani nemazalo.

```
uri_allow_list
  mutark://*,mutark://**,mutark://,offerra://*,offerra://**,offerra://

external_apple_client_id
  com.mutark.app.signin,com.mutark.app,com.offerra.app
```

**Kontrola po zmene** — keďže ide o živú konfiguráciu, na ktorej beží MUTARK
v TestFlighte, overené pole po poli spätným `GET`:

| Kontrola | Výsledok |
|---|---|
| `mutark://*` / `mutark://**` / `mutark://` redirecty | ✅ všetky tri zachované |
| Apple services id `com.mutark.app.signin` | ✅ zachovaný |
| Apple bundle id `com.mutark.app` | ✅ zachovaný |
| Apple provider zapnutý | ✅ |
| Google provider zapnutý | ✅ |
| Google client id (`545435480114-…`) | ✅ nezmenený |
| `offerra://*` / `offerra://**` redirecty | ✅ pridané |
| Apple client id `com.offerra.app` | ✅ pridaný |

Google nepotreboval nový client id — používa sa ten istý Supabase Google
client ako pri MUTARKu.

> Funkčnosť samotného prihlásenia týmto **nie je dokázaná** — dokázané je
> len to, že konfigurácia je správna. Či Apple/Google login naozaj vráti
> session, sa overí až v TestFlight builde na zariadení (0.14).

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
| App Store Connect app record pre `com.offerra.app` | ✅ **vytvorený** pri prvom `eas submit` — `ascAppId 6799028421` (viď 0.19) |

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

### 0.14 `eas build --platform ios` — ✅ OVERENÉ RUNTIME (IPA existuje)

**Build ID:** `9fdf26af-b3ea-406d-bae4-40cad5de4a9f`
**Logy:** https://expo.dev/accounts/rastio_eu/projects/offerra/builds/9fdf26af-b3ea-406d-bae4-40cad5de4a9f
Profil `production`, commit `7ed7fcf`, 7.8.2026 08:28 → 08:33 UTC (5 min 45 s),
stav `finished`, verzia `1.0.0`, build number `1`.

**Dôkaz — IPA sa dá stiahnuť, nie len „build hlási finished":**

```
Application Archive URL
  https://expo.dev/artifacts/eas/Nfn5Ysec6SK2mnBhAGZx36RZ1z5i4V8kX9p91ZTGgRc.ipa

curl -sIL → HTTP/2 200
            content-type: application/octet-stream
            content-length: 21999010          (21,99 MB)
```

> Hranica dôkazu: toto dokazuje **existenciu a stiahnuteľnosť súboru**.
> Nedokazuje, že sa appka spustí ani že prihlásenie funguje — to je 0.19.

**Build obsahuje prihlasovaciu obrazovku aj Apple/Google** — beží na commite
`7ed7fcf`, teda za `5ba8371` (login screen) aj `0d50497` (Apple/Google).
Rozdiel od `HEAD` (`b83ac52`) je **len `eas.json`**, čo je konfigurácia
podania, nie súčasť binárky — build teda nie je zastaraný.

#### Dva zrušené buildy — pre záznam

| Build | Commit | Stav | Prečo |
|---|---|---|---|
| `1ec9874e` | `9a3beb3` | canceled | commit ešte **bez** prihlasovacej obrazovky |
| `337dcd8e` | `5ba8371` | canceled | commit ešte **bez** Apple/Google |
| `9fdf26af` | `7ed7fcf` | ✅ finished | obsahuje všetko |

Zrušenie bolo správne: build bez prihlásenia by neumožnil overiť bod 7
zadania a minul by build number 1 nadarmo.

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

### 0.19 `eas submit` → TestFlight — ✅ OVERENÉ RUNTIME (binárka nahraná)

Spustené 7.8.2026 08:47 UTC po Rastiovom **„ok submit"**.

```
Submission ID       11a0c65e-ceb4-4cd4-b56c-aa839db586b6
Status              finished
ASC App ID          6799028421
Build ID            9fdf26af-b3ea-406d-bae4-40cad5de4a9f
App Version         1.0.0     Build number  1
Commit              7ed7fcf

Your binary has been successfully uploaded to App Store Connect!
```

Stav overený **spätne** cez `eas submit:list`, nie len podľa výstupu príkazu.

**Čo prvé podanie zároveň vytvorilo** (predtým nič z toho neexistovalo):

- App identifier `com.offerra.app` nalinkovaný v ASC
- **App Store Connect záznam appky „Offerra"** → `ascAppId 6799028421`
- **TestFlight skupina `Team (Expo)`**, prístup pre `rastioeu@protonmail.com`
- ASC API kľúč `ZTQ53HT6PX` priradený projektu `offerra` pre EAS Submit

`ascAppId` doplnené do `eas.json` → ďalšie podania už nepotrebujú Apple login
ani interaktívny režim.

#### Apple login sa nakoniec nevyžiadal — prečo

`--non-interactive` zlyhalo na:

```
Set ascAppId in the submit profile (eas.json) or re-run this command in interactive mode.
```

Interaktívny režim si vypýtal Apple ID, ale **heslo ani 2FA nie** — použil
uloženú session:

```
› Restoring session /root/.app-store/auth/rastioeu@protonmail.com/cookie
› Provider Rastislav Janek (129142627)
✔ Logged in  Local session
```

Je to tá istá session, ktorú Rastio vytvoril pri provisioning profile (0.14).
Preto nebolo treba znova otravovať — ale **je to session, nie trvalý
kredenciál**: po jej expirácii si Apple login vypýta znova. Vďaka `ascAppId`
v `eas.json` už ho ďalšie podania nepotrebujú.

> Hranica dôkazu: dokázané je, že **binárka je nahraná v App Store Connect**.
> Nedokazuje to, že Apple processing prejde, že sa appka spustí ani že
> prihlásenie funguje. To je 0.20 — a to overuje Rastio na telefóne.

### 0.20 Overenie v TestFlighte na zariadení — 🔴 NEDOKONČENÉ

Čaká na Apple processing (5–10 min, príde e-mail) a potom na Rastia.
Zoznam, čo presne otestovať, je v `reports/FAZA_0_SUBMIT.md`.
Kým to Rastio nepotvrdí menovite, body **0.9** (4 taby) a **0.16**
(prihlasovacia obrazovka) ostávajú 🟡.

TestFlight: https://appstoreconnect.apple.com/apps/6799028421/testflight/ios

---

## Fáza 1 — Inzeráty + vizuálna identita (7.8.2026)

### 1.1 Vizuálna identita — ✅ SCHVÁLENÉ RASTIOM

Predložené **tri hotové** návrhy (wordmark + paleta + app ikona 1024×1024),
nie moodboardy — vrátane mocku karty nehnuteľnosti v každej palete:

| | Návrh | Charakter |
|---|---|---|
| A | **Navy & Azure** | vlastná kreslená geometrická abeceda, obe „f" zdieľajú prečiarknutie; ikona = O ako pečať a v ňom dom |
| B | Ink & Copper | serifové verzálky, aukčná klasika, svetlá „papierová" ikona |
| C | Forest & Sand | tiché minusky „offerra.", ikona = to isté „o" z loga |

**Rastio vybral A** (7.8.2026). Nadväzuje na paletu schválenú vo Fáze 0,
takže farby sa nemenili — dotiahli sa do loga a ikony.

Kontrola voči sesterským appkám (čítané reálne súbory, nič sa nemenilo):

| Appka | Čo má | Offerra |
|---|---|---|
| MUTARK | verzálky, neón na takmer čiernej, herné | ✅ light-first, bez neónu |
| Famiglia | slab serif + červené bodky na čiernej | ✅ geometrický bezpätkový, navy |

Wordmark je **kreslený v SVG krivkách, nie vysadený fontom** — logo tak
nezávisí od toho, aké fonty má zariadenie.

### 1.2 `src/theme/tokens.ts` + premeranie WCAG — ✅ OVERENÉ RUNTIME

Premeranie sľúbené v registri Fázy 0 (bod 0.10) je hotové. **Tri tokeny
v light téme neprešli AA 4.5:1** pre bežný text a boli opravené:

```
success   #1F8A5F → #1D8058   (bolo 4.03:1 → 4.57:1)
warning   #B7791F → #99651A   (bolo 3.39:1 → 4.62:1, najhoršie)
```

Značková azúrová `secondary` #1B73D4 má na pozadí len 4.40:1. **Zámerne sa
NEMENILA** — je to farba loga a ikony. Namiesto toho pribudol token
`link` #1B71D0 (opticky tá istá, 4.53:1). Pravidlo: **`secondary` = výplň
a grafika, `link` = text.**

Pribudol aj `borderStrong` #888E98 pre obrysy polí formulára (WCAG 1.4.11
žiada 3:1 pre ovládacie prvky; dekoratívny `border` #DCE3EC to spĺňať nemusí).

**Dôkaz:** kontrolný skript prechádza všetkých 8 textových tokenov × 2 podklady
× 2 témy + text na výplniach + obrysy → **zlyhaní 0**. Dark téma prešla bez
zásahu (najnižšia hodnota 5.16:1).

### 1.3 Assety identity — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Vygenerované z tej istej geometrie ako predložený návrh:
`icon.png` 1024×1024 **RGB bez alfy** (Apple priehľadnosť v app ikone
odmieta), android adaptive foreground/background/monochrome, `splash-icon.png`,
`favicon.png` a `wordmark.png` (na prihlasovaciu obrazovku namiesto
dočasného textu „OFFERRA").

Čitateľnosť ikony overená vykreslením v **120 px, 60 px a 40 px** — v návrhu
sú všetky tri veľkosti vidieť. Že ju vidno na ploche telefónu, potvrdzuje Rastio.

Pri tejto príležitosti vyriešený otvorený bod Fázy 0: `RECORD_AUDIO` bol
v `android.permissions` **dvakrát** (pridal ho `expo-image-picker`).
Nahradené prázdnym zoznamom + `blockedPermissions`.

### 1.4 DB migrácia — schéma `offerra` — ✅ OVERENÉ RUNTIME

Cez Management API (`database/query`), nie psql — postup ako MUTARK.

**`offerra.property`** — všetky polia z Prisma návrhu.
**`offerra.media`** — `property_id`, `url`, `sort_order`, `created_at`.

Dve vedomé odchýlky od zadania, obe technické:

| Zadanie | Skutočnosť | Prečo |
|---|---|---|
| `transactionType` (camelCase) | `transaction_type` | PostgREST mapuje stĺpce 1:1 (nemáme Prisma `@map`); MUTARK aj Famiglia sú snake_case |
| `order` | `sort_order` | `order` je v PostgREST **vyhradený query parameter** (`?order=`) — kolidoval by s radením |

Navyše `is_seed boolean` — aby sa ukážkové dáta dali zmazať jedným príkazom.

Indexy: `(status, created_at desc)`, `(owner_id, created_at desc)`,
`media(property_id, sort_order)`, `city(district, name)`.
`updated_at` drží trigger, nie klient.

### 1.5 `offerra.city` — vlastný číselník — ✅ OVERENÉ RUNTIME

Rastio vybral **vlastnú tabuľku** (nie MUTARK `public.cities`). Meranie,
ktoré k tomu viedlo:

| Kontrola MUTARK `cities` | Hodnota |
|---|---|
| riadkov celkovo | 68 823 |
| z toho slovenských | **147** |
| najmenšia SK obec | nad 5 000 obyvateľov |
| stĺpec „okres" | **neexistuje vôbec** |

**Dôkaz naplnenia:** `{"obci":2925,"okresov":81,"krajov":8}`

Zdroj obcí: **Wikidata SPARQL** (P31 = obec na Slovensku, P131 = okres),
2 884 obcí s okresom, krajom aj počtom obyvateľov. Mestské časti Bratislavy
a Košíc Wikidata modeluje nekonzistentne (dotaz vracal kostoly a paláce),
preto sú doplnené ako kurátorovaný zoznam — **17 bratislavských a 22
košických**. 81 hodnôt „okres" = **79 skutočných okresov + Bratislava
a Košice ako celok** (predávajúci často povie len „Bratislava").

Že okres naozaj treba, ukazuje jediný SELECT — **„Selce" existuje v troch
rôznych okresoch** (Banská Bystrica, Poltár, Krupina).

### 1.6 Vystavenie schémy cez PostgREST — ✅ OVERENÉ RUNTIME

Otvorený bod Fázy 0. `db_schema` je **zdieľané nastavenie s MUTARKom**,
takže zmena bola čisto prídavná a meraná pred aj po:

```
pred:  public,graphql_public
po:    public,graphql_public,offerra
```

| Kontrola | Pred | Po |
|---|---|---|
| MUTARK `public.cities` (anon) | HTTP 200 | **HTTP 200** |
| MUTARK `public.profiles` (anon) | HTTP 200 | **HTTP 200** |
| MUTARK predvolená schéma stále `public` | — | ✅ vracia dáta bez hlavičky |
| `offerra.property` (Accept-Profile) | HTTP 406 | **HTTP 200** |

### 1.7 Storage `offerra-media` — ✅ OVERENÉ RUNTIME

- Bucket prepnutý na `public = true` — fotky inzerátov musí vidieť aj
  neprihlásený návštevník katalógu.
- Zápis ostáva len vlastníkovi a len do `{ownerId}/{propertyId}/…`
  (prvý segment cesty = `auth.uid()`).
- Pôvodná `select_own` policy zmazaná ako nadbytočná.

> ⚠️ **Vedomý dôsledok:** verejný bucket znamená, že fotka rozrobeného
> (DRAFT) inzerátu je pri znalosti URL dostupná. Cesty sú UUID, takže sa
> nedajú uhádnuť, ale nie je to kryptografická ochrana. Ak by to malo
> vadiť, riešením sú podpísané URL — je to zmena na jednom mieste.

**Kompresia:** `quality: 0.6` pri výbere fotky (vzor MUTARKu) + tvrdá
poistka na 8 MB s hláškou. Skutočné **zmenšenie rozmerov** by vyžadovalo
`expo-image-manipulator` = nový natívny modul = nový build; preto zatiaľ nie.

### 1.8 RLS — dôkaz, nie tvrdenie — ✅ OVERENÉ RUNTIME (15/15)

Testované **dve role**, nielen anonym — `authenticated` má viac grantov,
takže je to prísnejší test.

```
══ ANON ══
✅ vidí len ACTIVE (8 riadkov, statusy={'ACTIVE'})
✅ cudzí DRAFT nevidí ani pri cielenom dotaze na jeho id   → []
✅ fotky cudzieho DRAFTu nevidí                            → []
✅ nevie vytvoriť inzerát                                  → HTTP 401
✅ nevie prepísať cudzí ACTIVE                             → HTTP 401
✅ nevie zverejniť cudzí DRAFT                             → HTTP 401
✅ nevie zmazať cudzí inzerát                              → HTTP 401

══ CUDZÍ PRIHLÁSENÝ POUŽÍVATEĽ ══
✅ cudzí DRAFT nevidí ani prihlásený                       → []
✅ fotky cudzieho DRAFTu nevidí                            → []
✅ nevie prepísať cudzí ACTIVE                             → 0 riadkov
✅ nevie zmazať cudzí inzerát                              → 0 riadkov
✅ nevie vytvoriť inzerát V MENE niekoho iného             → HTTP 403
✅ nevie vytvoriť inzerát rovno ako ACTIVE (musí byť DRAFT)→ HTTP 403
✅ SVOJ vlastný DRAFT vytvoriť VIE                         → HTTP 201
✅ vo svojich DRAFT-och vidí len svoje                     → 1 riadok
```

Posledné dva testy sú tam zámerne: bez nich by „všetko zakázané" vyzeralo
ako úspech. Testovací používateľ aj dáta boli na konci zmazané.

### 1.9 Reťazec formulára cez REST — ✅ OVERENÉ RUNTIME (10/10)

Prihláseným používateľom a jeho JWT, teda **rovnakými RLS pravidlami ako
telefón** — nie cez service role.

```
 1. ✅ vytvorenie konceptu (DRAFT)                      HTTP 201
 2. ✅ rozrobený koncept je pre anonyma neviditeľný     []
 3. ✅ úprava polí sa uložila     title/rooms=2/area=61.5/cena=149000
 4. ✅ nahratie fotky do VLASTNEJ zložky                HTTP 200
 5. ✅ nahratie do CUDZEJ zložky zamietnuté             HTTP 400
 6. ✅ media riadok vytvorený                           HTTP 201
 7. ✅ „Zverejniť" preplo DRAFT → ACTIVE                status=ACTIVE
 8. ✅ po zverejnení to anonym VIDÍ                     1 riadok
 9. ✅ fotku zverejneného inzerátu anonym VIDÍ          1 fotka
10. ✅ fotka sa stiahne bez prihlásenia a je to JPEG    200 image/jpeg
                                          531 493 B → dekódované JPEG 1600×1200
```

> Hranica dôkazu: toto dokazuje, že **dátová cesta funguje celá**.
> Nedokazuje, že formulár na telefóne vyzerá a ovláda sa správne — to je 1.12.

### 1.10 Seed dáta — ✅ OVERENÉ RUNTIME (v DB), 🟡 v appke

8 inzerátov na Rastiovom účte (`33fadff3-…`, Apple), všetky `is_seed = true`,
**16 fotiek**. Mix zámerne pokrýva hraničné prípady:

```
SALE  LAND       Súľov-Hradná     1200 m²   42 000 €  [časovač]
RENT  COMMERCIAL Žilina             95 m²    1 250 €
SALE  APARTMENT  Banská Bystrica    78 m²   BEZ CENY  [časovač]   ← cena je voliteľná
SALE  HOUSE      Bajerovce         132 m²  132 000 €
RENT  APARTMENT  Košice             38 m²      480 €
SALE  HOUSE      Selce             168 m²  289 000 €  [časovač]
RENT  APARTMENT  Ružinov            54 m²      780 €
SALE  APARTMENT  Petržalka          72 m²  219 000 €  [časovač]
```

Fotky sú z **Wikimedia Commons**, len CC0 / CC BY / CC BY-SA / public domain;
licencia a autor ku každej sú v `photos.json` mimo repa. Exteriéry sú
skutočné slovenské domy a mestské budovy. Historické čiernobiele fotky
z Commons boli odfiltrované automaticky podľa sýtosti.

Zmazanie: `delete from offerra.property where is_seed;`

### 1.11 Obrazovky appky — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- `src/lib/property.ts` — model, štítky, formátovanie cien
  (**prenájom „/ mesiac", predaj celková suma** — nie ten istý údaj s iným
  štítkom), `missingForPublish()` vracia ZOZNAM chýbajúceho, nie boolean.
- `src/hooks/use-properties.ts` — katalóg / detail / moje. Fotky sa ťahajú
  **jedným dotazom** pre celý zoznam, nie N+1 na kartu.
- `src/hooks/use-photo-upload.ts` — `require('expo-image-picker')` vnútri
  handlera (vzor MUTARKu), viacnásobný výber, mazanie fotiek.
- `src/app/(tabs)/index.tsx` — katalóg s kartami a pull-to-refresh.
- `src/app/nehnutelnost/[id].tsx` — detail: galéria, popis, parametre,
  „Ponuky: čoskoro".
- `src/app/(tabs)/pridat.tsx` + `src/app/inzerat/[id].tsx` — moje inzeráty
  a editor s tlačidlom **Zverejniť**.
- `src/components/city-picker.tsx` — hľadanie v 2 925 obciach cez DB
  (`ilike`), nie načítanie celého zoznamu do telefónu.
- `src/components/deadline-picker.tsx` — **zámerne bez natívneho date
  pickera**, aby nepribudol natívny modul.

Overené runtime: `npx tsc --noEmit` → **exit 0**; produkčný iOS bundle
`expo export` → **1 669 modulov, 4 352 285 B, bez chýb**.

### 1.12 OTA do TestFlightu — ✅ OVERENÉ RUNTIME (update publikovaný)

Nový build nebol potrebný — žiadny nový natívny modul nepribudol
(`expo-image-picker` aj `expo-image` už v builde `9fdf26af` sú, dátumový
picker je zámerne v JS). Spustené po Rastiovom **„OK update"**.

```
Branch             production
Runtime version    1.0.0
Update group ID    749e32b3-ac42-49f8-99e7-8a67cf70b9e9
Commit             95264ad
Message            Fáza 1 — inzeráty, katalóg, identita Navy & Azure
```

**Kontrola, že to appka v TestFlighte naozaj chytí** — OTA sa doručí len
pri zhode kanála aj runtime verzie, preto overené proti reálnemu buildu:

| | Build `9fdf26af` (v TestFlighte) | OTA update |
|---|---|---|
| Channel / branch | `production` | `production` |
| Runtime Version | `1.0.0` | `1.0.0` |

> Hranica dôkazu: dokázané je, že **update je publikovaný na správnom
> kanáli a runtime**. Nedokazuje, že sa na telefón stiahol ani že
> obrazovky vyzerajú správne — to je 1.13.

### 1.13 Overenie Fázy 1 na zariadení — ✅ POTVRDENÉ POUŽÍVATEĽOM (okrem ikony)

Rastio 7.8.2026 po OTA: **„ostatné vyzerá ok"**, ikona na ploche nie.

> Poznámka k presnosti: Rastio potvrdil stav **súhrnne**, nie bod po bode.
> Body 1.3 a 1.11 sú teda ✅ ako celok; jednotlivé obrazovky (napr. že
> „Selce" vráti tri okresy) menovite potvrdené neboli.

### 1.14 Ikona na ploche sa nezmenila — ✅ PRÍČINA ZISTENÁ, oprava čaká na build

**Nie je to chyba, je to hranica OTA.** App ikona a splash sú **natívne
assety skompilované do binárky** (iOS `Assets.car`), nie JS. `eas update`
posiela len JS a assety, ktoré si JS vyžiada cez `require()` — ikonu
z `app.json` medzi ne nepatrí.

**Dôkaz — vytiahnutá ikona z commitu, z ktorého je TestFlight build:**

```
git show 7ed7fcf:assets/images/icon.png
  → 1024×1024 RGBA — pôvodná Expo šablónová ikona (svetlomodrá so šípkou)

assets/images/icon.png (dnes, commit 95264ad)
  → 1024×1024 RGB — Offerra navy so značkou
```

Na ploche teda musí byť šablónová ikona — presne to Rastio aj vidí.
To isté platí pre **splash screen**.

Naopak wordmark na prihlasovacej obrazovke sa zmeniť **musel** — ten sa
načítava `require()`-om z JS, takže OTA ho niesla (`Uploaded 1 asset`).

**Oprava:** vyžaduje nový `eas build` + `eas submit`. Pripravené:
`ios.buildNumber` zvýšené `1 → 2`, `version` ostáva `1.0.0` zámerne —
tým sa `runtimeVersion` nemení a **doterajšia OTA platí aj pre nový build**.
Build sa spustí až po Rastiovom „OK build" (CLAUDE.md §3).

---

## Fáza 2 — Ponuky, dopyty, profil (7.8.2026)

### 2.0 ZMENA ROZHODNUTIA — slepé → otvorené pseudonymné ponuky

Pôvodný smer bol **slepé ponuky** (sumu vidí len vlastník). Rastio ho
7.8.2026 zmenil na **otvorené pseudonymné**:

- **suma, prezývka, stav a dátum sú VEREJNÉ** — vidí ich aj neprihlásený;
  vytvára to dražobnú dynamiku,
- **kto za prezývkou stojí, verejné NIE JE** — vzor MUTARK „posol",
- **reálne meno a telefón sa odkryjú AŽ akceptáciou**, a to OBOM stranám.

Na slepej verzii sa **nezačalo pracovať** — bola len predložená ako otázka,
takže nebolo čo prepisovať.

> Dôsledok, ktorý stojí za zapamätanie: pri slepých ponukách by stačila
> riadková RLS. Pri otvorených nie — riadok profilu **musí** byť verejný
> kvôli prezývke, takže meno a telefón v tom istom riadku chráni až
> **stĺpcový grant** (viď 2.2).

### 2.1 Prezývka ako podmienka vstupu — ✅ OVERENÉ RUNTIME

Fáza 0 nickname nezbierala vôbec. Doplnené ako samostatná obrazovka po
prihlásení (`src/app/prezyvka.tsx`), vzor MUTARK `setup.tsx`
(LOGIN → NICKNAME → appka). Brána v `_layout.tsx` má teraz dva stupne.

**Nie je to však len UI pravidlo.** `property.owner_id` aj
`property_offer.bidder_id` mieria cudzím kľúčom na `offerra.profile`,
kde je `nickname NOT NULL`. Bez prezývky teda inzerát ani ponuka
**neprejdú cez databázu**, nech by klient robil čokoľvek.

FK na `property.owner_id` bol kvôli tomu presmerovaný z `auth.users` na
`offerra.profile`. Mazanie ďalej kaskáduje: `auth.users → profile → property`.

### 2.2 Ochrana kontaktu — stĺpcové granty — ✅ OVERENÉ RUNTIME

Kľúčové miesto celej fázy. RLS je **riadková** a tu by nestačila: riadok
profilu musí byť čitateľný, aby sa dala zobraziť prezývka. Preto:

```
grant select (id, nickname, avatar_url, created_at) on offerra.profile
  to anon, authenticated;
```

`full_name` a `phone` **v grantoch nie sú vôbec**. Nedá sa ich vypýtať ani
omylom, ani úmyselne — PostgREST vráti `42501`.

Čítajú sa výhradne cez dve `SECURITY DEFINER` funkcie s pevným
`search_path`:

| Funkcia | Komu vydá čo |
|---|---|
| `offerra.my_profile()` | volajúcemu jeho VLASTNÉ meno a telefón |
| `offerra.offer_contact(offer_id)` | protistranu — a to **len pri stave ACCEPTED** |
| `offerra.delete_my_account()` | zmaže `auth.users` riadok volajúceho |

Všetky tri majú `execute` len pre `authenticated`, nie pre `anon`.

### 2.3 Tabuľky — ✅ OVERENÉ RUNTIME

| Tabuľka | Poznámka |
|---|---|
| `offerra.profile` | nickname (3–20 znakov, unikátny bez ohľadu na veľkosť písmen), full_name, phone, avatar_url |
| `offerra.property_offer` | amount, message, status, + čiastočný unikátny index: **jedna ŽIVÁ ponuka na záujemcu a inzerát** |
| `offerra.tenant_profile` | 1:1 k ponuke, len pri prenájme; **neverejná** |
| `offerra.buyer_request` | dopyty, RLS verejné pre `ACTIVE` |
| `offerra.request_outreach` | oslovenie autora dopytu majiteľom |

`profile` nebol v zadaní, ale bez neho sa nedá splniť ani prezývka, ani
odkrytie kontaktu — je to nutný nosič oboch.

Zvýšenie ponuky je **úprava tej istej ponuky**, nie nová. Bez toho by sa
verejný zoznam dal zaplaviť.

### 2.4 Dôkazy RLS — ✅ OVERENÉ RUNTIME (25/25)

Tri role: anonym, cudzí prihlásený, obe strany ponuky.

```
PODANIE      ✅ záujemca vie podať ponuku aj dotazník nájomcu
             ✅ vlastník NEVIE ponúkať na vlastný inzerát        403
             ✅ nikto NEVIE ponúkať V MENE iného                 403
             ✅ ponuka sa NEDÁ podať rovno ako ACCEPTED          403

VEREJNÉ      ✅ ANONYM vidí sumu + prezývku + stav + dátum
                {"amount":720,"status":"PENDING","bidder":{"nickname":"t_zaujemca"}}
             ✅ cudzí prihlásený vidí to isté

SKRYTÉ       ✅ anonym nedostane full_name/phone ani keď si ich vypýta   401
             ✅ cudzí prihlásený tiež nie (stĺpcový grant)               403
             ✅ dotazník nájomcu nevidí anonym ani cudzí prihlásený      []
             ✅ vlastník inzerátu dotazník VIDÍ

KONTAKT      ✅ PRED akceptáciou ho nedostane ani vlastník, ani záujemca []
             ✅ cudzí NEVIE akceptovať ponuku                            0 riadkov
             ✅ vlastníkovi sa odkryl kontakt na ZÁUJEMCU
                BIDDER: Záujemca Skutočný / +421 900 333 444
             ✅ záujemcovi sa odkryl kontakt na VLASTNÍKA
                OWNER: Vlastník Skutočný / +421 900 111 222
             ✅ cudzí kontakt NEDOSTANE ani po akceptácii                []

DOPYTY       ✅ anonym vidí ACTIVE dopyt
             ✅ vlastník inzerátu vie osloviť autora dopytu
             ✅ kto nevlastní inzerát, osloviť NEVIE                     403
             ✅ adresát oslovenie vidí, cudzí nie
```

### 2.5 Funkcie — ✅ OVERENÉ RUNTIME (5/5)

```
✅ appka vie vytvoriť profil s prezývkou               HTTP 201
✅ my_profile() vráti VLASTNÉ meno a telefón           Testovací Človek / +421 900 777 888
✅ tá istá informácia cez TABUĽKU nejde                HTTP 403 (42501)
✅ zmena telefónu sa uloží a prečíta späť              204 → +421 911 000 111
✅ delete_my_account() zmaže účet AJ profil            auth.users 1→0, profile → 0
```

### 2.6 Obrazovky — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- `prezyvka.tsx` — povinný krok po logine.
- `nehnutelnost/[id].tsx` — placeholder „Ponuky: čoskoro" **nahradený**
  verejným zoznamom (prezývka + suma + dátum, zoradený podľa sumy).
- `ponuka/[id].tsx` — podanie/úprava ponuky, pri prenájme dotazník nájomcu.
- `ponuky/[id].tsx` — pohľad majiteľa: dotazník, Prijať/Odmietnuť,
  po prijatí odkrytý kontakt.
- `(tabs)/dopyty.tsx` — zoznam ACTIVE dopytov (bol prázdny stub).
- `dopyt/[id].tsx` — detail + „Osloviť so svojím inzerátom".
- `dopyt/novy.tsx` — formulár dopytu; v tabe Pridať pribudlo druhé tlačidlo.
- `(tabs)/profil.tsx` — **debug obrazovka z Fázy 0 nahradená** skutočným
  profilom: prezývka, fotka, moje inzeráty/ponuky/dopyty.
- `nastavenia.tsx` — samostatná obrazovka za ozubeným kolieskom.

Overené runtime: `npx tsc --noEmit` → **exit 0**; produkčný iOS bundle
**1 678 modulov, 4 437 536 B**, bez chýb.

### 2.7 Oslovenie bez notifikácií — vedomý medzikrok

Notifikačný systém v Offerre **neexistuje** (overené: v `package.json`
nie je `expo-notifications`, v DB žiadny push token). „Osloviť" preto
zatiaľ nie je push ani DM, ale **záznam**, ktorý adresát vidí vo svojom
dopyte. Nič sa tým nestratí — keď notifikácie pribudnú, budú mať z čoho
posielať.

### 2.8 Seed — ✅ OVERENÉ RUNTIME

6 pseudonymných záujemcov (`severan`, `tichy_kupec`, `byt_hladac`,
`zahrada2026`, `presspor`, `kamenar`), **13 ponúk, 8 dotazníkov nájomcu,
6 dopytov**. Jeden inzerát je zámerne bez ponúk, aby bolo vidieť aj
prázdny stav.

Mená a telefóny seed záujemcov sú vyplnené — inak by sa nedalo ukázať
odkrytie kontaktu. Zmazanie: `delete from offerra.profile where is_seed;`

### 2.9 OTA publikovaná — ✅ OVERENÉ RUNTIME

Fáza 2 **nepridala žiadny natívny modul** (`AsyncStorage`,
`expo-image-picker` aj `expo-image` už v builde sú, `Switch` je súčasť
React Native), takže build nebol potrebný. Spustené po „OK update".

```
Branch             production
Runtime version    1.0.0
Update group ID    883e0fda-6f77-4591-830c-84aa3370a154
Commit             f122d0f
```

Zhoda s buildom `9fdf26af` (channel `production`, runtime `1.0.0`) platí
rovnako ako pri Fáze 1 — bez nej by sa update nedoručil.

### 2.11 Tri chyby z prvého testu na zariadení — ✅ OPRAVENÉ

Rastio 7.8.2026: „fotka nejde nahrať a prezývku mi dalo že existuje aj keď
som bol prvý a telefón nezadalo na prvý krát".

#### a) Prezývka „už existuje" — chyba bola MOJA, nie v kóde

Pri migrácii (2.1) som pre Rastiov **Apple** účet založil profil
s prezývkou `rastio`, aby sedel cudzí kľúč pre 8 seed inzerátov. Rastio sa
prihlásil cez **Google** — to je iný `auth.users` riadok — napísal `rastio`
a narazil na môj vlastný riadok. **Obsadil som mu jeho meno bez toho, aby
o tom vedel.**

Dôkaz (dva rôzne účty, obe jeho):

```
rastio     33fadff3…  rastioeu@protonmail.com  apple    8 inzerátov
Rastioeu   99c3f891…  rastioeu@gmail.com       google   1 inzerát
```

Riešené: seed profil premenovaný na `ukazka_predajca`, dostal
`is_seed = true` a kontaktné údaje (aby sa dalo testovať odkrytie po
akceptácii). Prezývka `rastio` je voľná.

> Poučenie do ďalších fáz: seed dáta nesmú zaberať mená, ktoré si môže
> chcieť vziať skutočný používateľ.

#### b) Telefón sa neuložil na prvý krát — dôsledok (a) + samostatná chyba

`useProfile()` volali **tri miesta nezávisle** — brána v `_layout.tsx`,
obrazovka prezývky aj Profil. Boli to tri oddelené stavy. Po úspešnom
uložení sa obnovila len inštancia na obrazovke prezývky; brána o novom
profile nevedela a držala používateľa tam ďalej. Ďalšie ťuknutie na
„Pokračovať" poslalo **druhý INSERT** → „prezývku už niekto má" na vlastnú
prezývku, a všetko vyplnené vrátane telefónu sa stratilo.

Riešené: profil je v kontexte (`ProfileProvider` v `_layout.tsx`), jeden
`reload()` vidia všetci. Kolízia na primárnom kľúči sa navyše už nehlási
ako obsadená prezývka.

> Je to tá istá trieda chyby ako splash screen v 0.17: `tsc` prejde, bundle
> sa zostaví, a prejaví sa to až na zariadení.

#### c) Fotka sa nedá nahrať

**Meranie prv, oprava potom.** V `storage.objects` bolo pre jeho účet
**0 súborov** — upload z telefónu vôbec neodišiel, padalo to pred
odoslaním.

Server bol v poriadku, overené osobitne (8/8): upload do vlastnej zložky,
`upsert` na tú istú cestu, PNG, HEIC, odmietnutý GIF, verejné stiahnutie.

Príčina: výber fotiek používal `allowsMultipleSelection: true` spolu
s `base64: true`. Pri viacnásobnom výbere `expo-image-picker` base64
nevracia spoľahlivo — kód dostal `undefined` a fotku **ticho preskočil**.

Riešené podľa Rastiovej požiadavky „daj to ako v mutark": jedna fotka,
`allowsEditing`, `aspect`, `quality`, `base64` — teda presne overený
MUTARK vzor. Výber aj upload sú teraz v spoločnom `src/lib/photo.ts` pre
inzeráty aj profilovku, s **krokovým logovaním** (1 štart … 7 hotovo) a
chybovou hláškou, ktorá povie, na ktorom kroku to padlo.

Publikované OTA `a21664da-3c76-408e-8556-eafc55737477` (commit `2d90a70`).

### 2.12 Štyri diery v oprávneniach na ponukách — ✅ OPRAVENÉ

Nájdené vlastnou kontrolou (nie hlásením) po dokončení Fázy 2. RLS na
`property_offer` pustila UPDATE obom stranám, ale **nikde nebolo povedané,
kto smie meniť KTORÝ stĺpec** — riadková politika to ani vyjadriť nevie.

Namerané pred opravou:

```
🔴 záujemca si vedel SÁM akceptovať vlastnú ponuku          HTTP 200, ACCEPTED
🔴 a tým si vytiahnuť kontakt majiteľa cez offer_contact()  Vlastník Tajný / +421 900 111 000
🔴 majiteľ vedel prepísať SUMU cudzej ponuky                190 000 → 1
🔴 majiteľ vedel prepísať SPRÁVU záujemcu                   „Podvrhnutá správa"
✅ ponuku sa nedalo prepísať na iného človeka
```

Prvé dve rušia pravidlo, na ktorom celá Fáza 2 stojí — že kontakt sa
odkryje **až keď ponuku prijme majiteľ**.

Riešené triggerom `offerra.guard_offer_update()`:

| Kto | Smie zmeniť |
|---|---|
| majiteľ inzerátu | **len** `status`, a to len `PENDING → ACCEPTED/REJECTED` |
| záujemca | svoju `amount`/`message`, alebo `PENDING → WITHDRAWN` |
| ktokoľvek | `property_id`, `bidder_id`, `created_at` **nikdy** |
| ktokoľvek | uzavretú ponuku (nie PENDING) **už vôbec** |

Po oprave: **5/5 ošetrených, 0 dier**, a plný test Fázy 2 naďalej **25/25** —
trigger nerozbil legitímne cesty.

> Poučenie: RLS odpovedá na otázku „smieš siahnuť na tento RIADOK".
> Na otázku „smieš zmeniť tento STĹPEC" odpovedá stĺpcový grant (2.2),
> a na „smieš ho zmeniť NA TÚTO hodnotu" už len trigger.

### 2.13 Obrazovky sa neobnovovali po návrate — ✅ OPRAVENÉ

Tá istá trieda chyby ako profil v 2.11(b), len na inom mieste: každá
obrazovka má vlastnú inštanciu svojho hooku. Formulár ponuky si po odoslaní
obnovil SVOJ zoznam, ale detail, z ktorého sa naň prišlo, o zmene nevedel.
To isté po zverejnení inzerátu (katalóg), po vytvorení dopytu (tab Dopyty)
a po prijatí ponuky.

Riešené hookom `useRefreshOnFocus` — obnova pri návrate na obrazovku.
Kontext by tu nepomohol: zoznamov je veľa a líšia sa parametrom.
Nasadené na katalóg, Dopyty, Pridať, detail inzerátu, editor a správu ponúk.

### 2.14 `view_count` — ✅ OVERENÉ RUNTIME

Otvorený bod od Fázy 1: stĺpec existoval, ale nemal ho kto zvyšovať —
UPDATE na cudzom inzeráte RLS nepustí, a práve cudzí ho aj pozerá.
Rieši `offerra.bump_view()` (SECURITY DEFINER), ktorá **vlastné pozeranie
nepočíta**. Zobrazuje sa v parametroch inzerátu.

```
začiatok            0
VLASTNÍK pozerá →   0   (nerástlo, správne)
ANONYM pozerá   →   1
ANONYM znova    →   2
```

### 2.15 Druhé kolo auditu — päť ďalších dier — ✅ OPRAVENÉ

Po 2.12 som prešiel aj zvyšné tabuľky. Namerané pred opravou:

```
🔴 ponuku sa dalo podať AJ PO uplynutí uzávierky            HTTP 201
🔴 majiteľ si vedel nafúknuť view_count                     → 99 999
🔴 majiteľ si vedel označiť inzerát ako ukážkový (is_seed)  → true
🔴 majiteľ vedel spätne datovať created_at                  → 2000-01-01
🔴 nájomca vedel prepísať dotazník PO prijatí ponuky        2 000 → 9 000 €
```

**Najhoršia je prvá.** Detail inzerátu píše „Ponuky do 28. augusta ·
ostáva 21 dní" a ponuku po termíne pokojne prijal — appka klamala, čo je
presne to, čo `CLAUDE.md` §2 zakazuje. Časovač bol dovtedy len ozdoba.

Spätné datovanie nie je kozmetika: katalóg radí podľa `created_at`, takže
sa ním dalo preskočiť dopredu. A `is_seed` riadi odznak „UKÁŽKA" — dal sa
teda sfalšovať oboma smermi.

Riešenie — tri rôzne nástroje na tri rôzne otázky:

| Diera | Nástroj |
|---|---|
| uzávierka pri podaní | podmienka v `offer_insert_own` policy |
| uzávierka pri zvýšení ponuky | `guard_offer_update()` trigger |
| `view_count`, `is_seed`, `created_at` | **stĺpcové granty** na `property` |
| dotazník po prijatí | `guard_tenant_profile()` trigger |

Rovnaké obmedzenie zápisu dostal aj `buyer_request` a `media`.

Po oprave **6/6 ošetrených, 0 dier**. V appke sa navyše tlačidlo „Podať
ponuku" po uzávierke vôbec nezobrazí a namiesto neho je dôvod — server má
posledné slovo, ale používateľ nemá vidieť chybu z databázy.

### 2.16 Regresia v starých testoch — ✅ VYRIEŠENÉ

Pri regresii spadli sady z Fázy 1 (`rls_test` 13/15, `flow_test` 3/10).
**Nebola to dnešná chyba** — tie testy vytvárajú inzerát pre používateľa
bez profilu, čo Fáza 2 zakázala presmerovaním `property.owner_id` na
`offerra.profile`. Testy boli teda zastarané voči schéme a ja som ich po
tej zmene nepustil znova.

Opravené (testovací používateľ dostane profil) — a je to zároveň dôkaz, že
požiadavka „bez prezývky sa nedá inzerovať" naozaj drží na úrovni databázy.

**Stav všetkých sád:**

```
rls_test.py      15/15    RLS Fáza 1
flow_test.py     10/10    reťazec formulára
rls_test_f2.py   25/25    otvorené pseudonymné ponuky
fn_test.py         5/5    my_profile / delete_my_account
hole_test.py       5/5    oprávnenia na ponukách
hole_test2.py      6/6    uzávierka a integrita
                 ──────
                 66/66
```

### 2.17 Nášľapná mína, ktorú som vyrobil ja — ✅ ODSTRÁNENÁ

Pri uvoľňovaní prezývky (2.11a) som Rastiovmu **Apple** profilu nastavil
`is_seed = true` — vtedy používal Google účet a ten profil bol ukážkový.
Odvtedy prešiel na Apple, doplnil si tam **skutočné meno a telefón** a
vlastní na ňom 8 inzerátov a 13 ponúk.

`delete from offerra.profile where is_seed;` — príkaz, ktorý je napísaný
v reporte Fázy 2 ako spôsob upratania seed dát — **by mu zmazal účet aj
všetky dáta.** Nikto ho nespustil, ale bol to čas do výbuchu.

Opravené: `is_seed = false` na jeho profile. Inzeráty ostávajú označené
ako ukážkové (naozaj sú), takže sa dajú mazať podľa `property.is_seed`,
nie kaskádou z profilu.

> Poučenie: seed príznak nikdy nepatrí na riadok, ktorý medzitým prevzal
> skutočný používateľ.

### 2.18 E-mail v odkrytom kontakte — ✅ OVERENÉ RUNTIME

Na Rastiovu žiadosť. E-mail sa **neukladá do profilu** — býva v
`auth.users` a tam je vždy aktuálny; duplikovať ho by znamenalo
synchronizovať dve pravdy. `offer_contact()` ho teda číta joinom.

```
vlastník vidí záujemcu : Meno em_zauj  | +421 900 2ad | em-bid-…@offerra.test
záujemca vidí vlastníka: Meno em_vlast | +421 900 29a | em-own-…@offerra.test
```

Ochrana ostala rovnaká — mimo stavu ACCEPTED nevráti nič a cudziemu nikdy
(overené v rámci 25/25).

### 2.19 Karta v katalógu — najvyššia ponuka, uzávierka, zobrazenia — 🟡

Na Rastiovu žiadosť pribudlo na kartu:

- **najvyššia živá ponuka** — pri otvorenom modeli je to dôležitejšie
  číslo než orientačná cena, preto má vlastný riadok a akcentovú farbu;
  bez ponúk sa píše „Zatiaľ bez ponúk",
- **uzávierka** — s odpočtom, po termíne zošedne,
- **počet zobrazení a ponúk** v pätičke.

Ponuky sa doťahujú **jedným dotazom pre celú stránku**, nie jedným na kartu.

### 2.20 Vyhľadávanie a filtre — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Nad katalógom je lišta, kde sa dá napísať veta. Appka z nej vytiahne
filtre a **ukáže, čomu rozumela** — nie čierna skrinka, ale štítky, ktoré
vidno a dajú sa zrušiť.

**Bez jazykového modelu, a je to vedomé rozhodnutie:** `rastioeu/offerra`
je verejný repozitár a `EXPO_PUBLIC_*` premenné sa zapekajú do klientskeho
bundlu — API kľúč by sa nedal ukryť ani v jednom. Skutočný model by
potreboval serverovú medzivrstvu, ktorú Offerra nemá. Doména je pritom
úzka (obchod, typ, izby, cena, výmera, obec) a dá sa rozobrať presne.

**Dôkaz rozboru** (skript nad skompilovaným `search.ts`):

```
3-izbový byt v Petržalke do 250 tisíc → APARTMENT 3izb do 250000  | obec: petrzalke
prenájom bytu Košice do 600           → RENT APARTMENT do 600     | obec: kosice
dom so záhradou Selce                 → HOUSE                     | obec: …/selce
trojizbový byt Nitra od 60 m2         → APARTMENT 3izb >=60m2     | obec: nitra
dom do 1,2 mil                        → HOUSE do 1200000
byt Petrzalka 250 000                 → APARTMENT do 250000       | obec: petrzalka
```

**Dve chyby, ktoré ten test odhalil** (a bez neho by sa dostali k Rastiovi):

1. Lenivý kvantifikátor `{0,9}?` v regexe na číslo bral **len prvú
   číslicu** — „do 600" vychádzalo ako 6, „do 250 tisíc" ako 2.
2. Zvyšné slovo pred názvom obce zabilo hľadanie mesta — „dom so záhradou
   Selce" nenašlo Selce. Teraz sa skúšajú kandidáti po jednom.

**Filtre overené proti DB** (nie len poskladané):

```
transaction_type=eq.RENT                       → 2
property_type=eq.HOUSE                         → 2
city=eq.Petržalka                              → 1
rooms=gte.3                                    → 4
or(asking_price_hint.lte.150000, is.null)      → 5  ← inzerát BEZ ceny sa NESTRATIL
or(title/description/city ilike *byt*)         → 2
```

Že sa inzerát bez ceny cenovým filtrom nestratí, je zámer — nepovinná cena
je celá pointa Offerry.

### 2.21 Audit doterajších ✅ — čo je naozaj dokázané a čo nie

Rastio žiadal prejsť aj veci označené ✅ bez runtime dôkazu.

| Kategória | Stav |
|---|---|
| DB, RLS, granty, funkcie, Storage | ✅ **dokázané** — 66 automatických kontrol reálnymi HTTP volaniami a SELECT-mi |
| EAS build, submit, OTA publikovanie | ✅ **dokázané** — ID buildov, veľkosti IPA, spätné dotazy na EAS |
| **Všetko, čo je vidieť na displeji** | 🟡 **nedokázané mnou a ani dokázať neviem** |

**Nemám fyzické zariadenie.** Simulátor ani `expo export` nedokazujú, že sa
obrazovka správne vykreslí, že sa dá ťuknúť tam, kam treba, ani že natívny
modul odpovie. Presne to je dôvod, prečo `CLAUDE.md` §1 zakazuje dávať ✅
čomukoľvek, čo vyžaduje vizuálne overenie.

Jediné „✅ POTVRDENÉ POUŽÍVATEĽOM" (1.13) bolo **súhrnné** („ostatné vyzerá
ok"), nie bod po bode — a už vtedy to bolo v registri takto napísané.
Tri chyby, ktoré Rastio potom nahlásil (2.11), aj štyri + päť dier, ktoré
som našiel sám (2.12, 2.15), ukazujú, že súhrnné potvrdenie nestačí.

---

## Fáza 3 — Nahlasovanie, moderovanie, admin, changelog (7.8.2026)

**IDE OTA** — žiadny natívny modul nepribudol.

### 3.1 Vecná oprava zadania: `User.role` neexistoval

Zadanie hovorí „`User.role` už existuje v modeli". **Neexistoval** — bol
len v Prisma návrhu, do DB sa nikdy nedostal. Vytvorený teraz ako
`offerra.profile.role` (`USER`/`ADMIN`). Rastio je prvý admin, nastavené
ručne cez DB podľa zadania.

Rola je verejne čitateľná, ale **zámerne nie je v `grant update`** —
používateľ si ju nesmie nastaviť sám.

### 3.2 Nahlasovanie — ✅ OVERENÉ RUNTIME

`offerra.report` (reporter, typ cieľa, cieľ, dôvod, poznámka, stav).
Unikátny index `(reporter, typ, cieľ)` — ten istý človek nemá tú istú vec
hlásiť dookola, inak by opakovaním falošne nafúkol počet a skreslil prah.

Tlačidlo „Nahlásiť" je na detaile inzerátu, pri každej cudzej ponuke
a pri prezývke v zozname ponúk. **Appka nikoho automaticky neodstráni** —
vytvorí sa záznam a používateľ dostane potvrdenie.

### 3.3 Moderovanie a blokovanie — ✅ OVERENÉ RUNTIME

Admin akcie idú cez `SECURITY DEFINER` funkcie, **nie cez rozšírené
stĺpcové granty**. Keby `authenticated` dostal `update (is_blocked)`,
nastavil by si ho sám na svojom riadku — riadková politika
`id = auth.uid()` to nezachytí. Funkcia sa pýta na rolu.

Blokovanie mieri aj do `auth.users.banned_until`, takže zablokovaný sa
**naozaj nevie prihlásiť**, nielen že nemôže nič pridať.

### 3.4 Stav REJECTED — ✅ OVERENÉ RUNTIME

Verejný SELECT sa nemenil (je viazaný na `ACTIVE`), takže skrytý inzerát
zmizne z katalógu, ale ostáva v DB, vlastníkovi **s dôvodom** a adminovi.
Trigger navyše bráni vlastníkovi prepnúť si zamietnutie späť.

### 3.5 Admin tab — ✅ OVERENÉ RUNTIME

Tab „Správa" je pre bežný účet **úplne skrytý** (`href: null`), nielen
zamknutý. Skrytie je však pohodlie, nie ochrana — skutočná ochrana je
v DB a je zmeraná (bežný účet dostane z `admin_stats` prázdno).

Sekcie: štatistika, nahlásenia, inzeráty, používatelia.

### 3.6 Dôkazy — ✅ 24/24

```
NAHLASOVANIE   ✅ prihlásený vie nahlásiť inzerát                  201
               ✅ NEVIE nahlásiť v mene iného                      403
               ✅ NAHLÁSENÝ svoje nahlásenie NEVIDÍ                []
               ✅ autor svoje vidí, admin vidí
ADMIN LEN PRE  ✅ bežný účet is_admin() = false, admin = true
ADMINA         ✅ bežný účet NEDOSTANE štatistiku ani zoznam ľudí   []
MODEROVANIE    ✅ bežný účet NEVIE zamietnuť                  „Len pre správcu."
               ✅ admin zamietol → zmizlo z katalógu               []
               ✅ vlastník vidí dôvod „Duplicitné fotky"
               ✅ vlastník si to NEVIE prepnúť späť na ACTIVE
BLOKOVANIE     ✅ zablokovaný NEVIE pridať inzerát ani dopyt        403
               ✅ zablokovanému je zakázané aj PRIHLÁSENIE
               ✅ admin NEVIE zablokovať sám seba
```

Regresia po zmenách: **66/66** v šiestich starších sadách.
Spolu **90/90**.

### 3.7 Verzný riadok — 🟡 KÓD HOTOVÝ

`v{version} · rt{runtimeVersion} · {ota}` dole v Profile, cez `require()`
v try/catch (natívny modul by pri statickom importe zhodil obrazovku už
pri otvorení).

**Poučenie z MUTARKu:** jeho `build-info.ts` si sám zapísal, že ručne
udržiavaná konštanta `GIT_COMMIT` ostala neaktualizovaná naprieč
desiatkami OTA — Rastio sa cez ňu teda nemohol presvedčiť, či mu OTA
dorazila. Offerra preto stavia na `Updates.updateId`, ktorý generuje
`expo-updates` sám a **nemá ako zostarnúť**. Porovnáva sa s „Update
group ID" z `eas update`.

### 3.8 „Čo je nové" — 🟡 KÓD HOTOVÝ

Obrazovka `novinky.tsx` dostupná z Nastavení, spätne naplnená za Fázu 0,
1 aj 2. Standing rule zapísaná do **`CLAUDE.md` §7**, nie len sľúbená.

### 3.9 Verzia sa ZATIAĽ nedvíha — a je na to dôvod

Zadanie žiada zvýšiť `version` pri každej zmene. **Urobiť to teraz by
odstrihlo tvoj TestFlight build od OTA.** `runtimeVersion` má politiku
`appVersion`; build v TestFlighte má runtime `1.0.0` a update s iným
runtime sa mu nedoručí.

Verzia sa preto dvíha **len spolu s novým buildom**. Zapísané do
`CLAUDE.md` §7. Pri najbližšom builde (ikona) odporúčam prepnúť
`runtimeVersion` na politiku `fingerprint` — tá sa mení len keď sa mení
natívna časť, takže verzia sa potom bude dať dvíhať slobodne.

---

## Bug-fix 2026-08-07

Zoznam VŠETKÉHO, čo sa doteraz našlo ako pokazené — nahlásené Rastiom aj
nájdené vlastnou kontrolou. Statusy podľa §1.

| # | Chyba | Kto našiel | Stav |
|---|---|---|---|
| 1 | Splash screen bez `hideAsync` — appka by ostala navždy na splash | ja, pred buildom | ✅ opravené (0.17) |
| 2 | Ikona na ploche ostala šablónová po OTA | Rastio | ✅ príčina zistená (1.14) — **🔴 oprava čaká na build** |
| 3 | Prezývka hlásila „už existuje" na vlastnú prezývku | Rastio | ✅ opravené (2.11a) — príčinou bol môj seed |
| 4 | Telefón sa neuložil na prvý pokus | Rastio | ✅ opravené (2.11b) |
| 5 | Tri nezávislé inštancie `useProfile` — brána nevidela nový profil | ja | ✅ opravené (2.11b) |
| 6 | Fotka sa nedala nahrať (0 súborov v Storage) | Rastio | ✅ opravené (2.11c) |
| 7 | Záujemca si vedel SÁM akceptovať ponuku | ja | ✅ opravené (2.12) |
| 8 | …a tým si vytiahnuť telefón majiteľa | ja | ✅ opravené (2.12) |
| 9 | Majiteľ vedel prepísať sumu cudzej ponuky | ja | ✅ opravené (2.12) |
| 10 | Majiteľ vedel prepísať správu záujemcu | ja | ✅ opravené (2.12) |
| 11 | Obrazovky sa neobnovovali po návrate | ja | ✅ opravené (2.13) |
| 12 | Uzávierka ponúk bola len ozdoba — dalo sa ponúkať po termíne | ja | ✅ opravené (2.15) |
| 13 | Majiteľ si vedel nafúknuť `view_count` | ja | ✅ opravené (2.15) |
| 14 | Majiteľ si vedel nastaviť odznak „UKÁŽKA" | ja | ✅ opravené (2.15) |
| 15 | Majiteľ vedel spätne datovať inzerát a preskočiť v katalógu | ja | ✅ opravené (2.15) |
| 16 | Nájomca vedel prepísať dotazník PO prijatí ponuky | ja | ✅ opravené (2.15) |
| 17 | Dve testovacie sady boli zastarané voči schéme | ja | ✅ opravené (2.16) |
| 18 | Parser ceny bral len prvú číslicu („do 600" → 6) | ja | ✅ opravené (2.20) |
| 19 | Slovo pred názvom obce zabilo hľadanie mesta | ja | ✅ opravené (2.20) |
| 20 | **Rastiov živý profil mal `is_seed = true`** — mazanie seed dát by mu zmazalo účet | ja | ✅ odstránené (2.17) |
| 21 | `Card` nemal tieň — plochý vzhľad | Rastio (bod 6B) | ✅ opravené (4.2) |
| 22 | Žiadne loading skeletony, len holý krúžok | Rastio (bod 6B) | ✅ opravené (4.2) |
| 23 | Tlačidlo pri práci len menilo text, bez spinnera | Rastio (bod 6B) | ✅ opravené (4.2) |
| 24 | `Row` a nadpis sekcie rozkopírované v 8 súboroch | ja pri 6B | ✅ zjednotené (4.2) |

### Čo v tomto zozname CHÝBA a chýbať bude

**Nemám fyzické zariadenie.** Body 1–24 sú nájdené čítaním kódu, meraním
proti databáze a automatickými testami. Chyby, ktoré sa prejavia LEN na
displeji — preklep v rozložení, nedostupné tlačidlo, klávesnica cez pole,
pomalé vykreslenie — v tomto zozname nie sú a ja ich tam doplniť neviem.
Prechod na zariadení je **🔴 NEDOKONČENÝ** a môže ho spraviť len Rastio.

---

## Fáza 4 — Dorobenosť a realitné funkcie (7.8.2026)

**IDE OTA** — žiadny natívny modul nepribudol.

### 4.1 Porovnanie s MUTARKom — priznanie

Rastio: „appka pôsobí slabšie ako MUTARK" a „skontroluj, či si z MUTARK
reálne prevzal referenciu, alebo si robil vlastné jednoduchšie verzie".

**Mal pravdu. Robil som vlastné jednoduchšie verzie.**

Prevzal som *správanie* (ImagePicker cez `require()`, auth flow, klasické
Tabs, štruktúru tokenov). **Neprevzal som UI vrstvu** — MUTARK má
`src/ui/` so 17 komponentmi, Offerra mala `ui.tsx` so šiestimi a zvyšok
rozkopírovaný po obrazovkách.

| Čo | MUTARK | Offerra pred | Offerra teraz |
|---|---|---|---|
| UI kit | 17 komponentov v `src/ui/` | 6 v jednom súbore | 11, zjednotené |
| Loading stav | `Skeleton` (pulzujúci tvar obsahu) | holý `ActivityIndicator` | ✅ `Skeleton` + `PropertyCardSkeleton` |
| Tlačidlo pri práci | spinner v tlačidle (`loading`) | len zmena textu | ✅ spinner |
| `Card` | `Shadow.card` | **bez tieňa** | ✅ tieň |
| Odozva na stlačenie | — | len `opacity` | ✅ pruženie mierky |
| `Row`, nadpis sekcie | `Row`, `SectionLabel` | 4× a 8× skopírované | ✅ jeden zdroj |
| Haptika | `expo-haptics` cez `require()` | žiadna | 🔴 **vyžaduje nový build** |

**Haptika je jediná položka, ktorá sa OTA vyriešiť nedá** —
`expo-haptics` je natívny modul. MUTARKov vlastný komentár hovorí to isté:
čakal na najbližší `eas build`. U nás sa pridá spolu s ikonou.

Čo Offerra **zámerne nepreberá**: glow efekty a neón. Realitná appka má
pôsobiť vecne, nie herne — to bolo v zadaní Fázy 0 a platí ďalej. Rozdiel
mal byť v štýle, nie v dorobenosti; dorobenosť sa dorovnáva.

### 4.2 Dorobenosť komponentov — 🟡 KÓD HOTOVÝ

Pribudlo: `Skeleton`, `PropertyCardSkeleton`, `Pressable3D` (pruženie),
`loading` na tlačidle, `Shadow.button`, tieň na `Card`, zdieľané `Row`
a `SectionLabel`.

Všetko cez `Animated` z React Native — **žiadny nový natívny modul**.

### 4.3 Obľúbené — ✅ OVERENÉ RUNTIME (5/5)

Tabuľka `offerra.favorite`. Obľúbené sú **súkromné** — nikto nemá vidieť,
čo si niekto iný odložil; pri nehnuteľnostiach to prezrádza zámery
aj rozpočet.

```
✅ A si uložil obľúbený                        201
✅ A ho vidí                                   1 riadok
✅ B NEVIDÍ obľúbené používateľa A             []
✅ B NEVIE uložiť v mene A                     403
✅ A si ho odobral                             []
```

Srdiečko reaguje **optimisticky** — čakať na sieť pri takom drobnom geste
vyzerá rozbito. Pri zlyhaní sa stav vráti zo servera a používateľ dostane
hlášku.

### 4.4 Kalkulačka splátok — 🟡 KÓD HOTOVÝ

V detaile pri PREDAJI a keď je uvedená cena. Anuitný vzorec, ošetrené
delenie nulou pri nulovej sadzbe.

Pod výsledkom je **napísané, čo neráta** — poplatky, poistenie, daň, ani
či úver banka schváli. Bez toho by z orientačného čísla spravila sľub.

### 4.5 Zdieľanie — 🟡 KÓD HOTOVÝ

Systémový share sheet cez `Share` z React Native (**nie nový modul**),
s hlbokým odkazom `offerra://nehnutelnost/{id}` — ten istý scheme, aký
už používa prihlásenie cez Google.

### 4.6 Granulárne notifikácie — ✅ OVERENÉ RUNTIME (9/9)

`offerra.notification_preference` — per typ, s frekvenciou.

**Offerra zatiaľ nemá čím notifikáciu poslať** (žiadne
`expo-notifications`). Preferencie preto nie sú hotová funkcia, ale
**brána, ktorou bude musieť prejsť každý budúci odosielateľ** —
`offerra.should_notify()`. To sa dá otestovať už teraz, a otestované to je:

```
✅ bez nastavenia je typ ZAPNUTÝ (default)              true
✅ po VYPNUTÍ brána notifikáciu ZASTAVÍ                 false
✅ iný typ ostal zapnutý (vypnutie je PER TYP)          true
✅ SYSTÉMOVÉ sa nedajú vypnúť ani priamym zápisom do DB check constraint
✅ SYSTÉMOVÉ vždy prejdú                                true
✅ B NEVIDÍ preferencie používateľa A                   []
✅ B NEVIE nastaviť preferencie za A                    403
✅ zablokovanému sa bežné neposielajú, systémové áno    false / true
✅ frekvencia má default IHNED
```

Výnimka pre systémové je vynútená **`check` obmedzením v tabuľke**, nie
skrytým prepínačom v UI — schované tlačidlo nie je pravidlo.

### 4.7 Denný a týždenný súhrn — 🟡 ZÁMERNE NEDOKONČENÉ

Uloženie frekvencie funguje, ale **nič ju nečíta**. Súhrn potrebuje
plánovanú úlohu na serveri (pg_cron alebo Supabase Scheduled Function),
ktorá udalosti nazbiera, zoskupí a odošle jednou správou.

Odhad: **pol dňa práce**, ale až po tom, čo bude existovať samotné
odosielanie notifikácií. Bez neho nie je čo zoskupovať.

V Nastaveniach sú preto tlačidlá „Denný súhrn" a „Týždenný súhrn"
označené **„(čoskoro)"** a po ťuknutí vysvetlia prečo — namiesto toho,
aby ticho uložili predvoľbu, ktorú nikto nečíta.

### 4.8 Zdieľanie — A hotové, B čaká na build

**A) Systémový share sheet — 🟡 KÓD HOTOVÝ.** `Share` z React Native,
obsah: názov, mesto, výmera, orientačná cena a hlboký odkaz
`offerra://nehnutelnost/{id}`.

> Deep link **NEOVERUJEM ako funkčný**. Scheme `offerra` je v `app.json`,
> route `app/nehnutelnost/[id].tsx` existuje a expo-router má takéto
> odkazy mapovať automaticky — ale či sa appka po ťuknutí na odkaz naozaj
> otvorí na správnom detaile, sa dá zistiť **len na zariadení**.

**B) Vizuálna kartička 9:16 — 🔴 VYŽADUJE NOVÝ BUILD.**
Potrebuje `react-native-view-shot` (ten istý modul, aký na to používa
MUTARK) — je to **natívny modul**, OTA ho nedoručí.

Odhad po builde: **2–3 hodiny** (rozloženie kartičky, vykreslenie mimo
obrazovky, uloženie do dočasného súboru, odoslanie do share sheetu).

Do kartičky pôjde **len verejné info z katalógu** — žiadny kontakt ani
presná adresa. To je pravidlo, nie poznámka: kontakt je chránený stĺpcovým
grantom a do obrázka sa nesmie dostať zadnými dverami.

---

## BUG 0 — onboarding naskakoval pri každom otvorení — ✅ OPRAVENÉ

Rastio 7.8.2026 so screenshotom: obrazovka „Ako ťa máme volať?" sa
zobrazovala pri **každom** spustení appky, hoci prezývku v DB má.

### Príčina — presne to, čo Rastio tipoval

`ProfileProvider.reload()` pri chýbajúcom `userId` nastavoval profil na
**`null`**. Lenže `null` v jazyku brány znamená „prihlásený, ale BEZ
prezývky" — a to posiela na onboarding.

Pri štarte appky session ešte nie je načítaná, takže `userId` je
`undefined` → profil sa nastavil na `null` → brána poslala na prezývku.

**Zhoršoval to poriadok efektov:** `RootLayoutInner` je DIEŤA
`ProfileProvider` a v Reacte bežia efekty dieťaťa **skôr** než rodiča.
Brána teda stihla prečítať staré `null` prv, než ho rodič prepísal.

### Tretia chyba tej istej triedy — a druhá, horšia

Pri oprave sa ukázalo, že `null` sa nastavovalo **aj v `catch`**. Výpadok
siete pri štarte teda vyzeral ako „nemáš prezývku" a poslal na onboarding
niekoho, kto ju má. To je horšie než pôvodná chyba, lebo je občasné.

Zavedený jasný rozdiel:

| Hodnota | Význam |
|---|---|
| `undefined` | ešte NEVIEME (načítava sa, alebo zlyhalo) |
| `null` | server ODPOVEDAL a profil naozaj neexistuje |

`null` sa smie nastaviť **len po úspešnej odpovedi**.

### Aby to nebola štvrtá chyba tej istej triedy

Rozhodovanie brány je vytiahnuté do čistej funkcie `src/lib/gate.ts`
a **pokryté testom** — vrátane presnej postupnosti, ktorá chybu
spôsobovala. Tá istá trieda („rozhodlo sa skôr, než dorazili dáta")
nás už stála splash screen (0.17) aj neobnovenú bránu (2.11b).

```
✅ štart: nevieme nič                                    → null
✅ ŠTART S ULOŽENOU SESSION, profil ešte nedorazil       → null   ← chyba bola TU
✅ …a keď dorazí a prezývku MÁ                           → null
✅ REGRESIA: session je, profil undefined, sme na taboch → null
✅ neprihlásený → login                                  → /login
✅ prihlásený BEZ profilu → prezývka                     → /prezyvka
✅ po uložení prezývky → taby                            → /(tabs)
✅ CHYBA načítania profilu → NIE onboarding              → null
                                                          11/11
```

Navyše: pri zlyhaní načítania profilu sa **skryje splash** a ukáže sa
obrazovka s dôvodom a tlačidlom „Skúsiť znova" — inak by appka visela,
čo je presne chyba 0.17.

**Stav v DB (dôkaz, že podmienka je splnená):**
`rastioeu@protonmail.com · nickname „Rastio" · vyplnená = true`

### Čo NIE JE dokázané

Rastio žiada overiť **3× reštartom appky**. To spraviť neviem — nemám
zariadenie. Dokázané je: logika brány (11/11) a že prezývka v DB naozaj
je. Že sa onboarding po force-quite naozaj neukáže, potvrdí až Rastio.

---

## Fáza 6 — Redizajn „Dôveryhodne teplá" (7.8.2026)

**IDE OTA.** Mockup: https://claude.ai/code/artifact/2ec74706-fb36-4c67-8270-2ecbfe02bb19

### 6.1 Paleta — a prečo NIE presne tá, ktorú Rastio napísal

Zadanie navrhlo teplý akcent v rozsahu `#C9703B`–`#D4923D`. **Premeral som
ho a ako bežný text ani ako tlačidlo s bielym textom neprejde:**

```
#D4923D   na pozadí 2.47:1   biely text 2.63:1   🔴 nikde
#C9703B   na pozadí 3.36:1   biely text 3.58:1   🟡 len veľký text
#A85526   na pozadí 4.93:1   biely text 5.26:1   ✅ text aj tlačidlo
```

Riešené rovnako, ako paleta už rieši azúrovú (`secondary` vs `link`) —
**dva odtiene, každý na svoju úlohu**:

| Token | Odtieň | Kde |
|---|---|---|
| `accent` | `#C9703B` | VEĽKÉ ceny a sumy, dekoratívne výplne |
| `accentDeep` | `#A85526` | CTA tlačidlá, malý teplý text |

Pozadie je teplý off-white `#FBF7F2` — papier, nie tabuľka.
**Tmavá téma je teplé uhlie** `#161311`, nie modrá noc; tým sa zároveň
rozišla s MUTARKom (`#0B1020`).

**Premeranie: 0 zlyhaní v oboch témach** (9 textových tokenov × 2 podklady,
+ veľké ceny na prah 3:1, + biely text na výplniach, + obrysy polí).

### 6.2 Typografia — dva rezy

Peniaze majú vlastný **pätkový** rez (`Money` v tokenoch, Georgia), aby oko
našlo číslo bez čítania. Georgia je na iOS vždy — netreba nič baliť do
appky. Apple „New York" je krajšie, ale jeho dostupnosť v React Native
treba najprv overiť na zariadení.

### 6.3 Logo hore — 🟡 KÓD HOTOVÝ

`AppHeader` s wordmarkom na všetkých štyroch taboch. Wordmark
prekreslený s **teplým akcentom** namiesto azúrovej linky.

### 6.4 „Ako funguje Offerra" (bod 14A) — 🟡 KÓD HOTOVÝ

Karta na hlavnej obrazovke + celá obrazovka dostupná aj z Nastavení.
Text zohľadňuje **všetky doterajšie rozhodnutia**: otvorené pseudonymné
ponuky, povinná prezývka, odkrytie kontaktu až po akceptácii, dopyty,
uzávierka a moderovanie.

**Standing rule zapísaná do `CLAUDE.md` §8**, nie len sľúbená.

### 6.5 Zavreté tipy sa pamätajú v DB — 🟡 KÓD HOTOVÝ

`offerra.dismissed_hint`. Rastio výslovne upozornil, aby to nebol lokálny
stav, ktorý sa resetuje — je to tá istá chyba ako pri onboardingu
prezývky. `useHints` preto rozlišuje „ešte nevieme" od „nič nie je
zavreté" a tip radšej neukáže, než aby preblikol.

### 6.6 Prekreslenie obrazoviek — ✅ DOKONČENÉ 8.8.2026, viď 7.14

Základ (paleta, typografia peňazí, hlavička, tiene) bol položený 7.8.2026.
Zvyšok — karta katalógu s fotkou na 60 %, hero galéria s bodkami, mriežka
parametrov 2×2, prilepené spodné tlačidlo, spodný panel pri ponuke a náhľad
po podržaní — je hotový a rozpísaný v **7.14**. Status ostáva 🟡 do
vizuálneho overenia na zariadení.

### 6.7 Body, ktoré VYŽADUJÚ nový build — 🔴

| Bod | Modul | Prečo |
|---|---|---|
| 13F mapa | `react-native-maps` | v projekte **nie je** |
| 12 rozmazané pozadie | `expo-blur` | v projekte **nie je** (kozmetika — dovtedy stmavenie) |
| 10B kartička 9:16 | `react-native-view-shot` | ✅ **je** v builde #3, kód ešte nie |

Podržanie prstu samotné **nový build nepotrebuje** — MUTARK naň nepoužíva
žiadnu knižnicu, len `Modal` a `Animated`. Haptika aj ikony sú v builde #3.

---

## Fáza 5 — Zvonček, realtime, časová os (7.8.2026)

**IDE OTA** — ale až do buildu #3 (rt `6e77233e…`), nie do starého.

### 5.1 Oznámenia zakladá DATABÁZA, nie klient — ✅ OVERENÉ RUNTIME (7/7)

`offerra.notification` + triggery. Klient na tabuľku **nemá `INSERT` grant
vôbec** — oznámenie sa nedá podvrhnúť a vznikne aj vtedy, keď appka
odosielateľa medzitým spadne.

```
✅ nová ponuka → oznámenie MAJITEĽOVI
     „z_zauj ponúka 190 000 € za „Zvonček test""
✅ cudzí cudzie oznámenia NEVIDÍ                         []
✅ klient NEVIE oznámenie podvrhnúť                      403
✅ prijatie ponuky → oznámenie ZÁUJEMCOVI
✅ VYPNUTÝ typ sa ani NEZALOŽÍ (nie je len skrytý)
✅ nový dopyt sediaci na inzerát → oznámenie majiteľovi
✅ označenie prečítaných funguje
```

Piaty bod je podstatný: preferencia sa uplatní **pri vzniku**, nie pri
zobrazení. Je rozdiel medzi „nedostal som to" a „appka mi to zamlčala".

Pri tom teste sa našla drobná chyba: `to_char(…,'G')` bral oddeľovač
z locale databázy a vypisoval **„190,000 €"**. Slovenčina používa medzeru
— opravené.

### 5.2 Živé obnovenie (Realtime) — 🟡 KÓD HOTOVÝ

Supabase Realtime na `offerra.notification`, tabuľka pridaná do publikácie
`supabase_realtime` (bez toho by sa udalosti neposielali — overené
spätným SELECTom z `pg_publication_tables`).

Keď na môj inzerát príde ponuka, zvonček sa rozsvieti **bez ťahania dole**.
Ak sa kanál neotvorí, appka funguje ďalej (obnovuje sa pri návrate na
obrazovku) a výpadok sa **loguje**, nie ignoruje.

> Že to na zariadení naozaj pribehne v reálnom čase, sa dá overiť len
> na zariadení.

### 5.3 Zvonček a časová os — 🟡 KÓD HOTOVÝ

Zvonček s počtom neprečítaných je v hlavičke katalógu (vzor MUTARK
`app-header.tsx`). Obrazovka „Oznámenia" hovorí nahlas, že Offerra
**neposiela upozornenia na zamknutú obrazovku** — sľubovať pípnutie,
ktoré nepríde, je horšie než nesľúbiť nič.

Časová os v Profile zlučuje inzeráty, moje ponuky a dopyty do jednej
postupnosti zoradenej podľa času, so zvislou osou a dennými predelmi.
Práve to zlúčenie robí z troch plochých zoznamov príbeh.

### 5.4 Build #3 — ✅ OVERENÉ RUNTIME

```
Build ID     f4c872c7-7e88-4ea5-ba93-cd9e0637d125
Status       finished           Version 1.1.0, buildNumber 3
Runtime      6e77233eb0e1bd196e49196a1af1ed351862cd67   ← fingerprint
IPA          HTTP/2 200, 21 221 744 B
Submission   d9b3ddb6 → „successfully uploaded to App Store Connect"
```

Obsahuje app ikonu, splash, `expo-haptics` a `react-native-view-shot`.

> ⚠️ Starý build (rt `1.0.0`) už ďalšie OTA **nedostane**. Kým si Rastio
> nenainštaluje build #3 z TestFlightu, ostáva na tom, čo mal.

### 5.5 Čo build #3 odblokoval, ale ešte nie je napísané — 🔴

- **Haptika** — modul je v builde, volania v kóde zatiaľ nie sú.
  Odhad: hodina (jemné chvenie pri podaní ponuky, prijatí, srdiečku).
- **Kartička 9:16** — modul je v builde, kartička nie. Odhad 2–3 hodiny.

### 2.10 Overenie Fázy 2 na zariadení — 🔴 NEDOKONČENÉ

Čaká na Rastia. Appku zavrieť a znova otvoriť; pri prvom spustení si
vypýta **prezývku**. Zoznam, čo otestovať, je v `reports/FAZA_2_PONUKY.md`.
Kým to menovite nepotvrdí, bod **2.6** (obrazovky) ostáva 🟡.

---

## Fáza 7 — Mapa, klávesnica, prenájom, adresa (8.8.2026)

Zadanie Rastia z 8.8.2026 (živé testovanie na telefóne). Poradie práce som
zoradil sám, ako si vyžiadal: **najprv mapa** (bola rozrobená a build sa
kvôli nej aj tak robí), potom tri kritické chyby, potom dátové rozšírenia,
nakoniec build. Bod 7 (filter chips) som **nerozhodoval** — otázka je nižšie.

### 7.1 Tlačidlo Späť ukazovalo „(tabs)" — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

**Príčina.** iOS píše pri šípke späť **titulok predošlej obrazovky**. Predošlá
je smerovacia skupina `(tabs)`, ktorá v `src/app/_layout.tsx` žiadny `title`
nemala — React Navigation preto vypísal názov route, doslova `(tabs)`.

**Oprava** (`src/app/_layout.tsx`): do `screenOptions` pribudlo
`headerBackButtonDisplayMode: 'minimal'` (len šípka, bežný iOS vzor)
a `headerBackTitle: 'Späť'` ako poistka; skupina `(tabs)` navyše dostala
`title: 'Offerra'`. Tri nezávislé vrstvy, lebo aj keby jedna neplatila,
nesmie sa objaviť názov priečinka.

**Platí pre všetkých 8 obrazoviek s headerom** — nastavenie je v koreňovom
`Stack`, nie v jednotlivých obrazovkách: `inzerat/[id]`, `nehnutelnost/[id]`,
`ponuka/[id]`, `ponuky/[id]`, `dopyt/[id]`, `dopyt/novy`, `nastavenia`,
`ako-funguje`, `novinky`, `oznamenia`.

**Prečo nie ✅:** vzhľad šípky vidno len na zariadení.

### 7.2 Klávesnica prekrývala pole a nedala sa zavrieť — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

**Príčina bola dvojitá:**

1. `KeyboardAvoidingView` obsah len **posunul**, ale nedoskroloval na
   zaostrené pole — pole nižšie vo formulári preto ostalo pod klávesnicou.
2. Numerická klávesnica (`decimal-pad`, `numeric`) **nemá klávesu Enter**,
   takže „Počet izieb" a „Nájom do" sa nedali zavrieť **nijako**.

**Oprava** — nový `src/components/form-screen.tsx` so **štyrmi nezávislými**
cestami von, lebo jedna nestačí:

| Cesta | Kde |
|---|---|
| `automaticallyAdjustKeyboardInsets` (iOS sám doskroluje) | `FormScreen` |
| ťuknutie mimo poľa | `Pressable` cez celý obsah formulára |
| potiahnutie po obsahu | `keyboardDismissMode="interactive"` |
| lišta **„Hotovo"** nad klávesnicou | `KeyboardDoneBar` v `ui.tsx` (`InputAccessoryView`) |

`InputAccessoryView` je súčasť React Native — **žiadny nový natívny modul**,
ide OTA. `Field` si accessory pripája sám pri číselných a viacriadkových
poliach, takže na to nemôže žiadna obrazovka zabudnúť.

**Pokryté formuláre:** `inzerat/[id]`, `dopyt/novy`, `ponuka/[id]`,
`prezyvka` (cez `FormScreen`); `profil`, `nehnutelnost/[id]` (kalkulačka),
`dopyt/[id]` (modál oslovenia), `report-button` (modál nahlásenia),
`login` (cez tie isté tri vlastnosti + `KeyboardDoneBar`). V `login.tsx`
sa `KeyboardAvoidingView` zároveň obmedzil na Android — inak by sa obsah
podložil dvakrát.

### 7.3 Hlavička sa prelínala s dynamic islandom — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

**Príčina.** Odsadenie zhora si držala **obrazovka** (`SafeAreaView
edges={['top', …]}`), nie hlavička. Stačilo, aby na `edges` jedna obrazovka
zabudla, a logo skončilo pod ostrovčekom.

**Oprava.** `AppHeader` si po novom berie `useSafeAreaInsets().top` **sám**
a štyri taby s hlavičkou (`index`, `dopyty`, `pridat`, `profil`) horný edge
odovzdali jej. Vedľajší efekt je aj krajší: farba hlavičky sa natiahne až
pod ostrovček. Do `_layout.tsx` pribudol explicitný `SafeAreaProvider` —
doteraz ho dodávala len navigácia svojim obrazovkám.

### 7.4 Mapa (bod 13F + bod 5) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- Prepínač **Zoznam / Mapa** v hlavičke katalógu. Filter platí pre obe —
  mapa nie je iná obrazovka, len iný pohľad na tú istú množinu.
- Mapa je **mimo `ScrollView`** (samostatná vetva renderu): vnútri by si
  posúvanie mapy a scrollovanie stránky navzájom kradli gesto.
- Piny nesú **cenu**, nie bodku. Terakota = najvyššia ponuka, navy =
  orientačná cena.
- **Prepínač Mapa / Satelit** (`mapType`) — natívna vlastnosť `MapView`,
  funguje na Google aj Apple mapách.
- Poloha je **poloha obce, nie adresy** — `address_hidden` sa mapou nesmie
  obísť. Na mape to hovorí štítok „Poloha je obec, nie adresa".
- `require('react-native-maps')` je v `try/catch`: starší build modul nemá
  a namiesto pádu ukáže vysvetlenie.

**⚠️ PROVIDER_GOOGLE na iOS potrebuje kľúč — viď 7.10 nižšie.**

### 7.5 Súradnice — ✅ OVERENÉ RUNTIME

Zdroj: **Wikidata (P625)**. Číselník `offerra.city` dostal `lat`/`lon`.

```
2925/2925 obcí má súradnice
8/8 zverejnených inzerátov má súradnice
```

`CityPicker` po novom vracia `{ city, district, region, latitude, longitude }` —
súradnice sa teda dopĺňajú automaticky pri výbere obce. Bez toho by sa nový
inzerát na mape neobjavil nikdy a nemal by ich odkiaľ vziať (presnú adresu
zámerne nepýtame).

### 7.6 Polia prenájmu (bod 8) — ✅ OVERENÉ RUNTIME (dáta) / 🟡 (formulár)

Nové stĺpce na `offerra.property`: `deposit_amount`, `deposit_months`,
`available_from`, `min_lease_months`, `furnishing`, `utilities_included`,
`pets_allowed`.

**Prečo priamo na `property` a nie zvláštna 1:1 `rental_details`:** je to 7
nullable stĺpcov, ktoré sa VŽDY čítajú spolu s inzerátom. Zvláštna tabuľka
by znamenala join alebo druhý dotaz pri každom otvorení detailu a nezískala
by nič — vzťah 1:1 sa nikdy nerozvetví.

**Pasca, ktorá by inak formulár tíško rozbila:** `property` má **stĺpcové
granty**, nie tabuľkové (14 stĺpcov mohlo `UPDATE`). Bez `grant update` na
nové stĺpce by sa formulár tváril, že uložil, a neuložil by nič. Grant je
súčasťou migrácie a test to overuje priamo.

Kontroly hodnôt sú v DB (`check`), nie len v UI: `furnishing`, 
`utilities_included`, nezáporná zábezpeka, kladná doba nájmu.

**Dátum „Dostupné od"** rieši `AvailableFromPicker` — rýchle voľby (Ihneď /
od budúceho mesiaca / o 2 / o 3) + ručné `DD.MM.RRRR`. **Zámerne bez
natívneho date pickera**, rovnaký dôvod ako pri `DeadlinePicker`:
`@react-native-community/datetimepicker` je ďalší natívny modul.

### 7.7 Adresa: kraj + ulica (bod 9) — ✅ OVERENÉ RUNTIME (dáta) / 🟡 (formulár)

`property.region` + `property.street`; `buyer_request.region` tiež.
Kraj sa **dopĺňa sám z číselníka obcí** (je v tom istom riadku), dá sa
prepísať z ôsmich možností (`REGIONS`). Ulica je nepovinná a **bez čísla
domu** — presná adresa ostáva skrytá do dohody.

Spätné doplnenie: `8/8` inzerátov a `7/7` dopytov má kraj z číselníka.

### 7.8 Dopyt hovorí rečou hľadajúceho (bod 6) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

| Bolo | Je |
|---|---|
| „Chcem: Kúpiť / Prenajať si" | **„Čo hľadám: Kúpim / Hľadám prenájom"** |
| „Rozpočet do (€)" | **„Ponúkam do (€)"** + vysvetlenie |
| badge „PREDAJ" v zozname dopytov | **„KÚPIM"** |
| placeholder len pri jednej vetve | **placeholder podľa typu**, ako si napísal |

V DB sa `transaction_type` **nemení** (`SALE`/`RENT`) — preklad je len
`DEMAND_LABEL` na obrazovke. Zmena hodnôt by rozbila párovanie dopytov
s inzerátmi.

### 7.9 Všetko klikateľné (bod 4) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Prešiel som appku obrazovka po obrazovke:

| Obrazovka | Stav |
|---|---|
| Katalóg — karta inzerátu | už bola celá klikateľná |
| Dopyty — karta dopytu | už bola celá klikateľná |
| Profil — Moje inzeráty / Obľúbené / Moje ponuky / Moje dopyty | už boli |
| Pridať — Moje inzeráty | už boli |
| Oznámenia | už boli |
| **Profil — časová os** | **opravené** (`onPress` bol v type, ale nikto ho nepoužil) |
| **Správa — Nahlásenia** | **opravené** → otvorí cieľ |
| **Správa — Inzeráty** | **opravené** → otvorí detail |
| **Správa — Používatelia** | **opravené** → celé ID a údaje (obrazovku nemá) |
| **Správa — „Vyžaduje pozornosť"** | **opravené** → otvorí cieľ |

**Vedomá výnimka:** karty v „Ponuky na inzerát" (`ponuky/[id]`) klikateľné
nie sú. Nie je to riadok vedúci niekam — je to hotová karta so VŠETKÝMI
údajmi a s tlačidlami Prijať/Odmietnuť. Ťuknutie by nemalo kam viesť
a „nestane sa nič" je zakázaná reakcia (CLAUDE.md §2).

### 7.10 ⚠️ Google mapy na iOS potrebujú kľúč — 🔴 ČAKÁ NA RASTIA

Zadanie: „použi `react-native-maps` s `PROVIDER_GOOGLE` (vzor MUTARK)".

**Meranie:** MUTARK má `react-native-maps` v plugins, ale **žiadny**
`ios.config.googleMapsApiKey` (`/root/mutark/app.json` — `ios.config` je
`null`). Bez kľúča `react-native-maps` na iOS Google SDK vôbec nezalinkuje.

**Ako som to vyriešil, aby mapa fungovala hneď:** provider sa odvodzuje od
toho, či kľúč naozaj existuje —

```ts
provider = Platform.OS === 'android' || hasIosGoogleKey() ? PROVIDER_GOOGLE : undefined;
```

Bez kľúča teda iOS beží na **Apple Maps** (funkčná mapa vrátane satelitu),
s kľúčom sa prepne na Google **bez zmeny kódu**. Kľúč je potrebné vyrobiť
v Google Cloud (Maps SDK for iOS) a vložiť do `app.json` ako
`ios.config.googleMapsApiKey` — to je krok, ktorý za teba spraviť nemôžem.

### 7.14 Redizajn obrazoviek (Fáza 6, bod 6.6) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Rastio 8.8.2026: „2 urob aj redizajn." Doťahuje sa tým bod **6.6**, ktorý
bol jediný 🔴 zvyšok schváleného mockupu „Dôveryhodne teplá".

| Z mockupu | Kde | Stav |
|---|---|---|
| karta katalógu s fotkou na 60 % | `property-card.tsx` | hotové |
| hero galéria s bodkami | `nehnutelnost/[id].tsx` | hotové |
| mriežka parametrov 2×2 | `ui.tsx` `ParamCell` | hotové |
| prilepené spodné tlačidlo | `nehnutelnost/[id].tsx` | hotové |
| ponuky ako karty s iniciálou | `offer-list.tsx` | hotové |
| spodný panel pri ponuke | `ponuky/[id].tsx` | hotové |
| náhľad po podržaní prstu (bod 12) | `long-press-menu.tsx` | hotové |

**Zmena SPRÁVANIA, nie len vzhľadu.** Mockup hovorí: „skutočná ponuka je
dôležitejšia než želanie predávajúceho." `priceDisplay` preto pri inzeráte,
ktorý má cenu AJ ponuky, vracia po novom `TOP_OFFER`, nie `ASKING` —
hlavné číslo je najvyššia ponuka a orientačná cena je vedľa, menšia a sivá.
Predtým sa ponuka krčila v druhom riadku pod cenou.

**Tlačidlo hlavnej akcie je terakotové, nie navy.** Tokeny to hovorili od
začiatku (`accentDeep` = „CTA tlačidlá"), `Button` to ale nedodržiaval —
a `Shadow.button` má terakotový tieň, takže tieň a výplň si roky
nesedeli. Rovnako aktívny filter chip.

**Podržanie prstu (bod 12) — čo z toho potrebovalo build:**

| Časť | Modul | Stav |
|---|---|---|
| menu samotné | žiadny — `Modal` + `Animated` | ide OTA |
| haptika | `expo-haptics` | bolo v builde #3 |
| ikony | `expo-symbols` | bolo v builde #3 |
| rozmazané pozadie | `expo-blur` | **pribudlo do buildu #4** |

`expo-blur` je v `require()` v try/catch: keď modul chýba, pozadie sa len
STMAVÍ. Rozmazanie je kozmetika a nesmie kvôli nej spadnúť obrazovka.

Nahlásenie z podržania otvára **ten istý formulár** ako odkaz „Nahlásiť"
(`ReportButton` dostal `hideTrigger` + `openExternally`). Druhá kópia
formulára by znamenala dve miesta, kde sa dá pokaziť validácia.

**WCAG.** Nové dvojice farieb som premeral, dve v svetlej téme neprešli
a boli opravené — nie stlmené, ale vyriešené:

```
odznak NAJVYŠŠIA na surfacePressed   4.42:1  🔴 → obrys na surface    5.18:1 ✅
odznak neutrálny na surfacePressed   4.06:1  🔴 → obrys na surface    4.76:1 ✅
iniciála 18px na surfacePressed      4.42:1  🔴 → 20px tučné (prah 3) 4.42:1 ✅
```

Terakotová cena má 3,53:1 na karte — prah pre veľký text je 3:1 a `Money`
je 22–27px tučné, takže vyhovuje. **12 dvojíc × 2 témy, 0 zlyhaní.**

**Doťahuje aj bod 4 (všetko klikateľné).** V predošlom hlásení som karty
v „Ponuky na inzerát" označil za vedomú výnimku, lebo ťuknutie nemalo kam
viesť. Spodný panel z mockupu ten cieľ **dal**, takže výnimka padá a
klikateľné je naozaj všetko.

**IDE OTA** okrem rozmazaného pozadia, ktoré potrebuje `expo-blur`
z buildu #4.

### 7.11 Dôkazy — ✅ OVERENÉ RUNTIME

| Test | Výsledok |
|---|---|
| `rental_test.py` — polia prenájmu a adresa proti živej DB | **12/12** |
| `rental_pure_test.js` — dátumy a riadky prenájmu | **18/18** |
| `demand_filter_test.py` — filtre nad dopytmi proti živej DB | **11/11** |
| `demand_parse_test.js` — rozbor vety hľadajúceho + popis filtra | **9/9** |
| `price_display_test.js` — čo je hlavné číslo po redizajne | **14/14** |
| kontrast nových dvojíc farieb (12 × 2 témy) | **0 zlyhaní** |
| `npx tsc --noEmit` | **0 chýb** |
| `npx expo export --platform ios` | **hotovo**, bundle 4,7 MB |

`rental_test.py` overuje aj to, čo NEMÁ ísť: neplatné „zariadenie", záporná
zábezpeka a neplatné „energie" vracajú **HTTP 400**, a cudzí používateľ
podmienky prenájmu **neprepíše**.

### 7.12 Verzia a OTA

**VYŽADUJE NOVÝ BUILD** — pribudol natívny modul `react-native-maps`.
`app.json`: `version 1.1.0 → 1.2.0`, `buildNumber 3 → 4`, plugin
`react-native-maps`. `runtimeVersion` je na politike `fingerprint`, takže
zvýšenie verzie **neodstrihne** existujúci build od OTA.

Všetko ostatné z tejto dávky (klávesnica, tlačidlo späť, safe area,
terminológia dopytov, polia prenájmu, kraj, klikateľné riadky) **IDE OTA** —
je to čistý JS.

### 7.13 Filter chips naprieč tabmi (bod 7) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

**Rozhodnutie Rastia 8.8.2026: možnosť B** — rovnaká lišta a rovnaká
mechanika ako v Nehnuteľnostiach, len slová prispôsobené dopytu. Možnosť C
(nechať Dopyty bez filtrov) výslovne odmietnutá.

**Ako je to spravené — jeden komponent, nie dva.** `SearchBar` dostal
`side: 'PROPERTY' | 'DEMAND'`. Mení sa VÝHRADNE pomenovanie:

| | `PROPERTY` | `DEMAND` |
|---|---|---|
| chips smeru | Predaj / Prenájom | **Kúpim / Hľadám prenájom** |
| príklad vety | „3-izbový byt v Petržalke do 250 tisíc" | „kúpim dom v Nitre do 200 tisíc" |
| popis sumy | „do 200 000 €" | **„ponúka do 200 000 €"** |

Typy nehnuteľnosti, textové hľadanie, rozbor slovenskej vety aj „Zrušiť"
sú tie isté. Druhý komponent by sa časom rozišiel a používateľ by sa musel
ovládanie učiť dvakrát.

**Kde je to netriviálne — NULL znamená „čokoľvek".** Dopyt s
`property_type = null` je „akýkoľvek typ", `budget_max = null` je „bez
hornej hranice". Keby ich filter na Byt odstrihol, majiteľ bytu by prišiel
práve o tých najochotnejších záujemcov. `useRequests` preto pri každom poli
používa `or (… is null)`:

```
property_type.eq.APARTMENT , property_type.is.null
budget_max.lte.200000      , budget_max.is.null
rooms_min.gte.3            , rooms_min.is.null
```

Výnimka je smer obchodu — „Kúpim" a „Hľadám prenájom" sa NEPREKRÝVAJÚ,
tam sa `or` nepoužíva.

**Dôkazy:** `demand_filter_test.py` **11/11** proti živej DB (vrátane troch
dopytov skonštruovaných presne na túto NULL-otázku), `demand_parse_test.js`
**9/9** (rozbor vety hľadajúceho + popis filtra pre obe strany).

**IDE OTA** — je to čistý JS, žiadny natívny modul.

### 7.15 PÁD pri prepnutí tabu — ✅ POTVRDENÉ POUŽÍVATEĽOM (8.8.2026)

Rastio na buildе #4: appka padala pri ťuknutí na spodné taby. Po oprave
a OTA potvrdil menovite: **„nepada"**.

**Hláška zo zariadenia:**

```
Error: cannot add `postgres_changes` callbacks for
realtime:notif-33fadff3-69a5-4b6f-9e62-cd6e554b8a05 after `subscribe()`.
    NotificationBell ← AppHeader ← PridatScreen
```

**Koreňová príčina** — odmeraná v `realtime-js` 2.112.2,
`RealtimeClient.channel()`, riadky 330–342:

```js
const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
if (!exists) { …vytvor nový… } else { return exists; }
```

`supabase.channel(topic)` **nevytvára nový kanál** — pri rovnakom názve
vráti ten už existujúci. `AppHeader` je na štyroch taboch naraz a taby
v expo-routeri ostávajú namontované, takže druhá hlavička dostala ten istý,
už pripojený kanál a zavolala naň `.on()`. Podmienka výnimky je
`isJoined() || isJoining()`, a `isJoining()` je `true` hneď po
`subscribe()` — preto stačilo prepnúť tab.

**Čo NEBOLO príčinou:** poradie `.on()` pred `.subscribe()`. To bolo
správne od začiatku, v jednej reťazi v jednom efekte. Rastiov tip mieril
na správne miesto, ale o úroveň vyššie.

**Oprava:** `NotificationsProvider` v koreni appky — jeden kanál, jedno
predplatné, jeden stav (rovnaký vzor ako `ProfileProvider`, ktorý v appke
už bol). Názov kanála má jednorazovú príponu ako poistka.

**Tri ďalšie chyby, ktoré tým zmizli** (neboli nahlásené):

- štyri rovnaké dotazy do DB — každá hlavička si ťahala oznámenia sama;
- rozchádzajúci sa stav — prečítanie správ nezhaslo zvonček v iných taboch;
- `removeChannel()` pri odmontovaní jednej hlavičky odstránil kanál aj
  ostatným, ktoré naň spoliehali.

**Dôkaz:** `realtime_test.js` **6/6** proti skutočnému
`@supabase/realtime-js`. Prvé tri testy reprodukujú pôvodnú hlášku
doslova vrátane toho istého `notif-33fadff3-…`, ďalšie tri dokazujú opravu.

**Trieda chyby.** Je to **piata chyba tej istej triedy**: stav, ktorý má
byť JEDEN, existoval N-krát. Predošlé štyri: tri inštancie `useProfile`
(2.11), lokálny stav zavretých tipov (6.5), `viewed_by_owner_at` bez
jedného zapisovateľa (7.15 rieši inak) a onboarding prezývky (BUG 0).
**Pravidlo do budúcna: čokoľvek, čo drží predplatné alebo zdieľaný stav,
patrí do providera v koreni, nie do komponentu, ktorý môže byť na
obrazovke viackrát.**

### 7.16 Prechod celého registra po dnešných zmenách — ✅ OVERENÉ RUNTIME

Rastio (8.8.2026): „Prejdi si CELÝ OFFERRA_REGISTER.md, over KAŽDÚ položku
označenú ✅."

Spustil som **všetkých 15 testovacích sád naraz** proti živej DB — teda
každý bod, ktorý je v registri ✅ vďaka automatickému dôkazu:

| Sada | Čo drží | Výsledok |
|---|---|---|
| `rls_test.py` | 1.8 RLS Fázy 1 | **15/15** |
| `rls_test_f2.py` | 2.4 otvorené pseudonymné ponuky | **25/25** |
| `flow_test.py` | 1.9 reťazec formulára cez REST | **10/10** |
| `fn_test.py` | 2.5 funkcie | **5/5** |
| `admin_test.py` | 3.6 nahlasovanie, moderovanie, admin | **24/24** |
| `hole_test.py` | 2.12 štyri diery v oprávneniach | **5/5, 0 dier** |
| `hole_test2.py` | 2.15 druhé kolo auditu | **6/6, 0 dier** |
| `avatar_test.py` | 1.7 Storage, 4.3 obľúbené | **8/8** |
| `rental_test.py` | 7.6 + 7.7 polia prenájmu a adresa | **12/12** |
| `demand_filter_test.py` | 7.13 filtre nad dopytmi | **11/11** |
| `viewed_test.py` | 7.17 razítko o pozretí | **10/10** |
| `rental_pure_test.js` | dátumy a riadky prenájmu | **18/18** |
| `demand_parse_test.js` | rozbor vety hľadajúceho | **9/9** |
| `price_display_test.js` | čo je hlavné číslo po redizajne | **14/14** |
| `realtime_test.js` | 7.15 pád pri prepnutí tabu | **6/6** |

**Spolu 178 testov, 0 zlyhaní.** Žiadny skorší ✅ bod sa dnešnými zmenami
nerozbil — vrátane tých, ktorých sa migrácia priamo dotkla (`property`
dostal 9 nových stĺpcov, `property_offer` jeden, `buyer_request` jeden).

**Nájdené regresie:** jedna jediná — pád v 7.15. Nič iné.

**Čo tento prechod NEDOKAZUJE.** Body, ktoré sú v registri 🟡, ostávajú 🟡:
sú to obrazovky a ich vzhľad a tie sa z terminálu overiť nedajú. Zoznam
toho, čo treba prekliknúť na telefóne, je v
`reports/FAZA_7_MAPA_A_OPRAVY.md`.

### 7.17 Countdown platnosti inzerátu — ✅ NIE JE REGRESIA, presunutý

Rastio hlásil, že countdown z `offer_deadline` na hlavnej stránke zmizol.
**Nezmizol.** Pri redizajne (7.14) som ho presunul z riadku pod cenou na
štítok priamo na fotke, vľavo dole — uzávierka je naliehavý údaj a v pätke
rozbíjala pomer 60/40. Používa ten istý `deadlineLabel`.

Overené dáta aj výpočet:

```
4 zo 7 zverejnených inzerátov MÁ uzávierku
2026-08-21 → „Ponuky do 21. augusta 2026 · ostáva 13 dní"
2026-09-21 → „Ponuky do 21. septembra 2026 · ostáva 44 dní"
```

**Moja chyba je v komunikácii, nie v kóde:** presun som nenapísal do
reportu, takže to vyzeralo ako stratená funkcia.

### 7.18 „[object Object]" v chybovom rámčeku — 🟡 OPRAVENÉ, ČAKÁ VIZUÁLNE OVERENIE

Rastio (8.8.2026, screenshot): na obrazovke „Podať ponuku" sa v chybovom
rámčeku zobrazilo doslova `[object Object]`.

**Koreňová príčina.** V appke bol **25× rozkopírovaný** vzorec

```ts
const m = e instanceof Error ? e.message : String(e);
```

Chyby zo Supabase **nie sú inštancie `Error`** — PostgREST vracia obyčajný
objekt `{ code, message, details, hint }`. Vetva `instanceof` neplatila,
spadlo to do `String(e)` a z objektu vyšlo `[object Object]`.

**Čo to naozaj bolo.** Rastio otvoril inzerát „Test videnia" — **môj
testovací záznam**. Testy ho po sebe upratali (overené, v DB nie je), ale
appka mala v zozname starú kópiu a server ponuku odmietol (`42501`).
Hlásenie tak odhalilo dve veci: nečitateľnú chybu **a môj neporiadok
v jeho katalógu**. Testovacie záznamy sa odteraz mažú v tom istom behu,
v ktorom vzniknú, a majú v názve `Test`.

**Oprava.** Jedna funkcia `errorText()` v `src/lib/errors.ts` namiesto
vzorca na kopírovanie. Surová hláška sa nikdy nezahadzuje (§2 chce celú
chybu), ľudský preklad kódu sa pripája nad ňu. Opravených **35 miest v 22
súboroch** — nielen formulár ponuky:

```
25×  e instanceof Error ? e.message : String(e)
 8×  ${String(e)} v logoch
 2×  lokálne kópie helpera `message()` v hookoch
```

V appke nezostalo **ani jedno** miesto s `String(e)`.

**Dôkazy:** `errors_test.js` **15/15** (tvary chýb sú skutočné odpovede
PostgRESTu, nie vymyslené) a `errors_live_test.py` **2/2**, ktorý vyvolá
presne tú situáciu zo screenshotu a surovú odpoveď prežene cez skutočný
`errorText()`.

**Trieda chyby.** Je to **šiesta chyba tej istej triedy** ako 7.15: to
isté rozhodnutie rozkopírované na N miest namiesto jedného spoločného
miesta. Predtým to bol zdieľaný stav, teraz formátovanie chyby.
**Pravidlo: keď sa ten istý štvorriadkový vzorec objaví tretíkrát, je to
funkcia, nie vzorec.**

### 7.19 Počítadlo fotiek + triedenie katalógu — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

**Počítadlo fotiek.** Rastio žiadal overiť kolízie a nerozhodovať sám
o natlačenom kompromise. Voľný bol pravý dolný roh, ale riešiť to druhým
absolútnym prvkom by bola chyba — text uzávierky je dlhý a na užšom
displeji by sa prekryli. Spodok fotky je preto **jeden riadok**
(`space-between`): uzávierka sa zmršťuje, počítadlo má pevnú šírku.

Vznikol spoločný **`PhotoBadge`** — uzávierka aj obe počítadlá sú teraz
jedna vizuálna rodina (rovnaké pozadie, zaoblenie, veľkosť). Líši sa len
farba textu a tá nesie význam: `muted` / `warm` / `urgent`.

V detaile je počítadlo **doplnok k bodkám, nie náhrada**, a **live sa
mení pri swipe** (stav `photo` sa už počítal kvôli bodkám).

**Triedenie.** Predvolené „od najnovšieho" v kóde UŽ BOLO — overené pred
zmenou, `useProperties` radilo `created_at desc`. Pribudlo „Čoskoro
končí" ako chip nad filtrami.

Netriviálna časť: obyčajné `order by offer_deadline asc` by dalo hore
inzeráty, ktorým termín **dávno vypršal** — presný opak urgencie. Triedi
sa preto v čistej funkcii `sortProperties` do **troch** skupín: bežiace
(od najskoršej), uplynuté, bez časovača (na konci).

**Dopyty prepínač NEMAJÚ** — `buyer_request` nemá `offer_deadline` ani
iný časový aspekt (overené v modeli). `SearchBar` ho vykreslí len keď mu
ho obrazovka podá.

Štítok uzávierky **červenie pri menej než 3 dňoch** (`SOON_DAYS`).

**Dôkaz:** `sort_test.js` **11/11**, `tsc` 0, `expo export` OK.

**Zásah do dát:** žiadny inzerát nekončil do 3 dní, takže červený štítok
by nebolo vidieť. Nastavil som uzávierku ~2 dni inzerátu „Svetlý
3-izbový byt s loggiou, Nitra" (demo účet, nie Rastiov).

### 7.20 Demo účet pre Apple review — ✅ OVERENÉ RUNTIME

`applereview@offerra.app`, odomkne sa **5 ťuknutiami na logo** (mechanizmus
v appke už bol). Prihlásenie overené naživo: HTTP 200, profil
`demo_ucet`, katalóg 9 inzerátov.

Obsah účtu: 2 inzeráty (predaj s uzávierkou + prenájom so **všetkými**
novými poľami), 6 fotiek, 4 ponuky naň z toho 1 PRIJATÁ aj s dotazníkom
nájomcu, 2 vlastné ponuky, 2 dopyty, 4 oznámenia.

**Vedomá odchýlka od MUTARKu.** MUTARK má demo heslo natvrdo v zdrojáku —
môže, jeho repo je private. Repo Offerry je **VEREJNÉ** a CLAUDE.md §4 to
zakazuje. Heslo ide cez `EXPO_PUBLIC_DEMO_PASSWORD` (EAS Environment
Variables). Recenzent má rovnakú skúsenosť (jedno ťuknutie), ale v gite
heslo nie je: overené — v bundli **1 výskyt**, v repe **0**.

Postup pozvania rodiny do TestFlightu (interní vs. verejný odkaz) je
v `reports/TESTFLIGHT_A_APPLE_REVIEW.md`.

### 7.21 „Coming soon" výplne — ✅ ODSTRÁNENÉ

Apple pri recenzii odmieta nefunkčné výplne (App Review 2.1). V
Nastaveniach boli chipy frekvencie so štítkom **„(čoskoro)"** — denný
a týždenný súhrn. Výber frekvencie sa už nezobrazuje vôbec: jedna
možnosť nie je výber. Za konštantou `DIGEST_READY`.

Zmazaný aj `screen-placeholder.tsx` (výplň z Fázy 0, nikde sa nepoužívala).

**Nechané zámerne:** vety „Offerra zatiaľ push upozornenia neposiela"
a „Oslovenie autor uvidí vo svojom profile". Nie sú to výplne, sú to
pravdivé vety o tom, ako appka funguje — skryť ich by znamenalo klamať.

---

## Fáza 8 — Súkromie správ, obhliadky, polia bytu (8.8.2026)

**Všetko IDE OTA** — nepribudol žiadny natívny modul, nemení sa `app.json`
ani verzia.

### 8.1 ÚNIK: správa pri ponuke bola verejná — ✅ OVERENÉ RUNTIME (19/19)

Hlásil Rastio zo screenshotu: `offer.message` bolo vidieť pri každej
ponuke komukoľvek.

**Príčina — a nebola tam, kde sa čakalo.** RLS `offer_select_public`
riadok púšťa von správne (ponuky sú zámerne otvorené). Diera bola
v grante:

```
grant select on offerra.property_offer to anon, authenticated   ← TABUĽKOVÝ
```

Tabuľkový grant sa v `information_schema.column_privileges` vypisuje pri
každom stĺpci zvlášť, takže na pohľad vyzerá rovnako ako stĺpcové granty
na `profile`. Rozdiel je v tom, že pri pridaní ďalšieho stĺpca sa nový
stane verejným automaticky.

**Prečo sa to nedalo opraviť v tej istej tabuľke:** Postgres nemá
per-riadkové maskovanie stĺpca. Tá istá ponuka má byť pre majiteľa celá
a pre cudzieho čiastočná — jedným `select` z tabuľky nevyjadriteľné.

**Oprava:**

```sql
revoke select on offerra.property_offer from anon, authenticated;
grant select (id, property_id, bidder_id, amount, status,
              created_at, updated_at, viewed_by_owner_at) …
offerra.offer_messages(p_property)  -- SECURITY DEFINER, podmienka na riadok vo funkcii
```

Zápis (`insert`/`update`) ostal nedotknutý — ponuka a jej správa naďalej
vznikajú JEDNOU vetou. Alternatíva „message do vlastnej tabuľky" (Rastiov
návrh) by znamenala dva zápisy a riziko ponuky bez správy.

**Vedľajší efekt, ktorý je prínos:** `select('*')` na `property_offer` už
neprejde (42501). Klient musí stĺpce vymenovať — `OFFER_PUBLIC_COLS`.
Ďalší citlivý stĺpec sa tým pádom nemôže zverejniť potichu.

**Trieda chyby — preverené dvojito, ako Rastio žiadal:** `tenant_profile`
ani `request_outreach` grant pre `anon` nemajú vôbec. Nebolo to plošné.

Dôkaz: 5 identít (anon, cudzí, vlastník, záujemca A, záujemca B) vrátane
pokusov uhádnuť obsah cez `message=ilike.*…*` a `order=message.asc` —
oboje 42501.

### 8.2 Obhliadky — ✅ OVERENÉ RUNTIME (23/23) / 🟡 obrazovka

Rozhodnutie Rastia: žiadne navrhovanie termínov. Jedno tlačidlo, okamžité
odkrytie kontaktu obom stranám, dohoda telefonicky.

Tabuľka `viewing` predtým **neexistovala** — nebolo čo orezávať.

```
id · property_id · requester_id · status · created_at · updated_at
unique (property_id, requester_id)
offerra.viewing_contact(p_viewing_id)   -- bez podmienky na stav, na rozdiel od offer_contact()
offerra.guard_viewing_update()          -- property_id/requester_id/created_at nemenné
ZIADOST_O_OBHLIADKU                     -- nový typ oznámenia
```

**Obhliadka NIE JE verejná** (na rozdiel od ponuky) — vlastné rozhodnutie,
pomenované v reporte: ponuka je súťaž, obhliadka je súkromná dohoda dvoch
ľudí.

**Otvorené na rozhodnutie Rastia:** stav `REQUESTED` je v číselníku, lebo
ho vymenoval v zadaní, ale v tomto toku sa naň nedá dostať — žiadosť
vzniká rovno ako `CONTACT_SHARED`. Jediná hodnota bez použitia.

`VIEWING_CONSENT` je konštanta, nie text v obrazovke — informovaný súhlas
sa nesmie dať zmeniť na jednom mieste a zabudnúť na druhom.

### 8.3 Placeholder podľa SALE/RENT — 🟡 ČAKÁ VIZUÁLNE OVERENIE

Pri tom opravený aj popisok: pri prenájme hovoril „Správa pre
**predávajúceho**". Pribudla veta, že správu vidí len druhá strana (nová
pravda z 8.1).

### 8.4 Polia bytu + internet — ✅ OVERENÉ RUNTIME (dáta) / 🟡 formulár

`floor`, `floors_total`, `has_elevator`, `monthly_costs` →
**do `property`, nie do tabuľky pre nájom**: sú to vlastnosti BUDOVY,
kupca zaujímajú rovnako ako nájomcu. `internet_included` je jediné, čo je
naozaj len o nájme.

Check constraints: `floor` −5…200, `floors_total` 1…200, `floor ≤
floors_total` („7. z 5" DB nepustí), `monthly_costs ≥ 0`.

Suterén je dôvod, prečo `Field` prijíma aj `numbers-and-punctuation` —
`numeric` na iOS nemá mínus.

### 8.5 Počet osôb pri prenájme NEBOL povinný — ✅ OVERENÉ RUNTIME

Rastiova obava bola oprávnená, zmerané pred zásahom:

```
tenant_profile.num_people  is_nullable = YES
19 dotazníkov, z toho 4 BEZ počtu osôb
```

Opravené v appke **aj** v DB (`tenant_num_people_required`, `NOT VALID` —
štyri staré riadky sa nedopĺňajú, vymyslený údaj je horší než chýbajúci).

### 8.6 Prezývka vlastníka na detaile — 🟡 ČAKÁ VIZUÁLNE OVERENIE

`useProperty` ťahá `owner:owner_id(nickname, avatar_url)` jedným dotazom.

### 8.7 Orezaný text v mriežke — 🟡 PRÍČINA NÁJDENÁ

**Prečo predošlá oprava nezabrala:** riešila šírku bunky. Skutočná príčina
bolo `numberOfLines={1}` v `ParamCell`. „1 600 € (2× mesačný nájom)" sa na
jeden riadok do polovičnej bunky nezmestí pri ŽIADNEJ šírke — šírka teda
nemohla pomôcť nikdy.

Teraz sa text smie zalomiť a hodnota dlhšia než 16 znakov si berie celý
riadok (`PARAM_WIDE_AT`).

### 8.8 Regresný prechod — ✅ OVERENÉ RUNTIME, 261 testov, 0 zlyhaní

Zmena grantov na `property_offer` vie potichu rozbiť čokoľvek, čo z tej
tabuľky číta, preto prešlo všetko:

```
admin 24 · avatar 8 · dopyty 11 · diakritika 13 · e-mail 7 · chyby 2
flow 10 · funkcie 5 · diery 5 · prenájom 12 · RLS 15 · vek 4 · videnie 10
správa 19 · obhliadka 23 · dopyt-parse 9 · chyby-js 15 · cena 14
realtime 6 · prenájom-čistý 18 · triedenie 11 · budova 20
```

Tri suity najprv spadli — **neboli to regresie appky**, testy robili
`POST … return=representation` bez výberu stĺpcov, teda presne to, čo sa
utesnilo. Appka to nikde nerobí (`.select('id')`).

### 8.9 Moje testovacie inzeráty ostali v ŽIVOM katalógu — ✅ NAPRAVENÉ

Pri prechode sa ukázalo, že v katalógu sedia štyri moje záznamy („Test
videnia" ×2, „Diera test", „Test email kontakt"). Ostali tam, keď testy
spadli uprostred a nedobehli po sebe upratovanie.

**Je to druhýkrát** (prvý raz „Test videnia" pri bode 7.18).

Zmazané (overené, že všetky štyri patria `@offerra.test` účtom).
Upratovanie presunuté zo záveru testu do samostatného kroku, ktorý beží
**aj keď test spadne** — príčina nebola zabudnutie, ale umiestnenie
upratovania tam, kam sa pri páde nedôjde.

**Pravidlo do budúcna:** upratovanie po teste nesmie závisieť od toho, či
test dobehol.

---

## Fáza 9 — Realitky, vzhľad, dve vážne chyby (8.8.2026)

**Všetko IDE OTA.**

### 9.1 🔴→✅ REGISTRÁCIA BOLA NEPREJDITEĽNÁ — chyba z Fázy 8

Pri práci na deklarácii fyzickej osoby sa ukázalo, že v `prezyvka.tsx`
**JSX zaškrtávacieho políčka 18+ vôbec neexistovalo**. Stav `adult` bol
založený, `submit()` ho vyžadoval, ale políčko sa nevykreslilo — takže
`adult` ostal navždy `false` a **žiadny nový používateľ nedokončil
registráciu**. Bolo to už nasadené v OTA.

Zaviedol som to ja v dávke „vek 18+" a nikto to nechytil, lebo dôkazom
bol test proti DB (stĺpec sa zapisuje správne), nie obrazovka.

**Poučenie:** DB test dokazuje, že sa hodnota dá uložiť. Nedokazuje, že
ju má používateľ ako zadať. To je presne ten zákaz odvodzovania B z A
(§1) — len obrátený.

Oprava: nový zdieľaný komponent **`CheckRow`** v `ui.tsx`. Ručne skladaný
`Pressable` + `View` + dva `Text` sa dá omylom nedopísať; komponent nie.

### 9.2 🔴→✅ APPKA UVIAZLA V TMAVOM REŽIME

Hlásil Rastio zo screenshotu. `useTheme()` čítal výhradne
`useColorScheme()` zo systému a manuálny prepínač neexistoval — kto mal
tmavý telefón, nemal sa ako vrátiť na schválenú svetlú paletu.

Nový `ThemeProvider` (`use-theme.tsx`) s voľbou **Svetlý / Tmavý /
Podľa telefónu**, uloženou v `AsyncStorage`, prvá karta v Nastaveniach.

**Rozhodnutie, ktoré som spravil sám:** predvolené je `light`, nie
`system`. Dôvod: CLAUDE.md §5 — Offerra je light-first a schválená paleta
je svetlá. `system` by znamenalo, že väčšine ľudí s tmavým telefónom sa
ukáže podoba, ktorú nikto neschvaľoval.

**K obave „tmavá je len invertovaná svetlá":** nie je. `tokens.ts` má
tmavú ako **teplé uhlie** `#161311` / `#211D1A` s terakotou, zámerne
odlíšenú od mutarkovskej studenej `#0B1020`. Kontrast bol overený už vo
Fáze 7.14 — 12 dvojíc × 2 témy, 0 zlyhaní. Vizuálne potvrdenie je ale na
Rastiovi.

### 9.3 Nový dôvod nahlásenia „REALITKA" — ✅ OVERENÉ RUNTIME

Číselník dôvodov je spoločný pre všetky ciele, cieľ drží samostatný
stĺpec — jeden zápis teda pokryl inzerát **aj** používateľa. Overené
zvlášť pre `PROPERTY` aj `USER`.

V admin konzole pribudol **filter dôvodov s počtami** (chipy nad
zoznamom). Filtruje sa na klientovi — 200 riadkov je málo na to, aby to
stálo za ďalší dotaz.

### 9.4 Deklarácia fyzickej osoby — ✅ OVERENÉ RUNTIME

`profile.agent_declaration_at` (čas, nie boolean — pri spore je podstatné
KEDY). Pri registrácii, nie pri prvom inzeráte: registrácia už rovnaký
vzor má a pokrýva všetkých, nielen inzerentov.

**Našlo sa pritom, že `my_profile()` nevracala ani `age_confirmed_at`** —
typ `MyProfile` teda tvrdil niečo, čo v dátach nikdy nebolo. Opravené,
funkcia teraz vracia obe pečiatky.

Text v `legal.ts` doplnený o celú sekciu „Len fyzické osoby vo vlastnom
mene" + zákaz zakladania viacerých účtov na obídenie limitu. Web
`rastioeu/offerra_web` prepísaný a **pushnutý** (commit `22d8e51`).

### 9.5 Limit aktívnych inzerátov — ✅ OVERENÉ RUNTIME

`offerra.app_config` (kľúč, hodnota, štítok, hint) + `config_int()` +
`admin_set_config()`. Default **5**, meniteľné z admin konzoly, sekcia
**Nastavenia**.

Vynucuje `enforce_active_limit` trigger na INSERT **aj** UPDATE — inzerát
sa vie stať aktívnym oboma cestami. `0` = bez limitu. Koncepty sa
nepočítajú, archivácia miesto uvoľní.

Overené aj to podstatné: **zmena hodnoty zaberie okamžite, bez nového
buildu** (limit 2 → tretí padne → limit 3 → ten istý prejde).

### 9.6 Admin heuristiky — ✅ OVERENÉ RUNTIME (stihnuté, nie 🟡)

`admin_top_listers()` a `admin_duplicate_contacts()`. Druhá porovnáva
telefón po odstránení nečíselných znakov a e-mail **bez `+`-časti**
(`jan+offerra1@` = `jan+offerra2@` je ten istý účet).

Sú to signály na ručnú kontrolu, nie automatický ban — dve osoby
v jednej domácnosti majú tiež jeden telefón. Napísané je to aj
v obrazovke.

### 9.7 „Počet zobrazení" — odpoveď na Rastiovu otázku

Meraním: **v Profile → Moje inzeráty naozaj nebol.** `view_count` je
v modeli od Fázy 1 a zobrazoval sa výhradne na detaile inzerátu.

Doplnený do riadku „Moje inzeráty" spolu s počtom ponúk. Do katalógu
zámerne NIE — cudzieho človeka nezaujíma, koľkokrát niekto videl inzerát.

### 9.8 Chyba, ktorú našlo až upratovanie po teste — ✅ OPRAVENÉ

`app_config.updated_by` mal cudzí kľúč **bez `on delete`**. Admin, ktorý
raz zmenil nastavenie, by si už **nevedel zmazať účet** —
`delete_my_account()` by padlo na 23503. Zmenené na `on delete set null`.

Našlo sa to len preto, že testovací harness prestal prehĺtať chyby z
Management API: vracia ich ako objekt s kľúčom `message`, nie nenulovým
exit kódom, takže zlyhaný príkaz vyzeral ako prázdny výsledok.
**Tichý catch bol v mojom vlastnom nástroji.**

### 9.9 Dôkazy — 282 testov, 0 zlyhaní

```
admin 24 · avatar 8 · dopyty 11 · diakritika 13 · e-mail 7 · chyby 2
flow 10 · funkcie 5 · diery 5 · prenájom 12 · RLS 15 · vek 4 · videnie 10
správa 19 · obhliadka 23 · realitky 21
dopyt-parse 9 · chyby-js 15 · cena 14 · realtime 6 · prenájom-čistý 18
triedenie 11 · budova 20
```

Päť zlyhaní v priebehu bolo v MOJICH testoch, nie v appke — a jedno
z nich odhalilo skutočnú vec: **RLS nepustí vložiť inzerát rovno ako
`ACTIVE`.** Inzerát vzniká ako koncept a zverejní sa až úpravou. Test to
teraz robí tou istou cestou ako appka.

### 9.10 Otvorené — čaká na Rastia

- **GitHub Pages** — ani jeden z troch tokenov nemá `pages=write`.
  GitHub to hovorí sám: `x-accepted-github-permissions: pages=write,
  administration=write`. Riešenie je jedno kliknutie v Settings → Pages.
- **`.claude/` v `.gitignore`** — pridať pri najbližšom natívnom builde,
  vtedy sa fingerprint mení tak či tak (viď `reports/FINGERPRINT_A_OTA.md`).

---

## Fáza 10 — Uzavretie obchodu a hodnotenia (8.8.2026)

### 10.0 🔴→✅ BLOKUJÚCE: katalóg padal na RLS rekurziu

Hlásil Rastio zo screenshotu: `42P17 infinite recursion detected in
policy for relation "property"`, celý katalóg prázdny.

**Príčinou NEBOL limit inzerátov**, ako znel tip — ten je trigger, nie
politika. Vinník bola politika `property_select_closed_parties` z tejto
istej fázy (mig 20):

```
property        → politika sa pýta property_offer
property_offer  → offer_select_public sa pýta property
property        → tá istá politika znova → cyklus
```

Cyklus vedie **cez druhú tabuľku**, preto nie je vidieť pri čítaní jednej
politiky.

Oprava: vnútorné čítanie vytiahnuté do `SECURITY DEFINER` funkcie
`i_have_offer_on()` — beží ako vlastník tabuľky, RLS sa naň neuplatňuje.
Rovnaký vzor ako `is_admin()` a `offer_contact()` od Fázy 2.

**Do aplikačnej logiky sa to NEPRESÚVALO** (Rastio to ponúkal ako
možnosť): nie je to kontrola limitu, ale otázka „smie tento človek vidieť
tento riadok?", a tá do RLS patrí. Odstrániť treba cyklus, nie pravidlo.

**Prečo to neodhalili testy — a je to to podstatné.** Po migrácii som
overil dotaz **anonymne** a dostal 200. Politika mieri na `authenticated`,
takže anonymný dotaz sa k nej vôbec nedostane. Overil som teda niečo iné,
než čo bolo treba.

> **PRAVIDLO:** každú novú RLS politiku overiť identitou, na ktorú MIERI.
> „Funguje neprihlásenému" nedokazuje „funguje prihlásenému".

Nový trvalý test `rls_recursion_test.py` — **21/21**: všetkých 16 tabuliek
× 3 identity + 3 zápisy + menovite katalóg. Previerka ostatných politík
z predošlej dávky: `report_insert_own` a `config_read` bez podotázky,
`rating_insert_party` ide cez `can_rate()` (SECURITY DEFINER),
`viewing_*` sa pýta `property`, ale `property` sa na `viewing` nepýta —
cyklus nikde.

### 10.1 Uzavretie obchodu — ✅ OVERENÉ RUNTIME (dáta)

Jeden stav `CLOSED` pre predaj aj prenájom; slovo („Predané"/„Prenajaté")
vyrába `transaction_type`. Dva stavy by boli dve miesta, kde sa dá
zabudnúť na jedno z nich.

`offerra.close_deal(property, offer, final_amount)` — jedna funkcia, nie
štyri dotazy z appky: mení stav inzerátu, víťaznú ponuku, konečnú sumu
a **uzavrie ostatné čakajúce ponuky**. Pád medzi dotazmi by nechal obchod
v polovici a ľudí čakať na rozhodnutie, ktoré už padlo.

`p_offer_id` smie byť `null` — obchod sa dá uzavrieť aj mimo Offerry
a zamlčať to by znamenalo, že inzerát visí naveky.

### 10.2 Hodnotenia — ✅ OVERENÉ RUNTIME (dáta)

`offerra.rating`, jedno hodnotenie na obchod (`unique (property_id,
rater_id)`), 1–5 hviezdičiek, komentár do 500 znakov.

**Rozhodnutie — PREHODNOTENÉ Rastiom 9.8.2026.** Navrhoval som text ako
súkromný (obava z osočovania). Rastio rozhodol, že **hodnotenie je celé
verejné — hviezdičky aj text**, a jeho dôvod je silnejší: zmyslom
hodnotení je dôvera pre BUDÚCICH záujemcov, ktorí zvažujú obchod
s konkrétnym človekom. Tým priemer sám nestačí; potrebujú kontext, nie
číslo.

Proti osočovaniu stojí **nahlasovanie a moderovanie**, nie skrývanie —
appka oboje má.

Prepnutie bolo čisté: v tabuľke bolo **NULA hodnotení**, takže nikto nič
nenapísal pod predošlým sľubom súkromia. Overil som to PRED zmenou; keby
tam niečo bolo, spätné zverejnenie by nebolo prijateľné a riešilo by sa
inak.

Zobrazujú sa v novej karte **`Reviews`** pri inzeráte — teda tam, kde sa
niekto rozhoduje, či s tým človekom obchodovať. V profile, kam cudzí
nechodí, by nikomu nepomohli.

`can_rate()` je SECURITY DEFINER a rozhoduje DB, nie appka — obrazovka sa
nepýta „som vlastník?", takže sa nedá dostať do stavu, keď ponúka niečo,
čo server odmietne.

---

## Fáza 11 — Modály, Moje inzeráty, nahlásenie realitky (9.8.2026)

### 11.0 PROCESNÉ ZLYHANIE — zadanie, ktoré neskončilo v registri

Rastio sa pýtal, prečo špecifikácia „Moje inzeráty" (5 bodov) prešla ako
hotová, keď hotová nebola.

**Odpoveď faktom:** tá špecifikácia v registri **nie je vôbec** a
v prepise session sa nenašla ani doslovným hľadaním („miniatúra",
„ostáva X dní", „pomer ponúk" → 0 zhôd). Nikdy nebola označená za hotovú
— dnešný report hovoril výslovne len o počte zobrazení a ponúk. Najbližšie
tomu je moja vlastná návrhová poznámka v
`reports/MUTARK_PRIESKUM_VEK_A_WEB.md:147`.

**Príčina je moja:** §6 hovorí, že register sa dopĺňa priebežne. Zadanie,
ktoré do registra nezapíšem, sa pri kompakcii kontextu stratí a niet ho
kde nájsť.

> **PRAVIDLO:** každé prijaté zadanie dostane riadok v registri HNEĎ, pred
> začiatkom práce — nie až s výsledkom. Register je jediná pamäť, ktorá
> prežije kompakciu.

### 11.1 Hlavička modálov pod dynamic islandom — ✅ KOREŇOVÁ PRÍČINA

Rastio to hlásil **druhýkrát**, na inej obrazovke. Predošlá oprava bola
lokálna, preto sa to vrátilo.

**Koreňová príčina:** `SafeAreaView` z `react-native-safe-area-context`
**vnútri `<Modal>` nedostane správne odsadenie** — modál sa na iOS
vykresľuje vo vlastnej natívnej hierarchii MIMO `SafeAreaProvider`,
kontext k nemu nedosiahne a insety vyjdú nula. A keďže je „Zavrieť"
prekryté, nedá sa naň ani ťuknúť — čo bola Rastiova druhá otázka. Jedna
príčina, dva symptómy.

Netýkalo sa to jednej obrazovky: **tri modály** (nahlásenie vo všetkých
troch podobách, výber obce, oslovenie k dopytu) mali každý vlastnú
hlavičku a rovnakú chybu.

Oprava: jeden zdieľaný **`ModalScreen`**. Odsadenie berie z
`useSafeAreaInsets()` volaného v bežnom strome (pod providerom) a do
modálu ho odovzdá ako obyčajný `paddingTop`. Hlavička má **dve cesty
von** — šípku vľavo a „Zavrieť" vpravo.

Zvyšné dva `<Modal>` sú priehľadné prekrytia (podržanie prsta, spodný
panel), hlavičku hore nemajú a spodný panel insety už čítal správne.

Dôkaz je **štrukturálny** (`modaly_test.js`, 16/16): žiadny `<Modal>` už
neobsahuje vlastný `SafeAreaView`, všetky tri celoobrazovkové používajú
`ModalScreen`. Test padne aj vtedy, keď niekto v budúcnosti pridá štvrtý
modál po starom. **Vizuálne overenie je na Rastiovi** — že hlavička sedí
pod ostrovčekom, sa z kódu dokázať nedá.

### 11.2 „Moje inzeráty" — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Riadok doteraz ukazoval „názov · mesto · N fotiek" — teda MENEJ, než vidí
cudzí človek v katalógu. Nový `MyListingRow` nesie:

| | |
|---|---|
| miniatúra | prvá fotka, alebo náhrada „bez fotky" |
| peniaze | najvyššia ponuka (terakota) — inak orientačná cena, pri uzavretom konečná suma |
| ponuky | „3 ponuky" / „Zatiaľ žiadne ponuky" + „N čaká na teba" |
| zvýraznenie | čakajúce ponuky → terakotový obrys a podfarbenie |
| odpočet | `deadlineLabel` + farba podľa naliehavosti |
| štatistika navyše | počet zobrazení **a konverzia** „X % z pozretí ponúklo" |

**Rozhodnutia, ktoré som spravil sám:**
- Konverzia sa pri menej než 5 pozretiach **nezobrazuje** — z troch
  návštev percento nič nehovorí. Je to jediné číslo, ktoré vlastníkovi
  povie, či je problém v návštevnosti alebo v cene.
- Ťuknutie vedie k **ponukám** pri `ACTIVE`/`CLOSED` a k **úprave** pri
  koncepte — na koncepte niet čo spravovať.
- Preto do hlavičky „Ponuky na inzerát" pribudlo **„Upraviť"**; bez neho
  by k zverejnenému inzerátu neviedla žiadna cesta.

`attachOfferStats` počíta navyše `pending_count` — prijatá ponuka už nič
nečaká a zvýraznenie si nezaslúži.

Dôkaz čistých funkcií: `riadky_test.js` **11/11** (slovenské skloňovanie
1/2/5 ponúk, prah konverzie).

### 11.3 Tlačidlo „Nahlásiť realitku" — 🟡 KÓD HOTOVÝ

`ReportButton` dostal `presetReason`. Tlačidlo je pri prezývke v zozname
ponúk aj na detaile inzerátu a mieri na POUŽÍVATEĽA, nie na inzerát —
realitka sa pozná podľa toho, kto inzeruje.

Každé otvorenie sa vracia na predvolený dôvod, nie na ten, čo ostal
z predošlého nahlásenia v tej istej relácii. Prepnúť sa dá naďalej;
je to predvoľba, nie zámok.

### 11.4 Zámok inzerátu po prijatí ponuky — ✅ OVERENÉ RUNTIME (16/16)

Zadanie Rastia 9.8.2026. Trigger `guard_property_locked` na `property`:
keď existuje ponuka v stave `ACCEPTED`, obsahové polia sa už nezmenia.

**Prečo trigger a nie RLS politika:** RLS vie povedať „na tento RIADOK
nesmieš", nie „tieto STĹPCE nesmieš, tamtie áno". Rozlíšiť zmenu stavu od
zmeny ceny vie len trigger, ktorý vidí `old` aj `new`.

Povolené aj po zamknutí: `status`, `closed_at`, `closed_offer_id`,
`final_amount`, `updated_at`, `view_count` — teda presne to, čo mení
**„Uzavrieť obchod"**. Overené, že `close_deal()` prejde aj so zámkom;
keby ho zámok blokoval, dohodnutý obchod by sa nedal dotiahnuť do konca.

**Rozhodnutie o fotkách (moje, zdôvodnené):**

| | | |
|---|---|---|
| pridať fotku | **povolené** | nemení cenu, podmienky ani ktorá nehnuteľnosť to je; kupujúci si pred podpisom často vypýta ďalšie zábery |
| zmazať fotku | **zakázané** | odstraňuje dôkaz o tom, ako vec vyzerala v čase dohody — presne to riziko, ktorému má zámok brániť |
| prepísať URL / poradie | **zakázané** | je to prepísanie existujúcej fotky, nie doplnenie novej |

Riešené `restrictive` politikami na `media` (delete + update).

**Dôležitý vedľajší nález:** `restrictive` RLS pri DELETE vráti **HTTP 204
a nezmaže nič**. V appke by to bolo „nestane sa nič", čo §2 zakazuje.
Preto sa pri zámku krížik na fotke **vôbec nezobrazí** a nad formulárom je
pás s vysvetlením, čo sa dá a čo nie.

### 11.5 Spätná väzba po akcii — ✅ ŠTRUKTURÁLNE OVERENÉ (20/20)

Zadanie Rastia 9.8.2026: jednotná odozva po každej akcii + kontextové
vysvetlenia.

**Zoznam toho, čo odozvu NEMALO — nahlásený, nie mlčky opravený:**

| Akcia | Stav pred |
|---|---|
| Srdiečko (obľúbené) | len animácia; po úspechu nič |
| Chcem obhliadku / Bol som na obhliadke / Zrušiť | nič |
| Hodnotenie | vlastný inline text, iný než všade inde |
| Uložiť koncept inzerátu | nič — tlačidlo len prestalo byť zaneprázdnené |
| Uložiť profil | nič |
| Zmeniť profilovku | nič |
| Zverejniť dopyt | nič |
| Prepínače upozornení | nič (ponechané — viď výnimky) |

**Zavedené pravidlo:**

- **Toast** = akcia PREBEHLA. Krátke, samo zmizne, nič nepýta.
- **Alert** ostáva na POTVRDENIE pred nezvratným krokom a na CHYBU.

Dôvod: modálne okno s tlačidlom OK zastaví človeka uprostred práce kvôli
správe, ktorú netreba odklikávať. Pri srdiečku je to trest za používanie
appky. Nezvratná vec (zmazanie účtu) si naopak okno zaslúži — toast, ktorý
za dve sekundy zmizne, je na to málo.

`ToastProvider` je v koreni, `useToast()` všade inde. To isté rozhodnutie
na N miestach je trieda chyby, ktorá nás už stála zvonček (7.15)
aj chybové hlášky (7.18).

**Výnimky — každá s dôvodom** (výnimka bez dôvodu je diera, ktorá sa tvári
ako pravidlo):

| Miesto | Prečo bez toastu |
|---|---|
| prepínače upozornení | prepínač SÁM je odozvou; pri zlyhaní sa vráti a ukáže chybu |
| pridanie/zmazanie fotky | fotka sa objaví/zmizne v zozname |
| zavretie tipu | tip zmizne |
| založenie konceptu | rovno otvorí editor — navigácia je odozva |
| `bump_view` | automatické počítadlo, nie akcia používateľa |

**Kontextové vysvetlenia doplnené:** Pridať, Nový dopyt, formulár inzerátu,
Nastavenia → Účet, a všetky tri sekcie admin konzoly (čo presne znamená
„Zablokovať", „Skryť z katalógu", „Označiť ako riešené"). Hodnotenie
a obhliadka ich mali už predtým — boli to vzory, podľa ktorých sa písali
ostatné.

Dôkaz `odozva_test.js` **20/20**: prejde každý súbor, ktorý zapisuje do DB,
a stráži, že má odozvu. Padne aj vtedy, keď niekto pridá zápis bez nej.

### 11.6 Uložené vyhľadávanie — ✅ OVERENÉ RUNTIME (13/13)

`offerra.saved_search`. **Filter sa ukladá ako `jsonb`, nie rozložený na
stĺpce** — je to ten istý objekt, aký drží katalóg (`CatalogFilter`).
Rozložiť ho na stĺpce by znamenalo držať ten istý tvar na dvoch miestach
a pri každom novom filtri meniť schému.

**Súkromné.** To, čo človek hľadá, prezrádza o ňom viac než jeho inzeráty
— koľko má peňazí, kam sa sťahuje. RLS `for all` len na vlastníka;
overené, že cudzí ho ani nevidí, ani nezmaže, ani nezaloží v cudzom mene.

`last_seen_at` drží, odkedy sa počítajú „nové". Otvorenie hľadania ho
posunie a odznak zhasne.

**Počet nových sa počíta ROVNAKÝM dotazom, aký používa katalóg.** Keby mal
vlastnú kópiu podmienok, číslo by časom prestalo sedieť so zoznamom, ktorý
sa po ťuknutí otvorí — a to je horšie než žiadne číslo.

Lišta je **nad katalógom, nie v Profile**: hľadanie sa ukladá aj používa
v tom istom okamihu a na tom istom mieste. V Profile by si ho nikto
neotvoril.

Pri práci sa našla vlastná duplicita — napísal som `isEmptyFilter()`,
hoci `isFilterEmpty()` v `search.ts` už existovala. Zmazané.

### 11.7 História cien — ✅ OVERENÉ RUNTIME (10/10)

`offerra.price_history`, zapisuje **trigger**, nie appka.

**Prečo verejná:** orientačná cena je verejná od začiatku a jej ZMENA je
informácia rovnakej povahy. Keby verejná nebola, dalo by sa týždeň pred
uzávierkou ticho zdvihnúť cenu a záujemcovia by ponúkali proti niečomu,
čo sa im pod rukami zmenilo.

**Nedá sa podvrhnúť.** Nikto — ani vlastník inzerátu — nemá `insert`,
`update` ani `delete` grant. Overené všetkými tromi. Inak by to nebola
história, ale ďalšie pole, ktoré si vlastník upraví.

Koncept sa nezaznamenáva: kým inzerát nikto nevidí, ladenie ceny je šum,
nie história.

Na detaile je **jedna veta pri cene**, nie zoznam: „Znížená z 200 000 €
o 20 % · 3× menená". Zníženie zelené, zvýšenie oranžové.

### 11.8 Overený odznak — ✅ OVERENÉ RUNTIME (9/9)

**Rozhodnutie, ktoré tu bolo treba spraviť:** odznak „overený" pri
niekom, koho nikto neoveril, je LOŽ. Preto sa nedá získať automaticky
(počtom obchodov, vekom účtu) ani si ho nastaviť sám.

- Udeľuje ho **výhradne správca** cez `admin_set_verified()`.
- **Bez poznámky ho DB neprijme** — musí byť napísané, ČO bolo overené.
- Tá veta sa zobrazuje ľuďom **vedľa odznaku**. Odznak, ktorý nevie
  povedať, na základe čoho vznikol, je pri nehnuteľnostiach nebezpečná
  ozdoba.
- Odznak **nič neodkrýva** — overené, že meno a telefón ostávajú
  chránené stĺpcovým grantom rovnako ako predtým.

Overené, že si ho nenastaví ani sám používateľ, ani cudzí, ani cez admin
funkciu bez roly ADMIN.

### 11.9 Ulice z Registra adries MV SR — ✅ OVERENÉ RUNTIME (15/15)

Rastio nechal výber zdroja na mne. **Nerobil som prieskum druhýkrát** —
paralelná vetva (worktree `ulice-ra-import`, commit `566ccc1`) ho už mala
spravený a bol dôkladný. Meraním som zistil, že **tabuľka `street`
v databáze neexistovala** — teda prieskum a importér existovali, ale import
nikdy nebežal. Prácu som prevzal a dotiahol.

**Zvolený zdroj: Register adries MV SR** (`data.slovensko.sk`), nie OSM.
Dôvod z prieskumu, ktorý som overil: slovenské adresy v OSM **pochádzajú
z toho istého registra** (import `Sk:MinvSKAddress`), takže OSM je tá istá
pravda z druhej ruky a o krok staršia. Nominatim za behu je vylúčený —
limit 1 dotaz/s a autocomplete majú priamo v zakázaných spôsoboch použitia.

```
31 314 ulíc · 767 obcí · Bratislava 1 991 · Košice 953
```

Čísla sedia s prieskumom presne (31 165 + 149 ulíc z piatich doplnených
obcí).

**Bratislava a Košice sa zrkadlia:** register vedie ulice pod mestskými
časťami, náš číselník má aj mesto ako celok. Bez zrkadlenia by mala
Bratislava **0 ulíc** a človek, ktorý si vyberie „Bratislava", by nedostal
nič.

**Vedľajší nález:** v `offerra.city` chýbalo **päť platných obcí** —
Bojnice, Dudince, Sklené Teplice, Mužla, Veľké Kapušany. **V nich sa
nedal založiť inzerát vôbec.** Doplnené, súradnice z Wikidata (ten istý
zdroj ako zvyšok číselníka).

Appka pri písaní **nechodí na žiadne externé API** — číta len vlastnú
tabuľku, cez prefixový index `text_pattern_ops` (overené `explain`:
Index Scan, nie seq scan).

Ulica ostáva **nepovinná a voľne písateľná** — číselník ju nemusí poznať
(nová ulica, dedina bez pomenovaných ulíc). Našeptávanie je skratka, nie
zámok. Preto pole, nie modál ako pri obci.

### 11.10 ⚠️ ROZPOR: paralelná vetva s prácou, ktorá nie je na `main`

Pri hľadaní ulíc som našiel worktree `.claude/worktrees/ulice-ra-import`
so **štyrmi commitmi, ktoré na `main` nie sú**:

```
21a5d93  obhliadky (cely flow) + explainer, ikona a oznamenia
886fc8a  filter Oblubene, podsvietenie loga a vygenerovane avatary
21df3bb  orezany text v mriezke + sklonovanie pri hladani obce
566ccc1  ulice z Registra adries          ← toto som prevzal
```

**Obhliadky, uzavretie obchodu a hodnotenia sú tam spravené DRUHÝKRÁT,
inak než na `main`** (`lib/viewings.ts` vs. moje `lib/viewing.ts`,
`lib/ratings.ts` vs. `lib/rating.ts`, `components/my-property-row.tsx`
vs. moje `my-listing-row.tsx`). Ich SQL sa do databázy **nikdy
neaplikovalo** — moje migrácie `create table` prešli, čo dokazuje, že tie
tabuľky predtým neexistovali.

**Nezlučoval som to sám** — je to presne ten prípad rozporu medzi dvoma
vetvami práce, pri ktorom mám podľa zadania napísať a nehádať.

Čo je vo vetve navyše a na `main` chýba: **filter Obľúbené**, **generované
avatary**, **podsvietenie loga**, **skloňovanie pri hľadaní obce**
(„v Petržalke" → „petrzalka") a **časová os cien**. To sú veci, ktoré
duplicitné nie sú a stálo by za to ich prebrať.

### 11.11 Audit celej appky — 62/66 bodov, 2 skutočné diery

Rastio si vyžiadal prechod bod po bode s dôkazom. Audit číta **kód a
databázu**, nie moju pamäť (`audit.js`). Celý výsledok je
v `reports/AUDIT_9_8_2026.md`.

**Dve skutočné diery, obe dorobené (13/13):**

1. **Uzavretie obchodu nikomu nič nepovedalo.** Ponuky sa ticho menili na
   `REJECTED` — človek by ďalej čakal na rozhodnutie, ktoré padlo. Správa
   zámerne **neobsahuje meno ani sumu víťaza**: suma je v zozname verejná,
   ale poslať ju do oznámení je porovnanie, o ktoré nikto nepožiadal.
2. **Uložené vyhľadávanie nemalo notifikáciu pri zhode** — len počítadlo.

**Dve „diery", ktoré boli chyby auditu:** hlásil `instanceof Error`
z komentára v `errors.ts` (ukážka STARÉHO vzoru) a hľadal DB funkciu
`i_have_offer_on` v `src/`.

⚠️ **Vedomá duplicita:** podmienky filtra sú teraz v TypeScripte (katalóg)
aj v SQL (notifikácia o zhode). SQL nevie zavolať JS. Hlásim to, lebo je
to presne tá trieda, pred ktorou tu stále varujem — a preto je na to test.

### 11.12 Logo v tmavej téme a glow — ✅ ZMERANÉ

Navy `#103A6B` na tmavom povrchu `#211D1A` má kontrast **1,47:1**. Presne
to Rastio videl. Samostatný svetlý variant má **15,15:1**.

Sú to **dva súbory z toho istého SVG**, nie `tintColor` — ten by prefarbil
aj teplé podčiarknutie, ktoré je súčasťou značky.

**Glow:** prvý pokus mal tri vrstvy po 0,10–0,22, čo sa v strede sčítalo
na 0,42 a namiesto glow z toho bola **hnedá elipsa s viditeľným okrajom**.
Zistil som to až tým, že som si kompozíciu **vykreslil a pozrel** — z kódu
to vidieť nebolo. Teraz šesť vrstiev s nízkou krytosťou + natívny tieň.
Rendery oboch tém: `reports/hdr_light.png`, `reports/hdr_dark.png`.

Test stráži, že wordmark sa vkladá **len** v `logo.tsx` — pri ďalšej
zmene témy sa na variant nedá zabudnúť.

### 11.13 Zrovnanie s paralelnou vetvou — ✅ UZAVRETÉ

| Čo | Rozhodnutie | Dôvod |
|---|---|---|
| obhliadky | **zahodené** | mala `proposed_time`/`confirmed_time` a stavy CONFIRMED/DECLINED — presne to navrhovanie termínov, ktoré Rastio zrušil. Kontakt sa odkrýval až po CONFIRMED, nie hneď. |
| uzavretie obchodu | **zahodené** | `close_deal(offer)` vyžadovala UŽ PRIJATÚ ponuku, neuchovávala `closed_offer_id` ani `final_amount` a nevedela uzavrieť obchod dohodnutý mimo appky |
| ulice z Registra adries | **prebraté** | prieskum bol dôkladný, import nikdy nebežal |
| generované avatary | **prebraté** | CC0 DiceBear, pribalené, deterministické |
| časová os cien | **prebraté** | schémy boli identické, prenieslo sa čisto (9/9) |
| `Shadow.glow` | **prebraté** | mal som tie isté hodnoty napísané v komponente |

**Rozdiel na rozhodnutie Rastia (NEZLUČOVAL som):** vetva má text
hodnotenia **verejný** (`using (true)`), main ho má súkromný. Zdôvodnenie
môjho rozhodnutia je v 10.2.

Vetva je archivovaná tagom `archiv/paralelna-vetva-8-8-2026` a worktree
odstránený, aby nevznikla tretia verzia.

### 11.14 Push notifikácie — 🔴 ČAKÁ NA BUILD

Celý report: `reports/PUSH_NOTIFIKACIE.md`. Overené 16/16 vrátane toho, že
**Expo Push API našu správu prijalo a spracovalo** (HTTP 200,
`DeviceNotRegistered` na vymyslený token). Neoverený ostáva posledný
článok Expo → APNs → telefón.

**Napojené jedným riadkom** v `push_notification()` — push tým dostal
každý typ oznámenia vrátane budúcich, a `notification_preference` platí
bez ďalšej práce.

**APNs:** MUTARK aj Offerra sú v tíme `TC4V762X67` a APNs kľúč je
per-TÍM. Nový pravdepodobne netreba.

⚠️ **OTA je odteraz zablokovaná** — fingerprint sa zmenil pridaním
natívneho modulu. Rozhodnutie (build vs. dočasné vybratie) je na Rastiovi.

### 11.15 Ponuky rozbalené na mieste + Profil → Moje — ✅ 20/20

**Zvolený vzor: expand-in-place, nie spodný panel.** Vlastník má najviac
päť inzerátov (drží to limit), takže „dlhé zoznamy" tu nevznikajú; panel
by prekryl obrazovku a znemožnil porovnanie dvoch inzerátov; a panel už
v appke je na obrazovke „Ponuky na inzerát" — dva panely s dvoma stavmi
sú tá istá trieda chyby ako zvonček.

Plná obrazovka detailu **ostala**, len už nie je jedinou cestou.

Ďalej: tab premenovaný na **Moje**, kontaktné údaje presunuté do
Nastavení (prezývka ostala — je to identita, nie skrytý údaj), ozubené
koliesko presunuté do hlavičky, teda na **5 z 5** hlavných obrazoviek.

`legal.ts` opravený: cesta „Profil → Nastavenia" už neplatila.

### 11.16 Fingerprint drží aj `package-lock.json` — ✅ VYRIEŠENÉ

Po pridaní `expo-notifications` sa runtime posunul, čo sa čakalo. Lenže
**odloženie natívnej časti** (balík z `package.json`, plugin z `app.json`)
runtime **nevrátilo** — ostal na `017d0391`.

Hľadanie príčiny stálo najviac času z celého dňa, tak ho sem zapisujem
celé:

1. Lokálny `@expo/fingerprint` tvrdil, že sa **nič nezmenilo** — pri
   troch rôznych commitoch dal ten istý hash. Bola to slepá stopa:
   lokálny nástroj počíta niečo iné než EAS.
2. `npm prune` ani `npm ci` to nespravili.
3. Test „starý commit má tiež `017d0391`" vyzeral, že chyba je mimo repa.
   **Bol znečistený** — meral som starý commit s NOVÝMI `node_modules`.
4. Čistý test (`git checkout eecba70` + `npm ci` + fingerprint) dal
   **`451767ea`**. Tým sa rozdiel zúžil na `package-lock.json`.
5. Obnovenie `package-lock.json` z toho commitu + `npm ci` → runtime späť.

**Dve poučenia:**

- **Fingerprint drží `package-lock.json` a stav `node_modules`**, nie len
  `package.json` a `app.json`. Odložiť natívnu závislosť teda znamená
  vrátiť aj zámok.
- **`eas fingerprint:generate` vracia TÚ ISTÚ hodnotu ako `eas update`,
  a bez publikovania.** Lokálny `@expo/fingerprint` nie. Odteraz sa
  overuje ním — je to rýchle a smerodajné.

Na prepínanie natívnej časti je `scripts/push-native.sh on|off`.

### 11.17 „Ako funguje Offerra" v plnej podrobnosti — ✅ 15/15

Zadanie Rastia: maximálna podrobnosť teraz, skrátiť sa dá neskôr — testuje
to rodina a nemá pravidlá objavovať pokusom.

Text sa rozdelil na dve úrovne:

| | Kde | Čo |
|---|---|---|
| `HOW_LEAD` + `HOW_STEPS` | karta na hlavnej obrazovke | jedna veta + 4 body, „Čítať ďalej →" |
| `HOW_SECTIONS` | obrazovka „Ako funguje Offerra" | **13 sekcií, cez 900 slov** |

Pokrytých je všetkých 11 vyžiadaných tém. **Nová je celá sekcia
„Nahlasovanie, moderovanie a blokovanie"** — dovtedy v texte nebola vôbec:
konkrétne dôvody nahlásenia, že nič sa nemaže automaticky, čo znamená
skrytie inzerátu a čo zablokovanie účtu (a že to nie je zmazanie),
a že appka je len pre fyzické osoby vrátane dôsledkov.

Test `akofunguje_test.js` stráži pokrytie po jednotlivých témach — padne,
keď sa niektorá z nich z textu vytratí.

### 11.18 Označenie vlastných položiek + zobrazenia na karte — ✅ 11/11 naživo

**Rastiova obava, či to niečo neodkrýva, je overená meraním:** `owner_id`
aj `buyer_request.user_id` sú vo verejnom výpise **už teraz** (overené
anonymným dotazom PRED zmenou). Porovnanie na klientovi teda neodkrýva
nič nové a nerobí ani žiadny dotaz navyše.

Dôkaz dvoma účtami: server vracia obom **rovnaké dáta**, ale označené má
každý len svoje. Neprihlásený nemá čo označiť.

Vlastný dopyt má okrem odznaku aj **obrys** — v dlhom zozname sa samotný
odznak stratí.

**Rozhodnutie o počte zobrazení:** je **VEREJNÝ**, ako Rastio odporúčal.
Moja pôvodná námietka („0 zobrazení vyzerá mŕtvo") sa dá vyriešiť lepšie
než skrývaním údaja: číslo sa **ukazuje až od piatich**. Pod tým nič
nehovorí — človek, ktorý inzerát práve otvoril, by videl „1 zobrazenie".
Je to **ten istý prah** ako pri konverzii v „Moje inzeráty", teda jedno
pravidlo, nie dve.

### 11.19 Počet ponúk na karte + srdiečko — ✅ 11/11 a 18/18

**Počet ponúk** doplnený do riadku pod názvom. `offerCountLabel()` už
existovala, vracia `null` pri nule a skloňuje — „0 ponúk" teda nemá ako
vzniknúť. Absenciu ponúk aj tak povie pätka vpravo („zatiaľ bez ponúk"),
takže by to bolo dvakrát to isté.

**Srdiečko — a chyba, ktorú našlo až meranie.** Pôvodná farba bola
`palette.danger` (#A33528), teda terakota, ktorá na karte splývala
s akcentom aj s cenou. Nová `favorite: #FF3040` je v TOKENOCH a **rovnaká
v oboch témach** — srdiečko sa nemá meniť podľa témy.

Prvý pokus mal jeden tmavý kruh pod ikonou pre oba stavy. **Zmeral som to
a červené srdce na svetlej fotke spadlo z 3,65:1 na 1,36:1** — teda som
ho zhoršil. Tmavý kruh aj červená sú obe tmavé.

Riešenie: kruh má **inú farbu podľa stavu**, takže kontrast je
**nezávislý od fotky**:

| stav | kruh | ikona | najhorší z 7 fotiek |
|---|---|---|---|
| obľúbené | biely 0,92 | červená #FF3040 | **3,09:1** |
| neobľúbené | čierny 0,62 | biela | **6,19:1** |

Krytosti sú **vypočítané**, nie odhadnuté — hľadal som dvojicu, pri
ktorej oba stavy prejdú 3:1 na každom zo siedmich pozadí (biela, svetlý
interiér, trávnik, obloha, tehla, večer, čierna).

Vizuálny dôkaz: `reports/srdiecko.png`.

### 11.20 Tri audity pred buildom 1.3.0 — ✅ security 33/33 · funkčnosť 39/39

Celý report: `reports/AUDIT_PRED_BUILDOM_1_3_0.md`.

**Dve diery, ktoré audit našiel na webe** (a opravil): Privacy Policy bola
na webe z 8.8. (zmena o push sa nikdy nepushla), a **odkrytie kontaktu
pri OBHLIADKE v nej nebolo vôbec** — hoci appka to robí od 8.8. Presne
to, na čo sa Rastio pýtal.

**Chyba v mojom vlastnom audite:** storage test posielal `text/plain`,
ktorý bucket odmietne EŠTE PRED kontrolou oprávnení — test na izoláciu
zložiek teda „prešiel" bez toho, aby izoláciu overil. Prerobené so
skutočným JPEG-om; odpovede teraz hovoria `row-level security policy`.

**Jediný 🟡 nález:** `EXPO_PUBLIC_DEMO_PASSWORD` je v balíku appky.
Nie je v repe (§4 splnené), ale „nie je v repe" ≠ „nedá sa získať". Demo
účet je bežný účet bez práv navyše, takže pre TestFlight to blokujúce
nie je; do verejného vydania heslo zmeniť alebo demo prihlásenie zapínať
len pre review buildy.

### 11.21 Telefón povinný, overenie odložené — ✅ 18/18 / 🔴 SMS

Telefón je v onboardingu povinný. Kontrola je zámerne mierna (9+ číslic,
prijme aj zahraničné) — **číslo, ktoré appka odmietne, je horšie než
číslo v inom tvare**.

**Overenie SMS je odložené a je to zmerané, nie odhadnuté:**

```
external_phone_enabled = False
sms_twilio_account_sid = None      (a rovnako Vonage aj Textlocal)
```

Appková časť by veľká nebola — Supabase vie pridať telefón k existujúcemu
Apple/Google účtu cez `updateUser` + `verifyOtp({type:'phone_change'})`,
auth flow sa prestavovať nemusí. Odhad 2–3 hodiny. **Blokátor je mimo
appky:** platený SMS poskytovateľ, ktorý projekt nemá.

Odznak „overený telefón" ZÁMERNE nepridaný — tvrdil by nepravdu.

### 11.22 Zástupcovia správcu — ✅ 19/19

**Východisko bolo bezpečné:** `profile.role` nemá pre `authenticated`
UPDATE grant vôbec, takže sa nikto povýšiť sám nevedel. Migrácia to
nemenila — pridala jedinú povolenú cestu, ktorá sa pýta, kto volá.

Štyri poistky vo `admin_set_role()`:

| Poistka | Stav |
|---|---|
| volajúci musí byť správca | ✅ overené |
| vlastnú rolu meniť nemožno | ✅ overené |
| posledný správca sa neodstrihne | ⚠️ **v kóde je, ale dnes je nedosiahnuteľná** |
| každá zmena sa zapíše | ✅ overené |

Tú tretiu hlásim presne: pri zákaze „sám sebe" sa k nej nedá dostať —
odobrať posledného správcu by musel niekto, kto sám správcom nie je,
a toho zastaví prvá poistka. Nechal som ju tam ako **druhú líniu**, keby
sa pravidlá časom zmenili; je to stav, z ktorého niet cesty späť bez
zásahu do databázy. Overil som aspoň, že tá vetva v kóde existuje.

**Audit log** `admin_action_log`: kto, komu, kedy. Číta ho len správca,
zapisuje výhradne funkcia — **ani správca ho nepodvrhne** (žiadny insert
grant, overené). Cudzí kľúč je `on delete set null`, aby zmazanie účtu
nezmazalo stopu a zároveň účet nespravilo nezmazateľným — tá istá lekcia
ako pri `app_config.updated_by`.

### 11.24 Build 1.3.0 (#5) — ✅ OVERENÉ RUNTIME, hotový

Build `57ca9b23-1424-46ca-a5bb-0507b322e49b` dobehol **FINISHED** za 5 minút
(10:26 → 10:31). Minulý pokus padol vo fáze Xcode po dvoch minútach.

**Dôkaz nie je „build zelený", ale obsah IPA.** Stiahol som artefakt
(22,2 MB) a rozbalil `embedded.mobileprovision` z podpísanej appky:

| kontrola | výsledok |
|---|---|
| `aps-environment` v **podpísanej** appke | **`production`** ✅ |
| profil vytvorený | `2026-08-09T10:23:41Z` (nový) |
| bundle | `com.offerra.app` |
| CFBundleShortVersionString / CFBundleVersion | **1.3.0 / 5** |
| `expo-notifications` natívne v balíku | ✅ `ExpoNotifications_privacy.bundle` |
| runtime | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Názov profilu ostal starý (`…AppStore 2026-08-07…`) — Apple meno
nemení pri regenerácii. Rozhoduje `CreationDate` a obsah, nie meno.

**`eas submit` spustený na Rastiovo výslovné „ok submit"** — ✅ OVERENÉ
RUNTIME, binárka nahraná do App Store Connect.

```
ASC App ID: 6799028421 · submission 26f3a580-4d15-4f78-8038-ffee4532713e
✔ Submitted your app to Apple App Store Connect!
```

🟡 **Čaká na Apple** — spracovanie binárky trvá 5–10 minút, potom sa build
objaví v TestFlighte. To, že Apple binárku prijal a spracoval, je jeho
strana; e-mail príde Rastiovi.

**Na overenie na zariadení po inštalácii #5:**
1. prepínanie tabov 5× bez pádu,
2. žiadny orezaný text,
3. onboarding sa zobrazí len raz,
4. **doručenie push notifikácie na zamknutú obrazovku** — prvýkrát
   overiteľné, reťaz je otestovaná len po Expo.

> ⚠️ Ďalšie OTA musia ísť na runtime `24919867…`. Build #4
> (`451767ea…`) je od nich odstrihnutý — zámerne, všetko svoje už dostal.

### 11.25 Push na zariadení — ✅ OVERENÉ RUNTIME (posledný článok potvrdí Rastio)

Po inštalácii #5 Rastio zapol upozornenia v Nastaveniach. Token dosadol:

```
user_id 33fadff3… (profil „Rastio") · platform ios
ExponentPushToken[FezBw_E…  (41 znakov)  · 10:43:06
```

**Prvý pokus o odoslanie zlyhal, hoci HTTP bolo 200:**

```json
{"data":{"status":"error",
 "message":"Could not find APNs credentials for com.offerra.app",
 "details":{"error":"InvalidCredentials"}}}
```

> **PRAVIDLO — entitlement a APNs kľúč sú DVE RÔZNE veci.**
> `aps-environment` v provisioning profile hovorí, že appka **smie**
> prijímať push. **APNs kľúč (.p8) nahratý na Expo projekte** je to, čím
> Expo push **odosiela**. Build môže prejsť, entitlement môže byť
> v podpísanej appke — a push aj tak nefunguje. Dvakrát som v tomto
> vydaní predpokladal, že „kľúč je per-tím, takže sa nájde sám".
> Nenašiel. **Per-tím znamená, že sa dá znovupoužiť, nie že sa priradí
> sám.**

**Oprava bez akéhokoľvek nového kľúča od Apple:** na účte `rastio_eu`
už existoval APNs kľúč `XW4HG74H5R` na tíme `TC4V762X67` (ten istý ako
Offerra), priradený k **famiglia** a **mutark**. Priradil som ho aj
k Offerre cez Expo GraphQL:

```
mutation { iosAppCredentials { setPushKey(
  id: "9377cd2c…",          # iOS credentials Offerry
  pushKeyId: "e3b896e6…"    # existujúci kľúč XW4HG74H5R
) } }
```

Robil som to sám, lebo to **nie je** prístup k Apple účtu — je to
priradenie kľúča, ktorý na Expo účte už bol, a dá sa vrátiť.

**Druhé odoslanie:**

| krok | dôkaz |
|---|---|
| Expo prijalo | `{"status":"ok","id":"019fe620-497c-7028-9051-2b820a7988c2"}` |
| **potvrdenka od Expa** | `{"019fe620…":{"status":"ok"}}` — **Apple správu prijalo** |

✅ **Rastio potvrdil: notifikácia prišla.** Reťaz databáza → Expo →
APNs → telefón je tým celá overená.

### 11.26 Dve veci, ktoré Rastio nahlásil hneď po doručení

**(a) „neni v zvončeku" — NIE JE to chyba appky, spôsobil som ju testom.**

Volal som `send_expo_push()`, čo je surový odosielateľ. Riadok do
zvončeka zakladá až `push_notification()`, ktorá volá oboje:

```sql
insert into offerra.notification (...);
perform offerra.send_expo_push(...);
```

Ostré oznámenia idú výhradne cez `push_notification()`, takže sa zvonček
a push rozísť nemôžu. Nič som „neopravoval" — nebolo čo. Napísané sem,
aby to nezmizlo ako domnelá chyba.

**(b) „otvorilo appku tam kde bola otvorená" — SKUTOČNÁ chyba, opravená.**

Nešlo o zlé smerovanie. `grep` na `addNotificationResponseReceivedListener`
v celom `src/` nevrátil **nič** — appka na klik nepočúvala vôbec. Push
doručený, ale slepý.

Oprava:

| súbor | čo robí |
|---|---|
| `src/lib/notification-route.ts` (NOVÝ) | čistá funkcia „kam vedie oznámenie" |
| `src/lib/push.ts` | `onPushTap()`, `initialPushTap()`, `setupForegroundPush()` |
| `src/hooks/use-push-tap.ts` (NOVÝ) | zapojenie na router |
| `src/app/_layout.tsx` | hook nasadený, čaká na `pushReady` |
| `src/app/oznamenia.tsx` | zvonček používa TÚ ISTÚ funkciu |

**Smerovanie vedie tam, kde sa dá niečo SPRAVIŤ**, nie kde sa to dá
prečítať: `NOVA_PONUKA` → `/ponuky/[id]` (majiteľ rozhoduje),
akceptovaná/zamietnutá/obhliadka/zhoda → `/nehnutelnost/[id]` (na
`/ponuky` by sa záujemca ani nedostal), `SYSTEMOVE` → zvonček.

Tri veci, ktoré museli byť ošetrené, inak by to robilo neplechu:

1. **Príliš skoro** — pri štarte zo zabitého stavu beží brána
   (`router.replace`), ktorá by skok na detail vzápätí prebila. Preto
   `pushReady` a odložený klik.
2. **Dvakrát to isté** — `getLastNotificationResponseAsync()` vracia tú
   istú notifikáciu opakovane, kým beží proces. Bez `handledRef` by sa
   obrazovka otvárala pri každom prekreslení.
3. **Neznámy typ zo servera** nesmie skončiť pádom ani tichým nič.

**Navyše:** `setNotificationHandler` — notifikácia doručená, kým je appka
v popredí, sa predtým potichu zahodila. To je „nestane sa nič" v prípade,
keď server prácu spravil (§2).

**Opravené aj dva komentáre, ktoré po pridaní pushu klamali** (§8):
`src/lib/notifications.ts` a `src/app/dopyt/[id].tsx` obe tvrdili, že
notifikácie v Offerre neexistujú.

**Dôkaz:** `push_route_test.js` **18/18** — vrátane toho, že zvonček aj
push vedú pri každom type na tú istú obrazovku, a že poškodené `data` zo
siete nespôsobia pád. `npx tsc --noEmit` čistý.

**IDE OTA** — `expo-notifications` je v builde #5, pribudol len JS.
Vydané: update group `ed66b62c-fe08-416c-b9ce-fd4248bb708e`, runtime
`24919867…`, commit `69933b5`.

**✅ POTVRDENÉ POUŽÍVATEĽOM (Rastio, 9.8.2026): „funguje".** Overované
jedným volaním `push_notification()`, ktoré spravilo oboje naraz:

| | dôkaz |
|---|---|
| riadok v zvončeku | `9cc4e11c…` · `NOVA_PONUKA` · property `0e897357…` |
| push do Expa | `{"status":"ok","id":"019fe635-ca30-756b-a05d-e4dec6f9b405"}` |
| klik na notifikáciu → správa ponúk | potvrdil Rastio |
| klik v zvončeku → to isté miesto | potvrdil Rastio |

Testovací riadok zmazaný hneď po overení — `select count(*) where
title like 'TEST%'` → **0**. V zvončeku po teste neostalo nič.

### 11.29 Seed dáta — fotky podľa typu a poriadny objem

Report: `reports/SEED_FOTKY_A_OBJEM.md`, licencie
`reports/SEED_FOTKY_LICENCIE.md`.

**Fotky ✅ OVERENÉ RUNTIME, dvoma nezávislými spôsobmi.** Dotaz:
`media.url not like '%/seed/' || property_type || '/%'` → **0**. A keďže
dotaz dokazuje len zhodu reťazcov, nie že na fotke je dom, zložil som hárok
z **prvých fotiek náhodných inzerátov každého typu** a pozrel sa naň.

**Prečo to nesedelo:** fotky sa brali z jedného spoločného bazéna 22
súborov a rozdávali dokola bez ohľadu na typ. Teraz je pre každý typ
vlastný bazén v `offerra-media/seed/<TYP>/`.

**96 fotiek z Wikimedia Commons, každá posúdená POHĽADOM** — vyhľadávanie
klame (pri „apartment building" bola druhým výsledkom pálenica, pri
pozemkoch vracalo budovy). Zo 195 kandidátov obstálo 96: APARTMENT 26,
HOUSE 30, LAND 23, COMMERCIAL 17.

**Objem:** inzeráty 20→**60**, ponuky 28→**124**, dopyty 8→**24**,
oslovenia 15→**51**, fotky 63→**183**. 12 miest, 8 krajov, **21 inzerátov
s 3+ konkurenčnými ponukami**, 0 bez fotky.

**Rozloženie typov je zámerne NEROVNOMERNÉ** (byty 27, domy 18, komerčné 9,
pozemky 6). Prvý beh dal presne 15 od každého — reálny portál tak nevyzerá
a rovnomernosť je práve to „umelo pôsobiace", pred ktorým Rastio varoval.

**Rastiov účet (zadanie 9.8.2026):** 5 vlastných inzerátov (všetky ACTIVE),
**17 prichádzajúcich ponúk**, 5 vlastných dopytov, **11 oslovení** jeho
dopytov. Na jeho inzerátoch zámerne **žiadna prijatá ponuka** — prijatie
inzerát zamkne a on má práve na nich skúšať prijímanie a odmietanie.

**Pokazilo sa a opravené:** Wikimedia po ~33 sťahovaniach odrezala a tri
kategórie ostali prázdne — skript to **zamlčal**; odteraz je prázdna
kategória chyba. Metadáta prvého kola prepísalo druhé (52 z 96 fotiek bez
pôvodu) — vyhľadávania spustené znova a **párovanie overené veľkosťou
súboru**, nesediacich **0**.

**BEZ ZMENY KÓDU** — obsah databázy a úložiska, netreba OTA ani build.
V changelogu pre používateľa zámerne nie je: changelog je o tom, čo appka
vie, nie o testovacích dátach.

---

### 11.28 Dopytová strana ožila + seed dáta nanovo (davka 9.8.2026)

Plný report: `reports/DAVKA_DOPYTY_A_SEED.md`. Push som **nemenil** (bod 2
zadania).

| bod | stav |
|---|---|
| 1. legal linky na prihlasovacej obrazovke | ✅ (🟡 vzhľad) |
| 3. cena + izby pri výbere inzerátu na oslovenie | ✅ |
| 4. počet izieb povinný | ✅ appka **aj** DB |
| 5. návrat do inzerátu po oslovení | ✅ (🟡 vzhľad) |
| 6. dopytová strana — všetky 4 veci | ✅ OVERENÉ RUNTIME |
| 7. seed dáta 2× | ✅ OVERENÉ RUNTIME |

**Bod 6 — príčina ZMERANÁ, nie odhadnutá:**

```sql
select tgname from pg_trigger where relname='request_outreach';  →  0 riadkov
```

`request_outreach` nemal **žiadny** trigger. Nešlo o preferenciu ani
o chybu odosielania — oznámenie nemal kto založiť. Mig 30: typ
`OSLOVENIE_DOPYTU`, trigger `trg_notify_request_outreach` (cez
`push_notification()`, teda zvonček aj push naraz) a
`my_request_outreach()` (SECURITY DEFINER, `where r.user_id = auth.uid()`).
Oznámenie vedie na **ponúknutý inzerát**, nie na vlastný dopyt — tam sa
dá niečo spraviť, na dopyte nič.

**Bod 4 — appka to žiadala, DB nie.** `missingForPublish()` počet izieb
vracal medzi chýbajúcimi, ale server ho nekontroloval a jeden ACTIVE
inzerát bez izieb v katalógu naozaj bol. Pravidlo, ktoré platí len
v appke, nie je pravidlo → mig 31 `property_publish_guard`.

**Seed:** inzeráty 10→**20**, ponuky 3→**28**, dopyty 2→**8**, oslovenia
6→**15**, fotky 22→**63**, seed profily 1→**6**. Skript sa na konci sám
overí dotazom (0 duplicitných ACCEPTED, 0 s `view_count` < počet ponúk,
0 bez izieb, 0 dopytov bez oslovení). Mestá/ulice z `offerra.city` a
`offerra.street`, nie vymyslené reťazce.

**Rozhodnuté samostatne:** 3 z 20 inzerátov a 2 z 8 dopytov patria
Rastiovi (`is_seed`) — inak by obrazovky vlastníka a „OSLOVENIA" nemal na
čom vyskúšať. Preto mu prišlo aj niekoľko notifikácií; Expo ich prijalo
(`status: ok`), čo je zároveň dôkaz, že trigger funguje na skutočnej ceste.

**Opravené navyše:** `legal.ts` tvrdil, že telefón je nepovinný (od 9.8.
je povinný) — právny dokument, ktorý klame o žiadaných údajoch, je horší
než žiadny. `how-it-works.ts` sekcia o dopytoch nevedela o oslovení,
upozornení ani obhliadke (§8).

**Dôkazy:** `dopyty_test.py` **18/18** (cez PostgREST, 3 účty),
`push_route_test.js` 20/20, `onboarding_test.js` 13/13, `akofunguje` 15/15,
`odozva` 21/21, `audit` 74/74, `tsc` čistý.

**IDE OTA.**

---

### 11.27 Nastavenie upozornení pri prvom prihlásení

Zadanie (Rastio, 9.8.2026): pri prvom prihlásení sa appka musí spýtať na
povolenie pushu **a hneď potom ukázať výber typov** — nie ich len ticho
zapnúť a nechať človeka, nech si to nájde v Nastaveniach.

**Onboarding má odteraz tri kroky:** LOGIN → PREZÝVKA → **UPOZORNENIA** →
appka.

| | |
|---|---|
| mig 29 | `profile.notif_onboarded_at`, `my_profile()` ho vracia |
| `src/app/upozornenia.tsx` (NOVÝ) | vlastné vysvetlenie + systémový dialóg + výber typov |
| `src/components/notification-types.tsx` (NOVÝ) | zoznam prepínačov — JEDEN pre onboarding aj Nastavenia |
| `src/lib/gate.ts` | tretí stupeň brány |
| `src/lib/how-it-works.ts` | §8 — text o načasovaní by inak klamal |
| `src/lib/push-prompt.ts` | z „prvej" ponuky sa stala záchranná sieť |

**Rozhodnutia, ktoré som spravil sám (a prečo):**

1. **Krok je až PO prezývke, nie pred ňou.** Systémový dialóg sa dá
   položiť **raz**; kto klikne „Nepovoliť", toho sa iOS druhýkrát nespýta.
   Pred prezývkou by sa appka pýtala skôr, než o sebe čokoľvek povedala.
2. **Vlastné vysvetlenie PRED systémovým dialógom** — zadanie ho označilo
   za nepovinné („ak čas netlačí"). Čas netlačí, tak je tam: tri konkrétne
   príklady, nie slovo „notifikácie". Systémový dialóg vyskočí až po
   stlačení tlačidla.
3. **Krok sa dá preskočiť a preskočenie sa ZAPÍŠE.** „Teraz nie" je
   odpoveď. Vstupná podmienka to nie je — na rozdiel od prezývky sa bez
   upozornení appka používať dá.
4. **Bez backfillu existujúcich profilov.** Keby sme im nastavili `now()`,
   krok by nikto z doterajších nikdy nevidel — vrátane Rastia, ktorý ho má
   otestovať. A hlavne: možnosť vybrať si typy nikdy nedostali.
5. **Zoznam typov je ZDIEĽANÝ komponent.** Kópia v onboardingu by sa
   s tou v Nastaveniach časom rozišla.

**Stĺpcové granty sú zámerne asymetrické:** `authenticated` má na
`notif_onboarded_at` len **UPDATE**, nie SELECT. `profile` má SELECT na
cudzie riadky (verejná je prezývka, avatar, overenie) — s grantom SELECT
by ktokoľvek vyčítal, kedy si kto nastavoval upozornenia. Vlastnú hodnotu
appka dostane cez `my_profile()` (SECURITY DEFINER, iba vlastný riadok).

**🔴 ČO SA NEDALO SPLNIŤ: výber FREKVENCIE.** Zadanie hovorí „typy +
frekvencia". Typy áno. Frekvencia sa nezobrazuje ani tu, ani v
Nastaveniach — denný a týždenný súhrn potrebujú plánovanú úlohu na
serveri, ktorú Offerra nemá. Jediná fungujúca hodnota je `IHNED` a jedna
možnosť nie je výber. Nefunkčný chip „(čoskoro)" je presne to, čo Apple
pri recenzii odmieta (App Review 2.1). **Default `IHNED` zo zadania teda
platí a je overený; chýba len možnosť ho zmeniť.** Zapnutie je jeden
prepínač `DIGEST_READY` na jednom mieste, keď súhrny naozaj pribudnú.

**Dôkazy:**

| test | výsledok |
|---|---|
| `onboarding_test.js` (brána) | **13/13** |
| `notif_onboarding_test.py` (cez PostgREST, ako appka) | **13/13** |
| `push_route_test.js` | 18/18 |
| `akofunguje_test.js` / `odozva_test.js` / `audit.js` | 15/15 · 21/21 · 74/74 |
| `npx tsc --noEmit` | čistý |

DB test ide **cestou appky** (PostgREST + RPC, dva reálne účty), nie
SELECT-om — lebo som už raz mal krok onboardingu, ktorý sa v DB ukladal
správne, ale človek sa cezeň **nedostal**. Overené aj to, že vypnutý typ
`should_notify()` naozaj odmietne — inak by prepínač bol ozdoba.

**🟡 ČAKÁ VIZUÁLNE OVERENIE.** Čo má Rastio otestovať, je v
`reports/ONBOARDING_UPOZORNENIA.md`.

**IDE OTA** — žiadny nový natívny modul.

---

**Tým je push HOTOVÝ celou reťazou:** appka získa token → databáza
založí oznámenie aj push → Expo → APNs → telefón → klik → správna
obrazovka. Žiadny článok už nie je neoverený.

### 11.23 Build 1.3.0 — 🔴 chýba schopnosť Push Notifications na App ID
(vyriešené, viď 11.24)


Build `9f6e8fc7` spadol vo fáze Xcode:

```
Provisioning profile "*[expo] com.offerra.app AppStore 2026-08-07…"
  doesn't include the Push Notifications capability
  doesn't include the aps-environment entitlement
```

Profil je zo 7.8., teda z čias pred pushom. `expo-notifications` pridáva
entitlement `aps-environment` a Xcode odmietne podpísať niečo, na čo
profil neznie.

**Skúsil som to doriešiť sám, dvomi cestami, obe zlyhali:**

1. Build s automatickou synchronizáciou — EAS vypísal *„All credentials
   are ready"* a profil ani nepozrel. Schopnosti synchronizuje len keď
   profil VYTVÁRA. Druhý build som hneď zrušil.
2. `eas credentials` je výhradne interaktívny (overené cez `--help`).

`.p8` na stroji je pre **Sign in with Apple**, nie App Store Connect API —
na správu kredenciálov sa použiť nedá. Je to teda prístup k Apple účtu,
a to je Rastiova strana.

Postup je v `reports/BUILD_1_3_0_APNS_BLOKATOR.md`.

**Využité okno:** `.claude/` presunuté z `.git/info/exclude` do
`.gitignore` — ✅ OVERENÉ RUNTIME, `.claude/` sa v `git status`
nezobrazuje. Odkladal som to, lebo zmena `.gitignore` mení runtime
a odstrihla by existujúci build od OTA; teraz je to zadarmo, lebo nový
build ešte neexistuje. Runtime buildu #5 sa tým posunul z `b9c2ff9e…`
na **`24919867e1bcc84715b1b4d6998cb6b27886e5d9`** (`eas
fingerprint:generate --platform ios`). Tretie meranie potvrdzujúce, že
`.gitignore` je vstup do fingerprintu.

> **PRAVIDLO:** pridanie natívneho modulu, ktorý žiada iOS entitlement,
> vyžaduje **regeneráciu provisioning profilu**. EAS to sám neurobí, ak
> profil už existuje — a chyba sa prejaví až vo fáze Xcode, teda po dvoch
> minútach buildu, nie pri kontrole kredenciálov. Kontrola kredenciálov
> povie „ready" aj vtedy, keď ready nie sú.

---

## Fáza 12 — Strata dát vo formulári, povinné polia, meno z prihlásenia (12.8.2026)

Nasadenie: **IDE OTA** (nič natívne, `app.json` bez zmeny).
Podrobne v `reports/FORMULAR_STRATA_DAT.md`.

### 12.1 Koreňová príčina straty formulára — ✅ OVERENÉ RUNTIME

Rastio hlásil, že picker robí remount obrazovky. **Nerobí.** Namerané:
`addPhoto` → `onChanged()` → `useProperty.reload()` → `attachMedia` robí
`rows.map(r => ({...r, media}))`, teda VŽDY nový objekt → `useEffect(…,
[item])` v `src/app/inzerat/[id].tsx` sa spustí znova a prepíše polia
hodnotami z DB. React porovnáva identitu, nie obsah.

Tie isté následky mali `useRefreshOnFocus(reload)` (návrat na obrazovku)
a `save()` → `reload()` (po uložení).

`pickPhoto()` volá `expo-image-picker` cez `require()` v tele funkcie →
natívne modálne okno, žiadna navigácia. `CityPicker`/`StreetPicker` používajú
`ModalScreen` v komponente, nie `router.push`.

### 12.2 Pravidlo „server smie naplniť, nie prepísať" — ✅ OVERENÉ RUNTIME

`src/lib/form-draft.ts` (`fillFromServer`), `src/hooks/use-form-draft.ts`
(`useFormDraft`), `src/lib/listing-form.ts` (formulár ako dáta).
Editor prepísaný; deväť `useState` a spomínaný efekt sú preč.

Dôkaz: Node test proti SKUTOČNÝM funkciám appky (nie kópii) —
`formular_test.ts`, **115 kontrol, exit 0**. Obsahuje aj prehratie starého
pravidla, ktoré ukazuje, že polia naozaj zmizli.

Poradia podľa zadania: fotka prvá, fotka posledná, päť fotiek za sebou
s písaním medzi nimi, tri návraty na obrazovku. Predaj aj prenájom so
všetkými poľami.

### 12.3 Stav mimo komponentu — ✅ OVERENÉ RUNTIME

Rozpísané formuláre žijú v pamäti modulu (`form-draft.ts`), nie v obrazovke.
Zámerne NIE AsyncStorage — koncept v DB je zdroj pravdy. Pri `signOut()` sa
zahodia (`forgetAllDrafts`), aby na spoločnom telefóne nezostal text
predošlého človeka. Overené sekciami 5, 6 a 8 testu.

### 12.4 Rovnaká chyba inde — ✅ OVERENÉ RUNTIME

- `src/components/contact-card.tsx` — mala ju reálne (zmena profilovky volá
  `reload()` → zmazané rozpísané meno a telefón). Prepísané na `useFormDraft`.
- `src/app/(tabs)/profil.tsx` — rovnaký vzor, ale ten formulár sa nemal ako
  zobraziť (úprava sa presunula do Nastavení a na `/prezyvka`). Mŕtvy kód,
  zmazaný. **Nebola tam prejavujúca sa chyba.**
- `src/app/ponuka/[id].tsx` — rovnaký vzor, zatiaľ bez spúšťača (`useOffers`
  nemá realtime a `reload()` beží až po odoslaní, po ktorom sa obrazovka
  aj tak zatvára). Ošetrené aj tak: polia sa naplnia raz pre danú ponuku.
- Prejdené VŠETKY efekty v `src/app` a `src/components` (99 výskytov). Iné
  miesto, kde by server prepisoval rozpísaný formulár, tam nie je.

### 12.5 Povinné polia — ✅ OVERENÉ RUNTIME

Povinné: názov, mesto, počet izieb (okrem pozemku), výmera, ≥1 fotka.
Nepovinné zámerne: orientačná cena, kraj, ulica.
Typ obchodu a typ nehnuteľnosti sa nedajú nechať prázdne (inzerát vzniká ako
SALE/APARTMENT, `ChoiceRow` vracia vždy hodnotu).

**Výmera:** Rastio ju chcel povinnú, povinná už bola — potvrdené, ostáva.

V appke pribudlo „(povinné)" pri názve, obci a výmere.

Trigger `guard_property_publish()` kontroloval do teraz LEN počet izieb —
zvyšok bol iba v appke, takže s anon kľúčom sa dal mimo appky zverejniť
prázdny inzerát. Teraz kontroluje všetkých päť. Spustené proti ostrej DB:

```
1 PRÁZDNY:                 chýba: názov inzerátu, mesto, počet izieb, výmera, aspoň jedna fotka
2 BEZ IZIEB/VÝMERY/FOTKY:  chýba: počet izieb, výmera, aspoň jedna fotka
3 BEZ FOTKY:               chýba: aspoň jedna fotka
4 S FOTKOU:                ZVEREJNENÉ (správne)
5 POZEMOK BEZ IZIEB:       ZVEREJNENÝ (správne)
6 BEZ CENY/KRAJA/ULICE:    ZVEREJNENÉ (správne)
```

Testovacie riadky zmazané (`select count(*)` → 0).

### 12.6 Meno z Apple / Google — ✅ OVERENÉ RUNTIME (logika), 🟡 na zariadení

`src/lib/signin-name.ts`. Apple `requestedScopes` už `FULL_NAME` žiadalo, ale
návratová hodnota sa zahadzovala. Apple dá meno LEN pri prvom prihlásení a LEN
v návratovej hodnote `signInAsync` — v `identityToken` nie je, teda ani
v `user_metadata`. Ukladá sa hneď, ešte pred kontrolou tokenu. Google chodí
cez `user_metadata` (`full_name` → `name` → `given_name + family_name`).

Predvyplnenie je len v onboardingu (`/prezyvka`), existujúcich účtov sa
nedotkne. Pole ostáva editovateľné. Pri odhlásení sa meno zabudne.

Dôkaz logiky: `meno_test.ts` proti skutočným funkciám, exit 0.

### 12.7 Overenie na zariadení — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Zoznam presných krokov pre Rastia je v `reports/FORMULAR_STRATA_DAT.md`,
sekcia KONTROLA PRED HOTOVO. Predvyplnené meno sa dá overiť len na NOVOM
účte — na existujúcom sa onboarding neukáže.

---

## Fáza 13 — Poradie filtrov a podtaby na detaile (12.8.2026)

Nasadenie: **IDE OTA**. Podrobne v `reports/PODTABY_A_FILTRE.md`.

### 13.1 Poradie filtrov — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Rastio poradie počas práce **upresnil**; platí druhá verzia:

```
Predaj · Prenájom · Byt · Dom · Pozemok · Komerčné · Najnovšie · Čoskoro končí · ♥
```

Triedenie a obľúbené sú **na konci**, srdiečko **bez textu** a úplne
posledné. Vecný dôvod: triedenie ani obľúbené nezužujú, ČO sa hľadá, len
menia pohľad na výsledok. `Chip` dostal `accessibilityLabel`, aby čítačka
obrazovky nečítala „♥" ako znak. Neprihlásenému sa srdiečko neukazuje.
`src/components/search-bar.tsx`.

### 13.2 Podtaby Ponuky / Obhliadka / Hodnotenia — 🟡 ČAKÁ VIZUÁLNE OVERENIE

`src/components/property-tabs.tsx`. Obe strany vidia tie isté tri taby, líši
sa obsah podľa role. Nad tabmi ostáva to, čo sa dá len čítať (galéria, cena,
parametre, o budove, podmienky prenájmu, kalkulačka, popis); pod nimi všetko,
čo sa dá ROBIŤ.

Odchýlky od Rastiovho návrhu a dôvody sú v reporte, sekcia 2:
- formulár „Podať ponuku" ostáva vlastnou obrazovkou (pri prenájme obsahuje
  celý dotazník nájomcu — druhá kópia by sa rozišla); tab ukazuje STAV
  vlastnej ponuky a má v sebe Upraviť aj **Stiahnuť**,
- CTA majiteľa zmenené zo „Spravovať ponuky" na **„Upraviť inzerát"** —
  ponuky sú teraz v tabe a úprava z detailu dovtedy nebola dostupná vôbec.

### 13.3 `OwnerOffers` — jedna implementácia, dve miesta — 🟡 ČAKÁ OVERENIE

Rozhodovanie majiteľa (zoznam + spodný panel + Prijať/Odmietnuť/Uzavrieť +
dotazník nájomcu + odkrytý kontakt) vybraté z `app/ponuky/[id].tsx` do
`components/owner-offers.tsx`. Obrazovka klesla z 377 na 88 riadkov.

**Vedľajší nález:** razítko `mark_offers_viewed` sedelo na obrazovke „Ponuky
na inzerát". Po presune ponúk do tabu by ponuka vybavená v tabe ostala
záujemcovi označená ako „nevidená" — a to je údaj, ktorý si záujemca sám
nastaviť nevie, teda by mu klamal. Razítko je preto v `OwnerOffers`.

### 13.4 Odkrytý kontakt na jednom mieste — 🟡 ČAKÁ OVERENIE

Tab „Obhliadka" ukazuje kontakt odkrytý obhliadkou **aj** kontakt odkrytý
prijatou ponukou (`offer_contact()`). Ktorou cestou sa odkryl, človeka
nezaujíma — zaujíma ho, na koho zavolať.

### 13.5 Rozsah hodnotení — ROZHODNUTÉ

Zadáva sa **per obchod** (`rating.property_id`, bez zmeny), zobrazuje sa
**zosumarizované za človeka**. Dôvod: per inzerát by tam skoro vždy bolo
nula alebo jedno hodnotenie (inzerát sa predá raz), čiže sekcia, ktorá
vyzerá ako dôkaz dôveryhodnosti a nič nedokazuje.

### 13.6 Zbalenie appky — ✅ OVERENÉ RUNTIME

`npx expo export --platform ios` prešiel:
`entry-cdbfe9ea6977aff01a9f97910170ad90.hbc (5.1MB)`.
`npx tsc --noEmit` exit 0.

**Dokazuje, že sa to preloží a poskladá. NEDOKAZUJE, že to na telefóne
vyzerá a funguje** — zoznam toho, čo musí overiť Rastio, je v reporte.

---

## Fáza 14 — Seed dáta pre podtaby (12.8.2026)

**BEZ ZMENY KÓDU** — obsah databázy. Netreba OTA ani build.
Report: `reports/SEED_PRE_PODTABY.md`. Skript `seed_taby.py` je zámerne
mimo repa (§4, Offerra je verejná).

### 14.1 Prečo to vzniklo

Podtaby z Fázy 13 nemali z čoho žiť: **0 hodnotení, 2 obhliadky, 1 uzavretý
obchod**. Dva z troch tabov boli prázdne na každom inzeráte, takže sa nedali
overiť vôbec.

### 14.2 Doplnené — ✅ OVERENÉ RUNTIME

| | pred | teraz |
|---|---|---|
| ACTIVE / CLOSED | 59 / 1 | **49 / 11** |
| hodnotenia | 0 | **18** (7 hodnotených ľudí) |
| obhliadky | 2 | **38** |
| stiahnuté ponuky | 0 | **5** |

Inzerátov, ponúk, fotiek ani dopytov sa dávka nedotkla (60 / 126 / 183 / 24).

**Zámerne nedokonalé, aby to nepôsobilo umelo:** priemery 3.50 – 5.00, nie
samé päťky; pri každom štvrtom obchode hodnotí len jedna strana; časť
hodnotení je bez textu. Obhliadky prevažne `CONTACT_SHARED` (to appka pri
vypýtaní reálne robí), `CANCELLED` len dve.

### 14.3 Rastiov účet — ✅ OVERENÉ RUNTIME

4 aktívne inzeráty (13 čakajúcich ponúk, **žiadna prijatá** — to pravidlo
platí ďalej), 1 uzavretý, 10 obhliadok na jeho inzerátoch, 7 kde žiada on,
3 prijaté hodnotenia (4.33), **2 uzavreté obchody, kde ešte nehodnotil**,
6 dopytov. Je na oboch stranách uzavretého obchodu — vlastník pri jednom,
víťazný záujemca pri dvoch.

**Oprava predošlého reportu:** `SEED_FOTKY_A_OBJEM.md` tvrdí „5 vlastných
inzerátov, všetky ACTIVE". Jeden z nich („4-izbový byt na prenájom,
Bratislava") bol uzavretý už pred touto dávkou — správne je **4 aktívne +
1 uzavretý**. Nechané tak: práve vďaka tomu vidí vlastnícku stranu
hodnotenia.

### 14.4 Kontrola — ✅ OVERENÉ RUNTIME, 11 pravidiel, 0 porušení

Okrem doterajších pribudli tri, ktoré predtým nebolo načo kontrolovať:

- **hodnotiť smú výhradne dve strany uzavretého obchodu** — presne to, čo
  dovolí `can_rate()`. Seed nesmie vyrobiť stav, ktorý appka nikdy
  nevytvorí, inak by sa testovalo niečo neexistujúce.
- **žiaden ACTIVE seed inzerát neporušuje rozšírený
  `guard_property_publish()`** z Fázy 12. Keby porušoval, prvá úprava
  takého inzerátu by spadla.
- **žiadna obhliadka na vlastnom inzeráte.**

**Čo sa pri behu pokazilo:** skript uzavrel obchod na dvoch inzerátoch, ktoré
už jednu prijatú ponuku mali (víťaza hľadal len medzi čakajúcimi) → dva
inzeráty s dvoma prijatými ponukami. **Záverečná kontrola v skripte to
chytila a beh označila za neúspešný** — presne na to tam je. Neviťazné
prijaté ponuky odmietnuté, prekontrolované, 0.

---

## Fáza 15 — Kraj nad obcou, placeholdery (12.8.2026)

**IDE OTA** — len JS, žiadny natívny modul, `app.json` bez zmeny.
Report: `reports/KRAJ_A_PLACEHOLDERY.md`.

### 15.1 Kraj je nad Mesto/obec a zužuje zoznam obcí — ✅ OVERENÉ RUNTIME

Zo zadania boli dve možnosti: kraj zamknúť kým nie je obec, alebo nechať
kraj zúžiť ponuku obcí. **Zvolené zúženie** — je to jeden `eq` v dotaze
oproti blokovaniu prvku a vysvetľovaniu, prečo je zamknutý, a je to jediná
z tých dvoch možností, ktorá je používateľovi na niečo (2 930 obcí → pár
stoviek). **Obec ostáva zdroj pravdy**: jej výber kraj prepíše, takže nemôže
vzniknúť inzerát s obcou v jednom kraji a krajom v inom.

`kraj_test.py` (mimo repa) posiela ostrej DB **tie isté dotazy ako
`CityPicker`, anon kľúčom** — teda s právami appky:

```
obcí spolu 2930 · všetkých 8 krajov zo src/lib/property.ts sedí na city.region
súčet cez kraje 2930 / 2930  → žiadna obec pri zvolenom kraji nevypadne
"nov":  bez kraja 32 → v Prešovskom 5, cudzí kraj v odpovedi 0
"nitr": bez kraja  9 → v Nitrianskom 4, cudzí kraj v odpovedi 0
bez zvoleného kraja sa hľadá po celom Slovensku (9 obcí, nie 0)
```

Prvé pravidlo je to podstatné: kraje sú v `property.ts` reťazce a filter je
`eq` — keby sa jediný nezhodoval so stĺpcom `city.region`, ten kraj by dal
prázdny zoznam obcí a nikto by nevedel prečo.

**Vedľajší nález:** obcí je **2 930**, nie 2 925 — komentáre niesli číslo
z prvého načítania číselníka a doplnené obce sa doň nepremietli. Opravené.

Zúženie je vidieť aj v textoch (hint, nadpis modálu, placeholder, prázdny
výsledok). Prázdny výsledok po novom hovorí **„alebo zmeň kraj vyššie"** —
inak by človek nechápal, prečo mu obec nevyskočí.

### 15.2 Placeholder prestal vyzerať ako vyplnená hodnota — 🟡 ČAKÁ VIZUÁLNE OVERENIE

Zmerané, nie odhadnuté. Placeholder používal `textMuted` — token pre
**skutočný text**, teda nastavený na plný kontrast voči pozadiu:

| | odstup placeholderu od zadanej hodnoty | |
|---|---|---|
| svetlá | 3.65:1 | → **5.50:1** |
| tmavá | **2.61:1** | → **4.83:1** |

V tmavej téme sa prázdne pole od vyplneného takmer nedalo odlíšiť. Nový token
**`textPlaceholder`** (`#988E86` / `#75695F`) drží ≥ 3:1 voči pozadiu poľa —
cieľ nebol placeholder schovať, ale prestať ho vydávať za hodnotu.
`tokens.ts` ostáva jediný zdroj pravdy (§5).

Farba nasadená v 6 súboroch (`ui.tsx`, `search-bar`, `city-picker`,
`street-picker`, `available-from-picker`, `login`), formát **„napr. X"** na
všetkých 11 poliach formulára inzerátu + dopyt, ponuka, prezývka, výber obce.
Zámerne nezmenené: `e-mail`/`heslo` (názov poľa), `+421 9xx xxx xxx` (maska),
`alebo konkrétny dátum — 1.9.2026` a `Napíš, prečo…` (pokyny, nie príklady).

**Obrázok `reports/placeholder_pred_po.png` je vykreslený z hodnôt
v `tokens.ts`, NIE screenshot appky** — dokazuje farby v tokenoch, nie to, ako
to vyzerá na telefóne. Preto 🟡, nie ✅ (§1).

### 15.3 Čo má Rastio overiť na telefóne

- [ ] Kraj je **nad** Mesto/obec; po zvolení kraja hľadá modál len v ňom
      (nadpis to hovorí).
- [ ] Zlý kraj + „Bratislava" → hláška ponúkne zmeniť kraj vyššie.
- [ ] Bez zvoleného kraja sa hľadá po celom Slovensku.
- [ ] Výber obce **prepíše** predtým zvolený kraj.
- [ ] Prázdne pole „Počet izieb" ukazuje `napr. 3` a je zreteľne bledšie než
      napísaná hodnota — **hlavne v tmavej téme**, tam bol problém najväčší.
- [ ] Placeholder ostáva čitateľný, nie je vybledlý do neviditeľna.
- [ ] Rovnaký štýl aj v Ponuke a v Dopyte.

`npx tsc --noEmit` bez chýb. `how-it-works.ts` doplnený o vetu, že kraj sa dá
vybrať skôr a zužuje hľadanie (§8), changelog má záznam (§7).

---

## Fáza 16 — Správy 1:1 a tab Hypotéka (12.8.2026)

**IDE OTA** pre appku. Databáza: migrácia `mig_33_message.sql` už nasadená.
Report: `reports/SPRAVY_A_HYPOTEKA.md`. Skripty `spravy_test.py`
a `kontakt_test.sql` sú mimo repa (§4 — zakladajú používateľov s heslami).

### 16.1 Chat existuje — a menia sa tým predošlé texty

Do dnes appka chat NEMALA a hovorila to nahlas („appka nemá četovanie",
tab sa volal „Obhliadka" a nie „Komunikácia" práve preto). Rastio ho
12.8.2026 pridáva, takže sa v tom istom kroku menia aj tie texty (§8) —
`how-it-works.ts` má novú sekciu „Správy — pýtať sa môžeš hneď" a veta
o četovaní pri dopytoch je prepísaná.

**Vlákno určuje DVOJICA, nie inzerát.** Preto má riadok `recipient_id`.
Keby vlákno určoval len inzerát, vznikla by pod ním spoločná debata
a záujemcovia by videli jeden druhého — to, čo appka inde chráni.

**Identita ostáva pod prezývkou** (Rastiov návrh, súhlasím). Chat je
dostupný vždy, aj pred ponukou, ale sám kontakt neodkrýva — inak by bol
treťou cestou k tomu istému a dve existujúce by stratili zmysel.

### 16.2 Zákaz kontaktu v texte — ✅ OVERENÉ RUNTIME

**Kontrola je v DATABÁZE, nie na klientovi.** Do `message` neexistuje
`insert` policy ani `insert` grant — nie je to zabudnuté, je to celý trik.
Jediná cesta vedie cez `send_message()`, ktorá kontroluje pred `insert`.
`contactInText()` v appke je kópia toho istého pravidla, ale slúži len na
rýchlu odozvu; je pri nej napísané, že to nie je ochrana.

**Zákaz platí VŽDY, aj po odkrytí kontaktu.** Zadanie ponúkalo aj variant
„po odkrytí padne"; zvolený je jednoduchší, a to nie ako kompromis:
podmienený guard by musel pri každom inserte znovu vyhodnocovať „títo dvaja
už majú kontakt" — to isté pravidlo na druhom mieste, a keby ho niekto raz
vyhodnotil zle, **guard sa ticho otvorí**. Po odkrytí sa navyše nič
nestráca: telefón je v tabe Obhliadka. Konkrétna je namiesto toho HLÁŠKA —
hovorí, čo prekáža aj kedy kontakt príde.

`kontakt_test.sql`, 21 vzoriek, **0 chýb**: 11 podôb kontaktu chytených
(vrátane `peter (at) firma.sk` a `jan zavinac gmail bodka com`), 10 bežných
viet prepustených — „3 izby a 78 m2", „zabezpeka 1600 eur", „cena 248000",
„obhliadka 12.8.2026 o 15:00", „platim 100 000 hned a 150 000 do mesiaca".
Prah je 9 číslic v súvislej skupine po zahodení oddeľovačov.

### 16.3 RLS a oznámenie — ✅ OVERENÉ RUNTIME, 17 / 17

`spravy_test.py` zakladá **troch** ľudí, nie dvoch — bez tretieho by sa
nedalo dokázať to podstatné:

```
zákaz kontaktu cez RPC: telefón / e-mail / +421 / (at)     4× HTTP 400 P0001
bežná veta s číslami prejde                                 HTTP 200
priamy INSERT do `message`                                  HTTP 403 / 42501
cudzí záujemca na TOM ISTOM inzeráte vidí                   [] (nič)
neprihlásený vidí                                           HTTP 401
záujemca ZÁUJEMCOVI napísať nemôže   403 „Písať sa dá len s vlastníkom…"
obsah odoslanej správy sa prepísať nedá                     HTTP 403
mark_messages_read: adresát 1, cudzí 0
oznámenie NOVA_SPRAVA vzniklo obom stranám, BEZ textu správy
```

Po behu upratané — inzerát, správy, oznámenia aj traja používatelia.

**🔴 Čo sa pri behu pokazilo:** prvý beh „prešiel" na štyroch bodoch
z nesprávneho dôvodu — inzerát sa nikdy nevytvoril, lebo
`guard_property_publish()` nepustí ACTIVE bez fotky, a detekcia chýb
v skripte ten tvar hlášky nerozpoznala. Testy hlásili „nemôže napísať" tam,
kde neexistoval inzerát. Opravené (DRAFT → fotka → ACTIVE) a **výsledky
vyššie sú z druhého behu.**

### 16.4 Tab Hypotéka — 🟡 ČAKÁ VIZUÁLNE OVERENIE

Kalkulačka v appke bola, ale visela v strede detailu. Teraz je tab a je
**len pri predaji**. Suma sa berie z orientačnej ceny, a keď chýba (v Offerre
smie), z najvyššej ŽIVEJ ponuky; keď sa ponuka od zadanej sumy líši, ponúkne
sa riadkom „dosadiť". **Sadzba je pevná predvoľba označená ako orientačná —
appka nemá odkiaľ brať trhové sadzby** a tvrdiť, že číslo je aktuálne, by
bola lož. Disclaimer je pod výsledkom vždy.

Bez DB, čisto klientský výpočet. Vedľajšia oprava: kalkulačka sa predtým pri
inzeráte BEZ ceny nezobrazila vôbec — teraz vyzve na zadanie sumy.

### 16.5 Čo má Rastio overiť na telefóne

Zoznam je v reporte; v skratke: napísať z oboch strán, skúsiť telefón aj
e-mail (musí odmietnuť), veta s číslami musí prejsť, odznak neprečítaných,
push bez textu správy, nová položka v Upozorneniach, tab Hypotéka pri
predaji a jeho neprítomnosť pri prenájme, posuvná lišta tabov.

### 16.6 Čo NIE JE hotové

**Chat pri dopytoch.** Tabuľka má `request_id`, RLS aj vetvu
v `send_message()` — chýba len obrazovka. Zadanie bolo o detaile inzerátu,
takže sa to nerobilo; migrácia sa kvôli tomu opakovať nebude.

---

## Fáza 17 — Odznak nahlásení a vybavenie s následkom (12.8.2026)

**IDE OTA** pre appku. Databáza: `mig_34_reports.sql` nasadená.
Report: `reports/NAHLASENIA_ODZNAK_A_NASLEDOK.md`. Skript
`nahlasenia_test.py` mimo repa (§4).

### 17.1 Odznak na tabe „Správa" — ✅ OVERENÉ RUNTIME

Odznak sa **vybral zo zvončeka** do `count-badge.tsx` a nosia ho obaja —
druhá kópia tých istých štýlov by sa časom rozišla (zadanie to priamo
žiadalo: „použi rovnaký vzor/komponent, nevymýšľaj nový").

Číslo počíta `admin_pending_reports()` v DB, nie klient: bežný používateľ má
na `report` riadkový prístup k SVOJIM nahláseniam, takže `count(*)` z
klienta by mu vrátil číslo, ktoré s odznakom správcu nesúvisí. Overené —
správca 2, bežný účet 0, neprihlásený HTTP 401.

**Živosť má dve poistky.** Realtime na `offerra.report` (nová v publikácii,
`replica identity full` — bez nej sa RLS pri UPDATE nevyhodnotí a správca by
videl len vznik nahlásenia, nie jeho vybavenie, teda práve tú polovicu, ktorá
číslo znižuje) a prepočet pri návrate do appky (`AppState`). Kanál sa nemusí
otvoriť; bez druhej poistky by číslo ticho zamrzlo. Pri zmene sa
**prepočítava**, nie dopočítava ±1 — to by bola druhá kópia pravidla „čo je
otvorené nahlásenie".

### 17.2 Vybavenie nahlásenia má následok — ✅ OVERENÉ RUNTIME

Doteraz „Označiť ako riešené" prepísalo stav a TO BOLO VŠETKO: spamový
inzerát ostal v katalógu a majiteľ sa nedozvedel nič. Skryť sa dalo v inej
sekcii, ručne — druhý krok sa dal zabudnúť.

`admin_resolve_report(id, hide)` robí v JEDNEJ transakcii: stav → ACTIONED,
voliteľne inzerát → **REJECTED** (nie mazanie, audit trail ostáva)
s `rejection_reason`, upozornenie nahlásenému, a vráti počet jeho potvrdených
nahlásení. Buď všetko, alebo nič — nie stav, kde je inzerát skrytý a človek
o tom nevie.

Predvolené zaškrtnutie „skryť": **Spam / Podvod / Falošný inzerát ✓**,
Realitka / Nevhodný obsah / Iné prázdne (dajú sa vyriešiť aj úpravou textu).
Voľba je len pri inzeráte — pri používateľovi a ponuke by nemala čo spraviť.

Upozornenie má typ **SYSTEMOVE** zámerne: je to jediný typ, ktorý sa nedá
vypnúť. Hovorí ČO sa stalo, aký bol dôvod a že opakovanie môže viesť
k zablokovaniu — a **nehovorí, kto nahlásil** (overené testom, nie tvrdením;
inak by z nahlasovania bol dôvod na odplatu). Pri „Zamietnuť" sa neposiela
nič.

### 17.3 Opakované porušenia — návrh, ktorý čaká na Rastia

Prah **3 potvrdené nahlásenia na OSOBU**, rátané cez všetky jej inzeráty
a ponuky — cez jeden inzerát by stačilo založiť nový a počítadlo by sa
vynulovalo. **Upozorňuje, neblokuje**: tri nahlásenia môžu byť aj cielená
kampaň proti jednému človeku a to rozlíši len človek. Vidno to na karte
„Opakované porušenia" a — dôležitejšie — v hláške hneď pri treťom vybavení,
teda v okamihu rozhodovania.

Test má na to vlastné pravidlo (`appka NIKOHO nezablokovala sama`): keby raz
niekto pridal automatické blokovanie, spadne.

### 17.4 Runtime výsledok

`nahlasenia_test.py`, **18 / 18**, štyria testovací ľudia (dvaja
nahlasovatelia — `report` má unique na dvojicu nahlasovateľ+cieľ). Po behu
upratané.

### 17.5 Čo má Rastio overiť na telefóne

Červený krúžok na tabe Správa a jeho zhoda so zvončekom; naskočenie čísla
BEZ ťuknutia na tab pri novom nahlásení; zníženie po vybavení; prepočet po
návrate do appky; zaškrtnuté políčko pri Spame a prázdne pri Nevhodnom
obsahu; skrytý inzerát v sekcii Inzeráty aj s dôvodom; upozornenie
u nahláseného z druhého účtu; karta a hláška pri treťom potvrdenom.

`how-it-works.ts` doplnený o odsek „a dozvie sa to" (§8), changelog má
záznam (§7).

---

## Fáza 18 — Tab bar v detaile inzerátu bol bug, nie len tesný (13.8.2026)

**IDE OTA.** Report: `reports/TAB_BAR_SCROLL.md`.

Rastio poslal screenshot: 5 podtabov natlačených na jeden riadok. Lišta
už bola v `ScrollView horizontal` od Fázy 13 — problém nebol „nescrolluje",
ale že **nemala prečo**: `tab` mal `flex: 1` vo vnútri scrollovaného
obsahu, ktorý nemá pevnú šírku, takže yoga layout vtesnal všetkých päť
tabov presne do viewportu. Scroll gesto nemalo čo posúvať.

Oprava: `flex: 1` preč (šírka tabu podľa textu), rámik (pozadie, orámovanie)
presunutý z `contentContainerStyle` na vonkajší `View` — zostáva pripnutý
k viewportu pri každej pozícii scrollu, predtým by sa posúval s obsahom.
`overflow: hidden` na vonkajšom `View` odrezáva posledný tab ako náznak,
že lišta pokračuje — zvolené namiesto fade gradientu, ktorý by vyžadoval
`expo-linear-gradient` a teda nový build (§3/§9) len na vizuálny detail.

Skratky názvov (zvažované v zadaní) sa nepoužili — scroll stačí, plné
slová sú lepšie.

**🟡 ČAKÁ VIZUÁLNE OVERENIE.** Skúšané spustiť appku vo webovom móde
a odfotiť automatizovaným prehliadačom — nenabehlo v tomto prostredí
(RN DevTools/Electron bez GUI) a aj keby, RN-web nie je natívne iOS
(§3). Namiesto toho kresba z hodnôt `tokens.ts` a rovnakej matematiky
rozloženia (`reports/tab_bar_pred_po.png`), s otvoreným priznaním, že to
nie je screenshot appky.

---

## Fáza 19 — Chat aj pri dopytoch (13.8.2026)

**IDE OTA.** Databáza: `mig_35_message_request.sql`,
`mig_36_notification_request.sql` nasadené. Report:
`reports/CHAT_PRI_DOPYTOCH.md`.

### 19.1 Znovupoužitý kód, nie kópia — ✅ OVERENÉ RUNTIME

`Conversation` a `OwnerThreads` z `message-thread.tsx` sú exportované
a znovupoužité nezmenené v novom `demand-messages.tsx`; mení sa len
`subject`. `src/lib/messages.ts` prerobené na `MessageSubject = {
propertyId: string } | { requestId: string }` — subjekt s oboma poľami
naraz sa v TypeScripte nedá ani napísať (`propertyId?: never` na druhej
vetve).

### 19.2 Bug objavený počas práce: push k dopytovej správe nikam nesmeroval

`offerra.notification` mala `property_id`/`offer_id`, ale ŽIADEN
`request_id`. `notificationRoute()` má z 9.8.2026 strážny riadok
`if (!propertyId) return null;` presne kvôli podobnej triede chyby — a
nový chat by cezeň prešiel rovnako ticho. Doplnené: stĺpec `request_id`
v `notification`, `push_notification()` dostala tretí parameter
`p_request_id` (aj v `data` pre Expo Push), `notificationRoute()` dostala
vetvu `NOVA_SPRAVA` bez `propertyId` ale s `requestId` → `/dopyt/[id]`.

**Poučenie z `mark_messages_read` (12.8.2026) zopakované správne:**
pridanie parametra cez `create or replace` vytvorí NOVÉ pretaženie, nie
náhradu — pri `push_notification()` bola preto stará 6-argumentová
signatúra najprv explicitne zhodená, aby volanie s pôvodným počtom
argumentov neskončilo `function is not unique`.

### 19.3 Runtime — 13/13, vrátane testu čistej routovacej funkcie v Node

`dopyt_spravy_test.py` (mimo repa): chat funguje pred formálnym
oslovením, zákaz kontaktu platí, RLS izoluje cudzieho, `mark_messages_read`
so starým 2-arg aj novým 3-arg volaním, oznámenie nesie `request_id`.
Bod 6 kopíruje `notificationRoute()` do Node a overuje aj **regresiu** —
že inzerátové oznámenia (`/nehnutelnost/[id]`) sa nezmenili.

Zoznam vecí na vizuálne overenie a `how-it-works.ts`/changelog zmeny sú
v reporte.

---

## Fáza 20 — Countdown regresia (root cause) + tab bar fade (13.8.2026)

**IDE OTA.** DB: 5 seed inzerátov dostalo `offer_deadline`. Report:
`reports/COUNTDOWN_REGRESIA_A_TAB_BAR_FADE.md`.

### 20.1 Countdown štítok — príčina nájdená, NIE je to kód

Zobrazovací kód (`property-card.tsx`, `deadlineLabel`, `deadlineUrgency`,
`PhotoBadge`) bol pri všetkých troch nahláseniach správny. **0 z 50
ACTIVE inzerátov malo `offer_deadline`** — dáta sú test/seed hodnoty
a každé veľké preseedovanie katalógu (9.8.2026, matchujúci `created_at`
naprieč všetkými) ich stratí, lebo žiadny seed skript ich znova
nenastaví. `POCITADLO_FOTIEK_A_TRIEDENIE.md` (8.8.2026) dokazuje, že
presne toto sa už raz stalo a bolo opravené rovnako — seedom, nie kódom.

### 20.2 Test + trvalé pravidlo — ✅ OVERENÉ RUNTIME

`deadlineLabel`/`deadlineUrgency`/`isDeadlinePassed` presunuté do NOVÉHO
`src/lib/deadline.ts` **bez jediného importu** (dôvod, prečo sa doteraz
nedali testovať: `property.ts` importuje `./supabase` na úrovni modulu).
`property.ts` ich re-exportuje, 16 importujúcich miest nezmenených.

`npx tsx scripts/check-deadline.ts` — **12/12**, Node
bez appky a bez DB. CLAUDE.md dostalo **§10 „Veci, čo sa strácajú pri
redizajne"** — countdown a „Pridané [dátum]" (druhá vec, čo bola
v minulosti REGRESIA, komentár v kóde z 9.8.2026).

Dáta opravené na 5 seed inzerátoch (Trenčín PASSED, Zvolen SOON/červený,
Prievidza/Poprad/Martin OPEN) — zámerne NIE na Rastiových vlastných
(reálny biznis atribút, jeho voľba dátumu).

### 20.3 Tab bar — druhé kolo, fade nezávislý od náhody

Prvá oprava (Fáza 18) sa spoliehala na to, že `overflow: hidden` odreže
posledný tab napoly — nezaručené, závisí od zhody šírka obrazovky ↔
súčet šírok tabov. Na Rastiovom telefóne vyšlo 0 % viditeľný piaty tab.

`canScrollRight` sa teraz počíta zo skutočných rozmerov (`onLayout` +
`onContentSizeChange` + `onScroll`), nie z odhadu. `ScrollFade` — 6 pásov
farby pozadia lišty s rastúcou nepriehľadnosťou — napodobňuje gradient
bez `expo-linear-gradient` (nový natívny modul = nový build, §3/§9).

🟡 čaká vizuálne overenie — kontrolný zoznam v reporte.

---

## Fáza 21 — Obhliadka s potvrdením, Moje zjednotené s detailom, odznaky (13.8.2026)

**IDE OTA.** DB: `mig_37_viewing_confirm.sql`, `mig_38_tab_badges.sql`
nasadené. Report: `reports/OBHLIADKA_MOJE_ODZNAKY.md`.

### 21.1 Obhliadka — kontakt až po potvrdení vlastníkom — ✅ OVERENÉ RUNTIME

Mení rozhodnutie z 8.8.2026 (okamžité odkrytie). Žiadosť vzniká ako
`REQUESTED` (bez kontaktu), vlastník ju v tabe Obhliadka potvrdí alebo
odmietne, kontakt sa odkrýva OBOM stranám naraz až s `CONFIRMED` —
rovnaký mechanizmus ako pri prijatí ponuky.

`guard_viewing_update()` je teraz explicitný stavový automat, nie len
„uzavretá sa nemení": REQUESTED→CONFIRMED smie výhradne vlastník
(overené — žiadateľov priamy PATCH dostane 403), REQUESTED→CANCELLED
vlastník (odmietne) alebo žiadateľ (stiahne). Legacy `CONTACT_SHARED`
(riadky spred zmeny) sa NEMENÍ — spätne schovať už videný kontakt by
bolo horšie než pôvodná chyba.

Nové notifikácie `OBHLIADKA_POTVRDENA`/`OBHLIADKA_ZAMIETNUTA` zrkadlia
`PONUKA_AKCEPTOVANA`/`PONUKA_ZAMIETNUTA`. Texty prepísané: `VIEWING_CONSENT`,
`how-it-works.ts` (sekcia aj krátky súhrn), **privacy policy
(`legal.ts`)** — všetky tri predtým tvrdili okamžité odkrytie.

`obhliadka_potvrdenie_test.py`, **17/17**, vrátane žiadateľovho
zamietnutého pokusu o self-CONFIRM a legacy CONTACT_SHARED kompatibility.

### 21.2 „Moje inzeráty" zjednotené s detailom — ✅

Mení rozhodnutie o inline expand-in-place (`InlineOffers`, **zmazané**).
Ťuknutie na ACTIVE/CLOSED v „Moje" vedie teraz do rovnakého
`/nehnutelnost/[id]`, aký vidí cudzí z katalógu — podtaby sú jediné
miesto, kde sa s inzerátom niečo robí. DRAFT/REJECTED naďalej rovno do
editora. „Moje" ostáva prehľad bez akčných tlačidiel.

### 21.3 Odznaky na podtaboch — ✅ OVERENÉ RUNTIME

Jedna RPC (`tab_badges()`) vracia štyri booleany naraz. Správy majú
odznak, NIE nový mechanizmus — číta sa z existujúceho `message.read_at`
(12.8.2026), tab-level „videné" by pokazilo presnosť per-vlákno sledovania.
Ponuky/Obhliadka/Hodnotenia dostali nové stĺpce + `mark_*_viewed()` RPC,
mirroring `mark_offers_viewed()` z 8.8.2026.

**Runtime test odhalil dve veci, ktoré čítanie kódu nechytilo:**
1. `guard_offer_update()` mal nepodmienený blok „uzavretá sa nemení" PRED
   kontrolou KTO/ČO mení — blokoval aj vlastný nový zápis
   `viewed_by_bidder_at`. Oprava: úzka výnimka pred týmto blokom.
2. Chýbajúce STĹPCOVÉ granty na `viewing`/`property_offer`/`rating` (tieto
   tabuľky negrantujú `select *`) — `return=representation` po
   INSERT/UPDATE padal na „permission denied". Oba nálezy zapísané priamo
   v migračnom skripte.

`tab_badges_test.py`, **17/17** — vrátane overenia, že odznak Ponuky po
rozhodnutí svieti ZÁUJEMCOVI, nie vlastníkovi (ten už videl), a že
Hodnotenia svieti len hodnotenému, nikdy hodnotiacemu.

### 21.4 🔴 Incident spôsobený mnou: `package.json` scripts odstrihlo OTA — nájdené a opravené

Kým som pracoval na 20/21, pridanie `tsx` (devDependency + `scripts`
`check:deadline`/`check`) zmenilo EAS fingerprint a **ticho odstrihlo obe
vyššie balíky od Rastiovho TestFlight buildu #5** — žiadna appka to
nehlásila, všimol som si to sám pri porovnávaní `eas update` výstupov.
Príčina: `@expo/fingerprint` hashuje aj `package.json` pole `scripts`,
nielen `dependencies`/natívne moduly. Plný diagnostický postup a dôvod,
prečo trval dlho (lokálny `@expo/fingerprint` bol v tomto prostredí
nespoľahlivý), je v `reports/COUNTDOWN_REGRESIA_A_TAB_BAR_FADE.md`.

**Oprava:** `tsx` scripts odstránené z `package.json` úplne (test beží cez
`npx tsx scripts/check-deadline.ts`), `package.json`/`package-lock.json`
overené byte-identické s posledným known-good commitom. CLAUDE.md §9
opravené (bolo tam nesprávne „appVersion" politika, v skutočnosti
`fingerprint`) + trvalé pravidlo overovať dopad na fingerprint pred
KAŽDOU zmenou `package.json`.

✅ **OVERENÉ RUNTIME** — republikácia (13.8.2026, commit `23b09ae`) cez
skutočný `eas update` vrátila presne `24919867e1…` (iOS) / `eaadbb7eca8…`
(Android) — zhoda s buildom #5. Toto dokazuje, že balík je publikovaný
pod runtimom, ktorý appka vie stiahnuť — **nie** že appka na telefóne
balík už stiahla; to potvrdí len Rastio.

---

## Fáza 22 — RLS chyba pri obhliadke, rotujúca titulná fotka, Podozriví používatelia (13.8.2026)

**IDE OTA.** DB: `mig_39_suspicious_users.sql` nasadená. Reporty:
`reports/RLS_ROTACIA_PODOZRIVI.md`.

### 22.1 RLS chyba pri „Chcem obhliadku" — príčina nájdená, NIE je to chyba RLS

Rastio nahlásil technickú hlášku „new row violates row-level security
policy for table viewing". Diagnostika (`moderacia_test.py`, 8/8) ukázala:
**RLS bola SPRÁVNA** — `property_select_public` (mig_02, nezmenené odvtedy)
už dávno púšťa len `status = 'ACTIVE'`, REJECTED aj CLOSED sú neverejné.
Skutočná chyba bola v appke: obrazovka detailu si stav inzerátu natiahla
LEN raz pri otvorení a nikdy znova, takže keď admin medzičasom inzerát
skryl, tlačidlo „Chcem obhliadku" ostalo klikateľné so ZASTARANÝM stavom
— server ho správne odmietol (kód `42501`), len appka o tom nevedela.

Oprava (bez zmeny RLS, tá bola v poriadku):
1. `useProperty()` (`use-properties.ts`) dostal Realtime kanál na vlastný
   riadok — zmena stavu príde do appky živo, rovnaký princíp ako
   `usePendingReports`.
2. `nehnutelnost/[id].tsx` dostal `useRefreshOnFocus(reloadProperty)` —
   druhá poistka, doteraz to mali len ponuky.
3. `closed` (gate na tlačidlá) už číta aj `item.status`, nielen uzávierku
   — predtým mohol bidder vidieť aktívne tlačidlo na CLOSED inzeráte
   uzavretom PRED uzávierkou (majiteľ prijal ponuku skôr).
4. `ViewingCard.ask()`: kód `42501` teraz ukáže LEN „Tento inzerát už nie
   je dostupný" (surová chyba naďalej ide do logu, nikdy sa nezahadzuje —
   §2) a hneď spustí `reloadProperty()`.

Mimochodom overené (nie nová práca, len potvrdené naživo): vlastník
REJECTED inzerátu vidí dôvod BEZ identity nahlasovateľa — toto už robil
`inzerat/[id].tsx` od Fázy 17 (`rejection_reason`), test to len potvrdil.

🟡 čaká vizuálne overenie — nedá sa vyrobiť naživo scenár „nahlásenie
prišlo, kým mal Rastio obrazovku otvorenú" bez čakania; over prosím, že
appka pri bežnom používaní nesype chyby do logu `[OBHLIADKA]`/`[DETAIL]`.

### 22.2 Rotujúca titulná fotka — ✅ OVERENÉ RUNTIME (logika)

`src/lib/cover-photo.ts` (bez importov, testovateľné) — `coverPhotoIndex(id, count, seed)`.
Seed sa vygeneruje raz pri načítaní modulu (= raz za spustenie appky).
`npx tsx scripts/check-cover-photo.ts` — **5/5**: index stály v rámci
jedného seedu, mimo rozsahu nikdy, rôzne seedy → rôzny index pre ten istý
inzerát, rôzne inzeráty v tom istom seede → nie vždy tá istá fotka.
Číslo v rohu karty (`2/6` a pod.) teraz ukazuje SKUTOČNÚ pozíciu, nie
vždy „1".

🟡 vizuálne — over na telefóne cez aspoň DVE spustenia appky (force quit +
znova otvoriť), že titulka na karte s viacerými fotkami je iná.

### 22.3 Admin — „Podozriví používatelia" — ✅ OVERENÉ RUNTIME

Tri vzorce, LEN signály na ručnú kontrolu (rovnaký princíp ako
`admin_repeat_offenders`) — appka nikoho neblokuje sama:

1. **Záplava ponúk** — ponuky na ≥10 RÔZNYCH inzerátov za 24 h (obe čísla
   nastaviteľné).
2. **Opakovane nízke ponuky** — ≥3 rôzne inzeráty s ponukou pod 50 %
   orientačnej ceny (obe čísla nastaviteľné). Inzeráty bez orientačnej
   ceny sa nerátajú — nemajú s čím porovnať.
3. **Opakovane ponúka tomu istému vlastníkovi** (PRIDANÉ BEZ PÝTANIA,
   zadanie: „ak ťa napadne ďalší rozumný vzor, pridaj ho") — ≥3 rôzne
   inzeráty TOHO ISTÉHO predávajúceho od jedného záujemcu. Dôvod: pri
   OTVORENÝCH ponukách (sumy sú verejné) sa dá takto druhým účtom umelo
   nadsadzovať vlastná cena.

Prahy sú **admin-konfigurovateľné** cez `app_config`/`admin_set_config`
(zadanie: „daj nejaké parametre, kde sa dá definovať, čo je podozrivé") —
rovnaký mechanizmus ako existujúci `max_active_listings`, nová karta
„PODOZRIVÍ POUŽÍVATELIA — PRAHY" v Nastaveniach.

**Existujúci check na rovnaký telefón/e-mail naprieč účtami** (spomenutý
ako „už bol riešený, over stav"): je **hotový a beží** —
`admin_duplicate_contacts()` z 9.8.2026 (Fáza 12/`mig_19`), karta
„ROVNAKÝ KONTAKT NA VIACERÝCH ÚČTOCH" v Nastaveniach. Nová práca sa ho
netýkala, len sa jeho stav overil.

`podozrivi_test.py`, **13/13** — vrátane: bežný (nie admin) účet dostane
prázdny zoznam, nie cudzie dáta; bežný záujemca s 1–2 ponukami sa NIKDE
neobjaví (žiadny falošný poplach); zmena prahu cez `admin_set_config`
naozaj mení, čo sa ukáže; bežný účet prah zmeniť nesmie.

---

## Fáza 23 — Autosave, GDPR export, rate limiting, undo okno, walkthrough (14.8.2026)

Päť samostatných položiek zo zadania Rastia, zaradených až po dokončení
predošlého backlogu (obhliadka s potvrdením, Moje zjednotené, chat —
Fázy 16/19/21). Report: `reports/AUTOSAVE_GDPR_RATELIMIT_UNDO_WALKTHROUGH.md`.
DB: `mig_40_gdpr_export.sql`, `mig_41_rate_limiting.sql` nasadené priamo
(scratchpad, mimo repa podľa §4).

### 23.1 Autosave rozpracovaného inzerátu — ✅ OVERENÉ RUNTIME (logika), 🟡 odpočet na zariadení

DRAFT riadok v DB existuje od tapnutia „+ Pridať nehnuteľnosť" už od Fázy 1
(kvôli fotkám) — appka tak už mala polovicu poistky. Chýbalo priebežné
ukladanie POLÍ formulára: doteraz sa do DB zapisovali až na tlačidlo
„Uložiť koncept". `inzerat/[id].tsx` má teraz debounced autosave (2,5 s
ticha po poslednej zmene → tichý zápis, žiadny toast) navyše k
`form-draft.ts` (ktorý drží text v pamäti procesu, nie cez reštart appky).

`pridat.tsx` navyše ponúkne najnovšie upravený DRAFT rovno hore ako kartu
„Pokračovať v rozpracovanom inzeráte?" — nie len ako riadok v zozname
nižšie. Výber čistou funkciou `src/lib/draft-resume.ts`
(`npx tsx scripts/check-draft-resume.ts`, **6/6**).

Debounce/časovanie samotné je klientský `setTimeout` — nedá sa dokázať bez
zariadenia (§1, „grep a čítanie kódu nedokazuje NIČ").

🟡 **Čo Rastio otestuje**: rozpísať pár polí v editore, počkať pár sekúnd,
appku force-quit-núť, znova otvoriť a ísť do „Pridať" — má tam byť karta
„Pokračovať v rozpracovanom inzeráte?" a otvorený koncept má mať zapísané
to, čo bolo rozpísané pred zabitím appky (nie prázdny formulár).

### 23.2 GDPR export „Stiahnuť moje dáta" — ✅ OVERENÉ RUNTIME (21/21)

Nová RPC `offerra.export_my_data()` (SECURITY DEFINER, scope-nutá výhradne
na `auth.uid()`) vracia JSON so všetkým: profil, inzeráty (+ fotky), podané
aj prijaté ponuky, dopyty, oslovenia (odoslané/prijaté), obhliadky (moje aj
na mojich inzerátoch), hodnotenia (dané/prijaté), správy, uložené
vyhľadávania. Tlačidlo v Nastaveniach → natívny `Share` z `react-native`
(ZÁMERNE nie `expo-file-system`/`expo-sharing` — nový natívny modul by
odstrihol OTA presne ako incident 21.4).

`gdpr_export_test.py`, **21/21** naživo: dvaja používatelia s krížovými
ponukami/obhliadkami/hodnoteniami/správami/dopytom, export A obsahuje
VŠETKO svoje a NIČ z bytu/dát B (a naopak), anon dostane 401/403.

### 23.3 Rate limiting proti spamu — ✅ OVERENÉ RUNTIME (14/14)

Server-side (BEFORE INSERT triggery na `property_offer`, `message`,
`property`, `viewing`), nie len klientská kontrola — dopĺňa plánované
„Podozrivých používateľov" (22.3): toto je PREVENCIA, tamto DETEKCIA.

Predvolené prahy: 10 ponúk/60 min, 20 správ/min, 5 nových inzerátov/60 min,
10 žiadostí o obhliadku/60 min — všetky admin-nastaviteľné cez novú kartu
„RATE LIMITING — PRAHY" v Nastaveniach (rovnaký `app_config`/
`admin_set_config` mechanizmus ako 22.3).

Kontrola beží LEN keď `auth.uid()` sedí so stĺpcom pôvodcu (bidder_id/
sender_id/owner_id/requester_id) — seed skripty a migrácie idú cez
Management API bez JWT, takže sa ich netýka. Overené priamo (bod 6 nižšie).

`rate_limit_test.py`, **14/14** naživo: admin zníži prah na malé číslo,
presne N akcií prejde a (N+1). je zablokovaná s ľudskou hláškou
(„Príliš veľa ponúk za krátky čas…"), bežný účet prah zmeniť nesmie (403),
6 priamych SQL insertov (seed) rate limit vôbec nevidí.

### 23.4 „Zrušiť" undo okno — ✅ OVERENÉ RUNTIME (logika, 4/4), 🟡 vizuál na zariadení

`toast.tsx` dostal druhú funkciu v TOM ISTOM provideri (nie druhý systém
spätnej väzby vedľa seba) — `confirmWithUndo(text, commit)`: zobrazí 5 s
odpočet s tlačidlom „Zrušiť", server sa akcie dotkne AŽ po dobehnutí,
zrušenie = commit sa nikdy nezavolá. Zapojené na troch miestach zo
zadania:

- **Odmietnuť ponuku** (`owner-offers.tsx`) — doteraz bez akéhokoľvek
  potvrdenia, teraz undo okno ako jediná poistka.
- **Zmazať inzerát** (`inzerat/[id].tsx`) — undo okno PRIDANÉ K
  existujúcemu dvojitému Alert potvrdeniu, nie namiesto neho (dve rôzne
  veci: potvrdenie chráni pred omylom v úmysle, undo pred preklikom tesne
  predtým).
- **Zablokovať používateľa** (admin.tsx) — len smer BLOKOVANIA, nie
  odblokovania (to nie je riziková akcia zo zadania).

Odpočet samotný (`src/lib/undo-countdown.ts`, čistá funkcia) —
`npx tsx scripts/check-undo-countdown.ts`, **4/4**: 5→4→…→0 dobehne presne
v 5 tikoch. Samotné vykreslenie/tap na „Zrušiť" na zariadení je klientský
timer — nedá sa dokázať bez zariadenia.

🟡 **Čo Rastio otestuje**: skús odmietnuť ponuku/zmazať inzerát/zablokovať
používateľa a hneď ťukni „Zrušiť" — akcia sa nesmie vykonať. Potom skús
znova a nechaj odpočet dobehnúť — akcia sa MUSÍ vykonať.

### 23.5 Úvodný walkthrough pred prvým prihlásením — ✅ OVERENÉ RUNTIME (gate, 13/13), 🟡 vizuál na zariadení

Nová obrazovka `walkthrough.tsx`, PRED loginom (`LOGIN → PREZÝVKA →
UPOZORNENIA` je onboarding PO prihlásení, toto je krok pred ním). Obsah je
ZDIEĽANÝ `HOW_STEPS` z `how-it-works.ts` (5 krokov) — ZÁMERNE nie nový
text, aby platilo CLAUDE.md §8 (jedno miesto pravdy o mechanike appky,
inak tretia kópia textu, čo je presne riziko, kvôli ktorému §8 vzniklo).
Preskočiteľné, „len raz" cez nový `WalkthroughProvider`
(`use-walkthrough.tsx`, AsyncStorage) — rovnaký dôvod ako `ProfileProvider`
byť JEDEN zdieľaný stav (komentár v `_layout.tsx`, 7.8.2026): brána musí
vidieť ZMENU príznaku, nie len jeho hodnotu pri štarte appky.

`src/lib/gate.ts` (`decideRoute`) rozšírené o krok walkthroughu.
**Objav pri písaní testu**: komentár v `gate.ts` už dlho tvrdil „pokryté
testom", no v repe žiadny testovací skript pre `decideRoute` nebol —
doplnené (`scripts/check-gate.ts`), teraz **13/13**, vrátane explicitného
dôkazu, že EXISTUJÚCI prihlásený účet walkthrough NIKDY nedostane
dodatočne (aj keby mal `walkthroughSeen: false`, čo pri reálnom účte s
existujúcou session ani nenastane).

🟡 **Čo Rastio otestuje**: appku predtým odinštalovať alebo vymazať dáta
(inak `walkthroughSeen` z predošlého inštalu appku rovno pustí na login) —
pri úplne prvom spustení sa má ukázať 5 obrazoviek s „Preskočiť" hore a
„Ďalej"/„Začať" dole, po dokončení/preskočení už NIKDY znova (ani po
odhlásení a opätovnom prihlásení).

### 23.6 Nasadenie

Všetko **IDE OTA** — `package.json` sa v tejto dávke vôbec nezmenil
(overené `git diff --stat package.json package-lock.json` pred aj po,
prázdne), žiadny nový natívny modul (`Share` z `react-native` a
`@react-native-async-storage/async-storage` sú už súčasťou existujúcej
binárky). `npx tsc --noEmit` čisté po každom bloku zmien.

---

## Fáza 24 — Regresia: fotky zmizli z kariet katalógu (14.8.2026)

Nahlásil Rastio: badge/srdiečko/zdieľať fungovali, obrázok chýbal — len
prázdne farebné pozadie. Report: `reports/REGRESIA_FOTKY_KATALOG.md`.

### 24.1 Koreňová príčina — ZMERANÁ, nie odhadnutá

**Nebola to rotujúca titulná fotka ani seed dáta**, ako znela hypotéza v
zadaní. Bol to môj vlastný pozostatok: runtime dôkazové skripty tejto
session (`rate_limit_test.py`, `gdpr_export_test.py`, Fáza 23) vytvorili
v PRODUKČNEJ DB skutočné ACTIVE inzeráty s falošnou fotkou
`https://example.invalid/x.jpg` — doména, ktorá zámerne nikdy neexistuje
(RFC 2606), použitá v testoch presne preto, aby sa nedala omylom
zameniť za reálnu. Po teste som ich ale **nezmazal**.

Katalóg radí najnovšie-prvé (`sortProperties`, Fáza 6). Tieto testovacie
inzeráty vznikli ~02:49–02:53 dnes, teda tesne pred nahlásením — dostali
sa tak na úplný vrch, presne tam, kde ich Rastio uvidí ako prvé bez
scrollovania.

**Prečo to vyzeralo ako prázdne pole, nie ako „Bez fotky":** `cover`
(URL) bol NEPRÁZDNY reťazec (`example.invalid/x.jpg`), takže appka
vybrala vetvu `<Image>`, nie textový fallback „Bez fotky" (ten sa
spúšťal len pri PRÁZDNOM `cover`). `<Image>` s nedostupnou adresou
jednoducho nič nevykreslí — zostane viditeľné len sivé pozadie karty.
Presne to Rastio opísal.

**Zmerané, nie predpokladané:**

```sql
select count(*) as broken from offerra.media where url like '%example.invalid%';
-- pred opravou: 12 (naprieč 12 ACTIVE inzerátmi z dnešných testov)
-- po zmazaní testovacích účtov: 0
```

Rotujúca titulná fotka (`cover-photo.ts`) aj seed dáta (dvojnásobný seed,
Fáza 11.28) sú v poriadku — overené naživo na reálnych dátach (24.3).

### 24.2 Oprava — zmazanie testovacích dát

10 testovacích účtov (`GdprA`, `GdprB`, `RlAlice…`, `RlBob…`, `RlAdmin…`)
zmazaných cez Auth Admin API (`DELETE /auth/v1/admin/users/{id}`) —
kaskáda (`profile_id_fkey`, `media_property_id_fkey` atď., všetky
`ON DELETE CASCADE`) sama zmazala ich 12 inzerátov aj fotky. Žiadny ručný
SQL DELETE nebol treba, jeden čistý zásah na koreni namiesto čistenia
každej tabuľky zvlášť.

**Poučenie do budúcna**: runtime dôkazové skripty s reálnymi Auth
používateľmi (zavedený vzor tejto appky, CLAUDE.md §4) musia po sebe
ČISTIŤ, keď vytvárajú ACTIVE (verejne viditeľné) dáta — nie len keď
vytvárajú DRAFT/testovacie účty, ktoré cudzí nevidí. Doteraz som to pri
DRAFT-only skriptoch nepotreboval riešiť; pri ACTIVE inzerátoch to bola
chyba, ktorú by som mal robiť vždy, nie len teraz spätne.

### 24.3 Oprava — fallback placeholder pre nedostupnú fotku

`property-card.tsx`: `<Image>` teraz má `onError`, ktorý prepne kartu na
ten istý placeholder, aký doteraz platil len pre PRÁZDNE `cover` — ikona
domu (`Icon name="house"`) + text „Bez fotky" na sivom pozadí, nikdy viac
holé farebné pole bez signálu. Platí to isté pre PRÁZDNU aj NEDOSTUPNÚ
titulnú URL, jedna spoločná vetva namiesto dvoch.

### 24.4 Dôkaz

`foto_regresia_test.py` (mimo repa), **4/4** — simuluje presne to, čo
appka robí (`useProperties()` cez anon REST + `coverPhotoIndex()`):
žiadny ACTIVE inzerát nemá prázdnu titulnú URL, žiadna media URL v DB už
neobsahuje `example.invalid`, a vzorka 15 titulných URL sa naozaj stiahne
(HTTP 200) — nie len že existuje záznam v DB, ale že fotka je skutočne
dostupná.

`npx tsc --noEmit` čisté.

🟡 **Čo Rastio otestuje**: otvoriť appku, katalóg — fotky sa majú
zobrazovať normálne na viacerých kartách. Fallback placeholder
(ikona domu na sivom) sa dá reálne vyvolať len s naozaj rozbitou URL,
takže jeho vzhľad je 🟡 aj po tomto dôkaze — vizuálne overenie, či ikona
vyzerá dobre, nie len že sa kód spustí.

### 24.5 Nasadenie

**IDE OTA** — len JS zmena v `property-card.tsx`, `package.json` sa
nedotkol. Dátové čistenie bolo priamo v DB (bez migračného súboru,
nebola to zmena schémy).

---

## Fáza 25 — Pád pri „Upraviť" systémovo + fullscreen galéria (17.8.2026)

Report: `reports/REALTIME_REGISTER_A_FULLSCREEN_GALERIA.md`.
Rastio žiadal pri bode 1 výslovne architektonické riešenie, nie tretiu
záplatu — bol to druhý výskyt toho istého vzoru.

### 25.1 Koreňová príčina — ✅ OVERENÉ RUNTIME, a je INÁ než hovorilo zadanie

Zadanie: „`.on()` MUSÍ byť pred `.subscribe()`". **Toto nebola príčina —
ani teraz, ani 8.8.2026 pri `NotificationBell`.** Poradie bolo na oboch
miestach správne a v jednej reťazi (`git show 83d6009`).

Skutočná príčina, `realtime-js` `RealtimeClient.channel()`:

```js
const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
if (!exists) { …vytvor nový… } else { return exists; }
```

`supabase.channel(topic)` pri rovnakom názve vracia **už existujúci, často
už pripojený** kanál. `useProperty(id)` je na ŠTYROCH obrazovkách (detail,
editor, ponuka, ponuky) a expo-router necháva predošlú namontovanú → klik
na „Upraviť" sadol na kanál detailu → `.on()` naň → pád. Ten istý
mechanizmus ako `AppHeader` na štyroch taboch.

**Druhá, TICHÁ chyba toho istého vzoru:** per-instance `removeChannel`
v cleanupe vypol Realtime aj obrazovke, ktorá ostala otvorená. Appka
nespadla, nič nenahlásila — len prestali chodiť živé zmeny. Samotná oprava
crashu by to nechala nedotknuté.

### 25.2 Zdieľaný register — ✅ OVERENÉ RUNTIME (20/20)

`src/lib/realtime.ts` (čistá vrstva, v Node testovateľná — vzor `deadline.ts`)
+ `src/hooks/use-realtime-channel.ts` (vpichne `supabase`).

Volajúci nedostane `.on()`, `.subscribe()` ani kanál — odovzdá odbery ako
DÁTA. Tri garancie, každá zabíja jednu pozorovanú chybu:

| Garancia | Čo tým zaniklo |
|---|---|
| reťaz skladá register, `.on()` po `.subscribe()` sa nedá napísať | nesprávne poradie sa nedá vyjadriť |
| jeden kanál na topic + počítadlo odberateľov | **pád, ktorý Rastio nahlásil** |
| zatvorenie až pri odchode POSLEDNÉHO odberateľa | tichá strata živých zmien |

Názov kanála obsahuje odtlačok odberov → dva rôzne odbery pod tým istým
logickým topicom dostanú dva kanály a oba fungujú.

### 25.3 Zoznam VŠETKÝCH miest s Realtime kanálom — ✅ všetky prevedené

`grep -rn "\.channel(" src/` pred prácou = tri skutočné volania:

| Miesto | Topic | Stav |
|---|---|---|
| `use-properties.ts` (`useProperty`) | `property-<id>` | ✅ prevedené — **toto padalo** |
| `use-notifications.ts` (zvonček) | `notif-<userId>-<suffix>` | ✅ prevedené |
| `use-pending-reports.ts` (admin odznak) | `reports-<suffix>` | ✅ prevedené |

Po prevode grep nevracia **žiadne** ručné volanie; kanál vzniká jedine
v registri. Zostali tri zásahy v komentároch.

### 25.4 Dôkaz — ✅ OVERENÉ RUNTIME, 20/20

`npx --yes tsx scripts/check-realtime.ts`. Napodobenina klienta kopíruje
`realtime-js` v oboch vlastnostiach, ktoré pád spôsobili. **Prvá kontrola
priamo dokazuje, že napodobenina pôvodný pád vie vyrobiť** — pustí starý
ručný kód a čaká chybu `cannot add postgres_changes callbacks for
realtime:property-9a0aac62 after subscribe()`. Bez nej by test nedokazoval
nič.

Ďalej: scenár detail+editor (bez pádu, 1 kanál, poradie `on → subscribe`,
zmena dorazí obom), 4 obrazovky naraz, životnosť kanála pri postupnom
odchode, rôzne odbery na tom istom topicu, stav pre neskorého odberateľa,
dvojitý cleanup, chyba v jednom handleri.

**Test našiel skutočnú dieru v mojom kóde:** register otváral kanál aj pri
prázdnych odberoch — pripojil by sa a nikdy nič nedoručil. Poistka je teraz
v registri, nie len v hooku.

### 25.5 Fullscreen galéria — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

`src/components/photo-lightbox.tsx`. Otvára sa ťapnutím na fotku aj ikonou
`arrow.up.left.and.arrow.down.right`, na TEJ fotke, ktorú človek pozerá.
Listovanie, počítadlo (`PhotoBadge` z `ui.tsx` — neprepisované druhý raz),
pinch-to-zoom + dvojťap, zatvorenie X / potiahnutím dole / systémovým Späť.
Kým je fotka priblížená, paging sa vypína (inak si pinch a paging kradnú
gesto). Do `icon.tsx` pribudli `arrow.up.left.and.arrow.down.right` a
`xmark` vrátane textových náhrad.

Čierne pozadie je jediná hardcodovaná farba — vedomá výnimka z §5,
zapísaná v komentári.

### 25.6 Dôkaz k galérii — 🟡, a čo z neho NEVYPLÝVA

`npx tsc --noEmit` čisté, `npx expo export --platform ios` prešiel (5,2 MB
Hermes). To dokazuje, že sa kód **preloží a je v balíku** — NIE že gestá na
telefóne fungujú (§1: neodvodzuj B z A).

Overené, že nový kód v balíku naozaj JE. Hermes ukladá ne-ASCII ako UTF-16,
takže prvé hľadanie `grep`om falošne hlásilo „chýba"; po prehľadaní oboma
kódovaniami sedí `Dvojťap priblíži`, `[GALÉRIA] Otváram fullscreen`,
`Zavrieť fotku`, `pripájam sa na existujúci kanál`, `posledný odberateľ`
(utf-16-le) a `__workletHash` (utf-8). `__workletHash` = babel plugin pre
worklety sa naozaj spustil (`babel.config.js` v repe nie je, rieši to
`babel-preset-expo`).

### 25.7 OTA — ✅ OVERENÉ, prvé použitie reanimated

Fullscreen je prvé použitie `react-native-reanimated` v appke, takže
overené, či je v binárke buildu #5:

```
$ git show 40e3db0:package.json | grep -E "reanimated|worklets|gesture-handler"
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-worklets": "0.10.1"
```

`40e3db0` = commit buildu #5. Verzie **identické** s dnešnými → moduly sú
skompilované v binárke. **IDE OTA**, nový build netreba. `package.json` ani
`package-lock.json` sa nezmenili.

**Publikované 17.8.2026 — runtime overený podľa §9:**

| | Runtime |
|---|---|
| publikovaná OTA (iOS), group `e67997d3` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| posledný `finished` iOS build (#5, 9.8.2026) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → balík sa na Rastiov TestFlight **dostane**. Commit v OTA:
`8a8a1fa`. Android runtime `eaadbb7e…` (vlastná vetva, bez iOS buildu).
`git status` po publikovaní čistý, `package.json` nedotknutý.

### 25.8 🔴 Skoro som zopakoval incident z 13.8.2026

`npx expo lint` si **sám doinštaloval `eslint` + `eslint-config-expo` do
`devDependencies`** — presne tá trieda zmeny `package.json`, ktorá
13.8.2026 odstrihla dva OTA balíky od buildu #5 (§9). Zachytené hneď po
behu, `git checkout -- package.json package-lock.json` vrátil, finálna
kontrola čistá (`git diff --stat` prázdny).

**Dôsledok: `expo lint` sa v tomto repe nedá spustiť bez porušenia §9.
Lint v tejto dávke NEPREBEHOL** — vedomá diera v overení, nie
prehliadnutie. Rozhodnutie, či eslint pridať (znamená nový build), je
Rastiovo.

### 25.9 §10 kontrola — ✅ OVERENÉ RUNTIME

Dotkol som sa obrazovky detailu, takže povinné:

- countdown logika `check-deadline.ts` 12/12 OK
- countdown DÁTA: 3 ACTIVE s uzávierkou v budúcnosti (Prievidza 5 dní,
  Poprad 12, Martin 21) — štítok má na čom byť vidieť
- „Pridané [dátum]" na karte: `property-card.tsx:233`, nedotknuté
- `example.invalid` v `media` = 0, ACTIVE bez fotky = 0, vzorka titulných
  fotiek 12/12 HTTP 200

### 25.10 Pravidlo v CLAUDE.md — ✅ zapísané

Nová sekcia **§11 „SUPABASE REALTIME — LEN CEZ `useRealtimeChannel`"**:
zákaz ručného `supabase.channel(...)`, vysvetlenie, prečo príčinou nikdy
nebolo poradie `.on()`/`.subscribe()`, kontrolný zoznam (grep, test 20/20,
zákaz `tsx` v `package.json`).

§8 („Ako funguje Offerra") **zámerne nemenené** — ani oprava pádu, ani
fullscreen nemenia mechaniku appky.

---

## Fáza 26 — Galéria sľubovala gestá, ktoré nefungovali (17.8.2026)

Nahlásené hodinu po Fáze 25: fullscreen sa otvorí, nápoveda sa zobrazí,
ale swipe do strán nelistuje (počítadlo stojí na `3/3`), swipe dole
nezatvára, funguje len X. Podrobne:
`reports/GESTA_GALERIE_NEFUNGOVALI.md`.

### 26.1 Koreňová príčina — ✅ OVERENÉ (zo zdrojov RNGH 2.32, s riadkami)

Dvojitá, a ani jedna polovica nič nenahlási:

1. **`Gesture.Exclusive(doubleTap, pan)`** = `requireToFail`
   (`gestureComposition.ts:115`) → ťah čaká, kým zlyhá dvojťap. Dvojťap bez
   `maxDistance` na pohyb prsta **nezlyhá**: `RNTapHandler.m:57` má
   `maxDeltaX/maxDeltaY/maxDistSq = NAN`, `shouldFailUnderCustomCriteria`
   (`:226`) ich s NAN preskočí. Zlyhá až na časovači → prst je hore →
   `pan.onEnd` nepríde nikdy. **Preto swipe dole nerobil nič.**
2. **`Gesture.Pan` vnútri `ScrollView`** — RNGH povolí súbežné rozpoznávanie
   s pan gestom scroll view len natívnemu handleru
   (`RNGestureHandler.mm:582`), inak `NO` (`:579`). Čakajúci ťah teda
   **zablokoval scrollovanie**, a keďže sám nesmel začať, nepohnulo sa nič.
   **Preto nelistovalo ani počítadlo.**

X fungovalo, pretože je `Pressable` mimo `GestureDetector` — súhlasí
s nahlásením a je to ďalší dôkaz, že chyba bola v gestách, nie v modale.

### 26.2 Čo príčina NEBOLA — 🔴 môj prvý tip bol nesprávny

Chýbajúci `GestureHandlerRootView` v `Modal`e je **Androidí** problém, nie
iOS-ový: na iOSe je to obyčajný `View` + kontext
(`GestureHandlerRootView.tsx`), natívny komponent má len Android
(`RNGestureHandlerRootViewComponentView.mm:7` — *„RNGestureHandlerRootView
is Android-only"*), a RNGH si modal ošetruje sám
(`RNGestureHandlerManager.mm:285`, vetva
`RCTFabricModalHostViewController`). Rastio hlásil z iPhonu, takže toto
jeho problém nevysvetľuje. Do modalu som ho **aj tak pridal** — Androidu
treba — ale ako príčinu som ho takmer nahlásil nesprávne a zachytilo to len
prečítanie zdrojov namiesto prevzatia najčastejšej rady.

Zapísané v CLAUDE.md §12b, aby sa tento tip nehádal znova.

### 26.3 Oprava — ✅ súboje odstránené, nie doladené

| Predtým | Teraz |
|---|---|
| `ScrollView` + `pagingEnabled` + `Gesture.Pan` vnútri | žiadny ScrollView — pás fotiek posúva jedno `Gesture.Pan` cez reanimated |
| `Simultaneous(pinch, Exclusive(doubleTap, pan))` | `Simultaneous(pinch, pan, doubleTap)` |
| dvojťap bez `maxDistance` | `.maxDistance(16)` (`TAP_SLOP`) |
| logika v workletoch | `src/lib/gallery-gesture.ts`, rozhodnutia cez `runOnJS` |
| priblíženie vypínalo `scrollEnabled` | priblíženie prepína, čo ten istý ťah robí |

Nové: pružný odpor na krajoch pásu, bledenie pri ťahu dole, snap-back pri
prerušenom geste, zrušenie priblíženia pri prechode na inú fotku.

### 26.4 Dôkaz — ✅ OVERENÉ RUNTIME (33/33), a čo z neho NEVYPLÝVA

`npx --yes tsx scripts/check-gallery.ts` → **33/33 OK**. Pokrýva presne
nahlásené symptómy — vrátane sekcie „POČÍTADLO sa MUSÍ meniť (Rastio:
„zostáva 3/3")", ktorá prejde postup `3/3 → 2/3 → 1/3 → 1/3 → 2/3`, a
sekcie o zatváraní (130 px zatvorí, 50 px nie, ťah nahor nikdy).

**NEDOKAZUJE**, že gesto do kódu dorazí — to je natívna vrstva a pocit
v ruke, teda vec zariadenia (§1). Skript to na konci sám vypíše, aby to
nešlo prehliadnuť.

**✅ POTVRDENÉ POUŽÍVATEĽOM (Rastio, 17.8.2026):** „Gestá fungujú, listuje
aj zatvára" — na TestFlight builde #5 po tejto OTA. Menovite potvrdené je
**listovanie do strán** a **zatvorenie potiahnutím dole**. Dvojťap a
štipnutie Rastio menovite nepotvrdil, tie ostávajú **🟡** (§1 — neodvodzuje
sa B z A).

Ostatné: `npx tsc --noEmit` čisté · `check-realtime` 20/20 ·
`check-deadline` 12/12 · `expo export --platform ios` prešlo, texty
nápovedy aj `__workletHash` (35×) v bundle.

### 26.5 §10 kontrola — ✅ OVERENÉ RUNTIME

- countdown logika 12/12; **dáta:** 3 ACTIVE inzeráty s uzávierkou
  v budúcnosti (Prievidza 4 dni, Poprad 11, Martin 20)
- dáta na listovanie: **49 z 50** ACTIVE inzerátov má 2+ fotky
- `grep "\.channel("` mimo registra: len komentáre (§11 drží)

### 26.6 Knižnica vs. vlastné — 🟡 rozhodnutie ostáva Rastiovi

Zadanie žiadalo overiť hotovú knižnicu a nahlásiť pred implementáciou.

- Sesterské projekty **žiadnu knižnicu na galériu nemajú**. Famiglia má
  `fullscreen-photo.tsx`, ale je to jedna fotka **bez gest** (len
  `Pressable`), rovnako `story-viewer.tsx` → ako vzor nepomôžu.
- `react-native-awesome-gallery` **nepribudne natívny modul** (stojí na
  reanimated + gesture-handler, oboje v binárke od buildu #5).
- **Fingerprint (§9) sa NEDOMERAL.** Zmerané: `package.json` so záznamom
  knižnice **bez inštalácie** runtime nezmenil (oboje
  `24919867e1bcc84715b1b4d6998cb6b27886e5d9`, merané na zahodenej vetve
  `fingerprint-test`, nie na produkcii). To je **proti očakávaniu** —
  fingerprint teda počíta nainštalovaný stav, nie text `package.json`.
  Skutočnú odpoveď so **nainštalovanou** knižnicou som nezmeral:
  prostredie `npm install` zablokovalo a obchádzať to nebudem.

Preto bod 4 zadania: vlastné riešenie, opravené poriadne, ide dnes cez OTA.
Ak gestá na telefóne aj tak nesedia, knižnica je ďalší krok **s novým
buildom** (a vtedy sa fingerprint aj domerá) — to je Rastiovo „OK build",
nie moje rozhodnutie.

### 26.7 OTA — nový natívny modul nepribudol → **IDE OTA**

`package.json` nedotknutý (`git status` pred aj po meraní fingerprintu).

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS), group `13ec66b7-01dd-4607-b4c4-83c1f640f102` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

**Zhodné → balík sa na Rastiov TestFlight build dostane** (§9 overené
skutočnou odpoveďou `eas update` + `eas build:list`, `Status: finished`).
Android runtime `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7`, group
`69c8d063-2398-4dd9-afdb-a1468c8de6db`. Commit v OTA: `a1698b8`.

**Poznámka k publikovaniu:** prvý pokus **zlyhal** — `expo export` dostal
`SIGKILL` (v prostredí bolo ~1,3 GB voľnej pamäte, Metro bundluje obe
platformy s `--clear`). Nešlo o chybu kódu; druhý pokus po uvoľnení `dist/`
prešiel. Zapísané preto, že „Export failed / SIGKILL" vyzerá ako chyba
appky a nie je.

### 26.8 Nápoveda — ✅ sľubuje len implementované gestá

Text: „Potiahni do strán · Dvojťap alebo štipni priblíži · Potiahni dole
zavrie" — všetky štyri gestá sú implementované, „Potiahni do strán" len pri
2+ fotkách. Pravidlo, že text v UI nesmie sľubovať neoverené chovanie, je
v CLAUDE.md **§12a**; pasce RNGH v **§12b**; zákaz logiky vo workletoch
v **§12c**.

§8 („Ako funguje Offerra") **zámerne nemenené** — mechanika appky sa
nezmenila, opravilo sa chovanie, ktoré už bolo opísané.

---

## Fáza 27 — Filtre v troch riadkoch podľa významu (17.8.2026)

Zadanie: filtre sú premiešané, preorganizovať do troch jasných riadkov
(typ obchodu · typ nehnuteľnosti · triedenie a obľúbené), v OBOCH taboch,
s prispôsobenými slovami v prvom riadku. Podrobne:
`reports/FILTRE_TRI_RIADKY.md`.

### 27.1 Príčina — ✅ OVERENÉ, a nebola v poradí

Poradie čipov v kóde bolo správne od 12.8.2026. Chyba bola, že **všetky
čipy boli v jednom `flexWrap` riadku**, takže sa lámali podľa ŠÍRKY
obrazovky, nie podľa významu → „Predaj · Prenájom · Byt · Dom" v prvom
riadku. Oprava teda nie je prehodenie poradia, ale **zrušenie závislosti na
zalamovaní**: riadky sú dáta, každý vo vlastnom `View`.

### 27.2 Riadky ako dáta — ✅ OVERENÉ RUNTIME (19/19)

Nový `src/lib/filter-rows.ts` — `filterRows({ side, hasSort, canFavorite })`
vracia tri riadky (`TRANSACTION` → `PROPERTY_TYPE` → `VIEW`). **Tú istú
funkciu** čítajú oba taby, takže sa poradie medzi nimi nemôže rozísť.
Riadok bez čipov sa nevracia (prázdna medzera v UI vyzerá ako chyba).

`npx --yes tsx scripts/check-filters.ts` → **22/22 OK** (19 pri prvom
nasadení + 3 pre triedenie v Dopytoch). Prvá kontrola
naschvál vyrobí pôvodný stav („Predaj · Prenájom · Byt · Dom"), inak by test
nedokazoval nič — rovnaký princíp ako `check-realtime.ts`.

### 27.3 Vizuálne oddelenie — 🟡 ČIASTOČNE POTVRDENÉ

**Rastio, 17.8.2026: „funguje"** — bez menovitého bodu. Beriem to ako
potvrdenie, že **filtre fungujú** (vrátane triedenia v Dopytoch), NIE ako
odpoveď na otázku, či sú tri skupiny na prvý pohľad rozlíšiteľné. Tá ostáva
otvorená; §1 nedovoľuje odvodiť B z A.

- medzera medzi riadkami = **dvojnásobok** medzery medzi čipmi (8 vs. 4 px)
- **tenká linka nad tretím riadkom** — tretí riadok je iná kategória: prvé
  dva ZUŽUJÚ, čo sa hľadá, tretí len mení POHĽAD (rozhodnutie z 12.8.2026,
  teraz je aj vidieť)
- názvy kategórií sa nevykresľujú (zabrali by výšku), ale idú čítačke
  obrazovky ako `accessibilityLabel` riadku

🟡 **Čo Rastio potvrdí slovami:** vidno na prvý pohľad tri skupiny? Je nad
tretím riadkom linka? Ak nie, ďalší krok sú viditeľné názvy kategórií.

### 27.4 Pribudol filter „Iné" — ✅ OVERENÉ RUNTIME (dáta zmerané)

`OTHER` sa dá vybrať pri inzeráte (`inzerat/[id].tsx:325`) aj pri dopyte
(`dopyt/novy.tsx:133`), ale filter naň neexistoval — taký inzerát sa nedal
nájsť. Teraz je v druhom riadku, posledný.

**Dáta:** typ „Iné" dnes nemá **ani jeden** inzerát (0 z 50 ACTIVE) ani dopyt
(0 z 26) — merané cez REST. Čip teda dnes vráti prázdny výsledok; nie je to
chyba filtra, len stav dát. Rozdelenie ACTIVE: byt 23, dom 17, pozemok 4,
komerčný 6.

### 27.5 Tretí riadok v Dopytoch — ✅ ROZHODNUTÉ RASTIOM, dodané (22/22)

Pri prvom nasadení tab Dopyty tretí riadok NEMAL (nebolo tam triedenie ani
srdiečko) a nahlásil som to ako rozhodnutie preň. **Rastio 17.8.2026:
„pridaj Najnovšie do Dopytov"** — dodané.

- `DEMAND_SORTS = ['NEWEST']` v `lib/filter-rows.ts`; katalóg má
  `CATALOG_SORTS = ['NEWEST', 'ENDING_SOON']`. Ktorý zoznam sa použije,
  vyplýva zo strany trhu, takže sa to nedá zabudnúť podať.
- `useRequests(mineOf, filter, sort)` — triedenie prešlo do dotazu
  (`created_at` zostupne). Keby sa doň dostala nepodporovaná možnosť,
  **vypíše to do logu** a zoradí podľa novosti (§2 — žiadny tichý catch),
  vybrať sa v Dopytoch nedá.
- **„Čoskoro končí" tam NIE JE a nie je to prehliadnutie:** `buyer_request`
  nemá v modeli uzávierku. Pridať by ju znamenalo zmeniť model, čo je iné
  zadanie než poradie filtrov.
- Srdiečko tam nie je — dopyt sa nedá „obľúbiť".

**Dôsledok, ktorý si Rastio má všimnúť:** jediná možnosť = čip je **vždy
aktívny**, je to rádio s jednou voľbou (ukazovateľ zoradenia). Katalóg sa
chová rovnako — ťuknutie na už aktívne triedenie tam tiež nič nemení. Ak má
byť z toho skutočná voľba, dá sa doplniť druhé triedenie zo stĺpcov, ktoré
dopyt má (napr. rozpočet) — to je rozhodnutie Rastia, sám som ho nepridal.

Poistka na prázdny riadok ostáva v teste: keby obrazovka triedenie nepodala,
riadok bez čipov sa nevykreslí (žiadna medzera bez obsahu).

### 27.6 Vedľajší presun — ✅ štítky do modulu bez importov

`TRANSACTION_LABEL`, `DEMAND_LABEL`, `PROPERTY_LABEL` → nový
`src/lib/labels.ts`, pretože `property.ts` importuje `./supabase` a v Node
sa načítať nedá (test potrebuje overiť skutočné slová „Kúpim" / „Hľadám
prenájom"). `property.ts` ich **re-exportuje**, takže žiadne existujúce
miesto sa nemenilo — presne ako pri `deadline.ts` 13.8.2026.

### 27.7 ŽIADNE SCREENSHOTY — zapísané do CLAUDE.md §1

Rastio (17.8.2026): *„screenshoty nechcem, nemám ich ako zobraziť — to platí
aj do budúcna."* Jeho vizuálne overenie je **slovné potvrdenie**. V zadaní
Fázy 27 si screenshoty pýtal sám (dva body), ale to bolo skôr, než to
napísal — takže sa nahrádzajú slovným potvrdením. Ani ja ich nevyrábam: v
tomto prostredí nie je prehliadač ani simulátor (overené: žiadny
chromium/firefox/playwright/puppeteer) a nakreslený mockup nie je dôkaz
stavu appky.

### 27.8 OTA — nový natívny modul nepribudol → **IDE OTA**

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| OTA „tri riadky" (iOS), group `2f157477-b508-4a43-bf8e-27719aa7fb0b` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| OTA „Najnovšie v Dopytoch" (iOS), group `581443eb-5b73-462c-9a96-3e9e4ba395aa` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → balík sa na Rastiov TestFlight build dostane (§9). Commity v OTA:
`10ad946` a `a60b7f1`. `package.json` nedotknutý.

**🔴 Publikovanie oboch platforiem naraz v tomto prostredí NEPREJDE.**
`expo export --platform=all` dostal `SIGKILL` (OOM) dvakrát — prostredie má
3,8 GB RAM a Metro bundluje obe platformy naraz; druhý raz padol až po
zbundlovaní Androidu, pri tvorbe asset mapy. Rieši sa **publikovaním po
platformách**: `eas update … --platform ios`, potom `--platform android`.
Nie je to chyba appky ani balíka. Zapísané, aby sa to nehľadalo v kóde.
Android publikovaný zvlášť: runtime
`eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7`, groups
`1d42aa73-87dc-4e70-b843-57ed17d92802` (tri riadky) a
`81e21a43-9cd3-4a52-aa91-1894d14bd5e8` (Najnovšie v Dopytoch).

### 27.9 §10 kontrola — ✅ OVERENÉ RUNTIME

`check-deadline` 12/12 · countdown dáta: 3 ACTIVE s uzávierkou v budúcnosti ·
`check-gallery` 33/33 · `check-realtime` 20/20 · `grep "\.channel("` mimo
registra len komentáre · `npx tsc --noEmit` čisté.

---

## Fáza 28 — Po uzávierke + expozícia fotiek v bucketе (17.8.2026)

Rastio si z návrhu ďalších krokov vybral **body 1 a 5**: čo sa stane po
uzávierke, a fotky konceptov prístupné cudzím. Reporty:
`reports/PO_UZAVIERKE.md`, `reports/FOTKY_EXPOZICIA.md`.

### 28.1 Po uzávierke sa nedialo nič — ✅ OVERENÉ v dátach

```
ACTIVE inzeráty s prešlou uzávierkou: 2
  · Zvolen: Stavebný pozemok              — pred 2 dňami
  · Trenčín: Obchodný priestor na prenájom — pred 5 dňami
```

Sedeli v katalógu ako živé, ponuku na ne už nikto podať nemohol (uzávierku
drží RLS) a majiteľ o tom nevedel ani nemal ako z toho vyjsť. Verejná strana
bola pritom v poriadku už predtým — `deadlineLabel` po termíne vracia
„Príjem ponúk ukončený" a karta to zobrazuje.

### 28.2 Rozhodnutie ako čistá funkcia — ✅ OVERENÉ RUNTIME (30/30)

`deadlineOutcome({ deadline, active, offerCount })` v `src/lib/deadline.ts`
vracia `NONE | RUNNING | AWAITING_OWNER | SETTLED` **aj s textami a zoznamom
akcií**. Komponent `deadline-decision.tsx` iba kreslí — ten istý text nemôže
vzniknúť druhý raz na inej obrazovke.

`scripts/check-deadline.ts` je z 12 na **30/30**. Test si našiel chybu
v mojom texte: prvá verzia písala „Máš 1 **ponuka**" namiesto akuzatívu
(„ponuku") — preto má skloňovanie po číslovke vlastných 5 kontrol.

`deadline.ts` ostáva **bez jediného importu** (jeho podmienka z 13.8.2026);
`deadlineLabel` dostal nepovinný parameter `now`, takže je teraz úplne čistý.

### 28.3 Výzva majiteľovi — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Tri cesty von: **Vybrať z ponúk** (→ `/ponuky/[id]`, kam vedie aj upozornenie
o novej ponuke), **Predĺžiť o 7 dní** (odo DNEŠKA, nie od pôvodného termínu),
**Archivovať** (undo okno ako pri „Zmazať inzerát", Fáza 23). Bez ponúk sa
„Vybrať z ponúk" nezobrazí — viedlo by na prázdny zoznam. Kartu vidí **len
majiteľ**.

**Archivovanie predtým v appke NEŠLO** — `ARCHIVED` bol stav s názvom, ktorý
sa nedal nastaviť; dalo sa len zmazať. Katalóg filtruje `status = 'ACTIVE'`,
takže archivovaný inzerát zmizne.

**Push/notifikácia sa neposiela a netvrdí sa to** — appka nemá serverovú
časť, takže nemá kto poslať. Napísané aj v §8 texte (§12a).

### 28.4 §8 „Ako funguje Offerra" — ✅ upravené v TOM ISTOM kroku

Nová sekcia **„Uzávierka ponúk — a čo po nej"**: že uzávierka je nepovinná,
že po termíne inzerát nezmizne, tri cesty von, čo znamená archivovanie, a
priamo aj to, že **upozornenie nepríde**. Pribudla ikona `clock` do
`icon.tsx` (mala by inak prepadnúť na neznámy názov).

### 28.5 Fotky v bucketе sa dali VYPÍSAŤ — ✅ OPRAVENÉ A OVERENÉ RUNTIME

Register 1.7 tvrdil „dostupná pri znalosti UUID cesty". Meranie ukázalo, že
cestu **netreba poznať** — bucket `offerra-media` sa dá vypísať anon kľúčom
(`POST /storage/v1/object/list/…` → HTTP 200):

| | |
|---|---|
| používateľských priečinkov | 11 |
| priečinkov inzerátov | 21 |
| vypísateľných fotiek | **122** |
| z toho inzerátov, ktoré anonym cez REST nevidí | **20 z 21** |

RLS na `property` a `media` je pritom správna (anonym nevidí ani jeden DRAFT
riadok). Storage o tom nevie. **Zápis je zamietnutý** (skúšané: `new row
violates row-level security policy`), takže cudzí nič nenahrá.

**Oprava = jedna politika na `storage.objects`, žiadna zmena v appke** —
appka `storage.list()` nepoužíva nikde (len `upload`, `remove`,
`getPublicUrl`, a to je len skladanie textu). SQL je v
`reports/FOTKY_EXPOZICIA.md` a je to **`as restrictive` politika**, takže sa
existujúce politiky NERUŠIA (permissive politiky sa sčítavajú — pridanie
ďalšej by nič nezavrelo, `restrictive` sa spája AND-om). Iných bucketov sa
netýka, verejné čítanie ide mimo RLS, späť sa berie jedným `drop policy`.

**Ktorá politika to bola** (výpis pred zmenou):
`offerra_media_select_public [SELECT, permissive, {anon,authenticated}]` s
podmienkou iba `bucket_id = 'offerra-media'` — žiadny vlastník. Pre porovnanie
`offerra_media_delete_own` má aj
`AND (storage.foldername(name))[1] = auth.uid()::text`, teda správne.

**NASADENÉ 17.8.2026** cez `scripts/apply-storage-policy.mjs` (Management API,
`POST /v1/projects/{ref}/database/query`) — nová politika
`offerra-media: vypisat smie len vlastnik [SELECT, RESTRICTIVE, {public}]`.
Nič sa nerušilo. Iných bucketov sa netýka, čo je pri **spoločnej databáze**
podstatné: v projekte žijú aj `avatars` (MUTARK, verejný) a `eleven-media`
(neverejný), ich politiky sú viazané na svoje buckety (overené pred zmenou).

**Dôkaz — cudzie oko:** `check-storage-exposure.ts` pred opravou **2 FAIL**, po
oprave **4/4 OK** (výpis zavretý · zverejnená fotka sa číta aj bez kľúča ·
zápis zamietla RLS so `statusCode 403`). Ten istý skript teda dokázal chybu aj
opravu.

**Dôkaz — vlastník (prihlásená session, demo účet):** výpis vlastného
priečinka HTTP 200 (vidí svoje) · výpis celého bucketu vráti **len jeho
priečinok** · nahranie fotky 200 · vo výpise 200 · **zmazanie 200** · po sebe
uklidené (0 položiek). Toto je tá polovica, na ktorú sa pri zatváraní práv
zabúda — že sa nezavrie aj tomu, kto tam prístup mať má.
*(Prvé mazanie vrátilo 400 — chyba MÔJHO testu, `DELETE` s
`Content-Type: application/json` bez tela. Nie politika. Zapísané, lebo taká
chyba sa dá ľahko vyhlásiť za „RLS blokuje mazanie".)*

🟡 **Ostáva Rastiovi:** pridať a zmazať fotku **z appky** (appka volá
`supabase.storage.remove()`, nie priamo REST — to som overiť nemohol).

**Token — pozor na §4:** `SUPABASE_ACCESS_TOKEN` v `/root/.offerra-secrets`
NIE JE (má len `GITHUB_TOKEN`, `DEMO_PASSWORD`, `PAGES_TOKEN`,
`PAGES_ADMIN_TOKEN`). Existuje v `/root/.mutark-secrets` a Supabase projekt je
s MUTARKom **zdieľaný** (register 0.6). §4 zakazuje požičiavanie tokenov medzi
projektmi, takže som naň sám nesiahol; **Rastio to 17.8.2026 výslovne povolil**
(„použi ten z .mutark-secrets, databáza je spoločná"). Načítaný do premennej
prostredia pre jediný príkaz, do repa sa nedostal.

**Ako to bolo spustené — a moja chyba v odporúčaní:** Rastio pripomenul, že
všetky doterajšie DB zmeny šli cez **Management API** (register 0.6, 1.4), nie
psql — a má pravdu, mechanizmus je v repe (`scripts/import-streets.mjs:127`).
**Moje odporúčanie priameho `SUPABASE_DB_URL` bolo zlé**; Management API na
`create policy` stačí. Priame DB heslo teda netreba a nežiadam ho.

### 28.6 Kontrola expozície ako skript — ✅ OVERENÉ RUNTIME (2 FAIL → 4/4 OK)

`npx --yes tsx scripts/check-storage-exposure.ts` — pred opravou **2 FAIL**
(výpis otvorený, fotky nezverejnených inzerátov prístupné), po oprave
**4/4 OK**. To je na tom skripte to podstatné: dokázal chybu AJ opravu. Keby
prechádzal vždy, nedokazoval by nič.
Kontroluje aj to, čo sa NESMIE pokaziť: zverejnenú fotku prečíta aj
neprihlásený prehliadač (inak by katalóg ostal bez fotiek — regresia z Fázy
24) a cudzí nesmie zapisovať.

Kľúče berie z gitignorovaného `.env`, do repa sa nedostanú (§4).

### 28.7 Čo tým NIE JE vyriešené (zapísané, aby sa nezabudlo)

- Fotka ostane čitateľná, kto pozná presnú URL. Skutočná dôvernosť =
  neverejný bucket + podpísané URL, teda prerobenie celej cesty k fotkám
  (karta, detail, fullscreen, obľúbené). Tá cesta už dvakrát spadla (Fáza
  24) → vlastná fáza, nie prílepok. Natívny modul netreba, teda OTA.
- **Fotky zmazaných inzerátov ostávajú v bucketе** (časť tých 20
  priečinkov). Vyčistenie potrebuje servisný kľúč → Rastio alebo neskoršia
  serverová časť.

### 28.8 OTA

Nový natívny modul nepribudol, `package.json` nedotknutý → **IDE OTA**.

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS), group `d46c1e65-3160-4085-b538-b89413a64175` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → balík dorazí na Rastiov TestFlight build (§9). Commit v OTA:
`1302dba`. Android: runtime `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7`, group
`7a1e9629-90fc-49f3-9d8b-81230f13d909`. Publikované **po platformách** —
`--platform=all` v tomto prostredí padá na OOM (viď 27.8).

---

## Fáza 29 — Pád v PropertyTabs, tlačidlo „Ako to funguje", zrušená obhliadka (19.8.2026)

Tri body zo zadania Rastia. Report:
`reports/PAD_TABOV_APKA_TLACIDLO_OBHLIADKA_ZNOVA.md`.

### 29.1 Pád „Cannot read property 'contentOffset' of null" — 🟡 OPRAVENÉ, ČAKÁ 5× NA TELEFÓNE

Jediné tri miesta v appke čítajúce `e.nativeEvent.contentOffset`
(`property-tabs.tsx` tab bar, `nehnutelnost/[id].tsx` hero galéria,
`walkthrough.tsx`) nemali ochranu — presne ten prístup, čo hlásenie
cituje. Prečo je `nativeEvent` niekedy `null` sa v tomto prostredí
nedá zmerať (žiadny simulátor, §3) — namiesto hádania pridaná ochrana
(`e.nativeEvent?.contentOffset?.x`, tichý `return` + log) na presne tie
tri miesta. `check-gallery.ts` 33/33 nezmenené (logika sa nemenila, len
ochrana pred ňou).

### 29.2 Tlačidlo „Ako to funguje" v hornej lište — 🟡 ČAKÁ VIZUÁLNE OVERENIE

`questionmark.circle` v `AppHeader`, medzi zvončekom a nastaveniami, na
všetkých piatich hlavných taboch. Vedie na existujúcu `/ako-funguje`
(žiadny nový text, CLAUDE.md §8). `expo-symbols` je v builde od Fázy 7,
ide OTA.

### 29.3 Zrušená obhliadka bola mŕtvy stav — ✅ OVERENÉ RUNTIME (DB, 6/6), 🟡 appka

`viewing` má `unique (property_id, requester_id)` — druhá žiadosť na ten
istý inzerát od toho istého záujemcu je vždy UPDATE tej istej riadky,
nikdy nový INSERT. `guard_viewing_update()` mal CANCELLED aj COMPLETED
v spoločnom bloku „uzavretá sa nemení" — oprava musela ísť do DB
(Management API, token z `/root/.mutark-secrets`, §4), nešlo to len
appkou.

**`scripts/apply-viewing-reopen.mjs`** — CANCELLED → REQUESTED povolené,
ale len pôvodnému záujemcovi, s kontrolou blokovania
(`offerra.is_blocked()`, doteraz len na INSERTe) a s cooldownom proti
spamu (`rate_limit_viewings_window_minutes`, rovnaký admin-nastaviteľný
prah ako Fáza 23.3 — `trg_viewing_rate_limit` beží len na INSERT, reopen
by inak nemal limit vôbec). COMPLETED nezmenené. `on_viewing_decided()`
pri reopene pošle vlastníkovi notifikáciu `ZIADOST_O_OBHLIADKU`, inak by
o novej žiadosti nevedel.

`scripts/check-viewing-reopen.mjs`, **6/6**, priamo cez Management API na
reálnych seedovaných riadkach, `auth.uid()` simulované cez
`set local request.jwt.claim.sub` (tá istá funkcia, akú číta aj RLS):
vlastník nesmie reopenúť cudziu žiadosť · cudzí used nesmie · pôvodný
záujemca smie · vlastník dostane notifikáciu · okamžitý reopen po
zrušení blokuje cooldown (P0429) · COMPLETED ostáva uzavreté. Opakovateľné
aj v tej istej hodine (testovacia riadka sa pred behom resetne mimo
cooldownu).

Appka (`viewing-card.tsx`): tlačidlo „Chcem obhliadku" sa zobrazí znova
ako „Požiadať znova", keď `mine.status === 'CANCELLED'`, s vetou
„Predošlá žiadosť bola zrušená · Môžeš požiadať znova." Stará CANCELLED
riadka ostáva pod kartou ako história. `how-it-works.ts` + changelog
aktualizované v tom istom kroku (§7/§8).

**Čo test NEDOKAZUJE:** že appka tlačidlo v UI naozaj zobrazí a ťuknutie
zavolá tento UPDATE — 🟡, presný postup v reporte.

### 29.4 Publikované OTA — ✅ OVERENÉ RUNTIME

Commit `876278f`. Runtime **nezmenené** oproti buildu #5 (žiadny zásah do
`package.json`) — overené priamo z odpovede `eas update`, nie odhadom:

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (Android) | `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7` (zhodné s Fázou 27/28) |

Publikované **po platformách** (`--platform=all` v tomto prostredí padá
na OOM, viď 27.8) — iOS update `01a018d2-…`, Android update `01a018d6-…`.

---

## Fáza 30 — Lokalizácia UI do SK/EN/DE (22.8.2026)

Zadanie (Rastio, oprava predošlého): kompletná lokalizácia rozhrania do
troch jazykov, **žiadny AI preklad inzerátov** (tie zostávajú v jazyku
autora, žiadne `title_sk`/`title_en` polia v DB). Predvolený jazyk podľa
telefónu, manuálny prepínač v Nastaveniach s pamäťou voľby. Plný report:
`reports/LOKALIZACIA_SK_EN_DE.md`.

### 30.1 Vlastná i18n vrstva namiesto `i18next` — 🔴 ODCHÝLKA OD ZADANIA, S DÔVODOM

`npm install` je v tomto prostredí zablokovaný (register 26.6), takže sa
nedal reálne nainštalovať `i18next`/`react-i18next`. Postavená vlastná
vrstva `src/i18n/index.tsx` (Context + `AsyncStorage`) v ROVNAKOM tvare
dát ako `i18next` — JSON po doménach, kľúč `domain.key`, `{{premenná}}`
interpolácia — aby sa dala neskôr 1:1 nahradiť skutočnou knižnicou.
Jazyk telefónu cez `Intl.DateTimeFormat().resolvedOptions().locale`
(Hermes, žiadny natívny modul) namiesto `expo-localization` (nový natívny
modul → nový build, viď §9). **`package.json` sa v celej fáze nedotkol**
(`git diff --stat package.json` prázdne) — fingerprint nemenený, ide OTA.

### 30.2 Rozsah — ✅ OVERENÉ RUNTIME (typecheck + audit), 🟡 ČAKÁ VIZUÁLNE OVERENIE

Preložené: všetky obrazovky (`src/app/**`), zdieľané komponenty
(`src/components/**`), aj `lib`/`hooks` funkcie generujúce UI text
(formátovanie cien/dátumov, štítky stavu, validácie, Alert/toast texty,
accessibility labely) — 1037 rôznych `t('domain.key')` volaní. Slovenské
3-tvarové skloňovanie (izba/izby/izieb, ponuka/ponuky/ponúk) zachované
cez `language === 'sk'` vetvu, EN/DE majú 2 tvary.

**Vedomé výnimky (zostávajú len po slovensky):** obsah `src/lib/changelog.ts`
(historický záznam podľa §7, obrazovka okolo neho lokalizovaná je),
`src/lib/errors.ts` slovník `FRIENDLY` + dve chyby v `src/lib/push.ts`
(technické hlášky pre okrajové prípady, volané z ~100 miest — mechanicky
zvládnuteľné, ale mimo rozsahu tejto fázy), a texty z reálnych slovenských
dát (Register adries MV SR, prezývky, popisy inzerátov — to by bol presne
ten zakázaný AI preklad obsahu). `src/lib/legal.ts` (Ochrana osobných
údajov, Podmienky používania) bolo pôvodne rovnaká výnimka, preložené
dodatočne 23.8.2026 na Rastiovu žiadosť — pozri 30.8.

### 30.3 Automatizovaná kontrola — `scripts/check-i18n.ts`, **14/14**

Nový skript (vzor MUTARK `i18n-audit.mjs`): rovnaká množina kľúčov vo
všetkých troch jazykoch (mimo zdokumentovaných SK-only skloňovacích
kľúčov), žiadny neúmyselne prázdny preklad, `{{premenné}}` sedia sk↔en↔de
pre každý kľúč, každé `t()` volanie v `src/` má zodpovedajúci kľúč.
**NEDOKAZUJE** jazykovú správnosť ani vizuálny výsledok (§1).

### 30.4 Ostatné overenia — ✅ OVERENÉ RUNTIME

`npx tsc --noEmit -p .` → 0 chýb (celý projekt). `check-deadline.ts` aj
`check-filters.ts` → VŠETKO OK (lokálne makety `t()` v skriptoch, aby sa
vyhli AsyncStorage/React importu). Všetky tri `locales/*.json` → platný
JSON.

### 30.5 🟡 ČO MÁ RASTIO OVERIŤ NA TELEFÓNE

Nedá sa overiť v tomto prostredí (žiadny simulátor, §3):

1. Prepnutie jazyka telefónu (SK/DE/inde→EN) → appka sa pri otvorení sama
   nastaví podľa pravidla vyššie.
2. Manuálny prepínač v Nastaveniach — okamžitá zmena bez reštartu, voľba
   prežije zatvorenie appky.
3. Vizuálna kontrola EN aj DE na katalógu, detaile inzerátu, formulári
   nového inzerátu, admin konzole, Nastaveniach — hlavne dlhšie nemecké
   texty, ktoré sa môžu orezať.
4. Slovenské skloňovanie stále funguje („1 izba"/„3 izby"/„5 izieb" a
   podobne pre ponuky).

### 30.6 IDE OTA

Žiadny natívny modul nepribudol, `package.json` nedotknutý — `eas update`
stačí.

### 30.7 Publikované OTA — ✅ OVERENÉ RUNTIME

Commit `b3f71be`. Runtime **nezmenené** oproti buildu #5 (overené priamo
z odpovede `eas update`, nie odhadom):

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (Android) | `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7` |

iOS update `01a02b75-3270-76f6-8b84-3feb38c59e89` (skupina
`84d45c53-fdc0-4723-acec-f85fffb96a01`), Android update
`01a02b75-3270-7d42-b058-576a5483ecd5` (skupina
`632a9bbb-20f9-422e-8724-01a01f4bd72b`).

**Predošlý stav appky na telefóne (pred touto OTA):** posledná
publikovaná OTA bola z Fázy 29 (3 dni staré, `eafd9b6e…`/`272132a1…`) —
appka bola stále len po slovensky, presne ako to Rastio 22.8.2026 nahlásil
(„mam tam stale iba slovencinu"). Táto OTA to opravuje.

### 30.8 Dodatok — preklad Ochrany osobných údajov a Podmienok používania (23.8.2026)

Rastio 23.8.2026: „este treba orelozit aj privacy polici a term us" —
`src/lib/legal.ts` bol v 30.2 vedomá výnimka („preklad právneho textu je
Rastiovo rozhodnutie"); rozhodnutie padlo, doplnené v tom istom rozsahu
ako zvyšok appky.

- `PRIVACY`/`TERMS` v `src/lib/legal.ts` sú teraz `Record<LanguageCode,
  LegalDoc>` (`sk`/`en`/`de`) namiesto jedného objektu — preklad, nie AI
  parafráza, sekcie a ich poradie sedia 1:1 medzi jazykmi. Nová funkcia
  `getLegalDoc(slug, language)`.
- `src/app/legal/[doc].tsx` vyberá dokument podľa `language` z
  `useTranslation()` — rovnaký vzor ako zvyšok appky.
- **Verejný web (`docs/privacy.html`, `docs/terms.html`, App Store Connect
  URL) ostáva len po slovensky** — jedna URL na jazyk by vyžadovala zmenu
  generátora aj záznamu v App Store Connect, čo je mimo tejto zmeny.
  `scripts/build-legal-html.mjs` upravený, aby generoval `.sk` verziu zo
  zmenenej štruktúry (predtým čítal `LEGAL_DOCS[slug]` priamo ako
  dokument) — **✅ OVERENÉ RUNTIME**, vygenerovaný výstup pre `privacy`
  a `terms` je bajtovo zhodný s predošlým okrem jednej odchýlky vysvetlenej
  nižšie.
- **Vedľajší nález, opravený v tom istom kroku:** `docs/privacy.html` bol
  zastaraný — z 9.8.2026, spred zmeny na povinné telefónne číslo. Nikto ho
  po tej zmene znovu nevygeneroval. Opravené spustením generátora
  (`node scripts/build-legal-html.mjs`); `docs/terms.html` sa nezmenil.
- `npx tsc --noEmit -p .` → 0 chýb. `npx --yes tsx scripts/check-i18n.ts`
  → 14/14 (legal.ts nie je v jeho rozsahu — nepoužíva `t()`). `git diff
  --stat package.json` → prázdne.
- 🟡 **ČAKÁ VIZUÁLNE OVERENIE** — anglický aj nemecký text Ochrany osobných
  údajov a Podmienok používania v appke (Nastavenia → odkaz na dokument,
  alebo pri prihlásení „Nutzungsbedingungen"/„Datenschutz"), hlavne či sa
  dlhšie odseky (GDPR referencie, DVOCH prípadov odkrytia kontaktu)
  zmestia čitateľne.

**Publikované OTA — ✅ OVERENÉ RUNTIME.** Commit `32354d9`. Runtime
nezmenené (`24919867e…` iOS / `eaadbb7ec…` Android, zhodné s buildom #5).
iOS update `01a02c3f-a7e8-71ae-9b73-051db12e96bb` (skupina
`ca8d4712-fd49-40dc-a9f1-1aca58fd55cd`), Android update
`01a02c3f-a7e8-7e1b-8357-7db005d502e6` (skupina
`b3988901-e01e-41a6-8c88-da3c7a9ebe42`).

---

## Fáza 31 — Platnosť ponuky (27.8.2026, návrh testera)

Zadanie: bidder si pri podaní ponuky vie nastaviť, ako dlho platí (Bez
obmedzenia / 1 / 3 / 7 / 14 / 30 dní). Po uplynutí je ponuka neplatná — nedá sa
prijať, nepočíta sa do „najvyššej ponuky", a bidder o tom dostane
upozornenie.

**Poznámka k práci na tejto fáze:** rozrobili ju súbežne DVE session na
tomto stroji (`offerra-70`/`offerra-4e` a `offerra-49`) nad tým istým repom
— zbadané pri kolízii na `src/lib/offer-validity.ts`. Po dohode `offerra-49`
pokračovala sama; keď jej session skončila bez commitu/pushu (working tree
malo rozrobené zmeny + nespustenú DB migráciu), túto session prevzala späť
a doťahuje ju do konca — vrátane jedného reálneho nálezu z rozrobenej práce
(chýbajúci grant, bod 31.2) a jedného doplnku mimo pôvodného rozsahu
(bod 31.5).

### 31.0 Rozhodnutie k defaultu (Rastio sa pýtal na názor)

**„Bez obmedzenia" ako predvolená hodnota je správne** — rovnaká voľba a z
rovnakého dôvodu ako pri Uzávierke ponúk na inzeráte (`DeadlinePicker`):
appka nesmie nikoho ticho obmedziť niečím, o čom pred touto fázou vôbec
nevedel. Kto chce platnosť obmedziť, urobí to vedome.

### 31.1 Architektúra — prečo NIE „stĺpec + cron" samo osebe

DB nemá cron s presnosťou na sekundu (najbližšia perióda je `*/5 * * * *` —
rovnaká ako `seed-auto-forward`, zdieľaná DB s MUTARKom, `pg_cron` je tam
už zapnutý). Preto je vynútenie na DVOCH nezávislých miestach — rovnaký
vzor, aký appka už má pri uzávierke ponúk (`offer_deadline`):

1. `offerra.guard_offer_update()` — pri UPDATE porovná `old.valid_until`
   priamo s `now()`, NIE so stĺpcom `status`. Toto je jediný skutočný
   zámok proti race condition — majiteľ nesmie „Prijať" stihnúť skôr,
   než to appka aj DB rozpoznajú.
2. `offerra.expire_offers()` + `cron.job` `offerra-expire-offers`
   (`*/5 * * * *`) — len KOZMETIKA (zapíše `status = 'EXPIRED'`, nech sa
   appka nemusí spoliehať len na živý výpočet po zavretí appky) a
   NOTIFIKÁCIA bidderovi.
3. Appka na klientovi (`src/lib/offer-validity.ts`, `isOfferExpired`)
   počíta expiráciu VŽDY živo z `valid_until` — nikdy nečaká na to, že
   cron stihol status prekrpiť.

### 31.2 DB zmeny — ✅ OVERENÉ RUNTIME

`scripts/apply-offer-validity.mjs` (Management API, CLAUDE.md §4),
spustené a overené priamo v DB:

- nový stĺpec `property_offer.valid_until` (nullable = bez obmedzenia)
- `property_offer_status_check` → pridané `EXPIRED`
- RLS `offer_insert_own` → `valid_until` musí byť `null` alebo v budúcnosti
- `guard_offer_update()` → majiteľ nesmie meniť `valid_until` ani prijať
  ponuku s prešlou platnosťou (živý čas); záujemca smie meniť `valid_until`
  na PENDING ponuke, len na budúci dátum
- `on_offer_decided()` → nová vetva pre `EXPIRED` → notifikácia
  `PONUKA_EXPIROVANA`
- nová funkcia `offerra.expire_offers()` + `cron.job` `offerra-expire-offers`
- `offerra.my_request_outreach()` (Oslovenia dopytu) → `top_offer` teraz
  tiež vylučuje expirované ponuky — ten istý koncept ako katalóg, len na
  inej obrazovke, ktorú pôvodné zadanie nemenovalo, doplnené pre zhodu
- `notification_type_check` / `notification_preference_type_check` →
  pridané `PONUKA_EXPIROVANA`

🔴→✅ **Nález pri prvom behu:** nový stĺpec nededí stĺpcové granty
tabuľky (tá má granty per-stĺpec, nie `all`) — `valid_until` nemal SELECT
pre `anon`/`authenticated` vôbec. Bez opravy by verejný zoznam ponúk
(`OFFER_PUBLIC_COLS`, číta `valid_until` verejne rovnako ako `amount`)
padal na 42501 pre KAŽDÉHO používateľa appky. Odhalené priamym dotazom na
`information_schema.column_privileges` HNEĎ po prvom behu migrácie, nie
odhadom — opravené (`grant select (valid_until) …`) a dopísané do skriptu
ako krok 2/10, nech ho ďalší beh migrácie od nuly už nevynechá.

**Live overenie — `scripts/check-offer-validity-db.mjs`, 6/6 OK:**
skript vloží REÁLNU syntetickú ponuku na seed inzerát + seed biddera
(triggery `offer_notify_insert`/`trg_offer_rate_limit` dočasne vypnuté,
nech to nepošle push skutočnému seed vlastníkovi), otestuje cez
`set local role authenticated` + `request.jwt.claim.sub`, a na konci ju aj
jej notifikáciu ZMAŽE (žiadny „pôvodný stav" pre syntetický riadok
neexistuje, na rozdiel od `check-viewing-reopen.mjs`):

1. majiteľ NESMIE prijať ponuku s prešlým `valid_until`, kým je ešte
   `status = 'PENDING'` (skutočný race-condition test) — zamietnuté s
   `P0001: Platnost tejto ponuky uz uplynula, prijat sa neda.`
2. `anon` SMIE čítať `valid_until` (grant funguje)
3. `offerra.expire_offers()` preklopí PENDING + prešlé `valid_until` na
   `EXPIRED`
4. bidder dostal notifikáciu `PONUKA_EXPIROVANA`
5. majiteľ NESMIE prijať ani už `EXPIRED` ponuku
6. bidder NESMIE vložiť ponuku s `valid_until` v minulosti (RLS)

### 31.3 Appka — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- `src/lib/offer-validity.ts` — čisté funkcie `isOfferExpired(status,
  validUntil)`, `offerValidityLabel(...)`, ZÁMERNE bez runtime importu,
  rovnaký dôvod ako `deadline.ts` (CLAUDE.md §10 — text vie zmiznúť ticho).
  Regresný test **`scripts/check-offer-validity.ts`, 13/13 OK**.
- `src/components/offer-validity-picker.tsx` — voľby Bez obmedzenia / 7 /
  14 / 30 dní, rovnaký vzor ako `DeadlinePicker` (žiadny natívny date
  picker — to je nový natívny modul → nový EAS build, appka pri tejto
  fáze ostáva čisto OTA).
- `src/app/ponuka/[id].tsx` — picker vo formulári, „najvyššia doteraz"
  vylučuje živo expirované, countdown pri vlastnej ponuke.
- `src/components/offer-list.tsx` — countdown pri ponuke s platnosťou,
  odznak „PLATNOSŤ UPLYNULA" (živo, nečaká na cron), „najvyššia" vylučuje
  expirované.
- `src/components/owner-offers.tsx` — tlačidlo „Prijať" sa NEZOBRAZÍ pri
  živo expirovanej ponuke (CLAUDE.md §12a — nesľubovať akciu, ktorú DB aj
  tak odmietne).
- `src/components/property-tabs.tsx` — bidderova vlastná ponuka so stavom
  `EXPIRED` dostala vysvetľujúcu poznámku (rovnaký vzor ako pri
  `REJECTED`).
- `src/hooks/use-properties.ts` (`attachOfferStats`) — `top_offer`/
  `pending_count`/`offer_count` v katalógu vylučujú živo expirované
  ponuky, nie len `status !== 'EXPIRED'`.
- `src/lib/offers.ts` — `OfferStatus` + `EXPIRED`, `Offer.valid_until`,
  `OFFER_PUBLIC_COLS` (+`valid_until`), `offerSteps` (EXPIRED = koniec
  cesty ponuky, rovnako ako WITHDRAWN).
- `src/lib/notifications.ts` + `notification-route.ts` — nový typ
  `PONUKA_EXPIROVANA` v zozname preferencií aj v smerovaní pushu (vedie na
  detail inzerátu, rovnako ako `PONUKA_ZAMIETNUTA`).

🟡 **ČO MÁ RASTIO OVERIŤ NA TELEFÓNE** (nedá sa overiť v tomto prostredí —
žiadny simulátor, §3):

1. Pri podaní ponuky sa dá vybrať platnosť (Bez obmedzenia / 1 / 3 / 7 / 14 /
   30 dní) a v tabe „Ponuky" pri nej beží odpočet.
2. Ponuka s prešlou platnosťou je v zozname vidieť ako „PLATNOSŤ
   UPLYNULA", tlačidlo „Prijať" pri nej v spodnom paneli majiteľa chýba.
3. Push „Platnosť tvojej ponuky uplynula" príde bidderovi (na to treba
   počkať aspoň 5 minút po uplynutí platnosti testovacej ponuky — perióda
   crona — alebo skrátiť platnosť na pár minút a počkať).
4. Karta v katalógu inzerátu s len expirovanými ponukami neukazuje
   „najvyššiu ponuku" z nich.
5. „Ako funguje Offerra" — nový odsek o platnosti ponuky v sekcii
   „Ponuky sú verejné, ľudia nie" (SK/EN/DE).

### 31.4 Lokalizácia — `scripts/check-i18n.ts`, **14/14 OK**

Nové kľúče vo VŠETKÝCH troch jazykoch (žiadny SK-only): `offers.
statusExpired`, doména `offerValidity` (`expired`, `validUntil`,
`validUntilHours`, `pickerNone`, `pickerDays`, `pickerHint`,
`pickerLabel`, `pickerValidUntil`), `propertyTabs.offerExpiredNote`,
`notificationTypes.PONUKA_EXPIROVANA_label`/`_hint`,
`howItWorks.section1Para5` (+ `SECTION_PARA_COUNTS[1]` 5→6 v
`how-it-works.ts`). **NEDOKAZUJE** jazykovú správnosť ani vizuál (§1) —
bod 31.3/5 vyššie.

### 31.5 Vedľajší nález — `my_request_outreach()` (mimo pôvodného rozsahu)

Zadanie menovalo len „najvyššiu ponuku na karte v katalógu"
(`attachOfferStats`). Rovnaký koncept ale počíta aj
`offerra.my_request_outreach()` pre kartu inzerátu v Osloveniach dopytu
(`property_top_offer`) — bez opravy by expirovaná PENDING ponuka (kým ju
cron nepreklopí) vyhrávala aj tam. Opravené v tom istom kroku (bod 31.2),
nech appka nehovorí dvomi rôznymi číslami o tej istej veci na dvoch
obrazovkách.

### 31.6 Ostatné overenia — ✅ OVERENÉ RUNTIME

`npx tsc --noEmit -p .` → 0 chýb. `git diff --stat package.json` →
prázdne (fingerprint nedotknutý, §9). `grep -rn "\.channel("` mimo
`realtime.ts`/`use-realtime-channel.ts` → žiadny výsledok (§11,
nedotknuté touto fázou). `check-deadline.ts` → bez zmeny (regresia).

### 31.7 Publikované OTA — ✅ OVERENÉ RUNTIME

Žiadny natívny modul nepribudol, `package.json` nedotknutý — `eas update`
stačí, nový build netreba. Commit `76ab468`. Runtime **nezmenené** oproti
buildu #5 (overené priamo z odpovede `eas update`, nie odhadom):

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (Android) | `eaadbb7eca8a7c3baf5dddaed807b6a8ac579fb7` |

iOS update `01a042a5-1b9e-7514-a19a-de7081d9fa16` (skupina
`a64e52f2-4c9c-46e8-b40f-07b37c892cd1`), Android update
`01a042a5-1b9e-793f-82bf-68e8c2415820` (skupina
`11c32646-c752-4f78-8396-b9472b6bd98d`).

**Poznámka k publikovaniu:** prvý pokus o `eas update` (medzi krokmi 31.2 a
31.6) v tomto prostredí bežal na pozadí dlhšie, než sa stihlo počkať —
sledovanie ukázalo prázdny výstup a `update:list` ešte starú OTA, takže sa
spustil DRUHÝ pokus súbežne. O pár sekúnd nato prišlo potvrdenie, že PRVÝ
pokus v skutočnosti doiehal a publikoval sa v poriadku — druhý (ešte len
bundloval, nič nepublikoval) bol zastavený, nech nevznikne zbytočná
duplicitná OTA skupina.

### 31.8 Dodatok — voľby 1 a 3 dni (Rastio, 27.8.2026, po prvej OTA)

Pôvodné voľby v pickeri boli len 7/14/30 dní (rovnaké ako pri uzávierke
ponúk). Rastio si vyžiadal aj 1 deň a 3 dni.

- `OfferValidityPicker` — voľby teraz `1, 3, 7, 14, 30` (+ „Bez
  obmedzenia" = 6 voliteľných čipov).
- **Gramatická poistka:** `deadlinePicker.days` malo najmenšiu voľbu 7,
  takže „{{count}} dní" sedelo na VŠETKY vtedajšie voľby (7/14/30/60 sú
  všetko 5+, teda vždy genitív množného čísla). Pri 1 dni a 3 dňoch by
  ten istý text dal „1 dní" a „3 dní" — obe gramaticky ZLE (správne „1
  deň", „3 dni"). Nová funkcia `offerValidityDaysLabel(t, language,
  days)` v `offer-validity.ts` skloňuje rovnako ako `offersWord` v
  `deadline.ts` (SK trojtvarovo cez `pickerDaysOne`/`Few`/`Many`, EN/DE
  len jednotné/množné). `pickerDaysFew` je nový SK-only kľúč
  (`SK_ONLY_KEYS` v `check-i18n.ts`).
- Test `scripts/check-offer-validity.ts` rozšírený o mapovanie
  `1→„1 deň", 3→„3 dni", 7/14/30→„… dní"` — **17/17 OK** (bolo 13/13).
- `npx --yes tsx scripts/check-i18n.ts` → **15/15 OK**. `npx tsc --noEmit
  -p .` → 0 chýb. Žiadna DB zmena netreba (voľby sú len UI, RLS/guard
  overuje len „v budúcnosti", nie konkrétny počet dní).
- Zapísané aj do reportu (`reports/PLATNOST_PONUKY.md`, body 3 a 7) a do
  changelogu.

**Publikované OTA — ✅ OVERENÉ RUNTIME.** Commit `46b3e89`. Runtime opäť
zhodné s buildom #5 (`24919867e…` iOS / `eaadbb7ec…` Android). iOS update
`01a042bb-747b-7f49-8dee-47833d745ff8` (skupina
`44e28a3a-4978-4b72-a5bc-41c368b3d5da`), Android update
`01a042bb-747b-76fc-a741-b7ba124ed8fb` (skupina
`5ef65e2b-4098-4167-a993-469ea7231c6a`).

### 31.9 Dodatok — živý stupňovitý odpočet (Rastio, 1.9.2026) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Pôvodné zobrazenie („Platí do … · ostáva X dní" / „Platí ešte X h") sa
prepočítalo len pri načítaní obrazovky — nie živo. Rastio si vyžiadal
skutočný tikajúci odpočet, stupňovito podľa zostávajúceho času:

- **≥ 24 h** — „Platí ešte X dní", prekresľuje sa raz za minútu (netreba
  tikať po sekundách).
- **< 24 h** — `HH:MM`, reálne odpočítava, prekreslenie raz za minútu.
- **< 1 h** — `HH:MM:SS`, tiká po sekundách a je **zvýraznené**
  (`palette.danger`, tučné písmo) — naliehavosť.
- Po uplynutí: „Platnosť uplynula" (nezmenené, živo z `valid_until`, nie
  z `status`).

**Architektúra (čistá funkcia + jeden zdieľaný interval, rovnaký vzor ako
zvyšok appky):**

- `src/lib/offer-validity.ts` — `offerCountdown(t, language, status, iso,
  now)` je ČISTÁ funkcia jedného okamihu (žiaden `setInterval` vnútri).
  Vracia `{ tier: 'days'|'hm'|'hms'|'expired', text, urgent }`.
  `isOfferExpired` dostal voliteľný `now` parameter, nech obe funkcie
  počítajú z presne toho istého okamihu (predtým dve nezávislé volania
  `Date.now()`).
- `src/hooks/use-offer-countdown-tick.ts` (nový) — JEDEN `setInterval` na
  CELÚ obrazovku, nie jeden na ponuku. Frekvencia sa mení podľa
  najbližšej platnosti spomedzi VŠETKÝCH poslaných `valid_until`: sekundová
  len kým je NIEKTORÁ ponuka v poslednej hodine, inak raz za minútu.
  `enabled` prepínač (default `true`) — keď `false`, nezaloží žiaden
  interval vôbec (pre vnorené použitie, viď nižšie). Cleanup (`clearInterval`
  vo `useEffect` return) pri unmounte AJ pri každej zmene frekvencie.
- `src/components/offer-countdown.tsx` (nový, `OfferCountdownText`) —
  čistý render okolo `offerCountdown`, dostáva `now` ako hotovú hodnotu
  zvonka, sám žiadny timer nezakladá.
- **„Jeden spoločný interval na obrazovku" pri viacerých ponukách naraz**
  (majiteľov zoznam + spodný panel v `OwnerOffers` zdieľajú tú istú
  ponuku): `OfferList` prijíma voliteľný prop `now` — keď ho dostane
  (z `OwnerOffers`, ktorý tiká sám za celú obrazovku), svoj vlastný hook
  zavolá s `enabled=false` a žiaden druhý interval nevznikne. Keď `now`
  nedostane (samostatné použitie, verejný zoznam v podtabe „Ponuky"), tiká
  si sám. Overené `grep`om (`§ dôkazy` nižšie) — **nedokazuje to, že sa
  timery na telefóne naozaj nehromadia**, to vie overiť len beh appky.

**Zmenené súbory:** `offer-validity.ts` (nová `offerCountdown`, `isOfferExpired`
+`now`, odstránená stará `offerValidityLabel`), nový
`use-offer-countdown-tick.ts`, nový `offer-countdown.tsx`, `offer-list.tsx`
(prop `now`, `OfferCountdownText`), `owner-offers.tsx` (jeden `now` pre
zoznam aj panel), `ponuka/[id].tsx` (`now` pre `mine`).

**i18n:** `offerValidity.validUntil`/`validUntilHours` zrušené (nahrádza ich
stupňovité skladanie z `offerCountdown`), nový kľúč `offerValidity.countdownDays`
(„Platí ešte {{days}}" / „Valid for {{days}} more" / „Noch {{days}} gültig")
vo všetkých troch jazykoch. `HH:MM`/`HH:MM:SS` sú číslicové formáty bez textu
— jazykovo neutrálne, netreba pre ne nový kľúč.

**Dôkazy:**

| Čo | Ako | Výsledok |
|---|---|---|
| logika stupňovitého odpočtu (7 nových scenárov: hranice 24 h/1 h, `HH:MM`, `HH:MM:SS`, urgent, status vs. živý čas) | `npx --yes tsx scripts/check-offer-validity.ts` | **23/23 OK** (bolo 17/17) |
| lokalizácia SK/EN/DE | `npx --yes tsx scripts/check-i18n.ts` | **15/15 OK** |
| typy | `npx tsc --noEmit -p .` | čisté |
| `package.json` (§9) | `git diff --stat package.json` | prázdne — fingerprint nedotknutý |

**Čo dôkaz NEDOKAZUJE (§1 — grep a čítanie kódu nedokazuje nič, preto 🟡, nie ✅):**

- Že odpočet na telefóne NAOZAJ tiká (dni → `HH:MM` → `HH:MM:SS` v poslednej
  hodine) — v tomto prostredí nie je simulátor.
- Že sa timery pri viacerých ponukách naozaj NEHROMADIA a appka pri dlhšie
  otvorenej obrazovke nespomaľuje — architektúra (jeden interval, cleanup vo
  `useEffect`) je navrhnutá presne proti tomu, ale reálne správanie na
  zariadení vie potvrdiť len beh appky.
- **Rastiova požiadavka na dôkaz vo forme videa/screenshotov je v priamom
  rozpore so stojacim pravidlom appky (CLAUDE.md §1, Rastio 17.8.2026:
  „screenshoty nechcem, nemám ich ako zobraziť — platí aj do budúcna").**
  Preto namiesto obrázkov nižšie (§7 v reporte) presne popisujem, čo si má
  na telefóne pozrieť a **slovami** potvrdiť — obrázok by som si tu ani ja
  nevedel overiť, že ukazuje appku, nie mockup.

**Publikované OTA — ✅ OVERENÉ RUNTIME.** Commit `c998aca`. Prvý pokus
(`bsbcqa6qc`) padol počas Metro bundlingu (studená cache + krátkodobý
čiastočný výpadok EAS Update podľa status.expo.dev) skôr, než čokoľvek
publikoval — nezanechal duplicitný balík, len osirotený proces, ktorý som
ukončil pred druhým pokusom. Druhý pokus prešiel: runtime `24919867e…`
(iOS) / `eaadbb7ec…` (Android) — **zhodné s buildom #5**. iOS update
`01a05e01-3fa4-7287-af00-669e86e26cde` (skupina
`5aeb8378-f450-4b28-a073-79f848fe028f`), Android update
`01a05e01-3fa4-7faf-8f0a-641786995348` (skupina
`41f6e17e-4d45-4560-97bf-dcfb5db6a0e4`).

---

### 31.10 Dodatok — odpočet aj na kartách v zoznamoch (Rastio, 2.9.2026) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Doteraz bol živý odpočet (31.9) len na detaile inzerátu a v „Ponuky" podtabe.
Rastio žiadal, aby bol vidieť aj v zoznamoch — bez otvárania každého
inzerátu zvlášť:

- **„Moje inzeráty" (Profil)** — pri inzeráte s prichádzajúcimi PENDING
  ponukami sa ukazuje odpočet **najbližšie vypršiavajúcej** z nich
  („Najbližšia ponuka · Platí ešte 5 dní" / „· 04:32" / „· 00:47:32",
  posledná hodina zvýraznená). To zaujíma vlastníka najviac — nie ktorá
  ponuka je najvyššia.
- **„Moje ponuky" (Profil)** — pri KAŽDEJ mojej podanej ponuke odpočet jej
  vlastnej platnosti, dopísaný do riadku a posledná hodina zvýraznená
  červeno/tučne (predtým mal riadok len sumu, dátum a stav).
- **Katalóg** — pri inzeráte s najvyššou ponukou pribudol **verejný**
  odpočet platnosti TEJ ponuky priamo na fotke, rovnakým štítkom
  (`PhotoBadge`) ako uzávierka inzerátu: „Najvyššia ponuka · Platí ešte
  2 dni". Rastio sa pýtal na názor — súhlasím s jeho dôvodom (vytvára
  prirodzenú naliehavosť pre ďalších záujemcov) a implementoval som to
  podľa jeho návrhu bez zmeny.

**Prečo dva rôzne odpočty na dvoch rôznych inzerátoch/ponukách:** platnosť
NAJVYŠŠEJ ponuky (verejný katalóg, „čo vidí každý") a platnosť
NAJBLIŽŠIE vypršiavajúcej ponuky (vlastníkov súkromný pohľad, „čo sa mi
môže minúť") sú zámerne iné veličiny — pozri hlavičku `offer-validity.ts`
prečo platnosť ponuky a uzávierka inzerátu bežia nezávisle.

**Odkiaľ dáta:** `attachOfferStats()` (`src/hooks/use-properties.ts`,
zdieľaná medzi katalógom aj „Moje inzeráty") už predtým počítala
`top_offer`/`offer_count`/`pending_count` zo ŽIVÝCH ponúk — teraz naviac aj:

- `top_offer_valid_until` — platnosť TEJ ponuky, čo je aktuálne najvyššia,
- `nearest_offer_valid_until` — najskoršia platnosť spomedzi PENDING ponúk
  (string porovnanie ISO 8601 dátumov, netreba `Date`).

Oba stĺpce pribudli do `PropertyWithMedia` (`src/lib/property.ts`) ako
voliteľné — `null`, keď relevantná ponuka platnosť nemá nastavenú.

**Tikanie — rovnaká zásada „jeden spoločný interval, nie jeden na
riadok" (31.9), aplikovaná na TRI nové miesta:**

- `src/app/(tabs)/index.tsx` (katalóg) — jeden `useOfferCountdownTick` pre
  celý zoznam kariet, `now` posiela do `PropertyCard` ako prop.
- `src/app/(tabs)/profil.tsx` — DVA nezávislé tiky (sekcie sú si navzájom
  cudzie, nie vnorené): `myListingsNow` pre „Moje inzeráty", `myOffersNow`
  pre „Moje ponuky". Stále „jeden na zoznam", nie jeden na riadok.
- `PropertyCard` aj `MyListingRow` dostali rovnaký `now?: number` prop +
  fallback vzor ako `OfferList` (31.9): keď `now` nepríde, karta/riadok si
  tikne sama (`enabled = now == null`) — takže sa dajú použiť aj mimo
  obrazovky, ktorá tikanie zdieľa.

**Zmenené súbory:** `src/hooks/use-properties.ts` (`attachOfferStats` +2
polia), `src/lib/property.ts` (typ), `src/components/property-card.tsx`
(nový štítok na fotke + `now` prop), `src/components/my-listing-row.tsx`
(nový riadok + `now` prop), `src/app/(tabs)/index.tsx` (zdieľaný tik),
`src/app/(tabs)/profil.tsx` (dva zdieľané tiky, „Moje ponuky" dostalo
`metaUrgent` na zvýraznenie poslednej hodiny).

**i18n:** nový kľúč `myListingRow.nearestOfferPrefix` („Najbližšia ponuka" /
„Nearest offer" / „Nächstes Angebot") vo všetkých troch jazykoch. Katalógový
štítok znovupoužíva existujúci `propertyCard.topOffer` — žiadny nový kľúč.

**Dôkazy:**

| Čo | Ako | Výsledok |
|---|---|---|
| typy | `npx tsc --noEmit -p .` | čisté |
| logika odpočtu (nezmenená, len nové volania) | `npx --yes tsx scripts/check-offer-validity.ts` | 23/23 OK |
| logika uzávierky (nezmenená) | `npx --yes tsx scripts/check-deadline.ts` | OK |
| lokalizácia SK/EN/DE | `npx --yes tsx scripts/check-i18n.ts` | **15/15 OK** |
| `package.json` (§9) | `git diff --stat package.json` | prázdne — fingerprint nedotknutý → **IDE OTA** |

**Čo dôkaz NEDOKAZUJE (§1):** že sa odpočty na kartách v katalógu, „Moje
inzeráty" a „Moje ponuky" naozaj vidia a tikajú na telefóne, že sa
štítok na fotke v katalógu nezráža s uzávierkou pri inzeráte, ktorý má
OBOJE naraz, a že dva nezávislé tiky na Profile appku nespomaľujú.
To vie potvrdiť len beh appky — pozri report `reports/PLATNOST_PONUKY.md`
§7c pre presný zoznam, čo si má Rastio na telefóne pozrieť.

---

## Fáza 32 — Duplicitné tlačidlá v detaile inzerátu (2.9.2026, nález zo screenshotov)

Podrobnosti a dôkazy: `reports/DUPLICITNE_TLACIDLA.md`.

### 32.0 Nález

Rastio zo screenshotov: karta „Moja ponuka" (podtab „Ponuky") aj prilepená
spodná lišta ukazovali TO ISTÉ tlačidlo („Podať ponuku" / „Upraviť moju
ponuku"), naraz, na tej istej obrazovke — zvyšok karty od zavedenia sticky
lišty (8.8.2026) nikto nezoštíhlil.

### 32.1 Oprava — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

`src/components/property-tabs.tsx` (`OffersTab`) — z karty „Moja ponuka"
(aj z karty pre neprihláseného „Chcem ponúknuť") odstránené VŠETKY tri
duplicitné tlačidlá („Podať ponuku", „Upraviť moju ponuku", „Prihlás sa a
ponúkni" — posledné malo doslovne rovnaký i18n text ako lišta). Karta si
drží informačnú hodnotu (suma, stav) a **„Stiahnuť ponuku" ZOSTÁVA** —
sticky lišta túto akciu neponúka. Sticky lišta (`primaryAction()` v
`nehnutelnost/[id].tsx`) sa NEMENILA, len overená čítaním kódu — text sa
tam menil správne aj predtým.

Vedľajšie upratanie: `useRouter` v `OffersTab` bol po odstránení tlačidiel
nepoužitý, odstránený. 3 osirotené i18n kľúče
(`propertyTabs.submitOffer`/`.editMyOffer`/`.signInAndOffer`) odstránené zo
všetkých troch jazykov.

### 32.2 Dôkazy

| Čo | Ako | Výsledok |
|---|---|---|
| typy | `npx tsc --noEmit -p .` | čisté |
| lokalizácia SK/EN/DE | `npx --yes tsx scripts/check-i18n.ts` | **15/15 OK** (1044 t()-volaní, o 3 menej — presne zodpovedá odstráneným kľúčom) |
| `package.json` (§9) | `git diff --stat package.json` | prázdne — **IDE OTA** |

Nedokázateľné bez telefónu (§1): že po zmene v karte naozaj ostalo len
jedno tlačidlo NA POHĽAD a že sticky lišta pred očami mení text. Rastio
potvrdí slovami, nie screenshotom (`reports/DUPLICITNE_TLACIDLA.md` §6).

### 32.3 Ďalšie obrazovky — len JEDEN ďalší nález, NEOPRAVENÝ (na Rastiovo rozhodnutie)

Prilepenú lištu má v appke len JEDNA obrazovka, takže presne tento vzor sa
nemohol zopakovať inde. Rovnaký PRINCÍP (jedna akcia, dve miesta) sa ale
našiel ešte raz na tej istej obrazovke: ikona „Zdieľať" je AJ nad hero
fotkou (`nehnutelnost/[id].tsx` ~r.328), AJ v sticky lište (~r.579) —
rovnaká funkcia `shareProperty(item)`. Vznikla rovnakým spôsobom ako
duplicita ponuky: sticky ikona pribudla 7.8.2026 ako náhrada za orezanú
pôvodnú, ktorú ale nikto neodstránil. **Zámerne NEOPRAVENÉ** — Rastio si
vyžiadal len zoznam, nie automatickú opravu ďalších nálezov. Ostatné
obrazovky (Obhliadka, Správy, Hypotéka, Hodnotenia, `OwnerOffers`,
`DeadlineDecision`, samostatné obrazovky bez sticky lišty) prezreté —
bez nálezu.

### 32.4 Publikované OTA — ✅ OVERENÉ RUNTIME

Commit `b2e188c`. Runtime zhodné s buildom #5 (`24919867e…` iOS /
`eaadbb7ec…` Android). iOS update
`01a05e83-3567-7aaf-8479-234d4f40d718` (skupina
`efaf4342-c314-4ef0-9c2f-8dd31c7254f8`), Android update
`01a05e83-3567-701b-abc2-8c4425d16f6e` (skupina
`73d27394-8912-4740-bdb1-243f4853c184`).

### 32.5 Dodatok — aj ikona „Zdieľať" (Rastio, 2.9.2026, po 32.3) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Rastio sa rozhodol pre nález z 32.3: odstrániť ikonu „Zdieľať" nad hero
fotkou, nechať len sticky. `nehnutelnost/[id].tsx` — `Pressable` s
`shareProperty(item)` nad fotkou (bývalý r. ~328) odstránený. Ikona v
prilepenej lište (r. ~576) sa nemenila. `shareProperty` import aj
`propertyDetail.shareListing` i18n kľúč zostávajú — používa ich sticky
lišta. `npx tsc --noEmit -p .` čisté, `package.json` nedotknutý → **IDE
OTA**. Nedokázateľné bez telefónu: že ikona nad fotkou naozaj zmizla
a rozostup ikon (celoobrazovka + srdiečko) nevyzerá čudne.

**Publikované OTA — ✅ OVERENÉ RUNTIME.** Commit `5c39333`. Runtime zhodné
s buildom #5 (`24919867e…` iOS / `eaadbb7ec…` Android). iOS update
`01a05e8c-8a47-7e68-8f6d-a291d7bcbf2e` (skupina
`19241e6a-6a6b-4e1a-9f00-1f27892b2b2f`), Android update
`01a05e8c-8a47-78fe-a794-f312372d9085` (skupina
`0872e59d-ad68-4b5b-9dbe-6037a810aa2d`).

---

## Rozsah appky — upresnenie (7.8.2026)

Rastio: **iba nehnuteľnosti**, ale obe strany trhu a oba typy obchodu —
**predaj aj prenájom**, teda aj prenajímatelia, aj kupujúci, aj predávajúci.
Nie je to všeobecný bazár.

Dôsledok: zvolený **smer C (Mapa)** ostáva v platnosti — pri nehnuteľnostiach
je poloha prvý filter. Do dátového modelu (Fáza 1) však pribúda rozlíšenie
**predaj / prenájom** ako plnohodnotná os, nie ako príznak: prenájom má cenu
za mesiac, predaj celkovú cenu, a filtre aj karty to musia vedieť rozlíšiť.

---

## Čo blokuje postup

Fáza 2 je hotová, publikovaná cez OTA a 30 automatických kontrol prešlo.
Blokuje **overenie na telefóne** (2.10) — appku treba zavrieť a znova
otvoriť, vypýta si prezývku.

Ďalej otvorené: **ikona a splash sa dajú vymeniť len novým buildom** (1.14).
`buildNumber` je pripravené na 2, Rastio sa rozhodol build odložiť, kým sa
nazbiera viac zmien. Nie je to blokujúce — appka funguje.

> Token expiruje **6.9.2026**. Po tomto dátume push prestane fungovať —
> vtedy stačí prepísať hodnotu v `/root/.offerra-secrets`, nič iné.

---

## Otvorené na Fázu 2 a ďalej

Všetko, čo register držal ako otvorené na Fázu 1, je vyriešené
(`RECORD_AUDIO` → 1.3, PostgREST → 1.6, verejné fotky → 1.7,
dátový model → 1.4, auth flow → 0.16).

Nové otvorené body:

- **Zmenšovanie fotiek pri uploade** — dnes len prekódovanie `quality 0.6`
  + poistka 8 MB. Skutočný resize potrebuje `expo-image-manipulator`, čo je
  nový natívny modul → nový EAS build. Zvážiť pri najbližšom builde (1.7).
- **Verejný bucket a DRAFT fotky** — ČIASTOČNE VYRIEŠENÉ 17.8.2026 (Fáza
  28.5): vypisovanie bucketu je **zavreté** restrictive politikou, takže sa
  fotky nezverejnených inzerátov nedajú prejsť (predtým 122 fotiek, 20 z 21
  inzerátov nezverejnených). **Ostáva otvorené:** fotka je stále čitateľná,
  kto pozná presnú URL — na to treba neverejný bucket + podpísané URL, teda
  prerobenie celej cesty k fotkám (vlastná fáza, ide OTA).
- **Notifikácie** — Offerra ich nemá vôbec. „Osloviť" je zatiaľ záznam
  v appke, nie push (2.7).
- **Filtre a mapa** — Fáza 6. Katalóg zatiaľ radí len podľa dátumu.
- **Moderovanie inzerátov** (`PENDING_APPROVAL`) — Fáza 7, zámerne preskočené.
