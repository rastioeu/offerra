# Poradie filtrov + podtaby na detaile inzerátu

**Dátum:** 12. 8. 2026
**Zadal:** Rastio
**Nasadenie:** **IDE OTA** — nič natívne, `app.json` bez zmeny.

---

## 1. PORADIE FILTROV

Hotové. „♥ Obľúbené" je teraz **prvý** čip a je v hornom riadku spolu
s triedením: **Obľúbené · Najnovšie · Čoskoro končí**, pod tým Predaj /
Prenájom / Byt / Dom / …

Predtým bolo „Obľúbené" na konci druhého riadka, za všetkými typmi
nehnuteľností — čo je pri filtri, ktorý človek používa najčastejšie, presne
naopak, než by malo byť.

Neprihlásenému sa „Obľúbené" naďalej neukazuje (srdiečko si nemá kam uložiť);
vtedy riadok začína rovno „Najnovšie". Pri dopytoch nie je ani jedno — dopyty
nemajú uzávierku ani obľúbené.

---

## 2. PODTABY — môj názor na tvoj návrh

**Tvoje rozdelenie beriem takmer celé.** Tri taby, tie isté pre obe strany,
obsah podľa role. Aj názov „Obhliadka" namiesto „Komunikácia" je správny
z presne toho dôvodu, ktorý si napísal: appka nemá chat, len jednorazové
odkrytie kontaktu, a tab nemá sľubovať viac.

**Dve veci som spravil inak, a tu je prečo:**

### a) Formulár „Podať ponuku" som do tabu NEDAL

Ostáva vlastnou obrazovkou (`/ponuka/[id]`) a tab na ňu vedie tlačidlom.

Dôvod: pri PRENÁJME ten formulár nie je jedno pole so sumou — je v ňom celý
dotazník nájomcu (počet osôb, zvieratá, dĺžka nájmu, zamestnanie, príjem,
poznámka) plus vlastná kontrola. Druhá kópia toho istého formulára by sa
skôr či neskôr rozišla s originálom a jedna z nich by tichšie klamala.

Čo tab **naozaj** ukazuje záujemcovi, je to podstatné: **stav jeho ponuky**
(suma, PENDING/ACCEPTED/REJECTED), tlačidlo **Upraviť** a — ako si žiadal —
**Stiahnuť ponuku**, keď je PENDING. Stiahnutie je priamo v tabe, nie za
preklikom.

### b) Rozhodovanie majiteľa som VYBRAL do komponenty, nie skopíroval

Prijať / Odmietnuť / Uzavrieť obchod aj so spodným panelom, dotazníkom
nájomcu a odkrytým kontaktom je teraz `src/components/owner-offers.tsx`.
Používa ju **aj** obrazovka „Ponuky na inzerát", **aj** podtab na detaile.
Jedna implementácia, dve miesta — nie dve implementácie.

Pri tom sa ukázala vec, ktorá by sa inak ticho pokazila: razítko „majiteľ
ponuku videl" (`mark_offers_viewed`) sedelo na obrazovke „Ponuky na inzerát".
Keby majiteľ vybavil ponuku v novom tabe, záujemcovi by pri nej naďalej
svietilo „nevidené" — a to je údaj, ktorý si sám nastaviť nevie, teda by mu
klamal. Razítko je preto teraz v `OwnerOffers`, čiže platí pre obe cesty.

### c) Tlačidlo majiteľa dole

Bolo „Spravovať ponuky" a viedlo na obrazovku, ktorú tab nahradil — teda by
viedlo na to isté. Zmenil som ho na **„Upraviť inzerát"**, lebo úprava
z detailu **dovtedy nebola dostupná vôbec**. Ak sa ti to nepozdáva, je to
jeden riadok späť.

---

## 3. ČO JE V KTOROM TABE

### Ponuky

| Kto | Čo vidí |
|---|---|
| Majiteľ | zoznam všetkých ponúk, ťuknutie otvorí panel s dotazníkom nájomcu (prenájom), Prijať / Odmietnuť, „Predať/Prenajať tomuto záujemcovi", odkrytý kontakt po prijatí |
| Záujemca bez ponuky | vysvetlenie + „Podať ponuku" + verejný zoznam ponúk |
| Záujemca s ponukou | vlastná suma a stav; pri PENDING Upraviť + Stiahnuť; pri ACCEPTED odkaz na kontakt v tabe Obhliadka; + verejný zoznam |
| Neprihlásený | verejný zoznam + „Prihlás sa a ponúkni" |
| Všetci | časová os cien a ponúk (patrí k ponukám, nie k popisu) |

### Obhliadka

| Kto | Čo vidí |
|---|---|
| Majiteľ | žiadosti o obhliadku so stavom (REQUESTED / CONTACT_SHARED / COMPLETED) a kontakt na žiadateľa; „Bol som na obhliadke" / „Zrušiť" |
| Záujemca | „Chcem obhliadku" (s varovaním PRED ťuknutím), alebo stav svojej žiadosti + odkrytý kontakt |
| Obaja | **kontakt z prijatej ponuky je TU tiež** — na jednom mieste, nech sa odkryl ktoroukoľvek z dvoch ciest |
| Neprihlásený | vysvetlenie, čo sa pri vypýtaní obhliadky stane |

