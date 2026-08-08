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

7. **Filtre nad Dopytmi** — až po tvojom rozhodnutí (možnosť B).
8. **Redizajn obrazoviek** podľa schváleného mockupu — na tvoj pokyn
   dorobený do toho istého buildu, aby sa nemíňal EAS kredit dvakrát.

Redizajn som zámerne robil **až po opravách**, nie súčasne: keby sa
zamiešal do nich, pri prvej chybe na telefóne by sa nedalo povedať, či ju
spôsobila oprava alebo prekreslenie.

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

Pôvodne som karty v „Ponuky na inzerát" nechal ako vedomú výnimku, lebo
ťuknutie nemalo kam viesť. **Redizajn nižšie tomu dal cieľ** (spodný panel),
takže výnimka padla a klikateľné je naozaj všetko.

### 9. Filtre nad Dopytmi (bod 7) — vybral si **možnosť B**

Hotové. Dopyty majú tú istú lištu ako Nehnuteľnosti — **jeden komponent**,
nie druhá kópia. Mení sa výhradne pomenovanie:

| | Nehnuteľnosti | Dopyty |
|---|---|---|
| chips smeru | Predaj / Prenájom | **Kúpim / Hľadám prenájom** |
| príklad vety | „3-izbový byt v Petržalke do 250 tisíc" | „kúpim dom v Nitre do 200 tisíc" |
| popis sumy | „do 200 000 €" | **„ponúka do 200 000 €"** |

Typy nehnuteľnosti, hľadanie vetou, „Rozumiem: …" aj „Zrušiť" sú tie isté —
ovládanie sa učíš raz.

**Jedna vec, ktorá pri tom nie je zrejmá a stála za pozornosť:** dopyt
„akýkoľvek typ" má v databáze prázdny typ a dopyt bez hornej hranice prázdny
rozpočet. Keby ich filter na „Byt" odstrihol, prišiel by si **práve o tých
záujemcov, ktorí sú ochotní vziať čokoľvek** — teda o najlepších. Filter ich
preto zámerne necháva prejsť. Overené tromi dopytmi postavenými presne na
túto otázku.

### 10. Redizajn obrazoviek — dotiahnutý schválený mockup

Doťahuje posledný 🔴 zvyšok mockupu „Dôveryhodne teplá".

**Katalóg.** Fotka zaberá ~60 % karty. Cena je terakotová, pätkovým rezom
a najväčšia na karte. Uzávierka sa presunula na fotku ako štítok — je to
naliehavý údaj a v pätke rozbíjala pomer.

**Zmena, ktorá nie je len vzhľad:** keď na inzerát niekto ponúkol, hlavné
číslo je odteraz **najvyššia ponuka**, nie orientačná cena. Tá je vedľa,
menšia a sivá. Mockup to hovorí priamo: skutočná ponuka je dôležitejšia
než želanie predávajúceho. Predtým sa ponuka krčila v druhom riadku pod
cenou.

**Detail.** Galéria cez celú šírku s bodkami (namiesto vety „6 fotiek —
potiahni do strany"), cena ako karta, parametre v mriežke 2×2 a **prilepené
spodné tlačidlo**. To vzniklo presne kvôli tvojmu screenshotu s orezaným
„Zdieľať" — takto sa hlavná akcia nemá ako orezať a nezmizne po scrollovaní.

**Ponuky.** Karty s iniciálou v krúžku namiesto riadkov; najvyššia má
terakotový rámik a odznak. Ako majiteľ na ponuku ťukneš a otvorí sa
**spodný panel** so všetkým — dotazník nájomcu, kontakt po prijatí,
Prijať a Odmietnuť. Predtým bola každá ponuka rozbalená a pri piatich sa
nedali porovnať sumy na jednej obrazovke.

**Podržanie prsta (bod 12).** Na karte v katalógu podržíš prst a dostaneš
náhľad + obľúbené / zdieľať / nahlásiť. Telefón zavibruje. Nahlásenie
otvára ten istý formulár ako odkaz „Nahlásiť" — nie druhú kópiu.

**Tlačidlá sú terakotové, nie navy.** Tokeny to hovorili od začiatku
(`accentDeep` = „CTA tlačidlá"), tlačidlo to ale nedodržiavalo — jeho tieň
už terakotový bol, takže si tieň a výplň nesedeli.

**Kontrast som premeral, dve dvojice neprešli a opravil som ich** — odznak
„NAJVYŠŠIA" a neutrálny odznak mali na tlmenom podklade 4,42 a 4,06
namiesto 4,5. Namiesto stlmenia dostali obrys na svetlom podklade: 5,18
a 4,76. Iniciála v krúžku má 20px tučné, čím sa počíta ako veľký text.
Spolu 12 dvojíc × 2 témy, **0 zlyhaní**.

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

---

## Čo mám otestovať ja a čo ty

**Ja (hotové, dôkazy sú v registri 7.11):**

| Test | Výsledok |
|---|---|
| polia prenájmu a adresa proti živej DB | **12/12** |
| dátumy a riadky prenájmu (jednotkový) | **18/18** |
| filtre nad dopytmi proti živej DB | **11/11** |
| rozbor vety hľadajúceho + popis filtra | **9/9** |
| čo je hlavné číslo po redizajne | **14/14** |
| kontrast nových dvojíc farieb (12 × 2 témy) | **0 zlyhaní** |
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
- [ ] V **Dopytoch** musí byť hore hľadanie a chips **Kúpim / Hľadám
      prenájom / Byt / Dom / Pozemok / Komerčný priestor**. Ťukni na
      „Kúpim" — musia ostať len kupujúci.
- [ ] **Karta v katalógu**: fotka má zaberať väčšinu karty, cena má byť
      terakotová a v pätkovom písme. Pri inzeráte s ponukami má byť veľké
      číslo NAJVYŠŠIA PONUKA a orientačná cena malá vpravo.
- [ ] **Podrž prst na karte** — má zavibrovať, pozadie stmavnúť
      (s buildom #4 rozmazať) a objaviť sa náhľad s tromi akciami.
- [ ] **Detail**: galéria potiahnutím do strán, bodky dole musia meniť
      aktívnu. Dole prilepené tlačidlo **Podať ponuku** — nesmie sa
      orezať ani zmiznúť po scrollovaní.
- [ ] **Ponuky na inzerát** (ako majiteľ): ťukni na ponuku → má sa vysunúť
      spodný panel s Prijať a Odmietnuť.
