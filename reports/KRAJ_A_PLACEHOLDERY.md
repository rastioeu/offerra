# Kraj nad obcou + placeholdery, ktoré vyzerali ako vyplnené hodnoty

**Dátum:** 12. 8. 2026
**Zadanie:** Rastio — dve zmeny vo formulári inzerátu
**Nasadenie:** **IDE OTA** — len JS, žiadny natívny modul, žiadna zmena `app.json`

---

## 1. KRAJ JE NAD MESTO/OBEC

### Čo sa zmenilo

Predtým: `Mesto/obec` → pod ním `Kraj` s poznámkou „Dopĺňa sa podľa obce."
Teraz: `Kraj (nepovinné)` → pod ním `Mesto/obec (povinné)`.

### Rozhodnutie, ktoré si odo mňa chcel

Dal si dve možnosti — kraj zamknúť, kým nie je obec, **alebo** nechať kraj
zúžiť ponuku obcí. **Zvolil som zúženie ponuky obcí.** Dva dôvody:

1. **Je to jednoduchšie.** Je to jeden riadok v dotaze:
   ```ts
   if (region) q = q.eq('region', region);
   ```
   Zamykanie by znamenalo stav navyše, vypnutý ovládací prvok a text, ktorý
   vysvetľuje, prečo sa nedá ťuknúť — teda viac kódu na to, aby appka robila
   menej.
2. **Je to jediná z tých dvoch možností, ktorá je používateľovi na niečo.**
   Obcí je **2 930**. Zamknutý kraj nad obcou je prázdny prepínač, ktorý sa
   sám vyplní o riadok nižšie — ovládací prvok, čo pri ťuknutí nerobí nič.
   Zúženie je naopak presne ten dôvod, prečo sa vôbec oplatí pýtať sa na kraj
   skôr než na obec.

### Prečo sa to nedá „rozbiť"

**Obec ostáva zdrojom pravdy.** Keď človek vyberie obec, kraj sa prepíše na
ten, ktorý má obec v číselníku — aj keby mal predtým zvolený iný. Nedá sa
teda uložiť inzerát s obcou v jednom kraji a krajom v inom. Kraj sa nedá
pokaziť, nanajvýš sa opraví.

**Prázdny kraj nesmie znamenať prázdny zoznam** — keď kraj zvolený nie je,
hľadá sa po celom Slovensku ako doteraz. To je overené nižšie ako samostatné
pravidlo, lebo je to najpravdepodobnejší spôsob, ako by sa taká zmena dala
pokaziť.

Kraj sa navyše premietol aj do textov, aby bolo VIDIEŤ, že hľadanie je
zúžené — inak by človek nechápal, prečo mu Nitra nevyskočí:

| kde | bez kraja | so zvoleným krajom |
|---|---|---|
| hint pod poľom | „Podľa obce sa doplní kraj aj poloha na mape." | „Hľadá sa v kraji Nitriansky. …" |
| nadpis modálu | „Vyber obec" | „Vyber obec — Nitriansky" |
| placeholder hľadania | „napr. Nitra" | „napr. Nitra — hľadá sa v kraji Nitriansky" |
| prázdny výsledok | „Nič sa nenašlo. Skús inú časť názvu." | „V kraji Nitriansky sa nič nenašlo. Skús inú časť názvu, **alebo zmeň kraj vyššie**." |

Posledný riadok je podstatný: keď človek zvolí zlý kraj, appka mu povie, kde
je chyba, nie len že „nič sa nenašlo".

### ✅ OVERENÉ RUNTIME

Skript `kraj_test.py` (mimo repozitára) posiela **ostrej databáze presne tie
dotazy, ktoré posiela CityPicker**, s anon kľúčom — teda s právami appky, nie
servisnými.

```
obcí spolu: 2930

--- 1. každý kraj zo zoznamu v appke sedí na hodnotu v DB ---
OK   Bratislavský kraj         90 obcí
OK   Trnavský kraj            251 obcí
OK   Trenčiansky kraj         276 obcí
OK   Nitriansky kraj          355 obcí
OK   Žilinský kraj            315 obcí
OK   Banskobystrický kraj     516 obcí
OK   Prešovský kraj           664 obcí
OK   Košický kraj             463 obcí

súčet cez kraje: 2930 / 2930

--- 2. hľadanie S krajom vs. BEZ kraja (to, čo robí CityPicker) ---
OK   "nitr":       bez kraja  9, v kraji Nitriansky   4, cudzí kraj v odpovedi: 0
OK   "bratislava": bez kraja  1, v kraji Bratislavský 1, cudzí kraj v odpovedi: 0
OK   "kosic":      bez kraja  6, v kraji Košický      6, cudzí kraj v odpovedi: 0
OK   "nov":        bez kraja 32, v kraji Prešovský    5, cudzí kraj v odpovedi: 0

--- 3. prázdny kraj NESMIE znamenať prázdny výsledok ---
OK   bez zvoleného kraja: 9 obcí

--- 4. obec zostáva zdrojom pravdy: má vlastný kraj, ktorý ju prepíše ---
OK   Nitra: region=Nitriansky kraj, lat=48.314722222

VŠETKO OK
```

