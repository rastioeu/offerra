# Dávka 2 — orezaný text, obhliadky, explainer, dizajn, obľúbené, skloňovanie

**Dátum:** 8. augusta 2026 · **IDE OTA** (žiadny nový natívny modul)

---

## 1. Orezaný text — ✅ OPRAVENÉ, 🟡 čaká vizuálne overenie

### Čo to spôsobilo

`ParamCell` v `ui.tsx` mal `numberOfLines={1}` pri bunke širokej **47 %
obrazovky**. Orezávalo to presne tie údaje, kvôli ktorým mriežka vznikla:

```
„1 240 € (2× mesačný nájom)"  →  „1 240 € (2× m…"
„7. septembra 2026"           →  „7. septembra…"
```

Hodnota sa teraz smie zalomiť na **dva riadky**. Bunky v tom istom riadku
mriežky si výšku dorovnajú samy — flexbox má predvolene
`alignItems: 'stretch'`, takže vyšší sused nič nerozhádže.

### Prešiel som VŠETKÝCH 11 výskytov v appke

| Miesto | Bolo | Je | Prečo |
|---|---|---|---|
| `ui.tsx` — `ParamCell` | 1 | **2** | pôvodná chyba |
| `property-card` — fakty | 1 | **2** | „Bratislava-Podunajské Biskupice · 78 m²" |
| `profil` — riadok zoznamu | 1 | **2** | dlhý názov inzerátu |
| `pridat` — riadok | 1 | **2** | to isté |
| `admin` — riadok | 1 | **2** | to isté |
| `property-card` — názov | 2 | 2 | zámer — karta má pevný tvar |
| `dopyty` — popis | 2 | 2 | zámer — náhľad popisu |
| `activity-timeline` — názov | 2 | 2 | zámer |
| `search-bar` — aktívne filtre | 2 | 2 | zámer |
| `ui.tsx` — `PhotoBadge` | 1 | 1 | obsah je „1/3", nemá čo pretiecť |
| `property-map` — pin | 1 | 1 | `maxWidth: 150` na cenu stačí |

