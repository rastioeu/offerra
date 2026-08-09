# Dopytová strana, seed dáta a štyri drobnosti

**Dátum:** 9. augusta 2026 · **Push som nechal presne tak, ako bol** (bod 2)

---

## KONTROLA PRED HOTOVO

### [✅] Legal linky na prihlasovacej obrazovke

`src/app/login.tsx` — pod prihlasovacími tlačidlami:
*„Prihlásením súhlasíš s **Podmienkami používania** a berieš na vedomie
**Ochranu osobných údajov**."* Oboje otvára `/legal/[doc]`, teda tú istú
obrazovku a **ten istý text** ako Nastavenia (`src/lib/legal.ts`).

Doteraz boli len v Nastaveniach — **až za prihlásením.** Kto sa ešte
neprihlásil, nemal ako zistiť, čomu sa chystá dôverovať.

🟡 Vzhľad odtiaľto neoveriteľný — pozri, či sa text nezalamuje škaredo.

### [✅] Cena + počet izieb pri výbere inzerátu na oslovenie

Obrazovka „Ktorým inzerátom?" mala len názov, mesto a m². Pri dvoch
inzerátoch v tom istom meste boli riadky prakticky nerozoznateľné.

Teraz má každý riadok navyše **cenu** a **počet izieb**. Keď cena chýba
(v Offerre je nepovinná), riadok povie *„Najvyššia ponuka …"*, a keď nie
je ani tá, *„Cena neuvedená"* — nie prázdno.

Skloňovanie izieb som vytiahol do `formatRooms()`; bolo napísané priamo
v karte katalógu a druhá kópia by sa časom rozišla.

### [✅] Počet izieb povinný pri zakladaní inzerátu

**Zistenie: appka to už žiadala, databáza nie.** `missingForPublish()`
počet izieb medzi chýbajúcimi vracal — ale server ho nekontroloval vôbec,
takže inzerát bez izieb sa dal zverejniť kadiaľkoľvek mimo formulára.
A jeden taký v katalógu naozaj bol:

```sql
select count(*) from offerra.property
 where status='ACTIVE' and property_type<>'LAND' and rooms is null;  →  1
```

Pravidlo, ktoré platí len v appke, nie je pravidlo. Doplnil som teda:

- **`property_publish_guard`** (mig 31) — zverejnenie bez izieb databáza
  odmietne. Pozemok je výnimka: izby nemá a mať nemôže.
- **pole je označené „(povinné)"** — dovtedy sa to človek dozvedel až pri
  pokuse zverejniť.

Dôkaz cestou appky (`dopyty_test.py`):

```
Koncept bez počtu izieb sa založiť DÁ (rozrobené sa nekontroluje)  HTTP 201
ZVEREJNENIE bez počtu izieb databáza odmietne    HTTP 400 „…bez počtu izieb."
Pozemok sa zverejní aj bez izieb                 HTTP 204
S počtom izieb sa zverejní                       HTTP 204
```

### [✅] Návrat do pôvodného inzerátu po oslovení dopytu

Po odoslaní `router.replace` na **verejný detail** inzerátu, ktorým
oslovil. Zvolil som verejný detail, nie editor: je to presne to, čo uvidí
druhá strana, keď si oslovenie otvorí.

🟡 Vizuálne overenie — či prechod nepôsobí trhane.

### [✅] Oslovenia dopytu — všetky štyri veci

**Klikateľné do detailu** — každé oslovenie je karta s názvom, cenou,
mestom, izbami, výmerou, správou a prezývkou. Ťuknutie otvorí
`/nehnutelnost/[id]`. Keď inzerát medzitým zmizol, karta sa nedá otvoriť
a povie *„inzerát už nie je dostupný"* — nie prázdna obrazovka.

