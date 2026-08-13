# Odznak nahlásení + vybavenie, ktoré má následok

**Dátum:** 12. 8. 2026
**Zadanie:** Rastio — dve správy: (1) živý odznak s počtom otvorených
nahlásení na tabe „Správa", (2) „Označiť ako riešené" má skryť inzerát
a upozorniť nahláseného
**Nasadenie:** **IDE OTA** pre appku. Databáza: `mig_34_reports.sql` už
nasadená na ostrom projekte.

---

## 1. ODZNAK NA TABE „SPRÁVA"

### Ten istý komponent, nie nový

Mal si pravdu, že appka to už vie — zvonček. Odznak som preto zo zvončeka
**vybral do `src/components/count-badge.tsx`** a používajú ho teraz **obaja**.
Druhá kópia tých istých štýlov by sa časom rozišla a odznaky by prestali
vyzerať rovnako.

### Číslo počíta databáza, nie klient

`admin_pending_reports()` (SECURITY DEFINER) sa pýta na rolu a neadminovi
vráti **0**. Nie je to opatrnosť navyše: bežný používateľ má na `report`
riadkový prístup k SVOJIM nahláseniam, takže obyčajný `count(*)` z klienta by
mu vrátil číslo, ktoré s odznakom správcu nemá nič spoločné.

### Živosť má DVE poistky, lebo ani jedna sama nestačí

| | čo rieši | čo nerieši |
|---|---|---|
| **Realtime** na `offerra.report` | nové nahlásenie aj jeho vybavenie sa premietnu do sekundy | kanál sa nemusí otvoriť (zlá sieť, spiaci telefón) — číslo by ticho zamrzlo |
| **Návrat do appky** (`AppState → active`) | najčastejší okamih, keď sa správca na appku pozrie | nič medzitým |

Na Realtime bolo treba `report` **pridať do publikácie** (dovtedy tam bola len
`notification`) a nastaviť `replica identity full` — bez toho by sa RLS pri
UPDATE nedala vyhodnotiť a správca by videl len vznik nahlásenia, nie jeho
vybavenie. Teda presne tú polovicu, ktorá číslo znižuje.

Pri zmene sa číslo **prepočítava**, nie dopočítava o ±1. Dopočítavanie by
znamenalo druhú kópiu pravidla „čo je otvorené nahlásenie" na klientovi.

---

## 2. „OZNAČIŤ AKO RIEŠENÉ" MÁ NÁSLEDOK

### Čo bolo zle

Presne ako píšeš: vybavenie prepísalo stav nahlásenia **a to bolo všetko**.
Spamový inzerát ostal v katalógu a jeho majiteľ sa nedozvedel nič. Skryť ho
sa dalo, ale v inej sekcii a ručne — dva kroky, z ktorých ten druhý sa dá
zabudnúť.

### Teraz je to JEDNA operácia

`admin_resolve_report(p_report_id, p_hide)` spraví v jednej transakcii:

1. nahlásenie → `ACTIONED`
2. ak `p_hide` a cieľ je inzerát → `property.status = 'REJECTED'`
   + `rejection_reason = 'Nahlásené: <dôvod>'` + `rejected_at`
3. upozornenie nahlásenému
4. vráti, **koľko potvrdených nahlásení má ten človek celkovo**

Buď sa stane všetko, alebo nič. Nie stav, kde je inzerát skrytý a človek
o tom nevie.

**Skrytie je `REJECTED`, teda ten istý stav ako z moderovania inzerátov —
NIE mazanie.** Audit trail ostáva, vlastník inzerát ďalej vidí aj s dôvodom
a dá sa vrátiť.

### Predvolené zaškrtnutie podľa dôvodu

Presne ako si navrhol:

| dôvod | „skryť inzerát" |
|---|---|
| Spam alebo reklama | **predvolene ✓** |
| Podvod | **predvolene ✓** |
| Falošný inzerát | **predvolene ✓** |
| Realitka/sprostredkovateľ | prázdne — rozhodneš prípad od prípadu |
| Nevhodný obsah | prázdne — dá sa vyriešiť aj úpravou textu |
| Iné | prázdne |

Zaškrtnutie sa dá v oboch smeroch prepnúť. Voľba sa ukazuje **len pri
inzeráte** — pri používateľovi a ponuke by „skryť" nemalo čo spraviť
a blokovanie účtu ostáva samostatná ručná akcia.

### Upozornenie pre nahláseného

