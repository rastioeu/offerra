# Ulice zo skutočného registra — prieskum zdrojov a import

**Dátum:** 8. augusta 2026 · **ide OTA** (appka), **import je jednorazový skript**

Zadanie: ulice **nie** z vlastných dát používateľov, ale zo skutočného
datasetu, a to v poradí 1) OSM/Nominatim, 2) Register adries SR,
3) zdôvodnený kompromis.

**Výsledok: vyhrala možnosť 2 — Register adries MV SR.** Je presnejšia než
OSM a ukázalo sa, že je aj dostupnejšia, než to na prvý pohľad vyzeralo.

---

## 1. Čo sa overilo — obe možnosti, meraním

### Možnosť 2 — Register adries SR (ZVOLENÁ)

Toto je slovenský obdobný register k českému RÚIAN, vedie ho **Ministerstvo
vnútra SR**, obsahuje všetky adresy na území SR.

Cesta k dátam nebola priamočiara a stojí za to ju zapísať, lebo **návody na
internete sú dnes už neplatné**:

| Krok | Výsledok |
|---|---|
| `data.gov.sk/dataset/register-adries-register-ulic` | **302** → `data.slovensko.sk` |
| ten istý odkaz cez `curl -L` | **nekonečná slučka** http↔https (26 skokov, stále dokola) |
| starý priamy odkaz na CSV `…/download/consstreetname.20200111.csv` | HTTP **200**, ale obsah je `<!doctype html>` — SPA shell, **nie CSV** |
| `data.gov.sk/api/3/action/package_show` (CKAN) | **302**, mŕtve |
| `data.slovensko.sk/api/...` (rôzne tvary) | **200** + HTML shell na všetko — catch-all routa |
| **`data.slovensko.sk/api/sparql`** | **400 „Missing parameter: query"** → **žije** |

Nový portál je DCAT katalóg s **funkčným SPARQL endpointom**. Cezeň sa dá
dopátrať k skutočným súborom. To bol zlom.

Prvý dotaz ukázal zlú správu:

```
napočítané distribúcie na celoštátnych datasetoch Registra adries
  Register Adries - Register ulíc                    0
  Register Adries - Register obcí                    0
  Register Adries - Register budov                   0
  Register Adries - Register vchodov                 0
  Register adries - Register krajov                  0
```

Vyzeralo to, že migráciou portálu sa dáta stratili. Ale dataset je
`dcat:DatasetSeries` a má **`dct:hasPart`** — päť členov série. A tie
distribúcie majú:

```
Ulice - konsolidované dáta          CSV   data.slovensko.sk/download?id=4a452e56-…
Ulice - inicializačné a zmenové     CSV   …417b2e21-…
Inicializačná dávka                 ZIP   …2f083ac1-…
Dokumentácia datasetu               HTML  …be67dc45-…
```

**Dôkaz stiahnutia** (`curl`, 8.8.2026):

```
ulice_konsolidovane.csv   http=200  size=6 239 286  type=text/csv
obce_konsolidovane.csv    http=200  size=  436 192  type=text/csv
okresy_konsolidovane.csv  http=200  size=    9 633  type=text/csv
```

`file(1)` potvrdil `CSV Unicode text, UTF-8` — teda naozaj dáta, nie HTML.

### Možnosť 1 — OSM / Nominatim (overená, nepoužitá)

| Čo | Zistenie |
|---|---|
| Geofabrik extract `slovakia-latest.osm.pbf` | **HTTP 200, 342 035 866 B**, `Last-Modified: Fri, 07 Aug 2026` — stiahnutý, funguje |
| Nominatim **za behu** pri písaní | **vylúčené** — limit 1 dotaz/s a autocomplete majú priamo v zakázaných spôsoboch použitia. Appka by pravidlá porušovala a pri výpadku by ulica prestala fungovať. |
| OSM ako zdroj na import | funkčné, ale **horšie**: ulica v OSM je čiara, nie záznam s obcou — priradenie k obci vyžaduje priestorový prienik s hranicami. Navyše slovenské adresy v OSM **pochádzajú z toho istého registra MV SR** (import `Sk:MinvSKAddress`), takže by to bola tá istá pravda z druhej ruky, o krok staršia. |