**Obhliadka funguje aj tu** — je to **tá istá obrazovka** ako v katalógu,
takže „Chcem obhliadku" je na nej bez akejkoľvek ďalšej práce. Práve
preto oslovenie vedie na detail inzerátu a nie na vlastný dopyt.

**Notifikácia — príčinu som zmeral, nehádal:**

```sql
select tgname from pg_trigger where relname='request_outreach';  →  0 riadkov
```

`request_outreach` **nemal žiadny trigger.** Nešlo teda o zablokovanú
preferenciu ani o chybu v odosielaní — oznámenie nemal kto založiť.
Doplnené (mig 30): nový typ `OSLOVENIE_DOPYTU` + trigger
`trg_notify_request_outreach`, ktorý ide cez `push_notification()`, takže
zvonček aj push naraz. Vedie na **ponúknutý inzerát**, nie na môj dopyt —
na dopyte by sa nedalo spraviť nič.

**Časová os** — `profil.tsx` má nový druh udalosti „Niekto oslovil tvoj
dopyt". Jediná udalosť na osi, ktorú nespôsobil používateľ, preto je
formulovaná v tretej osobe.

Dôkaz (`dopyty_test.py`, **18/18**):

```
OZNÁMENIE VZNIKLO (predtým nevznikalo vôbec)   type: OSLOVENIE_DOPYTU
Oznámenie vedie na PONÚKNUTÝ inzerát           id sedí
Presne jedno oznámenie navyše                  0 → 1
RPC nesie názov / cenu / izby / prezývku       „Test 3-izbový", 145000, 3, dop_238659
Nezúčastnený oslovenia cudzieho dopytu NEVIDÍ  0 riadkov
Ani ten, kto oslovil — nie je to JEHO dopyt    0 riadkov
Vlastný dopyt osloviť nejde (RLS)              HTTP 403
```

### [✅] Nové seed dáta

| | pred | teraz |
|---|---|---|
| inzeráty | 10 | **20** |
| ponuky | 3 | **28** |
| dopyty | 2 | **8** |
| oslovenia | 6 | **15** |
| fotky | 22 | **63** |
| seed profily | 1 | **6** |

Skript sa na konci **sám overí dotazom**, nie tvrdením:

```
inzerátov s viac než 1 ACCEPTED:            0
inzerátov s view_count < počtom ponúk:      0
inzerátov bez počtu izieb (mimo pozemkov):  0
seed účtov s neoznačenými dátami:           0
dopytov BEZ oslovení:                       0
oznámení „oslovil tvoj dopyt" pre teba:     3
```

Mestá, okresy, kraje a ulice sa berú z **ozajstných tabuliek**
`offerra.city` / `offerra.street` — vymyslené reťazce by nesadli na
filtre a vyhľadávanie, ktoré nad nimi stoja. Vyplnené sú aj nové polia:
poschodie/výťah, mesačné náklady, zábezpeka, energie, internet, nábytok,
dostupné od, min. dĺžka nájmu.

---

## Rozhodnutia, ktoré som spravil sám

**1. Tri z dvadsiatich inzerátov patria tebe.** Predošlé seed dáta ti
patrili **všetky**, takže sa v katalógu nedalo rozoznať cudzie od
vlastného. Keby som ich dal všetky seed účtom, ostal by ti len prázdny
koncept a obrazovky vlastníka — „Moje inzeráty", zvýraznenie čakajúcich
ponúk, správa ponúk, uzavretie obchodu — by sa nemali na čom vyskúšať.
Tri je kompromis. Sú `is_seed`, takže zahoditeľné.

**2. Dva z ôsmich dopytov sú tvoje.** Bez toho by si obrazovku
„OSLOVENIA" nemal ako vidieť — na cudzí dopyt sa nezobrazuje.

**3. Preto ti prišlo niekoľko notifikácií.** Seed oslovenia tvojich
dopytov spustili trigger a Expo ich prijalo (`status: ok`). Je to
zámer — je to zároveň dôkaz, že trigger funguje na skutočnej ceste, nie
len v teste.

