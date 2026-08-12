# Seed dáta pre podtaby — hodnotenia, obhliadky, uzavreté obchody

**Dátum:** 12. 8. 2026
**Nadväzuje na:** `reports/SEED_FOTKY_A_OBJEM.md` (objem a fotky) a
`reports/PODTABY_A_FILTRE.md` (podtaby, kvôli ktorým to vzniklo)
**Nasadenie:** **BEZ ZMENY KÓDU** — obsah databázy. Netreba OTA ani build.

---

## PREČO

Detail inzerátu má od 12. 8. 2026 tri podtaby. Seed dáta mali:

| | pred | |
|---|---|---|
| hodnotenia | **0** | tab „Hodnotenia" bol prázdny na KAŽDOM inzeráte |
| obhliadky | **2** | tab „Obhliadka" tiež, až na dve výnimky |
| uzavreté obchody | **1** | hodnotiť sa bez nich nedá — `can_rate()` to v DB vyžaduje |
| stiahnuté ponuky | **0** | stav, ktorý tab ponúka, sa nedal vidieť |

Dva z troch nových tabov sa teda nedali overiť vôbec. To nie je stav, v ktorom
má zmysel žiadať ťa, aby si ich šiel otestovať.

---

## ČO PRIBUDLO

| | pred | **teraz** |
|---|---|---|
| inzeráty spolu | 60 | **60** (nezmenené) |
| — z toho ACTIVE | 59 | **49** |
| — z toho CLOSED | 1 | **11** |
| ponuky | 126 | **126** (nezmenené) |
| — čakajúce | 112 | **83** |
| — prijaté | 7 | **15** |
| — odmietnuté | 7 | **23** |
| — **stiahnuté** | 0 | **5** |
| **hodnotenia** | 0 | **18** |
| **obhliadky** | 2 | **38** |
| fotky | 183 | **183** |
| dopyty | 24 | **24** |

Uzavretých je 11 z 60, teda necelá pätina. Na skutočnom portáli je uzavretých
inzerátov menšina — väčšina beží ďalej.

### Hodnotenia

**18 hodnotení, 7 hodnotených ľudí** — teda každý seed vlastník aj ty. Vďaka
tomu má tab „Hodnotenia" čo ukázať na ktoromkoľvek inzeráte, a v hlavičke
detailu sa objaví aj priemer pri prezývke.

| kto | priemer | počet |
|---|---|---|
| Marek_PO | 4.50 | 6 |
| Martina_KE | 4.50 | 2 |
| Peter_Nitra | 4.50 | 2 |
| Zuzana_BA | 5.00 | 2 |
| Lucia_TT | 5.00 | 1 |
| Tomas_ZA | 3.50 | 2 |
| **Rastio** | **4.33** | **3** |

**Zámerne to nie sú samé päťky.** Portál, kde má každý 5.00, vyzerá ako
podvrh. Preto je tam aj trojka s vetou „odpovede chodili pomaly a dvakrát
som musel volať" a Tomas_ZA má 3.50.

**Zámerne nehodnotia vždy obe strany** — pri každom štvrtom obchode hodnotí
len jedna. Na skutočnom portáli je to bežné a keby hodnotili vždy obaja,
bolo by to na prvý pohľad umelé.

Texty sú konkrétne a rôzne dlhé („Sám upozornil na vlhkosť v pivnici, hoci
nemusel", „Prišiel na obhliadku načas, peniaze mal vybavené dopredu"), časť
hodnotení je **bez textu** — hviezdičky bez komentára sú realita.

### Obhliadky

38 obhliadok, rozloženie stavov je zámerne nerovnomerné:

| stav | počet | prečo toľko |
|---|---|---|
| CONTACT_SHARED | 20 | toto appka pri vypýtaní obhliadky reálne robí — je to najčastejší stav |
| COMPLETED | 11 | časť ľudí obhliadku aj označí za absolvovanú |
| REQUESTED | 5 | krátkodobý stav |
| CANCELLED | 2 | výnimka, nie bežný stav |

---

## ČO Z TOHO MÁŠ TY

| | |
|---|---|
| aktívne inzeráty | **4** |
| uzavretý inzerát | **1** |
| čakajúce ponuky na tvojich inzerátoch | **13** |
| obhliadky NA tvojich inzerátoch | **10** (pohľad vlastníka aj s kontaktmi) |
| obhliadky, kde žiadaš TY | **7** (pohľad záujemcu) |
| hodnotenia, ktoré si dostal | **3** (priemer 4.33) |
| **uzavreté obchody, kde si ešte NEhodnotil** | **2** |
| tvoje dopyty | **6** |

Tri veci, ktoré som nastavil zámerne:

1. **Na tvojich aktívnych inzerátoch nie je ani jedna prijatá ponuka.**
   Prijatie inzerát zamkne — a ty máš práve na nich skúšať prijímanie
   a odmietanie sám. Ostáva to tak ako doteraz.
2. **Máš dva uzavreté obchody, kde si ešte nehodnotil**, a jeden, kde už
   hodnotenie máš. Vieš teda vyskúšať aj zadanie nového, aj úpravu
   existujúceho.
