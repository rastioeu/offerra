# Pád pri ťuknutí na spodné taby — diagnostika

**Dátum:** 8. augusta 2026
**Stav:** 🔴 **PRÍČINA ZATIAĽ NEZISTENÁ** — diagnostika nasadená, čakám na
hlášku zo zariadenia
**Nasadené:** OTA na runtime `451767ea…` = **build #4**

> Tento report úmyselne **netvrdí, že je opravené**. Podľa CLAUDE.md §2 je
> prvý krok diagnostika, nie oprava — a „malo by fungovať" je zakázané.

---

## Čo som odmeral (nie odhadol)

### 1. Na akom kóde vlastne bežíš

```
build #3  → runtime 6e77233e…   posledná OTA spred 14 h
build #4  → runtime 451767ea…   ŽIADNA OTA neexistovala
```

Build #4 teda bežal na **vloženom bundli**, teda presne na commite
`964c54a` (redizajn). Nič medzi tým sa k tebe nemohlo dostať.

### 2. Hypotéza „seed dáta nesedia s novým modelom" — **VYVRÁTENÁ**

Presne to si tipoval ako najpravdepodobnejšiu príčinu. Odmeral som to
a nesedí:

| Kontrola | Výsledok |
|---|---|
| `transaction_type` prázdny alebo neznámy | **0** riadkov (inzeráty, dopyty) |
| `property_type` mimo povolených hodnôt | **0** |
| `status` mimo povolených hodnôt | **0** |
| inzerát/ponuka/dopyt bez existujúceho profilu | **0** |
| aktívny inzerát bez kraja | **0** (doplnené z číselníka) |
| aktívny inzerát bez fotky | **0** |

Nové stĺpce sú navyše **všetky nullable** a všetky miesta, kde sa
renderujú, si prázdnu hodnotu ošetrujú (`rentalRows` každé pole testuje
na `!= null`, `formatDay` vracia `null`, kraj a ulica idú cez
`filter(Boolean)`). Prázdna hodnota v novom poli teda pád nespôsobí.

**Záver:** príčina je v kóde, nie v dátach.

### 3. Countdown platnosti inzerátu — **NIE JE STRATENÝ, PRESUNUL SA**

Toto je moja chyba v komunikácii, nie regresia. Pri redizajne som ho
presunul **z riadku pod cenou na štítok priamo na fotke** (vľavo dole),
lebo uzávierka je naliehavý údaj a v pätke rozbíjala pomer 60/40. Kód je
v `property-card.tsx` a naďalej používa ten istý `deadlineLabel`.

Overil som aj dáta a výpočet:

```
4 zo 7 zverejnených inzerátov MÁ uzávierku
2026-08-21 → „Ponuky do 21. augusta 2026 · ostáva 13 dní"
2026-09-21 → „Ponuky do 21. septembra 2026 · ostáva 44 dní"
```

Takže na tých štyroch kartách sa má zobraziť. Ak sa nezobrazuje ani na
nich, je to naozaj chyba a treba ju vidieť na obrazovke — čo nás vracia
k pádu.

---

## Čo som nasadil

**Záchranná obrazovka pri páde JS** (`src/components/error-boundary.tsx`).

Doteraz React pri chybe odmontoval celý strom a ostala **biela plocha bez
jediného slova** — presne to „nestane sa nič", ktoré CLAUDE.md §2 zakazuje.
Po novom je na obrazovke:

- názov a **celá surová hláška** chyby,
- **komponent, v ktorom padla** (component stack) — teda ktorá obrazovka,
- tlačidlo „Skúsiť znova".

Nie je to len pomôcka na dnes; ostáva v appke natrvalo.

**Runtime nasadenej OTA je `451767ea63364f29fedb9f7c117c80fa69dfe1b3`,
čo je presne runtime buildu #4** — overené výpisom z `eas update`. Update
sa k tebe teda dostane.

---

## Čo potrebujem od teba (bez toho ďalej neviem)

Na Linuxe nemám iOS simulátor ani tvoj telefón, takže **pád z terminálu
reprodukovať neviem** — je to tá istá hranica, ktorú má register zapísanú
od Fázy 2. Hláška zo zariadenia je jediný spôsob, ako sa dostať ku
koreňovej príčine.

1. **Zavri appku úplne** (potiahnutím hore, nie len prepnutím).
2. Otvor ju. Prvé spustenie update **stiahne**, ale ešte nepoužije.
3. **Zavri a otvor ju znova** — teraz beží nový kód.
4. Ťukni na tab, pri ktorom to padá.
5. Namiesto pádu má naskočiť červený nadpis **„Appka spadla"**. **Odfoť to
   celé** — hláška aj zoznam komponentov pod ňou.

Napíš mi k tomu ešte dve veci, ktoré rozhodujú, či ide o JS alebo natívny pád:

- **Ktorý konkrétny tab?** (Nehnuteľnosti / Dopyty / Pridať / Profil)
- **Appka sa úplne zavrie** (skočí na plochu), alebo ostane otvorená
  s bielou/červenou obrazovkou?

Ak sa appka **úplne zavrie**, je to natívny pád a záchranná obrazovka ho
nezachytí — vtedy potrebujem crash log: *Nastavenia → Ochrana osobných
údajov a bezpečnosť → Analytics & Improvements → Analytics Data*, nájdi
riadok začínajúci `Offerra` s dnešným dátumom a pošli ho.

---

## Čo je zastavené

Podľa tvojho pokynu **nerobím žiadnu novú funkcionalitu**, kým toto nebude
stabilné a tebou potvrdené. Rozpracované a odložené:

- demo účet pre Apple review + seed obsah,
- právne texty a hostovanie,
- postup pozvania rodiny do TestFlightu,
- audit „coming soon" obrazoviek.

Prechod celého `OFFERRA_REGISTER.md` položku po položke spravím hneď po
tom, čo bude pád vyriešený — má zmysel až na stabilnej appke.