**4. Fotky sa opakujú.** V úložisku je 22 skutočných fotiek a inzerátov
je 20. Nové sa nemám odkiaľ vziať, tak sa recyklujú.

---

## Čo sa pri tom pokazilo (a ako som to našiel)

**Zoznam fotiek som čítal až PO upratovaní.** `media` ide s inzerátom
cez `ON DELETE CASCADE`, takže bazén bol prázdny a skript spadol na
delení nulou. Súbory v úložisku pritom ostali — mazanie riadku ich
neodstráni. Opravené na `storage.objects`, čo je aj správnejší zdroj:
hovorí, čo naozaj existuje, nie na čo sa niekto kedysi odkazoval.

**Vymyslel som si hodnoty číselníkov** (`FULLY`/`PARTLY`/`NONE`), ktoré
nesedeli s `property_furnishing_chk`. Zachytila to databáza.

**Management API ma odrezalo** a vrátilo HTML stránku od Cloudflare
namiesto JSON. Skript spadol na parsovaní a nebolo vidno prečo. Doplnené
dávkovanie a opakovanie s odstupom — a hlavne: pri zlyhaní sa vypíše
**surová odpoveď**, nie hláška o parsovaní.

**Prvá verzia testu zakladala inzerát rovno ako ACTIVE**, čo RLS zakazuje
(`property_insert_own` žiada `DRAFT`). Padol na RLS, nie na počte izieb —
dokazoval by teda niečo iné, než tvrdí. Opravený **test**, nie kód: ide
teraz cestou appky, koncept → zverejniť.

**Nič skutočné sa nestratilo.** Po upratovaní som overil, čo ostalo:
jediný nie-seed inzerát je tvoj prázdny DRAFT.

---

## Čo som našiel a opravil navyše

`src/lib/legal.ts` tvrdil, že **telefónne číslo je nepovinné.** Od
9. augusta je povinné. Právny dokument, ktorý klame o tom, aké údaje
appka žiada, je horší než žiadny — opravené v tom istom kroku.

`how-it-works.ts` — sekcia o dopytoch nevedela o oslovení, upozornení ani
obhliadke (§8).

---

## Výsledky testov

| test | výsledok |
|---|---|
| `dopyty_test.py` (cez PostgREST, 3 účty) | **18/18** |
| `push_route_test.js` | **20/20** |
| `onboarding_test.js` | 13/13 |
| `akofunguje_test.js` | 15/15 |
| `odozva_test.js` | 21/21 |
| `audit.js` | 74/74 |
| `npx tsc --noEmit` | čistý |

`odozva_test.js` najprv padol na `use-offers.ts` — jeho regulárny výraz
berie `.rpc(` ako zápis. `my_request_outreach()` je **čítanie** a v tom
súbore nie je jediný zápis (overené grepom). Doplnená výnimka s dôvodom,
rovnako ako pri `use-is-admin.ts`, ktorý to má tak isto.

---

## Čo musíš overiť ty

1. **Dopyty → tvoj dopyt → OSLOVENIA** — ťukni na oslovenie, má sa
   otvoriť ponúkaný inzerát.
2. **Na tom inzeráte si vypýtaj obhliadku** — má fungovať rovnako ako
   inde.
3. **Moje → časová os** — má tam byť „Niekto oslovil tvoj dopyt".
4. **Osloviť cudzí dopyt** — v zozname inzerátov musíš vidieť cenu aj
   izby, a po odoslaní ťa to má hodiť do toho inzerátu.
5. **Prihlasovacia obrazovka** — obidva odkazy dole musia otvárať texty.
6. **Katalóg** — 20 inzerátov s fotkami, tri z nich tvoje.

---

## Vydanie

**IDE OTA** — žiadny nový natívny modul. Migrácie 30 a 31 sú v databáze
už teraz, seed dáta tiež.