Preto: OSM zostáva odložená záloha (súbor je stiahnutý), ale zdrojom je
register. `slovakia-latest.osm.pbf` **nie je v repozitári** — 342 MB.

---

## 2. Čo z registra vyšlo

```
platných ulíc v RA (validTo = rok 3000)          28 795
z toho s obcou napojenou na náš číselník         28 345   (98,44 %)
zrkadlené do „Bratislava"/„Košice" ako celku      2 942
duplicity (rovnaká ulica v tom istom meste)        −206
───────────────────────────────────────────────────────
NA IMPORT                                        31 165 ulíc v 763 obciach
```

Pozor na dva detaily, ktoré by inak import ticho pokazili:

- **RA neznačí platnosť prázdnou hodnotou, ale rokom 3000.** Kto hľadá
  `validTo IS NULL`, dostane **nula riadkov** a bude si myslieť, že dataset
  je prázdny. (Presne to sa mi stalo pri prvom pokuse.)
- **CSV je uvodzovkované** — 240 riadkov obsahuje `"`, lebo dva názvy ulíc
  majú v sebe čiarku (`Febr,víťazstva`). `split(',')` by ich rozbil.
  Importér má preto skutočný RFC4180 parser.

### Bratislava a Košice — chyba, ktorá by bola tichá

Register vedie ulice pod **mestskými časťami**, nie pod mestom. Náš
číselník má aj riadok „Bratislava" ako celok — a ten by mal **0 ulíc**:

```
pred opravou:  Bratislava  city_id=2924  ulíc=0
               Košice      city_id=2925  ulíc=2
```

Register pritom sám hovorí, že *„predávajúci často povie len Bratislava"* —
takže by si vybral mesto a autocomplete by mu neponúkol nič. Ulice 39
mestských častí sa preto **zrkadlia** aj pod zastrešujúce mesto:

```
po oprave:     Bratislava  1 991 ulíc
               Košice        953 ulíc
```

### Vedľajší nález — v číselníku obcí chýbalo 5 obcí

Porovnanie s registrom odhalilo, že `offerra.city` (pôvodne z Wikidata)
nepozná päť **platných** slovenských obcí:

| Obec | Okres | Ulíc, ktoré na nej viseli |
|---|---|---|
| Bojnice | Prievidza | 64 |
| Veľké Kapušany | Michalovce | 34 |
| Mužla | Nové Zámky | 34 |
| Dudince | Krupina | 17 |
| Sklené Teplice | Žiar nad Hronom | 0 |

**V týchto obciach sa dosiaľ nedal založiť inzerát vôbec.** Doplnené sú
migráciou `scripts/sql/2026-08-08-city-chybajuce.sql`, súradnice z Wikidata
(P625) — rovnaký zdroj ako zvyšok číselníka. Vojenské obvody Javorina, Lešť
a Valaškovce register tiež pozná, tie sme **zámerne nedopĺňali**.

Zvyšok nenapojených ulíc je legitímny odpad: 300 pod obcou „Neznáma“
(vlastný zástupný záznam registra), 69 pod „Bratislava-Prievoz“ (zanikla
1946, mapované na Ružinov) a 1 pod „Lefantovce“ (rozdelené).

---

## 3. Ako to funguje v appke

Autocomplete beží **výhradne nad vlastnou tabuľkou** `offerra.street`.
Appka pri písaní nechodí na žiadne externé API — dáta sú naimportované raz.

```sql
select id, name from offerra.street
 where city_id = $1 and name_norm like $2   -- 'sanc%'
 order by name limit 8
```

- `name_norm` je **generovaný stĺpec** cez `offerra.norm()` — tú istú
  funkciu používa `city.name_norm`. Nemôže sa teda rozísť s tým, čo posiela
  klient (`normalizeText()`). Import ho vôbec neposiela, počíta ho databáza.
- Index `(city_id, name_norm text_pattern_ops)` — bez `text_pattern_ops` by
  `LIKE 'prefix%'` pri našej kolácii index nevyužil a robil seq scan.
- Unikátny index `(city_id, name_norm)` robí import **idempotentným**
  (`on conflict do nothing`) — dá sa spustiť znova bez duplicít.