Prvý blok je ten, na ktorom to mohlo celé padnúť: zoznam ôsmich krajov je
v `src/lib/property.ts` ako reťazce a filter je `eq`. **Keby sa čo i len jeden
reťazec nezhodoval so stĺpcom `city.region`, ten kraj by dal prázdny zoznam
obcí** a človek by nevedel prečo. Overené je nielen že každý kraj má obce,
ale aj že **súčet cez kraje = všetky obce** — teda že neexistuje obec, ktorá
by pri zvolenom kraji vypadla.

Pri hľadaní „nov" je to najviditeľnejšie: 32 obcí bez kraja, 5 v Prešovskom.
To je presne ten úžitok, kvôli ktorému bola zvolená táto možnosť.

**Vedľajší nález:** obcí je **2 930**, nie 2 925 — komentáre v kóde niesli
staré číslo z prvého načítania číselníka, doplnené obce sa do nich nikdy
nepremietli. Opravené.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

Dotaz dokazuje odpoveď servera, nie poradie polí na obrazovke.

- [ ] **Nový inzerát** → pole **Kraj** je **nad** Mesto/obec.
- [ ] **Zvoľ kraj (napr. Nitriansky), potom otvor Mesto/obec** → nadpis modálu
      má názov kraja, píš „nov" → musia prísť LEN obce z toho kraja.
- [ ] **Zvoľ zámerne zlý kraj** (napr. Košický) a hľadaj „Bratislava" →
      hláška musí povedať, že v tom kraji nič nie je a **že sa dá kraj zmeniť
      vyššie**.
- [ ] **Nevyber žiadny kraj a hľadaj** → musí hľadať po celom Slovensku.
- [ ] **Zvoľ Košický kraj, potom vyber obec z Nitrianskeho** (cez zrušenie
      kraja) → kraj sa musí prepísať na Nitriansky, nie zostať Košický.
- [ ] **Ulica** pod obcou funguje ďalej ako doteraz.

---

## 2. PLACEHOLDERY

### Čo bolo zle — a bolo to horšie, než si písal

Mal si pravdu, že placeholder vyzerá ako vyplnená hodnota. Zmeral som to
a problém bol **v oboch veciach naraz** — vo farbe aj vo formáte.

Placeholder používal token `textMuted`. To je farba pre **skutočný text**
(popisky, sekundárne údaje), takže bola nastavená tak, aby mala plný kontrast
voči pozadiu. Placeholder z nej preto nevyzeral ako nápoveda, ale ako obsah.

**Zmerané (WCAG kontrastný pomer):**

| | pozadie poľa | zadaná hodnota | placeholder PRED | **odstup placeholderu od hodnoty** |
|---|---|---|---|---|
| svetlá | `#FFFDFB` | `#1C1815` | `#7A7068` (4.76:1 s pozadím) | **3.65:1** |
| tmavá | `#211D1A` | `#F7F3EF` | `#A2968C` (5.80:1 s pozadím) | **2.61:1** |

V tmavej téme boli od seba placeholder a skutočná hodnota **2.61:1** — to je
menej, než WCAG žiada od obyčajného textu voči pozadiu. Inými slovami: v tmavej
téme sa prázdne pole od vyplneného takmer nedalo odlíšiť.

### Čo je teraz

**Nový token `textPlaceholder`** — vlastná farba, výhradne pre placeholdery,
nič iné ju nepoužíva. `tokens.ts` ostáva jediný zdroj pravdy (CLAUDE.md §5),
žiadna obrazovka nemá vlastnú farbu.

| | placeholder PO | s pozadím poľa | **odstup od hodnoty** |
|---|---|---|---|
| svetlá | `#988E86` | 3.16:1 | **3.65:1 → 5.50:1** |
| tmavá | `#75695F` | 3.14:1 | **2.61:1 → 4.83:1** |

Obe nové hodnoty držia **≥ 3:1 voči pozadiu poľa** — to je hranica, pod ktorú
sa ísť nesmie, inak by sa placeholder nedal prečítať vôbec. Cieľ nebol
placeholder schovať, ale prestať ho vydávať za hodnotu.

### Formát „napr. X" na VŠETKÝCH poliach

Farba sama nestačí — „3" je aj tak číslo, ktoré v poli vyzerá ako číslo.
Prešiel som **všetky** polia, nielen formulár inzerátu:

**Formulár inzerátu** (`inzerat/[id].tsx`) — všetkých 11:

| pole | PRED | PO |
|---|---|---|
| Názov | (už bolo `napr. …`) | `napr. Svetlý 3-izbový byt pri Slavíne` |
| Popis | `Stav, orientácia, čo je v okolí…` | `napr. Po rekonštrukcii, orientácia na juh, električka 5 minút` |
| Počet izieb | `3` | `napr. 3` |
| Výmera | `78` | `napr. 78` |
| Cena (predaj) | `248000` | `napr. 248000` |
| Cena (prenájom) | `850 (za mesiac)` | `napr. 850 za mesiac` |
| Poschodie | `3` | `napr. 3` |
| Z koľkých poschodí | `5` | `napr. 5` |
| Mesačné náklady | `140` | `napr. 140` |
| Zábezpeka | `1600` | `napr. 1600` |
| Zábezpeka = mesiacov | `2` | `napr. 2` |
| Min. dĺžka nájmu | `12` | `napr. 12` |

**Ostatné formuláre** — ten istý vzor, lebo problém nie je vlastnosť jednej
obrazovky:

| obrazovka | zmenené |
|---|---|
| Nový dopyt | `400`→`napr. 400 za mesiac`, `120000`, `650`, `200000`, `2`, `55` |
| Ponuka | `780`→`napr. 780 za mesiac`, `215000`, `2`, `24`, `2000`, poznámka |
| Prezývka | `Ján Novák` → `napr. Ján Novák` |
| Výber obce | `Začni písať názov obce…` → `napr. Nitra` |

**Farba `textPlaceholder` je nasadená v 6 súboroch** — všade, kde bol
`placeholderTextColor`: `ui.tsx` (spoločné pole `Field`, teda väčšina
formulárov naraz), `search-bar.tsx`, `city-picker.tsx`, `street-picker.tsx`,
`available-from-picker.tsx`, `login.tsx`.

### Čo som ZÁMERNE nechal tak

Nie každý placeholder je príklad hodnoty. Tieto by po „napr." boli horšie:

| kde | text | prečo |
|---|---|---|
| Prihlásenie | `e-mail`, `heslo` | názov poľa, nie príklad — „napr. e-mail" nedáva zmysel |
| Telefón | `+421 9xx xxx xxx` | maska formátu, `x` už samo hovorí „sem príde tvoje číslo" |
| Dostupné od | `alebo konkrétny dátum — 1.9.2026` | pokyn, čo sa dá do poľa napísať |
| Odpoveď na dopyt | `Napíš, prečo by ho mohol tvoj inzerát zaujímať.` | pokyn, nie príklad |

### 🟡 ČAKÁ VIZUÁLNE OVERENIE — obrázok PRED/PO

`reports/placeholder_pred_po.png`

⚠️ **Nie je to screenshot appky.** Je to obrázok vykreslený **z hodnôt
v `src/theme/tokens.ts`** — teda dokazuje, aké farby sú v tokenoch a ako
vyzerá ten rozdiel, **nedokazuje, že to tak vyzerá na tvojom telefóne.**
Podľa CLAUDE.md §1 tento bod preto nemôže dostať ✅ — vizuálne overenie robíš
ty.

Čo na obrázku je: to isté pole „Počet izieb" v štyroch stavoch — PRED (stará
farba + „3") a PO (nová farba + „napr. 3"), prázdne aj vyplnené, v svetlej aj
tmavej téme, s vypísaným odstupom od skutočnej hodnoty.

**Na telefóne over:**

- [ ] **Prázdne pole „Počet izieb"** v novom inzeráte — musí byť vidieť
      `napr. 3` a musí byť na prvý pohľad **bledšie** než keď tam číslo napíšeš.
- [ ] **To isté v tmavej téme** — tam bol problém najväčší (2.61:1).
- [ ] **Placeholder ostáva čitateľný**, nie je vybledlý do neviditeľna.
- [ ] **Ponuka aj Dopyt** majú ten istý štýl — nie je to opravené len na jednej
      obrazovke.

---

## KONTROLA PRED HOTOVO

| bod zo zadania | stav |
|---|---|
| Kraj je nad Mesto/Obec, logika prepojenia funguje bez rozbitia — dôkaz | ✅ **OVERENÉ RUNTIME** (dotazy vyššie) + 🟡 poradie polí na obrazovke čaká na teba |
| Placeholder texty jasne odlíšené od reálnej hodnoty (farba + formát „napr. X") na všetkých poliach — screenshot pred/po | 🟡 **KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE** — kontrast zmeraný, obrázok je vykreslený z tokenov, nie screenshot appky |

`npx tsc --noEmit` — bez chýb.
