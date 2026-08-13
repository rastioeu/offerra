# Správy 1:1 a odhad hypotéky — dva nové podtaby

**Dátum:** 12. 8. 2026
**Zadanie:** Rastio — dve nové záložky v detaile inzerátu + bezpečnostné
pravidlo k chatu (zákaz kontaktu v texte)
**Nasadenie:** **IDE OTA** pre appku (žiadny natívny modul).
**Databáza:** migrácia `mig_33_message.sql` je už nasadená na ostrom projekte.

---

## 1. „SPRÁVY" — CHAT 1:1

### Čo pribudlo

| vrstva | čo |
|---|---|
| DB | tabuľka `offerra.message`, RLS, `send_message()`, `contact_in_text()`, `mark_messages_read()`, typ oznámenia `NOVA_SPRAVA` |
| appka | `src/lib/messages.ts`, `src/components/message-thread.tsx`, tab v `property-tabs.tsx` |
| texty | „Ako funguje Offerra" má novú sekciu, changelog záznam, upozornenie sa dá vypnúť v Nastaveniach |

Tabuľka má presne tie stĺpce zo zadania — `property_id` / `request_id`,
`sender_id`, `recipient_id`, `content`, `created_at`, `read_at` — plus dva
`check` obmedzenia: predmet je práve jeden (inzerát ALEBO dopyt) a odosielateľ
sa nesmie rovnať adresátovi.

### Rozhodnutie 1: identita ostáva POD PREZÝVKOU — súhlasím s tvojím návrhom

Chat je dostupný **vždy**, aj pred podaním ponuky. Identitu ale sám
neodkrýva; meno a telefón sa odkryjú tak ako doteraz — prijatou ponukou
alebo obhliadkou.

