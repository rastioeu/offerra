# FÁZA 0 — SETUP (Offerra)

**Verzia:** 1.0.0 (prvý report projektu)
**Dátum:** 7.8.2026
**Stav:** ⏸️ **ZASTAVENÉ — čakám na 2 veci od teba** (GitHub token + „OK build")

---

## Zhrnutie v troch vetách

Projekt v `/root/offerra` stojí, beží na SDK 57 a Supabase časť je hotová a
overená spätnými SELECT-mi. Prihlásenie zdieľaným účtom z Offerra klienta
funguje — mám na to reálny log, nie domnienku. **Nemám GitHub token pre
`rastioeu/offerra`, takže nič nie je pushnuté**, a podľa dohody sa
nespúšťa `eas build` bez tvojho výslovného „OK build".

---

## ⛔ Čo od teba potrebujem

### 1. GitHub token pre `rastioeu/offerra` — BLOKUJE PUSH

Prehľadal som všetko, čo na stroji je:

| Kde | Čo tam je |
|---|---|
| `/root/.git-credentials` | 2 záznamy — patria mutark/famiglia |
| `/root/.famiglia-secrets` | `GITHUB_TOKEN` → **Famiglia** |
| `/root/.mutark-secrets` | Supabase, Apple, Expo — **žiadny GitHub token** |
| `$GITHUB_TOKEN` v prostredí | nenastavený |
| `/root/.bash_history` | jediná zmienka je `cd offerra`, žiadny token |

Podľa tvojho zadania som **nepoužil** MUTARK ani Famiglia token.

**Potrebujem:** GitHub Personal Access Token s právom `repo` (alebo
fine-grained token s `Contents: read and write`) pre repozitár
`rastioeu/offerra`.

Najbezpečnejšie mi ho podaj tak, že si ho uložíš sám — napr.:

```
! echo 'GITHUB_TOKEN=ghp_…' > /root/.offerra-secrets && chmod 600 /root/.offerra-secrets
```

(prefix `!` spustí príkaz priamo v tejto relácii)

### 2. „OK build" pre `eas build --platform ios`

Všetko pre build je pripravené (viď nižšie). Build **nespúšťam**, kým
nenapíšeš „OK build" — spotrebúva EAS kredit a čas.

---

## ✅ Čo je hotové a overené

### Supabase (bod 4) — kompletné

Cez **Management API**, nie psql — presne postupom, ktorý má MUTARK
zdokumentovaný v `reports/FAZA_11_*.md`.

**Schéma `offerra`** v projekte `vxqvpgzwefcehugmhaft`. Pred zápisom som
overil, že neexistovala (MUTARK sedí v `public`). Spätný SELECT:

```json
{"nspname":"offerra","tables":0,"anon_usage":true,"auth_usage":true}
```

Bez tabuliek — podľa zadania.

**Bucket `offerra-media`** + 4 RLS policy (select/insert/update/delete,
vzor „prvý segment cesty = `auth.uid()`"). Spätný SELECT:

```json
{"id":"offerra-media","public":false,"file_size_limit":10485760,
 "allowed_mime_types":["image/jpeg","image/png","image/webp","image/heic"],
 "offerra_policies":4,"objects":0}
```

### Prihlásenie zdieľaným účtom (lokálne) — dôkaz

Test bežal proti **Offerra** konfigurácii (jej `.env`, jej anon key), účtom
z MUTARKu:

```
[OFFERRA] Supabase URL z .env  : https://vxqvpgzwefcehugmhaft.supabase.co
[OFFERRA] anon key (prefix)    : eyJhbGciOiJIUzI1NiIsInR5… (dĺžka 208)

=== DÔKAZ: PLATNÁ SESSION V OFFERRA KLIENTOVI ===
user.id        : 6b861952-7bc9-4c71-bac5-cfae73305fc8
user.email     : applereview@mutark.app
token_type     : bearer
access_token   : eyJhbGciOiJFUzI1NiIsImtpZCI6IjNj… (dĺžka 802)
expires_at     : 2026-08-07T08:03:12.000Z

getUser(access_token) → ✅ platný, id=6b861952-7bc9-4c71-bac5-cfae73305fc8
JWT iss        : https://vxqvpgzwefcehugmhaft.supabase.co/auth/v1
JWT role       : authenticated
```

Podstatné: token nebol len **vydaný**, ale aj serverom **prijatý**
(`getUser`) — to dokazuje, že zdieľaný Auth akceptuje session z novej appky.

Skript **nedávam do repa** — obsahuje heslo demo účtu a `rastioeu/offerra`
je **verejný** repozitár (MUTARK je private, tam to nevadí).

### SDK 57 ako funkčná baseline — dôkaz

Nie „malo by fungovať": Metro naozaj zostavil iOS bundle.

```
manifest: "sdkVersion":"57.0.0", "runtimeVersion":"exposdk:57.0.0"
bundle  : HTTP 200, 8 484 223 B, 61,8 s, bez chýb
tsc --noEmit → exit 0
```

`expo 57.0.11` (npm `latest`), RN 0.86.2, React 19.2.3.
MUTARK je na `57.0.7` — **zámerne nezosúladené**, ako si písal.

### EAS projekt — samostatný

`@rastio_eu/offerra`, projectId `31b8063a-d351-4e3c-bfc4-5c384e432b61`
(MUTARK má `13c85c51-…`). `eas.json` podľa MUTARK vzoru.

### Kredenciály pre TestFlight — dobrá správa

Bál som sa, že tu zastanem. Nezastal:

| Kredenciál | Stav |
|---|---|
| EAS account | ✅ `rastio_eu` (`EXPO_TOKEN` v `.bashrc`) |
| Apple Team ID | ✅ `TC4V762X67` — „Rastislav Janek (Individual)" |
| App Store Connect API kľúč | ✅ na EAS účte: `ZTQ53HT6PX`, issuer `7cc9c1f2-…` |
| iOS distribučný certifikát | ✅ platný do 2027-07-09 |
| ASC app record `com.offerra.app` | 🔴 neexistuje — **vytvorí ho `eas submit`** pri prvom podaní |

Takže build aj submit sú technicky pripravené. Chýba len tvoje „OK".

### Skeleton — 4 taby

`Nehnuteľnosti / Dopyty / Pridať / Profil`, klasické `Tabs`
z `expo-router/tabs` (rovnako ako MUTARK — šablóna `create-expo-app` dnes
ponúka `unstable-native-tabs`, tie som vedome nepoužil kvôli prenosnosti
vzorov). Prázdne obrazovky, len nadpis, žiadna logika.

**Status 🟡, nie ✅** — kód je hotový a bundle sa zostavil, ale *že tie štyri
taby naozaj vidno* je vizuálne overenie, a to podľa Definition of Done
robíš ty na zariadení.

### Paleta — schválená pred zápisom

Predložil som 3 návrhy, vybral si **B — Navy & Azure**. Až potom som ju
zapísal do `src/theme/tokens.ts`:

```
LIGHT  background #F5F7FA   surface #FFFFFF
       primary    #103A6B   (navy)
       secondary  #1B73D4   (azure)
DARK   background #0D1520   surface #16202E
```

Štruktúra tokenov je zhodná s MUTARKom (`Palette`/`Colors`/`Spacing`/
`Radius`/`Type`/`Weight`/`Shadow`), obsah vlastný. Light-first.

**Jedna vec na tvoje zváženie:** dark `#0D1520` je blízko MUTARKovmu
`#0B1020`. Offerra je light-first, takže dark je doplnková téma — ale ak
chceš väčší odstup, meníme Offerra token (MUTARK nechávam na pokoji).

### MUTARK a Famiglia — nedotknuté

```
MUTARK   git status --porcelain → prázdne
FAMIGLIA git status --porcelain → prázdne
```

Ani jeden riadok zmeny. Len čítanie.

---

## 🟡 / 🔴 Čo nie je hotové

| Bod | Status | Prečo |
|---|---|---|
| Push do `rastioeu/offerra` | 🔴 | chýba token (viď vyššie) |
| `eas build --platform ios` | ⏸️ | čaká na „OK build" |
| `eas submit` do TestFlight | ⏸️ | nadväzuje na build |
| Appka spustená z TestFlightu | 🔴 | nadväzuje na submit |
| Prihlásenie overené v TestFlight builde | 🔴 | nadväzuje na submit |
| 4 taby viditeľné | 🟡 | kód hotový, vizuál overíš ty |
| `com.offerra.app` dostupné v Apple portáli | 🟡 | v App Store ho nikto nemá (`resultCount: 0`), ale registráciu potvrdí až build |

---

## Kontrolný zoznam zo zadania

- [x] Repo `rastioeu/offerra` existuje — ✅ (public, `main`, 1 commit)
- [ ] Vlastný token funguje, priebežné commity — 🔴 **token chýba**, commity zatiaľ lokálne
- [x] SDK 57 potvrdená ako funkčná baseline — ✅ bundle 8,48 MB
- [x] `app.json` má bundle id + EAS project — ✅
- [x] Supabase schéma `offerra` — ✅
- [x] Storage bucket `offerra-media` — ✅
- [x] Prihlásenie zdieľaným účtom lokálne — ✅ log vyššie
- [ ] `eas build --platform ios` — ⏸️ čaká na „OK build"
- [ ] `eas submit` do TestFlight — ⏸️
- [ ] Appka z TestFlightu na zariadení — 🔴
- [ ] Prihlásenie overené v TestFlight builde — 🔴
- [ ] 4 taby viditeľné — 🟡 čaká na vizuálne overenie
- [x] `tokens.ts` + 3 farebné návrhy na schválenie — ✅ (schválené B)
- [x] `OFFERRA_REGISTER.md` a `CLAUDE.md` — ✅ v `/root/offerra`
- [x] MUTARK a Famiglia nezmenené — ✅

---

## Na Fázu 1 (poznámky, nie úlohy na teraz)

- `RECORD_AUDIO` v `android.permissions` pridal `expo-image-picker` —
  realitná appka to nepotrebuje, pred prvým store buildom do
  `blockedPermissions`.
- Schéma `offerra` **nie je** vystavená cez PostgREST. `db_schema` je
  zdieľané nastavenie s MUTARKom — meniť opatrne, až budú tabuľky.
- Verejné čítanie `offerra-media` pre fotky inzerátov (teraz privátny).
- `eas.json` → `submit.production.ios` nemá `ascAppId` (appka v ASC ešte
  neexistuje) — doplní sa po prvom submite.