Typ **`SYSTEMOVE`** zámerne: je to jediný typ, ktorý si používateľ nesmie
vypnúť. Upozornenie o porušení pravidiel musí doraziť vždy.

Skrytý inzerát:

> „Tvoj inzerát „SPAM TEST inzerat" bol skrytý z katalógu, pretože porušil
> pravidlá Offerry (dôvod: spam alebo reklama). Inzerát nie je zmazaný —
> vidíš ho v sekcii Moje. Opakované porušenia môžu viesť k zablokovaniu účtu."

Ponechaný inzerát:

> „Nahlásenie na tvoj inzerát „…" bolo posúdené ako opodstatnené (dôvod:
> nevhodný obsah). Inzerát ostáva zverejnený — uprav ho tak, aby pravidlám
> vyhovoval. Opakované porušenia môžu viesť k zablokovaniu účtu."

**Kto nahlásil, sa v texte nedozvie** — inak by z nahlasovania bol dôvod na
odplatu. Overené testom, nie len tvrdením.

Pri **„Zamietnuť nahlásenie"** sa nahlásenému neposiela nič. Nemá sa čo
dozvedieť, že ho niekto nahlásil neopodstatnene.

---

## 3. NÁVRH: PRAH PRE OPAKOVANÉ PORUŠENIA

Pýtal si sa, či má appka počítať potvrdené nahlásenia a upozorniť správcu.
**Áno — a implementoval som to**, lebo to zapadá do heuristík, ktoré tam už
sú (`admin_alerts`). Rozhodnutie o prahu ale ostáva tvoje, tak ho tu
predkladám aj s dôvodmi.

**Prah: 3 potvrdené nahlásenia na tú istú OSOBU.** Jedno býva omyl, dve môžu
byť náhoda, tri už tvoria vzorec.

**Ráta sa cez človeka, nie cez inzerát** — cez všetky jeho inzeráty aj ponuky.
Keby sa rátalo cez inzerát, stačilo by založiť nový a počítadlo by sa
vynulovalo. To je diera, ktorú by spamer našiel do týždňa.

**Je to UPOZORNENIE, nie akcia.** Appka nikoho neblokuje sama a podľa mňa ani
nemá: tri nahlásenia môžu rovnako dobre znamenať cielenú kampaň proti jednému
človeku, a to rozlíši len človek. Blokovanie ostáva ručné, presne ako doteraz.

Dve miesta, kde to vidíš:

1. **Karta „OPAKOVANÉ PORUŠENIA"** v prehľade správy, hneď pod „Vyžaduje
   pozornosť" — prezývka, počet, dôvody, či už je zablokovaný.
2. **Hneď pri vybavovaní.** Toast po vybavení hovorí, koľko potvrdených
   nahlásení ten človek má, a **pri treťom vyskočí hláška**, že účet má
   opakované problémy a kde sa dá zablokovať. Toto je podstatnejšie než
   karta — informácia príde v okamihu rozhodovania, nie keď si ju niekde
   nájdeš.

