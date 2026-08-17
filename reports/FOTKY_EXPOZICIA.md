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

Spusti v **Supabase → SQL editor**:

```sql
-- 1) NAJPRV sa pozri, čo tam dnes je (názov politiky potrebuješ v kroku 2)
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- 2) zruš tú politiku, ktorá pustí SELECT komukoľvek na offerra-media
--    (názov doplň z výpisu; býva to niečo ako "Public read" alebo
--     "Allow public select on offerra-media")
drop policy "SEM_NAZOV_Z_KROKU_1" on storage.objects;

-- 3) nahraď ju politikou, ktorá pustí výpis LEN vlastníkovi jeho priečinka
create policy "offerra-media: vypisat smie len vlastnik"
on storage.objects for select
to authenticated
using (
  bucket_id = 'offerra-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Prečo `to authenticated` a vlastník podľa prvého segmentu cesty: fotky sa
ukladajú do `<user_id>/<property_id>/<súbor>`, takže „môj priečinok" je
presne to, čo appka potrebuje na mazanie vlastných fotiek. Verejné čítanie
zverejnených fotiek ide **mimo RLS** (bucket je public), takže sa ho to
netýka.

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

Na `drop policy` / `create policy` nad `storage.objects` treba **servisný
kľúč alebo prístup do dashboardu**. Mám len `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
a servisný kľúč sa podľa CLAUDE.md §4 do tohto repa nikdy nesmie dostať
(`rastioeu/offerra` je verejný). Takže: zmerané, pripravené, overiteľné —
ale spustiť to musíš ty.
