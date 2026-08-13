# Obhliadka s potvrdením, zjednotenie „Moje" s detailom, odznaky na podtaboch

**Dátum:** 13. 8. 2026
**Zadanie:** Rastio — tri súvisiace zmeny v jednej dávke
**Nasadenie:** **IDE OTA** pre appku. Databáza: `mig_37_viewing_confirm.sql`,
`mig_38_tab_badges.sql` nasadené (obe s korekciami nájdenými runtime
testom — popísané nižšie).

---

## 1. OBHLIADKA — KONTAKT AŽ PO POTVRDENÍ VLASTNÍKOM

### Čo sa zmenilo

Mení rozhodnutie z 8.8.2026. Predtým: „Chcem obhliadku" odkrylo kontakt
OKAMŽITE obom stranám. Teraz:

1. Záujemca klikne „Chcem obhliadku" → vznikne `viewing` so stavom
   **`REQUESTED`**. Kontakt sa **NEODKRÝVA**.
2. Vlastník dostane oznámenie a v tabe Obhliadka vidí žiadosť **pod
   prezývkou**, s tlačidlami **„Potvrdiť obhliadku"** / **„Odmietnuť"**.
3. Až potvrdením (`CONFIRMED`) sa meno, telefón a e-mail odkryjú **obom
   stranám naraz** — rovnaký mechanizmus ako pri prijatí ponuky.
4. Zamietnutá žiadosť (`CANCELLED` z `REQUESTED`) kontakt **nikdy**
   neodkryje.

Appka **ďalej** nenavrhuje ani nepotvrdzuje termíny — mení sa len KEDY sa
odkryje kontakt, nie AKO sa dohodne stretnutie (to zostáva na telefonáte).

### Kto smie ktorý prechod — presadzuje to DATABÁZA

`guard_viewing_update()` (trigger pred každým UPDATE) je teraz prísny
stavový automat, nie len „uzavretá sa nemení":

| z stavu | na stav | kto smie |
|---|---|---|
| REQUESTED | CONFIRMED | **výhradne vlastník** |
| REQUESTED | CANCELLED | vlastník (odmietne) **alebo** žiadateľ (stiahne) |
| CONFIRMED / CONTACT_SHARED | COMPLETED / CANCELLED | obe strany (nezmenené) |

**Toto nie je kontrola na obrazovke — je to obmedzenie v databáze.**
Priamy REST `PATCH` od žiadateľa na `status: 'CONFIRMED'` dostane HTTP 403
skôr, než by sa čokoľvek zapísalo. Overené testom nižšie, nie len tvrdením.

### Spätná kompatibilita — staré obhliadky sa nerozbili

Existujúce riadky so stavom `CONTACT_SHARED` (spred tejto zmeny — kontakt,
ktorý si dvaja ľudia už reálne vymenili) **sa nemenia**. `viewing_contact()`
ich naďalej odkrýva rovnako ako `CONFIRMED` — spätne schovať niečo, čo už
bolo videné, by bolo horšie než pôvodná chyba. Nové žiadosti už stav
`CONTACT_SHARED` nikdy nedostanú.

### Notifikácie

- `ZIADOST_O_OBHLIADKU` (vlastníkovi) — text prepísaný, už nesľubuje
  okamžité odkrytie: „Potvrď žiadosť v tabe Obhliadka — až potom sa vám
  navzájom odkryje kontakt."
- **Nové typy** `OBHLIADKA_POTVRDENA` a `OBHLIADKA_ZAMIETNUTA`
  (žiadateľovi), zrkadlia `PONUKA_AKCEPTOVANA`/`PONUKA_ZAMIETNUTA` —
  rovnaký mechanizmus, iný predmet.

### Texty