### Hodnotenia

Viditeľné všetkým: priemer + jednotlivé recenzie s textom. Ak je obchod
uzavretý a databáza to dovolí (`can_rate`), tu sa dá aj hodnotiť.

---

## 4. ROZSAH HODNOTENÍ — rozhodnutie a dôvod

**Zobrazujú sa hodnotenia MAJITEĽA CELKOVO, naprieč všetkými jeho obchodmi.**
Súhlasím s tvojím odporúčaním, ale mám na to ešte jeden dôvod navyše, ktorý
je podľa mňa silnejší než ten tvoj:

Hodnotenie sa v databáze **zadáva per obchod** (`rating.property_id`) — to
ostáva. Ale **zobrazovať** ho per inzerát by znamenalo, že tam skoro vždy
bude **nula alebo jedno** hodnotenie: inzerát sa predá raz a potom zmizne
z katalógu. Vznikla by sekcia, ktorá vyzerá ako dôkaz dôveryhodnosti, ale
nič nedokazuje — a to je horšie než žiadna sekcia.

Zadáva sa teda per obchod, zobrazuje sa zosumarizované za človeka.

---

## KONTROLA PRED HOTOVO

### ✅ OVERENÉ RUNTIME

- [x] `npx tsc --noEmit` — exit 0.
- [x] **Appka sa zbalí.** `npx expo export --platform ios` prešiel:
      `entry-cdbfe9ea6977aff01a9f97910170ad90.hbc (5.1MB)`. Po štrukturálnej
      zmene to je to minimum — dokazuje, že sa to preloží a poskladá,
      **nedokazuje, že to na telefóne vyzerá dobre.**

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Toto všetko je vizuálne alebo závisí od role — dokázať to viem len ja
kódom, potvrdiť len ty na telefóne.

- [ ] **Poradie filtrov.** Katalóg → prvý riadok čipov musí byť
      **Obľúbené · Najnovšie · Čoskoro končí**. Odhlás sa (alebo pozri
      neprihlásený pohľad) — vtedy tam „Obľúbené" byť nesmie.
- [ ] **Tri taby existujú.** Otvor ktorýkoľvek inzerát → pod popisom
      **Ponuky | Obhliadka | Hodnotenia**, prepínanie funguje, nič sa
      nestratí.
- [ ] **Pohľad ZÁUJEMCU.** Cudzí inzerát: tab Ponuky ukáže „Podať ponuku"
      + verejný zoznam. Podaj ponuku, vráť sa → musí ukázať tvoju sumu, stav
      „Čaká", tlačidlá Upraviť a Stiahnuť. **Vyskúšaj Stiahnuť** a over, že
      ponuka zmizla zo zoznamu ako aktívna.
- [ ] **Pohľad MAJITEĽA.** Vlastný inzerát s aspoň jednou ponukou: tab Ponuky
      → ťukni na ponuku → panel s Prijať / Odmietnuť. **Prijmi** a over, že
      sa objaví odkrytý kontakt.
- [ ] **Kontakt na jednom mieste.** Po prijatí ponuky prepni na tab Obhliadka
      — musí tam byť karta „Kontakt z prijatej ponuky". Z druhého účtu
      (záujemca) to isté: tab Obhliadka musí ukázať kontakt na predávajúceho.
- [ ] **Obhliadka bez ponuky.** Iný účet, iný inzerát: tab Obhliadka →
      „Chcem obhliadku" → potvrdenie → kontakty odkryté u oboch.
- [ ] **Hodnotenia.** Tab Hodnotenia u človeka, ktorý už hodnotenia má —
      musí ukázať priemer aj texty. Pri uzavretom obchode musí byť aj
      možnosť hodnotiť.
- [ ] **Tlačidlo dole u majiteľa** hovorí „Upraviť inzerát" a vedie do
      editora.
- [ ] **Obrazovka „Ponuky na inzerát" stále funguje** — z „Moje" ťukni na
      zverejnený inzerát, alebo cez upozornenie o novej ponuke. Vyzerá
      a funguje rovnako ako predtým (má rovnaký kód).
- [ ] **Nič nespadlo.** Preklikaj všetky tri taby na: vlastnom inzeráte,
      cudzom inzeráte, uzavretom inzeráte (CLOSED) a odhlásený.

---

## ČO SA ZMENILO

| Súbor | Čo |
|---|---|
| `src/components/property-tabs.tsx` | **nový** — tri podtaby, obsah podľa role |
| `src/components/owner-offers.tsx` | **nový** — rozhodovanie majiteľa vybrané z obrazovky, aby bolo na oboch miestach to isté |
| `src/app/nehnutelnost/[id].tsx` | lineárne sekcie nahradené podtabmi; CTA majiteľa „Upraviť inzerát" |
| `src/app/ponuky/[id].tsx` | používa `OwnerOffers`; z 377 riadkov na 88 |
| `src/components/search-bar.tsx` | „Obľúbené" prvé, v riadku s triedením |
| `src/lib/changelog.ts` | §7 |
