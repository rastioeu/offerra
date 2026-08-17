# Fotky v bucketе sa dajú vypísať cudzím okom

**Dátum:** 17.8.2026
**Vyžiadal:** Rastio (bod 5 z návrhu — „fotky konceptov sú verejné, kto pozná URL")
**Stav:** 🔴 **NEOPRAVENÉ — oprava potrebuje tvoju ruku** (SQL nižšie).
Zmerané, otestované a pripravené; sám to spustiť neviem.

---

## 1. Je to horšie, než register tvrdil

Register 1.7 hovoril: *„fotka rozrobeného inzerátu je pri znalosti UUID cesty
dostupná."* To znie ako niečo, čo treba najprv uhádnuť. **Netreba.**

Bucket `offerra-media` sa dá **vypísať** obyčajným anon kľúčom:

```
POST /storage/v1/object/list/offerra-media   { "prefix": "", "limit": 1000 }
→ HTTP 200, zoznam priečinkov
```

Prejsť sa dá celá štruktúra `<user_id>/<property_id>/<súbor>`, takže cesty
netreba hádať — dajú sa **prečítať**. Namerané 17.8.2026:

| | |
|---|---|
| používateľských priečinkov | **11** |
| priečinkov inzerátov | **21** |
| vypísateľných fotiek | **122** |
| z toho inzerátov, ktoré anonym cez REST **nevidí** | **20 z 21** |

Tých 20 sú koncepty, archivované, uzavreté alebo **zmazané** inzeráty. RLS
na tabuľkách `property` a `media` funguje správne — anonym nevidí ani jeden
DRAFT riadok (overené) — ale storage o tom nevie a fotky vydá.

Anon kľúč nie je tajný: je zabudovaný v appke, ktorú si každý stiahne. Treba
s ním počítať ako s verejným.

### Čo NIE JE problém

- **Priame čítanie URL zverejnenej fotky.** Bucket je verejný zámerne, inak
  by katalóg ostal bez fotiek (presne regresia z Fázy 24). Toto musí ostať.
- **Zapisovanie.** Skúšal som nahrať obrázok anon kľúčom → RLS to zamietla
  (`new row violates row-level security policy`). Cudzí ti do bucketu
  nenahrá nič, ani nič neprepíše.

---

## 2. Oprava — jedna politika, žiadna zmena v appke

Appka `storage.list()` **nepoužíva nikde** (overené: používa len `upload`,
`remove` a `getPublicUrl`, a `getPublicUrl` je len skladanie textu, žiadne
volanie servera). Zavretie výpisu preto appku nijako nezasiahne.

Vlož do **Supabase → SQL editor** tento jeden blok a spusti:

```sql
-- Zavrie VYPISOVANIE bucketu offerra-media pre cudzie oko.
-- Vlastník vidí svoj priečinok ďalej, iné buckety sa to netýka,
-- verejné čítanie zverejnených fotiek to NEOVPLYVNÍ.
create policy "offerra-media: vypisat smie len vlastnik"
on storage.objects
as restrictive
for select
using (
  bucket_id <> 'offerra-media'
  or (storage.foldername(name))[1] = auth.uid()::text
);
```

Späť sa to vezme jediným riadkom, keby čokoľvek:

```sql
drop policy "offerra-media: vypisat smie len vlastnik" on storage.objects;
```

### Prečo práve takto (a nie „zruš tú starú politiku")

- **`as restrictive`** znamená, že sa politika s existujúcimi **spojí
  spojkou AND**, nie OR. Preto **nič nemusíš rušiť** a nehrozí, že
  odstránením politiky pokazíš niečo iné, čo o nej nevieš. (Bežné politiky
  sú „permissive" a sčítavajú sa — pridanie ďalšej by samo nič nezavrelo,
  preto tu `restrictive` byť MUSÍ.)
- **`bucket_id <> 'offerra-media' or …`** — iných bucketov sa politika
  nedotkne vôbec.
- **Vlastník podľa prvého segmentu cesty**: fotky sa ukladajú do
  `<user_id>/<property_id>/<súbor>`, takže „môj priečinok" je presne to, čo
  appka potrebuje na mazanie vlastných fotiek. Anonym má `auth.uid()`
  prázdny → nevypíše nič.
- **Verejné čítanie ide MIMO RLS** (bucket je public, adresa
  `/object/public/…`), takže katalóg ostane s fotkami. Skript to kontroluje
  ako samostatný bod.

### Po spustení over dvoma vecami

```bash
npx --yes tsx scripts/check-storage-exposure.ts     # musí prejsť (dnes zlyhá na 2 kontroly)
```

a v appke **nahraj a zmaž fotku** vo vlastnom inzeráte — mazanie potrebuje
politiku na `delete`, tej sme sa nedotkli, ale overiť to treba prstom, nie
predpokladom (§1).

Skript je napísaný tak, že **dnes zlyhá** (exit 1) a po oprave prejde —
kontroluje aj to, čo sa nesmie pokaziť: že zverejnenú fotku prečíta aj
neprihlásený prehliadač, a že cudzí nesmie zapisovať.

---

## 3. Čo tým NEBUDE vyriešené

- **Fotka je stále čitateľná, kto pozná presnú URL.** Po oprave sa cesty
  nedajú prejsť, ale kto URL raz dostal (napr. z odkazu), otvorí ju ďalej.
  Skutočná dôvernosť konceptov = **neverejný bucket + podpísané URL**, čo je
  prerobenie celej cesty k fotkám (karta, detail, fullscreen, obľúbené,
  zdieľanie). Tá istá cesta už dvakrát spadla (Fáza 24), takže si to
  zaslúži vlastnú fázu a nie prílepok k tomuto. Odhad: nový natívny modul
  netreba, teda OTA — ale je to väčšia zmena, nie dnešná.
- **Fotky zmazaných inzerátov ostávajú v bucketе.** Časť tých 20 priečinkov
  sú siroty po zmazaných inzerátoch. Vyčistiť ich treba servisným kľúčom
  (ja ho nemám a do repa nepatrí — §4), takže je to úloha pre teba alebo pre
  neskoršiu serverovú časť.

---

## 4. Prečo som to nespustil sám

Rastio 17.8.2026: „spusť ty". **Nedá sa** — overené, nie odhadnuté:

| Čo som skúsil | Výsledok |
|---|---|
| `/root/.offerra-secrets` | len `DEMO_PASSWORD`, `GITHUB_TOKEN`, `PAGES_ADMIN_TOKEN`, `PAGES_TOKEN` — žiadny prístup k DB |
| `.env` v repe | len `EXPO_PUBLIC_SUPABASE_URL`, `…_ANON_KEY`, `…_DEMO_PASSWORD` |
| premenné prostredia | žiadna `SUPABASE_*`, `PG*` ani `DATABASE_URL` |
| `npx supabase projects list` | `Access token not provided` — CLI nebol nikdy prihlásený |
| `psql` | nainštalovaný, ale bez pripojenia sa nemá kam prihlásiť |

`create policy` nad `storage.objects` je DDL — anon kľúčom sa spustiť nedá a
ani servisný kľúč na to nestačí (ten cez REST DDL nespúšťa). Treba
**dashboard alebo pripojenie k databáze**.

**Ak to mám spustiť ja**, stačí do `/root/.offerra-secrets` (mimo repa, tam
už tvoje tajomstvá žijú) pridať riadok s pripojením z Supabase → Project
Settings → Database → *Connection string* (URI, s heslom):

```
SUPABASE_DB_URL=postgresql://postgres:<heslo>@db.<ref>.supabase.co:5432/postgres
```

Potom to spustím `psql`-om, overím skriptom a napíšem výsledok. Do repa sa
tá hodnota nedostane — `rastioeu/offerra` je verejný (§4).
