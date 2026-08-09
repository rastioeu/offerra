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

**Rozhodnutie, ktoré som spravil sám:** hviezdičky sú verejné (priemer
+ počet cez `user_ratings()`), **text komentára vidí len ten, koho sa
týka, a jeho autor**. Verejné voľné pole pripnuté k menovanému človeku je
priestor na osočovanie, ktorý Offerra pri svojej veľkosti neustráži.
Dôveru nesie priemer, nie cudzie vety.

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
- **Verejný bucket a DRAFT fotky** — fotka rozrobeného inzerátu je pri
  znalosti UUID cesty dostupná. Ak má vadiť, riešením sú podpísané URL (1.7).
- **Notifikácie** — Offerra ich nemá vôbec. „Osloviť" je zatiaľ záznam
  v appke, nie push (2.7).
- **Filtre a mapa** — Fáza 6. Katalóg zatiaľ radí len podľa dátumu.
- **Moderovanie inzerátov** (`PENDING_APPROVAL`) — Fáza 7, zámerne preskočené.
