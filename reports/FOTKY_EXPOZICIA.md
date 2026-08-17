# Fotky v bucketе sa dali vypísať cudzím okom

**Dátum:** 17.8.2026
**Vyžiadal:** Rastio (bod 5 z návrhu — „fotky konceptov sú verejné, kto pozná URL")
**Stav:** ✅ **OPRAVENÉ A OVERENÉ RUNTIME.** Politika nasadená cez Management
API, vypisovanie zavreté, vlastníkovi ani katalógu sa nič nepokazilo (dôkazy
v §5). Ostáva 🟡 jedna vec na telefóne — §6.

---

## 1. Bolo to horšie, než register tvrdil

Register 1.7 hovoril: *„fotka rozrobeného inzerátu je pri znalosti UUID cesty
dostupná."* To znie ako niečo, čo treba najprv uhádnuť. **Netreba bolo.**

Bucket `offerra-media` sa dal **vypísať** obyčajným anon kľúčom:

```
POST /storage/v1/object/list/offerra-media   { "prefix": "", "limit": 1000 }
→ HTTP 200, zoznam priečinkov
```

Prejsť sa dala celá štruktúra `<user_id>/<property_id>/<súbor>`, takže cesty
netreba hádať — dali sa **prečítať**. Namerané pred opravou:

| | |
|---|---|
| používateľských priečinkov | **11** |
| priečinkov inzerátov | **21** |
| vypísateľných fotiek | **122** |
| z toho inzerátov, ktoré anonym cez REST **nevidí** | **20 z 21** |

Tých 20 sú koncepty, archivované, uzavreté alebo **zmazané** inzeráty. RLS na
tabuľkách `property` a `media` funguje správne — anonym nevidí ani jeden DRAFT
riadok (overené) — ale storage o tom nevedel a fotky vydal.

Anon kľúč nie je tajný: je zabudovaný v appke, ktorú si každý stiahne. Treba
s ním počítať ako s verejným.

### Čo problém NEBOL

- **Priame čítanie URL zverejnenej fotky.** Bucket je verejný zámerne, inak by
  katalóg ostal bez fotiek (presne regresia z Fázy 24). Toto muselo ostať.
- **Zapisovanie.** Nahranie obrázka anon kľúčom RLS zamietla
  (`new row violates row-level security policy`). Cudzí do bucketu nenahrá nič.

### Ktorá politika to spôsobila

Výpis politík na `storage.objects` pred zmenou to ukázal presne:

```
offerra_media_select_public  [SELECT, permissive, {anon,authenticated}]
    (bucket_id = 'offerra-media'::text)
```

Žiadna podmienka vlastníka — kto má anon kľúč, dostal SELECT na celý bucket.
(Pre porovnanie: `offerra_media_delete_own` má
`AND (storage.foldername(name))[1] = auth.uid()::text`, teda správne.)

---

## 2. Oprava — jedna politika, žiadna zmena v appke

Appka `storage.list()` **nepoužíva nikde** (overené: len `upload`, `remove` a
`getPublicUrl`, a `getPublicUrl` je len skladanie textu, žiadne volanie
servera). Zavretie výpisu preto appku nijako nezasiahlo.

```sql
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

### Prečo takto a nie „zruš tú starú politiku"

- **`as restrictive`** sa s existujúcimi politikami spája **AND-om**, nie OR-om.
  Preto sa **nič nemuselo rušiť** a nehrozilo, že odstránením politiky pokazím
  niečo iné. (Bežné politiky sú „permissive" a sčítavajú sa — pridanie ďalšej
  by samo nič nezavrelo, preto tu `restrictive` byť MUSÍ.)
- **`bucket_id <> 'offerra-media' or …`** — iných bucketov sa nedotkne. To je
  dôležité, lebo databáza je **spoločná**: v tom istom projekte žijú `avatars`
  (MUTARK, verejný) a `eleven-media` (neverejný). Ich politiky sú viazané na
  svoje buckety, overené pred zmenou.
- **Vlastník podľa prvého segmentu cesty** — fotky sú v
  `<user_id>/<property_id>/<súbor>`, čo je presne to, čo appka potrebuje na
  mazanie vlastných fotiek. Anonym má `auth.uid()` prázdny → nevypíše nič.
- **Verejné čítanie ide MIMO RLS** (bucket je public, adresa
  `/object/public/…`), takže katalóg ostal s fotkami.

---

## 3. Čím sa to spustilo

Rastio pripomenul, že **všetky doterajšie DB zmeny v tomto projekte išli cez
Supabase Management API**, nie cez psql — schéma `offerra`, tabuľky, RLS aj
migrácie (register 0.6, 1.4). Má pravdu, mechanizmus je v repe
(`scripts/import-streets.mjs:127`):

```
POST https://api.supabase.com/v1/projects/vxqvpgzwefcehugmhaft/database/query
Authorization: Bearer $SUPABASE_ACCESS_TOKEN
```

**Moje predchádzajúce odporúčanie priameho `SUPABASE_DB_URL` bolo zlé** —
Management API na `create policy` stačí a je to tá istá cesta, akou vznikli
všetky ostatné politiky.

Nový spúšťač: `scripts/apply-storage-policy.mjs` — idempotentný (keď politika
existuje, nič nemení), `--dry-run` len vypíše politiky, pri chybe ukáže celú
odpoveď API (401 = vypršaný token, 403 = chýbajúce právo).

**Token:** v `/root/.offerra-secrets` **nebol** (má len `GITHUB_TOKEN`,
`DEMO_PASSWORD`, `PAGES_TOKEN`, `PAGES_ADMIN_TOKEN`). Existuje
v `/root/.mutark-secrets` a Supabase projekt je s MUTARKom **zdieľaný**.
CLAUDE.md §4 zakazuje požičiavanie tokenov medzi projektmi, takže som naň sám
nesiahol — **Rastio to výslovne povolil** („použi ten z .mutark-secrets,
databáza je spoločná"). Token sa načítal do premennej prostredia pre jediný
príkaz, do repa sa nedostal.

---

## 4. Čo tým NIE JE vyriešené

- **Fotka je stále čitateľná, kto pozná presnú URL.** Cesty sa prejsť nedajú,
  ale kto URL raz dostal, otvorí ju ďalej. Skutočná dôvernosť konceptov =
  **neverejný bucket + podpísané URL**, teda prerobenie celej cesty k fotkám
  (karta, detail, fullscreen, obľúbené, zdieľanie). Tá cesta už dvakrát spadla
  (Fáza 24) → vlastná fáza, nie prílepok. Natívny modul netreba, teda OTA.
- **Fotky zmazaných inzerátov ostávajú v bucketе.** Časť tých 20 priečinkov sú
  siroty. Vyčistenie je samostatná úloha (a treba naň Management API alebo
  servisný kľúč, nie appku).

---

## 5. Dôkazy

### Cudzie oko (anon kľúč aj bez kľúča)

```
── 1. dá sa bucket VYPÍSAŤ anon kľúčom? (toto je tá diera) ──
  OK   vypisovanie bucketu je pre cudzie oko ZAVRETÉ
        HTTP 200, nič sa nevypísalo
── 2. sú medzi nimi fotky NEZVEREJNENÝCH inzerátov? ──
  OK   nedá sa zistiť, pretože vypisovanie je zavreté — presne tak to má byť
── 3. čo MUSÍ ostať funkčné ──
  OK   zverejnenú fotku prečíta aj úplne cudzí prehliadač (bez kľúča)
        HTTP 200 — bez toho by katalóg ostal bez fotiek
── 4. zapisovať cudzí NESMIE ──
  OK   anon kľúčom sa do bucketu NEDÁ nahrávať — a zamietla to RLS, nie kontrola formátu
        HTTP 400, statusCode 403 — „new row violates row-level security policy"
```

`npx --yes tsx scripts/check-storage-exposure.ts` — pred opravou **2 FAIL**, po
oprave **4/4 OK**. Ten istý skript teda dokázal aj chybu, aj opravu; keby
prechádzal vždy, nedokazoval by nič.

### Vlastník (prihlásená session, demo účet)

Toto je tá polovica, na ktorú sa pri zatváraní práv zabúda — že sa nezavrie aj
tomu, kto tam má prístup mať. Preto sa fotka reálne nahrala a zmazala:

| Krok | Výsledok |
|---|---|
| výpis vlastného priečinka | HTTP 200, **vidí svoje** (2 položky) |
| výpis celého bucketu ako prihlásený | HTTP 200, **len svoj priečinok**, nič cudzie |
| nahranie fotky do vlastného priečinka | HTTP 200 |
| fotka vo výpise | HTTP 200, 1 položka |
| zmazanie vlastnej fotky | HTTP 200 |
| po sebe uklidené | 0 položiek v testovacom priečinku |

(Prvý pokus o mazanie vrátil HTTP 400 — bola to chyba **môjho testu**, poslal
som `DELETE` s `Content-Type: application/json` a bez tela. Nie politika.
Zapisujem to, lebo taká chyba sa dá ľahko vyhlásiť za „RLS blokuje mazanie".)

---

## 6. Čo mi ostáva potvrdiť od teba (🟡)

Overil som mazanie fotky **cez REST s prihlásenou session**, nie z appky.
Skús preto v appke **pridať a zmazať fotku vo vlastnom inzeráte** — je to jedno
ťuknutie a je to jediné miesto, kde by sa zmena práv mohla ukázať inak než v
mojom teste (appka volá `supabase.storage.remove()`, nie priamo REST).

Ak by fotky v katalógu náhodou zmizli (nemali by — čítanie ide mimo RLS),
späť to vezme jediný `drop policy` z §2.
