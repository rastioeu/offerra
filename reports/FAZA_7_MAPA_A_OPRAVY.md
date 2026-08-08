# Fáza 7 — mapa, klávesnica, prenájom, adresa

**Dátum:** 8. augusta 2026
**Zadanie:** Rastio, dávka nálezov zo živého testovania (kritické bugy +
vylepšenia)
**Verzia:** 1.2.0, build 4 · **VYŽADUJE NOVÝ BUILD** (`react-native-maps`)

---

## Ako som zoradil poradie

Vyžiadal si si to sám („zosúlaď poradie sám a napíš mi ako si to zoradil"):

1. **Mapa** — bola rozrobená z predošlého zadania a build sa kvôli nej aj
   tak robí. Nemalo zmysel ju nechať na pol ceste a robiť build dvakrát.
2. **Tri kritické bugy** (späť / klávesnica / safe area) — sú to veci, ktoré
   ti bránia appku vôbec používať.
3. **Klikateľné riadky** — lacné, prechádza sa pri tom celá appka.
4. **Terminológia dopytov** — jazyková zmena, nič nerozbije.
5. **Polia prenájmu + adresa** — migrácia DB, najväčší kus.
6. **Build**.

**Redizajn jednotlivých obrazoviek** podľa schváleného mockupu („Dôveryhodne
teplá") som do tejto dávky **nezaraďoval** — kritické bugy majú prednosť
a miešať ich do redizajnu by znamenalo, že sa nedá povedať, čo ktorú zmenu
spôsobilo.

---

## Čo sa opravilo

### 1. Tlačidlo Späť ukazovalo „(tabs)"

iOS píše pri šípke späť **titulok predošlej obrazovky**. Predošlá bola
smerovacia skupina `(tabs)` bez titulku, tak sa vypísal názov priečinka.

Nastavené je to v koreňovom `Stack`, teda **naraz pre všetkých 10 obrazoviek**
s hlavičkou:

```
headerBackButtonDisplayMode: 'minimal'   → len šípka (bežný iOS vzor)
headerBackTitle: 'Späť'                  → poistka
(tabs) dostalo title: 'Offerra'          → druhá poistka
```

### 2. Klávesnica prekrývala pole a nedala sa zavrieť

Boli to **dve chyby naraz**:

- `KeyboardAvoidingView` obsah posunul, ale **nedoskroloval** na pole →
  pole nižšie vo formulári ostalo pod klávesnicou;
- **numerická klávesnica nemá Enter**, takže „Počet izieb" a „Nájom do" sa
  nedali zavrieť vôbec.

Nový spoločný obal `FormScreen` dáva **štyri nezávislé cesty von**:

| Cesta | Ako |
|---|---|
| iOS sám doskroluje a podloží obsah | `automaticallyAdjustKeyboardInsets` |
| ťuknutie kdekoľvek mimo poľa | plocha cez celý formulár |
| potiahnutie prstom po obsahu | `keyboardDismissMode="interactive"` |
| **lišta „Hotovo" nad klávesnicou** | `InputAccessoryView` |

„Hotovo" sa pripája **automaticky** k číselným a viacriadkovým poliam —
nedá sa na ňu zabudnúť pri budúcich formulároch.

Pokryté: inzerát, nový dopyt, ponuka, prezývka, profil, hypotekárna
kalkulačka v detaile, modál oslovenia, modál nahlásenia, prihlásenie.

### 3. Hlavička sa prelínala s ostrovčekom

Odsadenie zhora si držala **obrazovka**, nie hlavička — stačilo, aby naň
jedna obrazovka zabudla. Teraz si ho `AppHeader` berie **sám** a farba
hlavičky sa natiahne až pod ostrovček.

---

## Čo pribudlo

### 4. Mapa (bod 5 + bod 13F)

- Prepínač **Zoznam / Mapa** hore v katalógu; filter platí pre obe.
- Na pine je **cena**, nie bodka. Terakota = najvyššia ponuka, navy =
  orientačná cena.
- **Prepínač Mapa / Satelit**, ako si žiadal.
- Mapa je mimo scrollovacej plochy — inak by si posúvanie mapy
  a scrollovanie stránky kradli gesto.

**Súradnice:** doplnil som ich do číselníka obcí z Wikidata —
**2925/2925 obcí** a **8/8 zverejnených inzerátov**. Výber obce po novom
dopĺňa aj súradnice, takže nový inzerát bude na mape hneď.

**Poloha je poloha OBCE, nie adresy.** Je to zámerné: presná adresa je
skrytá do dohody a mapa ju nesmie obísť. Píše to aj štítok na mape.

### 5. Polia prenájmu (bod 8)

Zábezpeka (€) · zábezpeka ako počet nájmov · dostupné od · minimálna doba
nájmu · zariadenie (zariadený/čiastočne/nezariadený) · energie v nájme
(áno/nie/čiastočne) · zvieratá (povolené/nepovolené).

Zobrazujú sa **len pri prenájme**. Pri prepnutí na predaj sa zahodia — inak
by inzerát na predaj nosil zábezpeku, ktorá tam nedáva zmysel.

*Rozhodnutie, ktoré si nechal na mňa:* dal som ich **priamo na `property`**,
nie do zvláštnej tabuľky `rental_details`. Je to 7 nepovinných stĺpcov, ktoré
sa vždy čítajú spolu s inzerátom — zvláštna tabuľka by pridala join pri
každom otvorení detailu a nezískala nič.

**Dátum „Dostupné od"** má rýchle voľby (Ihneď / od budúceho mesiaca / o 2 /
o 3) + ručné zadanie `1.9.2026`. Natívny kolotoč dátumov by bol **ďalší
natívny modul** — nechcel som pridávať druhý dôvod na build.

### 6. Adresa: kraj + ulica (bod 9)

Kraj sa **dopĺňa sám** podľa vybranej obce (je v tom istom číselníku), dá sa
prepísať z ôsmich možností. Ulica je nepovinná a **bez čísla domu**.
Spätne doplnené: 8/8 inzerátov, 7/7 dopytov.

### 7. Dopyt hovorí rečou hľadajúceho (bod 6)

| Bolo | Je |
|---|---|
| „Chcem: Kúpiť / Prenajať si" | **„Čo hľadám: Kúpim / Hľadám prenájom"** |
| „Rozpočet do (€)" | **„Ponúkam do (€)"** |
| badge „PREDAJ" | **„KÚPIM"** |

Placeholder v „Čo hľadáš" sa mení podľa toho, či kupuješ alebo hľadáš
prenájom.

### 8. Klikateľné celé karty a riadky (bod 4)

Prešiel som appku obrazovka po obrazovke. Väčšina už klikateľná bola;
**opravené sú:** časová os v Profile a všetky štyri zoznamy v tabe Správa
(nahlásenia, inzeráty, používatelia, „vyžaduje pozornosť").

**Jedna vedomá výnimka:** karty v „Ponuky na inzerát". Nie je to riadok
vedúci niekam — je to hotová karta so všetkými údajmi a s tlačidlami
Prijať/Odmietnuť. Ťuknutie by nemalo kam viesť.

---

## ⚠️ Čo potrebuje teba

### Google mapy na iOS potrebujú kľúč

Žiadal si `PROVIDER_GOOGLE` „vzor MUTARK". **Overil som MUTARK:** má
`react-native-maps` v plugins, ale **žiadny** `googleMapsApiKey`. Bez kľúča
`react-native-maps` na iOS Google SDK vôbec nezalinkuje a `PROVIDER_GOOGLE`
by dal prázdnu šedú plochu.

Urobil som to tak, aby mapa fungovala hneď a Google sa zapol bez zmeny kódu:

- **teraz (bez kľúča):** iOS beží na **Apple Maps** — plne funkčná mapa
  vrátane satelitu;
- **keď dodáš kľúč** (Google Cloud → Maps SDK for iOS) do `app.json` ako
  `ios.config.googleMapsApiKey`: automaticky sa prepne na Google.

Vyrobiť ten kľúč za teba nemôžem — je viazaný na tvoj Google Cloud účet
a fakturáciu.

### OTÁZKA — filter chips medzi Nehnuteľnosťami a Dopytmi (bod 7)

Výslovne si napísal, aby som nerozhodoval sám. Návrh a tri možnosti sú
nižšie; vyberáš ty.

**Kontext:** filtre v Nehnuteľnostiach (Predaj/Prenájom/Byt/Dom/…) filtrujú
**inzeráty**. Dopyty sú opačný smer a majú vlastnú množinu — Kúpim / Hľadám
prenájom + typ + kraj + rozpočet.

**Môj návrh: B — rovnaká lišta, iné slová.** Dopyty dostanú vlastnú lištu
chips s rovnakým vzhľadom a správaním, ale s vlastnými slovami (Kúpim /
Hľadám prenájom / Byt / Dom / …). Naučíš sa ovládanie raz, ale nikdy
nefiltruješ dopyty slovom „Predaj".

Ostatné dve možnosti: **A** — spoločná lišta a jeden prepínač
Nehnuteľnosti/Dopyty nad ňou (menej miesta, ale mieša dva rôzne trhy);
**C** — nechať Dopyty úplne bez filtrov, kým ich nebudú desiatky.

---

## Čo mám otestovať ja a čo ty

**Ja (hotové, dôkazy sú v registri 7.11):**

| Test | Výsledok |
|---|---|
| polia prenájmu a adresa proti živej DB | **12/12** |
| dátumy a riadky prenájmu (jednotkový) | **18/18** |
| `npx tsc --noEmit` | **0 chýb** |
| `npx expo export --platform ios` | **hotovo**, bundle 4,7 MB |

**Ty, po nainštalovaní buildu #4 z TestFlightu** — toto sú veci, ktoré
z terminálu overiť neviem:

- [ ] Otvor **Nový dopyt** a **Inzerát**: pri šípke späť **nesmie** byť
      žiadny text, tobôž nie „(tabs)".
- [ ] V dopyte ťukni do **„Nájom do"**. Klávesnica nesmie prekryť pole,
      nad ňou musí byť **„Hotovo"**, a ťuknutie vedľa poľa ju musí zavrieť.
- [ ] To isté v **Počte izieb** v inzeráte a v **hypotekárnej kalkulačke**
      v detaile.
- [ ] Na **Nehnuteľnostiach** sa logo nesmie prelínať s ostrovčekom.
      Skús aj Dopyty, Pridať a Profil.
- [ ] Prepni hore vpravo na **Mapu**. Musíš vidieť **8 pinov s cenou**
      a prepínač **Mapa / Satelit** vpravo hore. Ťuknutie na pin otvorí
      inzerát.
- [ ] V inzeráte prepni **Typ obchodu na Prenájom** — musí sa objaviť blok
      **PODMIENKY PRENÁJMU** (zábezpeka, dostupné od, …). Vyplň, ulož,
      vráť sa a skontroluj, že to tam ostalo.
- [ ] Vyber obec — **Kraj** sa musí doplniť sám.
- [ ] V **Novom dopyte** musí byť hore **„Kúpim / Hľadám prenájom"**,
      pri Kúpim pole **„Ponúkam do (€)"**.
- [ ] V **Správe** ťukni na riadok nahlásenia, inzerátu aj používateľa —
      každý musí niečo urobiť.
