# „[object Object]" v chybovom rámčeku — príčina a oprava

**Dátum:** 8. augusta 2026
**Stav:** 🟡 **OPRAVENÉ, ČAKÁ VIZUÁLNE OVERENIE**
**Nasadené:** OTA na runtime `451767ea…` = build #4 · **ide OTA**

---

## Koreňová príčina

V appke bol **25× rozkopírovaný** ten istý vzorec:

```ts
const m = e instanceof Error ? e.message : String(e);
```

**Chyby zo Supabase ale nie sú inštancie `Error`.** PostgREST vracia
obyčajný objekt:

```json
{ "code": "42501", "details": null, "hint": null,
  "message": "new row violates row-level security policy for table \"property\"" }
```

Vetva `instanceof Error` teda neplatila, spadlo to do `String(e)` — a
z objektu vyšlo doslova `[object Object]`. Používateľ sa nedozvedel nič.
To je presne to „nestane sa nič", ktoré CLAUDE.md §2 zakazuje, len
v obzvlášť škodlivej podobe: **tvárilo sa to, že informáciu dáva.**

### Čo konkrétne padlo tebe

Otvoril si inzerát **„Test videnia"** a skúsil naň podať ponuku. Ten
inzerát bol **môj testovací záznam** — moje testy ho po sebe upratali
(overil som, v DB nie je), ale tvoja appka mala v zozname ešte starú
kópiu. Server ponuku odmietol, lebo inzerát už nebol zverejnený.

Takže hlásenie odhalilo **dve** veci naraz:

1. appka nevedela chybu prečítať → `[object Object]`;
2. **môj testovací inzerát ti svietil v katalógu.** To je môj neporiadok
   a mrzí ma to. Testy po sebe upratujú, ale medzitým bol vidieť —
   všetky moje testovacie záznamy majú odteraz v názve `Test` a mažú sa
   v tom istom behu, v ktorom vzniknú.

---

## Oprava

Jedna funkcia `errorText()` v `src/lib/errors.ts` namiesto vzorca na
kopírovanie. Poradie, v akom hľadá zrozumiteľný text:

| Vstup | Výsledok |
|---|---|
| reťazec | on sám |
| skutočný `Error` | `.message` |
| objekt s `code` | **ľudský preklad** + pod ním surová hláška |
| objekt s `message` | `message` + `details` + `hint`, bez duplicít |
| objekt bez ničoho | JSON — radšej surový než `[object Object]` |
| `null`, `undefined`, `{}` | „Neznáma chyba." |
| cyklický objekt | nezhodí appku, vráti náhradný text |

Surová hláška sa **nikdy nezahadzuje** — §2 chce celú chybu. Ľudský
preklad sa pripája nad ňu.

Ľudské preklady kódov, ktoré používateľ reálne stretne:

```
23503  cudzí kľúč      → „Vec, na ktorú to smeruje, už neexistuje…"
23505  unikátny index  → „Toto už existuje…"
23514  check           → „Zadaná hodnota nie je povolená."
42501  RLS             → „Toto ti server nedovolil. Najčastejšie preto,
                          že inzerát už nie je zverejnený, uplynula
                          uzávierka, alebo je inzerát tvoj vlastný."
PGRST116 nenašlo sa    → „Nenašlo sa to — možno to už neexistuje."
```

Pri `42501` vymenúvam **skutočné dôvody**, lebo kód sám presný dôvod
nepovie a bolo by nečestné tvrdiť viac, než sa vie.

### Kde všade to bolo opravené

Neopravoval som len obrazovku „Podať ponuku". Vzorec bol všade:

```
25×  e instanceof Error ? e.message : String(e)
 8×  ${String(e)} v logoch
 2×  lokálne kópie helpera `message()` v hookoch
```

Dohromady **35 miest v 22 súboroch**: formulár ponuky, inzerátu, dopytu,
onboarding prezývky, nastavenia, admin akcie, nahlásenie, výber obce,
upload fotky, prihlásenie, obľúbené, tipy, notifikácie, verzný riadok.
V celej appke už nezostalo **ani jedno** miesto s `String(e)`.

---

## Dôkazy

### Jednotkový test na tvary chýb — 15/15

`errors_test.js`. Tvary **nie sú vymyslené** — sú to skutočné odpovede
PostgRESTu odchytené pri testoch RLS a check constraintov:

```
OK  RLS chyba nie je [object Object]
OK  RLS chyba nesie aj surovu hlasku
OK  zmazany inzerat -> zrozumitelne
OK  check constraint / unikatny index
OK  skutocny Error / holy retazec / objekt len s message
OK  objekt bez message -> radsej JSON nez [object Object]
OK  null / undefined / prazdny objekt
OK  cyklicky objekt nezhodi appku
OK  duplicita sa nevypise dvakrat
15/15 preslo
```

### Živý test proti skutočnej DB — 2/2

`errors_live_test.py` vyvolá **presne tvoju situáciu** a surovú odpoveď
prežene cez skutočný `errorText()`:

```
ponuka na UZ NEEXISTUJUCI inzerat (presne screenshot)
  HTTP 403
  SUROVE:  {"code":"42501","details":null,"hint":null,"message":"new row violates row-level…
  V APPKE: Toto ti server nedovolil. Najčastejšie preto, že inzerát už nie je
           zverejnený, uplynula uzávierka ponúk, alebo je inzerát tvoj vlastný.
```

`npx tsc --noEmit` 0 chýb, `npx expo export --platform ios` prešiel.

**Čo tieto dôkazy nedokazujú:** ako to vyzerá na tvojom telefóne. To
overíš ty.

---

## Čo otestovať

1. Zavri appku úplne → otvor → **zavri a otvor znova** (použije update).
2. Otvor ľubovoľný inzerát → **Podať ponuku** → nechaj sumu prázdnu
   a odošli. Má prísť **„Zadaj sumu ponuky."**, nie objekt.
3. Skús podať ponuku na **svoj vlastný** inzerát — má prísť veta
   o tom, že to server nedovolil, aj s dôvodmi.
4. V **Prezývke** skús prezývku, ktorú už niekto má — má prísť
   „Toto už existuje…".