3. **Si na oboch stranách** — pri jednom uzavretom obchode si vlastník, pri
   dvoch si víťazný záujemca. Tab „Hodnotenia" tak uvidíš z oboch pohľadov.

Jeden z tvojich inzerátov („4-izbový byt na prenájom, Bratislava") bol
uzavretý **už pred touto dávkou** — nie som to ja. Predošlý report tvrdí, že
máš 5 aktívnych; správne sú **4 aktívne + 1 uzavretý**. Nechal som to tak,
lebo práve vďaka tomu vidíš vlastnícku stranu hodnotenia.

---

## KONTROLA PRED HOTOVO

### ✅ OVERENÉ RUNTIME

Všetko dotazmi proti ostrej databáze, jedenásť pravidiel, **všetky 0
porušení**:

```
OK   inzerát s 2+ prijatými ponukami               0
OK   CLOSED bez víťaznej ponuky                    0
OK   hodnotenie mimo uzavretého obchodu            0
OK   hodnotenie od niekoho, kto nebol stranou      0
OK   hodnotený nie je druhá strana obchodu         0
OK   hodnotenie sám seba                           0
OK   Rastiov ACTIVE inzerát s prijatou ponukou     0
OK   obhliadka na vlastnom inzeráte                0
OK   ACTIVE inzerát, čo by neprešiel DB guardom    0
OK   inzerát bez fotky                             0
OK   view_count nižší než počet ponúk              0
```

Štvrté a piate pravidlo sú tie podstatné: hodnotiť smú **výhradne dve strany
uzavretého obchodu**, presne ako to dovolí `can_rate()` v databáze. Keby seed
vyrobil hodnotenie, ktoré by appka nikdy vytvoriť nevedela, testoval by si
niečo, čo neexistuje.

Posledné pravidlo je nové a stálo za to: overuje, že **žiaden ACTIVE seed
inzerát neporušuje rozšírený `guard_property_publish()`** z dnešnej rannej
dávky. Keby porušoval, prvá úprava takého inzerátu by spadla.

### 🔴 Čo sa pri behu pokazilo a ako to skončilo

Skript uzavrel obchod na dvoch inzerátoch, ktoré **už jednu prijatú ponuku
mali** — víťaza som hľadal len medzi čakajúcimi. Vznikli tak dva inzeráty
s dvoma prijatými ponukami, čo je stav, ktorý appka nikdy nevyrobí. Kontrola
na konci skriptu to **chytila a beh označila za neúspešný** — presne na to
tam je. Opravené: neviťazná prijatá ponuka je odmietnutá, prekontrolované,
**0**.

### 🟡 ČAKÁ VIZUÁLNE OVERENIE

Dotaz dokazuje riadok v databáze, nie že sa zobrazí na obrazovke.

- [ ] **Tab Hodnotenia** na ľubovoľnom cudzom inzeráte — priemer aj texty.
- [ ] **Tvoja povesť.** Otvor cudzí inzerát; pri prezývke vlastníka musí byť
      hviezdičkový priemer.
- [ ] **Dať hodnotenie.** Otvor „Obchodný priestor na predaj, Žilina" alebo
      „Obchodný priestor na prenájom, Nitra" (obe uzavreté, obe si vyhral) →
      tab Hodnotenia → musí ísť hodnotenie **zadať**.
- [ ] **Upraviť hodnotenie.** „4-izbový byt na prenájom, Bratislava" — tam už
      hodnotenie máš, musí sa dať zmeniť.
- [ ] **Tab Obhliadka, pohľad vlastníka.** Ktorýkoľvek z tvojich 4 aktívnych
      inzerátov → zoznam žiadostí aj s menom a telefónom žiadateľa.
- [ ] **Tab Obhliadka, pohľad záujemcu.** Cudzí inzerát, kde už žiadaš (7 ich
      je) → stav žiadosti + odkrytý kontakt vlastníka.
- [ ] **Stiahnutá ponuka** sa v zozname ponúk zobrazuje ako stiahnutá, nie
      ako aktívna.
- [ ] **Uzavretý inzerát** v katalógu nie je (49 ACTIVE, nie 60), ale otvoriť
      sa cez „Moje" dá a má odznak.

---

## AKO SA TO ZMAŽE

Nič nového — všetko visí na `is_seed` inzerátoch a mizne s nimi:

```sql
delete from offerra.property where is_seed;   -- vezme so sebou fotky,
                                              -- ponuky, obhliadky aj hodnotenia
delete from offerra.profile  where is_seed;   -- seed používateľov
```

Hodnotenia ani obhliadky **nemajú vlastný `is_seed`** a nepotrebujú ho —
majú cudzí kľúč na `property` s `on delete cascade`.

**Skript je `seed_taby.py` v pracovnom priečinku, ZÁMERNE mimo repozitára** —
Offerra je verejná (CLAUDE.md §4) a skript siaha na databázu servisným
prístupom.

**V changelogu pre používateľa toto nie je** — rovnaký dôvod ako minule:
changelog je o tom, čo appka vie, nie o testovacích dátach.