**Ulica ostáva nepovinná a voľne písateľná.** Obec je povinná a musí byť
z číselníka (preto modál), ulica nie: register nemusí poznať novú ulicu
a väčšina slovenských obcí ulice nepomenúva vôbec — 763 obcí s ulicami
z 2 925. Našeptávanie je skratka, nie mreža.

---

## 4. Súbory

| Súbor | Čo robí |
|---|---|
| `scripts/import-streets.mjs` | celý reťazec: stiahne RA → spáruje na číselník → migrácia → dávkový zápis. Má `--dry-run`. |
| `scripts/sql/2026-08-08-street.sql` | tabuľka `offerra.street`, indexy, RLS, granty |
| `scripts/sql/2026-08-08-city-chybajuce.sql` | 5 chýbajúcich obcí |
| `src/components/street-picker.tsx` | pole s našeptávaním |
| `src/app/inzerat/[id].tsx` | `Field` pre ulicu nahradené `StreetPicker` |

Import je **reprodukovateľný z repozitára** — nič nie je „vyrobené raz
ručne bokom". Keď register o rok doplní ulice, stačí skript pustiť znova.

---

## 5. Stav — KONTROLA PRED HOTOVO

| Bod | Stav |
|---|---|
| Zdroj street-level dát potvrdený a naimportovaný | **🟡 zdroj potvrdený a dataset overený, zápis do DB čaká na token** |
| Autocomplete nad vlastnou tabuľkou, nie live cez externé API | **✅ OVERENÉ V KÓDE A ZDÔVODNENÉ** — dotaz ide na `offerra.street`, Nominatim sa nevolá nikde |
| Ak plný import nebol možný, dôvod + plán | **✅ nižšie** |

### Čo presne chýba a prečo

Dáta sú stiahnuté, spárované a overené — čo chýba, je **jediný krok:
zápis do databázy**. Ten ide cez Supabase Management API a potrebuje
`SUPABASE_ACCESS_TOKEN`. Ten v `/root/.offerra-secrets` **nie je** (sú tam
len `GITHUB_TOKEN` a `DEMO_PASSWORD`) a k iným súborom s tajomstvami mi
prístup zamietlo bezpečnostné pravidlo prostredia. Anon kľúč z `.env`
na `CREATE TABLE` ani `INSERT` do číselníka nestačí — a ani by nemal.

Nie je to odhad, je to zmerané: `--dry-run` prejde celý reťazec vrátane
sťahovania a párovania a skončí na hranici zápisu.

```
$ node scripts/import-streets.mjs --dry-run
  okresy: 83 riadkov (0.0 MB)
  obce: 3029 riadkov (0.4 MB)
  ulice: 51158 riadkov (6.2 MB)
  city: 2925 obcí
Na import: 31165 ulíc v 763 obciach
Preskočené: { obecNenapojena: 450, prazdny: 0, duplicita: 206 }
```

*(450 „obec nenapojena" klesne na ~301 hneď po doplnení 5 obcí — tá
migrácia beží v ostrom režime pred párovaním.)*

**Odblokovanie — jeden riadok:**

```
echo 'SUPABASE_ACCESS_TOKEN=sbp_…' >> /root/.offerra-secrets
```

Potom:

```
SUPABASE_ACCESS_TOKEN=$(grep -m1 '^SUPABASE_ACCESS_TOKEN=' /root/.offerra-secrets | cut -d= -f2-) \
  node scripts/import-streets.mjs
```

Skript na konci sám vypíše spätný `SELECT` — počet ulíc, počet obcí
a koľko z nich má Bratislava. To bude ten dôkaz do registra.

### Čo overiť na telefóne (po importe)

1. Nový inzerát → vyber obec **Petržalka** → do poľa Ulica napíš `ben` →
   musí vyskočiť **Beňadická**.
2. Vyber obec **Bratislava** (celok) → napíš `sanc` → musí nájsť
   **Šancová** (je v Novom Meste, funguje len vďaka zrkadleniu).
3. Napíš do ulice nezmysel `Xyzabc` → **musí sa dať uložiť** — ulica je
   nepovinná a voľná.
4. Obec **Zavar** → napíš `ne` → ponuka musí byť z Zavaru, nie z Trnavy.