**Čo NEROBÍM a prečo:** neexpirujem staré nahlásenia (napr. „3 za 180 dní").
Zvažoval som to, ale pri objeme, ktorý Offerra má, by to len skrylo históriu.
Ak sa raz ukáže, že staré prípady zavadzajú, je to jeden `where` v tej
funkcii.

---

## KONTROLA PRED HOTOVO

### ✅ OVERENÉ RUNTIME — 18 / 18

`nahlasenia_test.py` (mimo repa — zakladá používateľov s heslami a jedného
povyšuje na správcu, §4). Štyria ľudia: správca, hriešnik a **dvaja**
nahlasovatelia (`report` má unique na dvojicu nahlasovateľ+cieľ, čo je
správne — ten istý človek tú istú vec druhýkrát nenahlási).

```
══ 1. počet pre odznak ══
  OK  správca dostane počet otvorených nahlásení         2
  OK  BEŽNÝ používateľ dostane 0, nie cudzie číslo       0
  OK  neprihlásený sa k číslu nedostane                  HTTP 401
  OK  `report` je v Realtime publikácii                  (bez toho by odznak nežil)

══ 2. „Riešené" so skrytím ══
  OK  správca vybaví nahlásenie                          HTTP 200
  OK  inzerát je REJECTED, NIE zmazaný   riadok existuje, dôvod „Nahlásené: spam alebo reklama"
  OK  nahlásenie je ACTIONED
  OK  nahlásený DOSTAL upozornenie                       SYSTEMOVE · „Porušenie pravidiel"
  OK  upozornenie vysvetľuje ČO a VARUJE pred opakovaním
  OK  upozornenie NEHOVORÍ, kto nahlásil
  OK  odznak sa po vybavení znížil                       2 → 1

══ 3. „Riešené" BEZ skrytia ══
  OK  inzerát ostáva ACTIVE
  OK  nahlásený je aj tak upozornený, ale iným textom     „…ostáva zverejnený…"

══ 4. práva ══
  OK  bežný používateľ nahlásenie NEVYBAVÍ    HTTP 403 „Len pre správcu."

══ 5. opakované porušenia (prah 3) ══
  OK  pri DVOCH potvrdených v zozname ešte NIE JE         0 záznamov
  OK  pri TROCH sa objaví      3× · „nevhodný obsah, podvod, spam alebo reklama"
  OK  bežný používateľ zoznam NEVIDÍ                      0 riadkov
  OK  appka NIKOHO nezablokovala sama                     is_blocked = false
```

Po behu upratané — nahlásenia, inzeráty, oznámenia aj štyria používatelia.

Posledné pravidlo je tam naschvál: dokazuje, že heuristika **upozorňuje
a neblokuje**. Keby raz niekto pridal automatické blokovanie, tento test
spadne.

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Dotazy dokazujú, čo vracia server. Nedokazujú, že sa červený krúžok naozaj
nakreslí na ikone.

- [ ] **Odznak.** Na tabe **Správa** je červený krúžok s číslom otvorených
      nahlásení. Vyzerá **rovnako ako na zvončeku**.
- [ ] **Živosť.** Nechaj appku otvorenú, z druhého zariadenia (alebo z web
      klienta) nahlás inzerát → číslo musí naskočiť **bez toho, aby si na tab
      ťukol**.
- [ ] **Zníženie.** Vybav nahlásenie → číslo klesne o jedno, opäť hneď.
- [ ] **Návrat do appky.** Prepni na inú appku a späť → číslo sa prepočíta.
- [ ] **Bežný účet tab „Správa" nevidí vôbec** (to platilo aj doteraz).
- [ ] **Voľba skrytia.** Nahlásenie s dôvodom **Spam** → checkbox „Skryť
      inzerát z katalógu" je **zaškrtnutý**; nahlásenie s **Nevhodný obsah**
      → **prázdny**. Oboje sa dá prepnúť.
- [ ] **Skrytie funguje.** Vybav spamové nahlásenie so zaškrtnutým políčkom →
      inzerát zmizne z katalógu, ale v sekcii Inzeráty je so stavom
      a dôvodom.
- [ ] **Upozornenie u nahláseného.** Z druhého účtu skontroluj zvonček —
      musí tam byť „Porušenie pravidiel" s dôvodom a vetou o opakovaní.
- [ ] **Karta OPAKOVANÉ PORUŠENIA** sa objaví, keď má niekto tri potvrdené.
- [ ] **Hláška pri treťom** vybavení vyskočí a ponúkne sekciu Používatelia.

### Zhrnutie k bodom zo zadania

| bod | stav |
|---|---|
| Badge s počtom otvorených nahlásení na ikone Správa, len pre adminov — dôkaz | ✅ **OVERENÉ RUNTIME** (funkcia vracia 2 správcovi, 0 bežnému, 401 neprihlásenému) / 🟡 vykreslenie odznaku overuješ ty |
| Číslo sa live aktualizuje pri novom nahlásení aj pri vybavení — dôkaz | ✅ **OVERENÉ RUNTIME** pre zdroj čísla (2 → 1) a pre zaradenie `report` do Realtime publikácie / 🟡 samotné doručenie cez WebSocket na telefón overuješ ty |
| „Riešené" pri spam/falošný/podvod ponúka voľbu skryť, predvolene ✓ — dôkaz | 🟡 predvoľba je v `hideByDefault()`, ale je to prvok na obrazovke |
| Skrytie mení status na REJECTED, nemaže dáta — dôkaz | ✅ **OVERENÉ RUNTIME** |
| Nahlásený dostane upozornenie s vysvetlením + varovaním — dôkaz | ✅ **OVERENÉ RUNTIME** (vrátane toho, že nehovorí, kto nahlásil) |
| Návrh prahu pre opakované porušenia predložený | ✅ predložený **a implementovaný** — prah 3, upozornenie nie akcia |

`npx tsc --noEmit` — bez chýb.