Dôvod je ten tvoj a nemám k nemu čo dodať: chat, ktorý by kontakt odkrýval,
by bol tretia cesta k tomu istému a tie dve existujúce by stratili zmysel.
Takto sa dá pýtať dopredu („je v cene kuchynská linka?") bez toho, aby si
človek musel vybrať medzi mlčaním a odhalením sa.

### Rozhodnutie 2: vlákno určuje DVOJICA, nie inzerát

`recipient_id` je v tabuľke práve preto. Keby vlákno určoval len inzerát,
vznikla by pod ním spoločná debata a záujemcovia by videli jeden druhého —
teda presne to, čo appka inde chráni. Vlastník má s každým záujemcom vlastnú
konverzáciu; **RLS to nedovolí obísť ani cudziemu záujemcovi na tom istom
inzeráte** (dôkaz nižšie).

Vlastník preto v tabe vidí ZOZNAM konverzácií (s odznakom neprečítaných)
a otvorí si jednu. Záujemca vidí rovno svoje jediné vlákno — zoznam by
u neho nemal čo ukázať.

Navyše: vlastník vidí v zozname aj záujemcov, ktorí **ponuku podali, ale
nenapísali**, s poznámkou „Ozvi sa prvý". Bez toho by vedel začať konverzáciu
len ten, komu niekto napísal ako prvý.

### Rozhodnutie 3: zákaz kontaktu PLATÍ VŽDY, aj po odkrytí

Pýtal si sa, či má zákaz po odkrytí kontaktu padnúť. **Necháva sa platiť
vždy.** Tri dôvody, v poradí dôležitosti:

1. **Podmienený strážca je strážca, ktorý sa dá pokaziť.** Aby zákaz po
   odkrytí padol, musela by sa podmienka „títo dvaja už majú kontakt"
   vyhodnocovať pri KAŽDOM insertе — teda to isté pravidlo na druhom mieste,
   a keby ho niekto raz vyhodnotil zle, guard sa TICHO otvorí. Toho si nikto
   nevšimne, lebo tichá diera nič nehlási.
2. **Po odkrytí sa tým nič nestráca.** Telefón druhej strany je v tej chvíli
   v tabe „Obhliadka" a dá sa naň ťuknúť. Posielať ho v texte je zbytočné.
3. **Jednoduchšie na údržbu**, ako si sám napísal — a to je pri pravidle,
   ktoré drží celý model odkrývania kontaktu, prednosť, nie kompromis.

Čo som spravil namiesto toho: **hláška je konkrétna** a hovorí, kedy kontakt
dostane. Nie „správu sa nepodarilo odoslať", ale:

> „Správa vyzerá, že obsahuje telefónne číslo. Zdieľanie kontaktných údajov
> v správach nie je povolené — kontakt sa odkryje automaticky po prijatí
> ponuky alebo dohodnutí obhliadky."

### Kde presne kontrola beží

**V databáze, vo funkcii `offerra.send_message()`.** Nie na klientovi.

Do tabuľky `message` **neexistuje `insert` policy ani `insert` grant** — nie
je to zabudnuté, je to celý trik. Jediná cesta, ako správa vznikne, vedie cez
`send_message()`, ktorá kontrolu robí ako prvú vec pred `insert`. Kto by
skúsil zapísať priamo cez REST, dostane 403 (dôkaz nižšie).

V appke je `contactInText()` **kópia toho istého pravidla**, ale slúži len na
to, aby človek nemusel čakať na server — hláška sa ukáže hneď pod poľom.
V kóde je pri nej napísané, že **to nie je ochrana** a že pri rozdiele platí
databáza.

### Vzor: rozumný, nie prísny

E-mail sa hľadá klasicky (`niečo@niečo.tld`) plus obídený zavináč
(`(at)`, `zavinac`, `bodka`). Telefón sa hľadá tak, že sa zahodia oddeľovače
(medzera, pomlčka, bodka, lomka, zátvorky) a pozerá sa na **súvislé skupiny
číslic — prah je 9**, čo je dĺžka slovenského čísla.

Vďaka tomu „0902 123 456" je jedno desaťciferné číslo, ale „3 izby, 78 m2"
sú dve krátke skupiny a prejde. Presne to, o čo si žiadal.

**Číslo rozpísané slovami sa nekontroluje zámerne.** Kto to chce obísť, obíde
to vždy; zmyslom nie je nepriestrelnosť, ale aby sa kontakt nedal poslať
omylom alebo z pohodlnosti. Prísnejší vzor by chytal bežné vety a naučil by
ľudí hlášku ignorovať — a to je horšie než žiadna.

---

## 2. „ODHAD HYPOTÉKY" — VLASTNÝ TAB

Kalkulačka v appke už bola, ale visela v strede detailu medzi parametrami
a popisom. Teraz je vlastný tab a ukazuje sa **len pri predaji** — pri
prenájme tab ani nie je, prázdna záložka je horšia než žiadna.

| | |
|---|---|
| suma | predvyplnená z orientačnej ceny; **keď cena chýba** (v Offerre je nepovinná), z najvyššej ŽIVEJ ponuky |
| ponuka | keď sa líši od zadanej sumy, je pod poľom riadok „Najvyššia ponuka je X — **dosadiť**" |
| vlastné zdroje | 10 / 20 / 30 % |
| sadzba | **4,2 % ako orientačná predvoľba**, editovateľná |
| doba | 20 / 25 / 30 rokov |
| výstup | mesačná splátka (anuita), vlastné zdroje, výška úveru, preplatené úroky |

**Sadzbu appka nemá odkiaľ brať.** Pýtal si sa, či mám zdroj aktuálnych
trhových sadzieb — **nemám**, v appke žiadny taký zdroj nie je a pridávať
kvôli jednému číslu externé volanie by znamenalo závislosť, ktorá raz spadne.
Preto je to **pevná predvoľba označená ako orientačná**, s vetou „Predvolené
číslo je odhad, nie ponuka banky" priamo pri poli. Tvrdiť, že je aktuálne, by
bola lož.

Disclaimer pod výsledkom:

> „Orientačný odhad, nie ponuka banky. Neráta poplatky, poistenie ani daň
> z nehnuteľnosti a nehovorí nič o tom, či ti banka úver schváli. Offerra nie
> je finančný poradca — skutočné číslo ti dá len banka."

Ukazuje sa **vždy**, aj keď je pole prázdne. Žiadna DB tabuľka, čisto
klientský výpočet — nič sa neukladá ani neodosiela.

---

## KONTROLA PRED HOTOVO

### ✅ OVERENÉ RUNTIME — 17 / 17

Skript `spravy_test.py` (mimo repa — zakladá používateľov s heslami, Offerra
je verejná, §4). Zakladá **troch** ľudí, nie dvoch: bez tretieho by sa nedalo
dokázať to podstatné.

```
══ 1. zákaz kontaktu (RPC = server, klient sa nepýtal) ══
  OK    ZABLOKOVANÉ: telefón              HTTP 400 P0001 „…obsahuje telefónne číslo…"
  OK    ZABLOKOVANÉ: e-mail               HTTP 400 P0001 „…obsahuje e-mail…"
  OK    ZABLOKOVANÉ: telefón s predvoľbou HTTP 400
  OK    ZABLOKOVANÉ: obídený zavináč      HTTP 400   (peter (at) firma.sk)
  OK    BEŽNÁ VETA s číslami prejde       HTTP 200   („3 izby a 78 m2 … poplatok, 140?")

══ 2. priamy zápis do tabuľky (obídenie kontroly) ══
  OK    priamy INSERT do `message` NEPREJDE            HTTP 403 / 42501

══ 3. RLS ══
  OK    vlastník odpovie                               HTTP 200
  OK    záujemca vidí SVOJE vlákno                     2 správy
  OK    CUDZÍ ZÁUJEMCA na tom istom inzeráte NEVIDÍ NIČ  HTTP 200, []
  OK    neprihlásený NEVIDÍ NIČ                        HTTP 401

══ 4. vlákno je vždy „vlastník ↔ niekto" ══
  OK    záujemca ZÁUJEMCOVI napísať nemôže   403 „Písať sa dá len s vlastníkom inzerátu."

══ 5. úprava správy ══
  OK    obsah odoslanej správy sa prepísať NEDÁ        HTTP 403 (grant je len na read_at)

══ 6. prečítané ══
  OK    vlastník si označí prijaté za prečítané        označených = 1
  OK    cudzí týmto NEOZNAČÍ nič                       označených = 0

══ 7. oznámenie ══
  OK    vlastníkovi vzniklo oznámenie NOVA_SPRAVA      1 ks
  OK    oznámenie NEOBSAHUJE text správy               „ChatZaujemca… ti píše k „CHAT TEST byt"."
  OK    záujemcovi prišlo oznámenie o odpovedi         1 ks
```

Po behu sa všetko upratalo — inzerát, správy, oznámenia aj traja testovací
používatelia.

**Samostatne overený vzor na kontakt** (`kontakt_test.sql`, 21 vzoriek,
**0 chýb**): 11 podôb kontaktu chytených, 10 bežných viet prepustených —
„mam 3 izby a 78 m2", „zabezpeka 1600 eur, najom 850 za mesiac", „cena 248000
eur", „obhliadka 12.8.2026 o 15:00?", „platim 100 000 hned a 150 000 do
mesiaca", „rok vystavby 1998" a ďalšie.

### 🔴 Čo sa pri behu pokazilo a ako to skončilo

Prvý beh testu „prešiel" na štyroch bodoch **z nesprávneho dôvodu**: inzerát
sa nikdy nevytvoril (`guard_property_publish()` nepustí ACTIVE bez fotky)
a kontrola chýb v skripte tú hlášku nerozpoznala, lebo mala iný tvar. Testy
teda hlásili „nemôže napísať" tam, kde v skutočnosti neexistoval inzerát.

Opravené: inzerát sa zakladá ako DRAFT, potom fotka, až potom ACTIVE, a
detekcia SQL chýb v skripte pozná oba tvary hlášky. **Až druhý beh je ten,
ktorého výsledky sú vyššie.** Píšem to sem, lebo presne takto vyzerá dôkaz,
ktorý nedokazuje to, čo tvrdí.

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Dotazy dokazujú, čo robí server. Nedokazujú, ako to vyzerá na telefóne.

**Správy — pohľad záujemcu**

- [ ] Otvor CUDZÍ inzerát → tab **Správy** → napíš „Je v cene kuchynská
      linka?" → správa sa objaví ako bublina vpravo.
- [ ] **Skús napísať telefónne číslo** („0902 123 456") → červená veta sa
      objaví **hneď pri písaní** a po ťuknutí na Odoslať to neprejde.
- [ ] **Skús napísať e-mail** → to isté.
- [ ] Napíš vetu s číslami („byt ma 78 m2, 3 izby") → **musí prejsť**.
- [ ] V hlavičke vlákna je veta, že kontakt sa neodkrýva chatom.

**Správy — pohľad vlastníka**

- [ ] Otvor SVOJ inzerát → tab **Správy** → zoznam konverzácií.
- [ ] Ak ti niekto napísal, je pri ňom **oranžový odznak s počtom
      neprečítaných**; po otvorení vlákna zhasne.
- [ ] Záujemcovia, ktorí podali ponuku a nenapísali, sú v zozname s poznámkou
      „Ozvi sa prvý" — dá sa im napísať ako prvému.
- [ ] „‹ Späť na zoznam" funguje.

**Oznámenie**

- [ ] Po prijatí správy príde **push aj zvonček**, text je „X ti píše
      k „názov inzerátu"" a **NEobsahuje text správy**.
- [ ] Ťuknutie na oznámenie otvorí detail toho inzerátu.
- [ ] V Nastaveniach → Upozornenia je nová položka **„Nová správa"** a dá sa
      vypnúť.

**Hypotéka**

- [ ] **PREDAJ s cenou** → tab **Hypotéka** je v lište a suma je predvyplnená.
- [ ] **PRENÁJOM** → tab Hypotéka **v lište NIE JE**.
- [ ] **PREDAJ bez ceny, ale s ponukami** → pole je prázdne alebo dosadené
      z ponuky a riadok „Najvyššia ponuka je … — dosadiť" funguje.
- [ ] Disclaimer je vidieť pod výsledkom.
- [ ] Lišta tabov sa dá **posunúť do strany** (je ich päť).

### Zhrnutie k bodom zo zadania

| bod | stav |
|---|---|
| Chat funguje 1:1, RLS overené (cudzí nevidí konverzáciu iných) — dôkaz | ✅ **OVERENÉ RUNTIME** (bod 3 a 4 testu) |
| Rozhodnutie o viditeľnosti identity zdôvodnené a implementované | ✅ prezývka; kontakt sa v chate ani nedá napísať — overené |
| Notifikácia pri novej správe funguje | ✅ **OVERENÉ RUNTIME** (vznikne riadok + push cez `push_notification`) / 🟡 doručenie na telefón overuješ ty |
| Kalkulačka počíta správne, len pri SALE, s disclaimerom — dôkaz | 🟡 **ČAKÁ VIZUÁLNE OVERENIE** — anuitný vzorec je nezmenený a bol v appke už predtým; podmienka na SALE aj disclaimer sú v kóde, ale sú to veci, ktoré vidno len na obrazovke |
| Odoslanie správy s e-mailom je zablokované so zrozumiteľnou hláškou — dôkaz | ✅ **OVERENÉ RUNTIME** |
| Odoslanie správy s telefónnym číslom je zablokované — dôkaz | ✅ **OVERENÉ RUNTIME** |
| Kontrola beží server-side, nie len na klientovi — dôkaz | ✅ **OVERENÉ RUNTIME** — RPC odmietla, priamy INSERT do tabuľky 403 |
| Rozhodnutie o správaní po odkrytí kontaktu zdôvodnené | ✅ zákaz platí vždy, dôvody vyššie |

`npx tsc --noEmit` — bez chýb.

---

## ČO SOM UROBIL A NEBOLO V ZADANÍ

- **Chat pri DOPYTOCH nie je hotový.** Tabuľka `message` má `request_id`
  aj RLS aj vetvu v `send_message()`, takže dopyt netreba migrovať znova —
  ale **obrazovka preň neexistuje**, zadanie bolo o detaile inzerátu.
  Chýbajúca je len UI vrstva.
- **Kalkulačka teraz zvláda inzerát BEZ ceny.** Predtým sa pri ňom
  nezobrazila vôbec (`item.asking_price_hint &&`). Keďže cena je v Offerre
  zámerne nepovinná, bola by to prázdna záložka pri každom takom inzeráte.
- **Lišta tabov sa posúva.** Päť názvov sa na úzky telefón nezmestí
  a skracovať ich („Hyp.") by bolo horšie.