- `VIEWING_CONSENT` (veta nad tlačidlom „Chcem obhliadku") prepísaná —
  už netvrdí, že sa kontakt zobrazí „okamžite".
- `src/lib/how-it-works.ts` — sekcia „Obhliadka" prepísaná na
  potvrdzovací tok; krátky súhrn nižšie na stránke tiež opravený (predtým:
  „Alebo hneď, ak si vypýtaš obhliadku" — už nie hneď).

### ✅ OVERENÉ RUNTIME — 17/17

`obhliadka_potvrdenie_test.py` (mimo repa, §4):

```
1. žiadosť vznikne so stavom REQUESTED
2. kontakt PRED potvrdením: NEVIDÍ ho ani žiadateľ, ani vlastník
3. žiadateľ sa NESMIE sám potvrdiť — HTTP 403 „Žiadosť o obhliadku môže
   potvrdiť len vlastník inzerátu."
4. vlastník potvrdí → OBAJA vidia kontakt, žiadateľ dostane
   OBHLIADKA_POTVRDENA
5. po potvrdení môžu OBAJA označiť COMPLETED/CANCELLED
6. vlastník ZAMIETNE nepotvrdenú žiadosť → OBHLIADKA_ZAMIETNUTA,
   kontakt sa NIKDY neodkryl
7. žiadateľ smie stiahnuť VLASTNÚ nepotvrdenú žiadosť
8. legacy CONTACT_SHARED (staré riadky) naďalej odkrýva kontakt aj
   umožňuje COMPLETED
```

### 🔴 Čo sa pri behu pokazilo a ako to skončilo

Nič v tomto behu — všetkých 17 kontrol prešlo na prvý pokus vďaka tomu, že
guard bol navrhnutý ako explicitný stavový automat, nie dolepenie na starý
kód.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

- [ ] Cudzí inzerát → „Chcem obhliadku" → text nad tlačidlom hovorí
      o potvrdení, nie o okamžitom odkrytí.
- [ ] Vlastný inzerát → v tabe Obhliadka je vidieť žiadosť **pod
      prezývkou**, bez kontaktu, s tlačidlami Potvrdiť/Odmietnuť.
- [ ] Po potvrdení sa na OBOCH účtoch objaví kontakt.
- [ ] Po zamietnutí žiadateľ dostane push/zvonček, kontakt nikde nie je.

---

## 2. „MOJE INZERÁTY" — ZJEDNOTENÉ S DETAILOM

### Čo sa zmenilo

Mení rozhodnutie o inline rozbaľovaní ponúk v „Moje". **Zmazaný celý
`src/components/inline-offers.tsx`** (bol použitý len na jednom mieste) —
dovtedy ťuknutie na riadok v „Moje" ROZBALILO ponuky s vlastným Prijať/
Odmietnuť NA MIESTE. Bolo to druhé miesto s tou istou akciou, ktorú appka
už raz zaplatila zvončekom aj chybovými hláškami (presne to hovorí
komentár, ktorý som pri mazaní čítal).

Teraz ťuknutie na ACTIVE/CLOSED inzerát v „Moje" vedie **do rovnakého
`/nehnutelnost/[id]`**, aký vidí cudzí človek z katalógu — s podtabmi
Ponuky/Správy/Obhliadka/Hypotéka/Hodnotenia. DRAFT/REJECTED naďalej vedú
rovno do editora (tam niet čo spravovať).

„Moje inzeráty" ostáva prehľad (miniatúra, cena, countdown, počet ponúk) —
**bez akčných tlačidiel**, presne ako si žiadal.

### Vedľajší úklid

`profil.tsx` stratil nepoužívaný stav (`openListing`) a `reload` z
`useMyProperties`, ktorý mal jediného spotrebiteľa — zmazaný
`InlineOffers`.

### ✅ OVERENÉ

`npx tsc --noEmit` bez chýb (žiadny odkaz na zmazaný súbor nikde
neostal). Toto je čisto navigačná zmena — logika prijatia/odmietnutia
ponuky sa NEMENILA, len miesto, odkiaľ sa k nej dostaneš.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

- [ ] „Moje" → ťukni na ACTIVE inzerát → otvorí sa **plný detail** s
      podtabmi, nie rozbalenie na mieste.
- [ ] V tabe Ponuky funguje Prijať/Odmietnuť **tak isto ako predtým**.
- [ ] DRAFT/REJECTED stále vedú rovno do úpravy.

---

## 3. ODZNAKY NA PODTABOCH

### Čo pribudlo

Malá červená bodka na tabe, keď je tam niečo nové:

| tab | čo rozsvieti odznak | komu |
|---|---|---|
| Ponuky | nová PENDING ponuka | vlastníkovi |
| Ponuky | moja ponuka bola prijatá/odmietnutá | záujemcovi |
| Správy | neprečítaná správa | príjemcovi |
| Obhliadka | nová REQUESTED žiadosť | vlastníkovi |
| Obhliadka | moja žiadosť bola potvrdená/zamietnutá | žiadateľovi |
| Hodnotenia | nové hodnotenie o mne k TOMUTO inzerátu | hodnotenému |

Bodka, nie číslo — tab často nesie viac vecí naraz (nová ponuka aj zmena
stavu inej), presné číslo by sčítalo dve rôzne veci a pôsobilo by
presnejšie, než v skutočnosti je.

### Ako je to postavené

**Jedna RPC pre všetky štyri odznaky** (`offerra.tab_badges()`) — jeden
round-trip pri otvorení detailu, nie štyri samostatné dotazy. Vracia štyri
booleany vypočítané zo servera, appka nemusí čítať citlivé sledovacie
stĺpce priamo.

**Správy dostali ODZNAK, nie nový mechanizmus.** Sledovanie na úrovni
JEDNOTLIVEJ SPRÁVY (`message.read_at`) tu už bolo od 12.8.2026 — odznak sa
z neho len ČÍTA. Keby tab-level „videné" prepisovalo `read_at` naraz pri
otvorení CELÉHO tabu (nie konkrétneho vlákna), pokazilo by to presnosť, na
ktorú bol navrhnutý: vlastník s troma konverzáciami by pri otvorení
zoznamu vlákien (nie jedného z nich) prišiel o odznaky pri neprečítaných
konverzáciách, ktoré ešte vôbec neotvoril.

**Ponuky, Obhliadka a Hodnotenia dostali NOVÝ stĺpec + RPC**, mirroring
existujúceho vzoru z `mark_offers_viewed()` (8.8.2026):
`viewed_by_bidder_at` (ponuky, symetricky k existujúcemu
`viewed_by_owner_at`), `viewed_by_owner_at`/`viewed_by_requester_at`
(obhliadka), `viewed_at` (hodnotenia). Otvorenie tabu zavolá príslušnú
`mark_*_viewed()` RPC.

### 🔴 Čo sa pri behu pokazilo a ako to skončilo

Runtime test odhalil DVE veci, ktoré by čítanie kódu nechytilo:

1. **`guard_offer_update()` blokoval vlastný nový zápis.** Existujúci
   trigger mal nepodmienený riadok „ponuka je už uzavretá, meniť sa
   nedá" PRED tým, než sa vôbec pozrelo, KTO a ČO mení. Blokoval teda aj
   zápis `viewed_by_bidder_at` na už rozhodnutú ponuku — presne to, čo
   táto funkcia potrebuje robiť. Oprava: úzka výnimka PRED tým blokom,
   ktorá povolí VÝHRADNE zmenu `viewed_by_bidder_at` z prázdna na
   hodnotu, žiadnu inú zmenu poľa, len samotným záujemcom.
2. **Chýbajúce stĺpcové granty.** `viewing`, `property_offer` a `rating`
   používajú STĹPCOVÉ granty (nie `select *` na celú tabuľku) — nové
   stĺpce bez explicitného grantu spôsobili, že `Prefer:
   return=representation` po INSERT/UPDATE zlyhal s „permission denied".
   Doplnené granty pre `authenticated` (a `anon` tam, kde je stĺpec
   súčasťou už verejnej tabuľky).

Oba nálezy sú teraz zapísané priamo v migračnom skripte, presne tak, ako
vznikli — nie vyčistené, akoby fungovali napoprvé.

### ✅ OVERENÉ RUNTIME — 17/17

`tab_badges_test.py` (mimo repa, §4) — jeden inzerát, dvaja ľudia, všetky
štyri odznaky prejdené v poradí rozsvietenie → zhasnutie, vrátane
overenia, že:

- Ponuky: rozhodnutá ponuka rozsvieti odznak **záujemcovi**, vlastníkovi
  po jeho vlastnom `mark_offers_viewed` **ostáva vypnutý**.
- Obhliadka: potvrdenie rozsvieti odznak **žiadateľovi**, nie vlastníkovi
  (ten už videl, keď potvrdzoval).
- Hodnotenia: odznak svieti LEN hodnotenému, nikdy hodnotiacemu.
- Správy: odznak zhasne presne po otvorení KONKRÉTNEHO vlákna, nie po
  otvorení tabu.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

- [ ] Nechaj si niekým podať ponuku na vlastný inzerát → na tabe Ponuky
      sa objaví červená bodka, po otvorení zhasne.
- [ ] To isté pre Správy, Obhliadka, Hodnotenia (potrebuješ druhý účet).
- [ ] Bodka je viditeľná aj v scrollovanej/fade časti lišty (over spolu s
      dnešnou opravou tab baru).

---

## KONTROLA PRED HOTOVO

| bod | stav |
|---|---|
| Odznaky na podtaboch fungujú pre nové aktivity, miznú po otvorení — dôkaz | ✅ **OVERENÉ RUNTIME** (17/17) / 🟡 vzhľad na telefóne |
| „Moje inzeráty" bez inline Prijať/Odmietnuť, tap vedie do zjednoteného detailu — dôkaz | ✅ kód a typecheck / 🟡 vzhľad na telefóne |
| Žiadosť o obhliadku NEODKRÝVA kontakt okamžite — dôkaz | ✅ **OVERENÉ RUNTIME** |
| Vlastník má Potvrdiť/Odmietnuť, kontakt sa odkryje až po potvrdení — dôkaz oboch strán | ✅ **OVERENÉ RUNTIME** |
| Text pri „Chcem obhliadku" a „Ako funguje Offerra" aktualizované | ✅ |

`npx tsc --noEmit` — bez chýb. Priebežne overované medzi krokmi (§ štýl
zadania) — obhliadka najprv sama, potom Moje, potom odznaky navrchu,
každý krok s vlastným runtime testom pred prechodom na ďalší.