Navyše: `Row` (štítok — hodnota) mal `flexShrink` len na hodnote. Dlhý
štítok („Minimálna doba nájmu") by hodnotu vytlačil z riadku — teraz sa
zmenšujú obaja.

> **Overiť na telefóne:** detail inzerátu na prenájom so zábezpekou
> a dátumom dostupnosti — obe hodnoty musia byť celé, na dvoch riadkoch,
> a bunky vedľa seba rovnako vysoké.

---

## 2. Obhliadky — 🔴 kód hotový, DB migrácia NEBEŽALA

### Odpoveď na tvoju otázku o kontakte

Pýtal si sa, či obhliadka vyžaduje odkrytie kontaktu. **Áno — ale až pri
POTVRDENÍ, nie pri žiadosti.** Tri kroky:

| Stav | Čo vidí majiteľ | Čo vidí záujemca |
|---|---|---|
| **REQUESTED** | prezývku a navrhnutý čas | nič nové |
| **CONFIRMED** | meno, telefón, e-mail | meno, telefón, e-mail **+ presnú adresu** |
| **COMPLETED** | to isté | to isté |

**Prečo takto:**

- **Žiadosť nesmie odkryť nič.** Inak by stačilo rozposlať žiadosti po
  celom Slovensku a pozbierať telefónne čísla majiteľov. Obhliadka je
  nezáväzná — musí byť aj lacná na zneužitie.
- **Potvrdenie JE ten súhlas.** Majiteľ sa práve rozhodol pustiť si toho
  človeka domov. To je väčší záväzok než prijať ponuku, nie menší.
- **Odkrýva sa OBOJSTRANNE**, lebo väčšie riziko nesie majiteľ — musí
  vedieť, koho púšťa dnu, nielen naopak.
- **Adresa ide len jedným smerom** — záujemcovi, aj keď má inzerát
  `address_hidden`. Bez adresy sa na obhliadku nedá prísť. Majiteľ adresu
  záujemcu nedostane, tú nepotrebuje.

Je to **skorší** okamih odkrytia než pri ponuke, a to zámerne: obhliadka
je nezáväzná, takže ju treba spraviť ľahko dosiahnuteľnou; akceptácia
ponuky je záväzok, tam odkrytie ostáva.

Drží to `viewing_contact()` v databáze — mimo `CONFIRMED`/`COMPLETED`
nevráti **ani riadok**. Nie je to skrytie v UI.

### Model

`offerra.viewing`: `id`, `property_id`, `requester_id`, `proposed_time`,
`confirmed_time`, `status`, `note`, `created_at`, `updated_at`.

Rozhodnutia, ktoré stoja za zápis:

- **Vlastná tabuľka, nie stĺpec na ponuke.** Obhliadka je nezávislá — dá
  sa vyžiadať pred ponukou aj po nej a obe poradia musia fungovať.
- **Jeden navrhnutý čas, nie pole termínov.** Majiteľ smie potvrdiť
  s posunom (`confirmed_time` ≠ `proposed_time`) a záujemca to buď príjme,
  alebo obhliadku zruší. Stav „protinávrh" by pribudol piaty a výsledok je
  ten istý. Appka záujemcovi napíše, že čas je iný, než navrhol.
- **Jedna ŽIVÁ obhliadka na dvojicu** (čiastočný unikátny index len na
  `REQUESTED`/`CONFIRMED`) — po zrušení sa dá požiadať znova.
- **Kto smie ktorý stav nastaviť, drží trigger**, nie policy: v RLS by sa
  to nedalo napísať zrozumiteľne. Majiteľ potvrdzuje a zamieta, záujemca
  ruší a označuje „bol som tam". „Bol som tam" ide len z `CONFIRMED`.
- **Oznámenia zakladá databáza**, nie klient — rovnaké pravidlo ako pri
  ponukách (register 5.1). Pribudli tri typy, všetky vypnuteľné
  v Nastaveniach okrem systémových.

### Kontrolný panel pre obe strany

- **Majiteľ** — `ponuky/[id].tsx`: ponuky **aj** obhliadky na jednej
  obrazovke. Rozhoduje sa o nich naraz („ten, čo tu už bol, ponúka menej"),
  dve obrazovky by to len sťažili. Nad zoznamom je štatistika
  **„3 záujemcovia už boli na obhliadke"** — ráta sa z riadkov, ktoré
  majiteľ aj tak vidí, takže netreba zvláštny dotaz.
- **Záujemca** — Profil: `MOJE OBHLIADKY` hneď pod `MOJE PONUKY`.

### Výber termínu bez natívneho pickera

`@react-native-community/datetimepicker` v aktuálnom TestFlight builde
**nie je** — pridať ho znamená nový build a nové podanie. Termín sa preto
vyberá rýchlymi voľbami (14 dní × hodiny 9–19), rovnako ako uzávierka
v `deadline-picker.tsx`. **Vďaka tomu ide celá dávka OTA.**

### 🔴 Čo NEBEŽALO

`scripts/sql/2026-08-08-viewing.sql` **nebola spustená** — chýba
`SUPABASE_ACCESS_TOKEN` (viď `ULICE_REGISTER_ADRIES.md`). Kým sa nespustí,
každá obrazovka s obhliadkami skončí na chybe „tabuľka neexistuje" —
zobrazí sa, nie zamlčí.

Dve miesta v migrácii, ktoré som **nemohol overiť** a preto sú napísané
obozretne:

1. **`notification.type`** — či je to `enum` alebo `check`, sa z klienta
   zistiť nedalo (OpenAPI je len pre `service_role`, na
   `notification_preference` nemá `anon` SELECT). Blok v migrácii zvládne
   **obe podoby** a nič nepredpokladá.
2. Overil som aspoň to, čo overiť šlo: `offerra.profile` má kľúč **`id`**,
   nie `user_id` (podľa `use-profile.ts`) — prvá verzia migrácie to mala
   zle a bolo by to padlo až za behu. A `offerra.viewing` naozaj
   neexistuje: `GET /rest/v1/viewing` → **HTTP 404**.

---

## 3. „Ako funguje Offerra" — ✅ AKTUALIZOVANÉ

Standing rule z `CLAUDE.md` §8. Pribudol krok **„Obhliadka kedykoľvek —
pred ponukou aj po nej"** a prepísal sa krok o kontakte: už nehovorí
„odkryje sa po akceptácii", ale menuje **obe** chvíle a výslovne dodáva,
že samotná žiadosť o obhliadku neodkryje nič.

Bez tejto úpravy by text klamal — presne prípad, kvôli ktorému pravidlo
vzniklo.

---

## 4. Dizajn — 🟡 čaká vizuálne overenie

### Podsvietenie

Pozrel som, ako to robí MUTARK (`branch-rivalry.tsx`, fáza dizajn-dark):
farebný `shadowColor`, `shadowOffset {0,0}`, `shadowOpacity 0.4`,
`shadowRadius 10`. **Rovnaký efekt, naša farba** — terakota `#C9703B`,
nie mutarkovská neónová zlatá. Je to nový token `Shadow.glow`, nie
hardcodovaná hodnota v komponente (`CLAUDE.md` §5).

`elevation: 0` zámerne — Android farebné tiene nevie a spravil by z toho
sivý obdĺžnik pod logom.

Použité na **logo v hlavičke** (+ nový token `accentGlow` ako veľmi jemná
teplá výplň za ním) a na **profilovú fotku**.

### Okrúhle fotky — kde a čo sa naozaj zmenilo

Poctivo: **avatary už okrúhle boli.** Všetky tri miesta
(`offer-list`, `ponuky/[id]`, Profil) mali `borderRadius: Radius.full`.
Tvar teda nebolo čo meniť — chýbal **obsah**.

Preto som doplnil to, čo malo skutočný efekt:

| Miesto | Predtým | Teraz |
|---|---|---|
| Zoznam ponúk | sivé koliesko s písmenom | vlastný obrazec |
| Detail ponuky | to isté | vlastný obrazec |
| Profil | sivé koliesko s písmenom | obrazec + teplý prstenec |

Päť ponúk od piatich ľudí, ktorých prezývka začína na „P", vyzeralo
predtým identicky.

### Vygenerované avatary — zdroj a licencia

| | |
|---|---|
| Štýl | DiceBear „Shapes" |
| Licencia | **CC0 1.0** — verejná doména, **bez** povinnosti uvádzať autora |
| Overenie | `dicebear.com/styles/shapes/` — „Shapes by DiceBear, licensed under CC0 1.0" |
| Počet | 12 PNG, spolu **184 KB** |
| Kde | `assets/images/avatars/`, doklad v `LICENSE.md` tamtiež |

Znovu vygenerovať:

```bash
for i in 01 02 03 04 05 06 07 08 09 10 11 12; do
  curl -s -o "assets/images/avatars/a$i.png" \
    "https://api.dicebear.com/9.x/shapes/png?seed=offerra-$i&size=192&backgroundType=gradientLinear"
done
```

**Dve rozhodnutia, ktoré stoja za vysvetlenie:**

- **Pribalené, nie hotlink.** Ťahať ich za behu by pri každom zobrazení
  avatara poslalo IP adresu používateľa na cudzí server a pri jeho výpadku
  by avatary zmizli.
- **Geometrické tvary, nie tváre.** Ponuky sú pseudonymné. Cudzia tvár pri
  prezývke by predstierala konkrétneho človeka, ktorý za ňou nestojí — to
  je horšie než žiadna fotka, a pri Apple review aj rizikovejšie.

Zhodou okolností sedia do palety — navy, azúrová a terakota sú presne naše
farby.

---

## 5. Filter „Obľúbené" — 🟡 čaká vizuálne overenie

Chip **♥ Obľúbené** v katalógu, prvý v rade (je to filter na „moje", nie
na typ obchodu).

Podstatné rozhodnutie: filter ide do **DOTAZU** (`id in (…)`), nie cez
preosiatie načítaných kariet. Katalóg berie 200 najnovších — obľúbený
inzerát môže byť starší a preosievaním by sa **stratil**.

Odhlásenému sa chip **neskrýva** (inak by o funkcii nikdy nezistil) — klik
ho pošle na prihlásenie. Dopyty chip nemajú, obľúbené sú len pri
nehnuteľnostiach.

`favoritesOnly` je typu `true | null`, nie `boolean`: `isFilterEmpty()`
pozná prázdno ako `null` a `false` by znamenalo, že filter nie je nikdy
prázdny a lišta „zrušiť filtre" by svietila stále.

---

## 6. Skloňovanie — ✅ OVERENÉ (25/25, 2925/2925, 0 falošných)

### Zvolený prístup a prečo

Overil som, ktorý prípad reálne nastáva: appka **nehľadá vo voľnom
texte**, ale v **uzavretom zozname 2 925 obcí**, ktoré sú v číselníku
v prvom páde (`search-bar.tsx` berie kandidátov z vety a dohľadáva ich
v `city`).

To celú úlohu mení — netreba morfologickú analýzu, stačí nájsť obec s dosť
dlhým **spoločným základom**. Skracuje sa **zadané** slovo, nie hľadané:
`like 'bratislave%'` nenájde nič, lebo v databáze je kratší tvar.

### Tri kroky od najpresnejšieho po najvoľnejší

```
1. rovnosť        name_norm = 'bratislava'      ← prvý pád, väčšina zadaní
2. prefix         name_norm like 'bratislav%'   ← dopísaná časť názvu
3. skrátený základ name_norm like 'bratis%'     ← skloňovanie
```

Poradie je **merané, nie odhadnuté**: keď šiel prefix prvý a zoradilo sa
podľa veľkosti, „Petrovce" vracalo **„Petrovce nad Laborcom"**. Takto
vypadlo 22 obcí z 2 925.

Výber spomedzi kandidátov robí `pickCity()`. Názov obce musí byť **takmer
celý spotrebovaný** (`dbSlack ≤ 1`) — bez toho „so záhradou" našlo obec
**Záhradné**. Zo zadaného slova smie ostať celá koncovka
(`inputSlack ≤ 4` pre „Košic|iach"), ale dlhá koncovka je dôveryhodná len
pri dlhom základe — bez toho „tehlový" našlo obec **Tehla**.

### Jedna výnimka navyše

Pohyblivé „-e-" (**Senec → v Senci**, **Hlohovec → v Hlohovci**) prefix
nezvládne — pri skloňovaní vypadne samohláska **uprostred**, takže
spoločný základ končí už na „sen". Rieši to jedno cielené pravidlo, ktoré
samohlásku vráti späť. Nie je to morfologická analýza — je to jeden vzor,
ktorý má medzi slovenskými mestami dosť zástupcov.

Bez neho „Senci" našlo obec **Seňa**. Sebavedomá nesprávna odpoveď je
horšia než žiadna, takže prah som pritiahol, kým to nesadlo.

### Dôkaz

Skompiloval som **skutočný `search.ts`** (nie kópiu logiky) a pustil ho
proti **skutočným 2 925 obciam** z `offerra.city`, so simuláciou toho
istého trojkrokového dotazu, aký robí appka:

```
skloňovanie                          25/25
prvý pád nájde sám seba          2925/2925
falošné nálezy (22 bežných slov)      0/22
```

Testované tvary: Bratislave/Bratislavy, Petržalke/Petržalky, Košiciach/
Košíc, Nitre/Nitry, Trnave, Žiline, Poprade, Prešove, Trenčíne, Martine,
Zvolene, Ružinove, Piešťanoch, Michalovciach, Senci, Malackách, Šali,
Hlohovci.

Slová, ktoré obcou byť **nesmú** a nie sú: izbový, záhradou, balkónom,
novostavba, garážou, terasou, pivnicou, výťahom, parkovaním, rekonštrukcii,
tehlový, panelák, podkrovný, prízemný, slnečný, tichej, centre, okolí,
lesom, jazerom, obchodmi, školou.

---

## KONTROLA PRED HOTOVO

| Bod | Stav |
|---|---|
| Text sa nezoreže v žiadnej mriežke — overené na všetkých obrazovkách | 🟡 **kód hotový**, prejdených všetkých 11 výskytov (tabuľka vyššie); orezanie sa dá potvrdiť len na zariadení |
| Obhliadky: vyžiadanie, potvrdenie, „bol som na obhliadke" | 🔴 **kód hotový, DB migrácia nebežala** — chýba `SUPABASE_ACCESS_TOKEN` |
| Kontrolný panel pre obe strany zobrazuje ponuky aj obhliadky spolu | 🔴 to isté — kód je, dáta nie |
| Rozhodnutie o odkrytí kontaktu zdôvodnené a implementované | ✅ **zdôvodnené** (§2), implementované v `viewing_contact()` |
| „Ako funguje Offerra" aktualizovaný o obhliadky | ✅ **HOTOVÉ** |
| Glow okolo loga v teplej farbe | 🟡 kód hotový |
| Okrúhle avatary aspoň na profilových fotkách | ✅ **už boli okrúhle** — doplnený obsah, nie tvar |
| Filter „Obľúbené" funguje | 🟡 kód hotový |
| Vyhľadávanie nájde mesto aj skloňované — dôkaz, prístup zdôvodnený | ✅ **OVERENÉ** 25/25 + 2925/2925 + 0 falošných |

`npx tsc --noEmit` → **EXIT=0** po každom bloku.

### Čo overiť na telefóne (po spustení migrácií)

1. Detail prenájmu → zábezpeka a dostupnosť **celé**, na dvoch riadkoch.
2. Cudzí inzerát → „Dohodnúť obhliadku" → zajtra 17:00 → odošli.
   Kontakt sa **NESMIE** ukázať.
3. Druhým účtom (majiteľ) → Spravovať ponuky → obhliadka je v zozname pod
   ponukami → **Potvrdiť termín**.
4. Späť prvým účtom → kontakt **aj adresa** sú vidieť → „Bol som na
   obhliadke" → majiteľovi pribudne „1 záujemca už bol na obhliadke".
5. Katalóg → ♥ Obľúbené → len odložené inzeráty. Odhlásený → klik pýta
   prihlásenie.
6. Hľadanie → „3-izbový byt v Bratislave do 250 tisíc" → musí rozumieť
   **Bratislava**.
7. Ponuky od viacerých ľudí → každý má **iný** obrazec.
