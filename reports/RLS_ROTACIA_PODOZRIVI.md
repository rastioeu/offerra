# RLS chyba pri obhliadke · rotujúca titulná fotka · Podozriví používatelia

13.8.2026. Tri samostatné požiadavky z jedného zadania. Podrobnosti a čísla
statusov podľa CLAUDE.md §1 sú v `OFFERRA_REGISTER.md` Fáza 22 — tento
report je zhrnutie pre kontext, register je záznam s dôkazmi.

---

## 1. „new row violates row-level security policy for table viewing"

**Hypotéza, ktorú Rastio uviedol** (inzerát bol nahlásený, status sa
zmenil, appka mala zastarané dáta): **potvrdená ako príčina.**

**Čo sa NEPOTVRDILO**: že by RLS bola nesprávne nastavená. Naopak —
overil som naživo (`moderacia_test.py`, 8/8), že `property_select_public`
(pravidlo z 8.8.2026, odvtedy nezmenené) už dávno správne skrýva REJECTED
aj CLOSED inzeráty pred cudzími. Toto je dôležité povedať nahlas: požiadal
si o opravu RLS, ale RLS opravu nepotrebovala — potrebovala ju appka,
ktorá si stav inzerátu nikdy neobnovila.

### Čo som zmenil

1. **`useProperty()`** dostal Realtime kanál na svoj vlastný riadok — keď
   sa stav inzerátu zmení (napr. admin ho skryje), appka sa o tom dozvie
   živo, nie až pri ďalšom otvorení obrazovky. Rovnaký princíp ako
   odznak nahlásení (`usePendingReports`).
2. **`nehnutelnost/[id].tsx`** dostal `useRefreshOnFocus(reloadProperty)`
   — druhá poistka pre prípad, že kanál sa neotvorí (zlá sieť). Doteraz
   to mali len ponuky, nie samotný inzerát.
3. **`closed`** (rozhoduje, či sa dajú robiť nové akcie) teraz číta aj
   `item.status`, nielen uzávierku ponúk — bez toho mohol záujemca vidieť
   aktívne tlačidlo „Chcem obhliadku" aj na inzeráte, ktorý bol uzavretý
   PRED uzávierkou (majiteľ prijal ponuku skôr, než prišiel termín).
4. **Chybová hláška**: `ViewingCard.ask()` teraz rozlíši kód `42501` a
   ukáže LEN „Tento inzerát už nie je dostupný" — nie súčasne s
   technickou hláškou, ako si nahlásil. Surová chyba sa aj tak nikdy
   nestráca (§2 appky) — ide do konzolového logu, len sa neukazuje
   používateľovi naraz s tou zrozumiteľnou vetou.

### Čo som len OVERIL, nie zmenil

Vlastník REJECTED inzerátu vidí dôvod skrytia BEZ toho, kto ho nahlásil —
toto appka vedela už od Fázy 17 (`rejection_reason` v `inzerat/[id].tsx`).
Test to potvrdil naživo (`moderacia_test.py`, bod 4): vlastník dostane
`rejection_reason: "Nahlásené: Spam alebo reklama"`, nikde sa neprenáša
identita nahlasovateľa.

**Dôkaz**: `moderacia_test.py`, 8/8 — vrátane priameho overenia, že pokus
o vklad do `viewing` na REJECTED inzerát vráti presne kód `42501` (kód, na
ktorý sa spolieha oprava v `ask()`).

🟡 **Čo Rastio otestuje**: bežné používanie appky (otváranie detailov,
žiadosti o obhliadku) — sledovať, či sa niekde neobjaví technická hláška
namiesto „Tento inzerát už nie je dostupný". Scenár „nahlásenie prišlo,
kým mal obrazovku otvorenú" sa nedá vyrobiť naživo bez čakania na reálne
nahlásenie, takže Realtime časť je 🟡 aj po tomto reporte.

---

## 2. Rotujúca titulná fotka

Nová čistá funkcia `src/lib/cover-photo.ts` — `coverPhotoIndex(id, count)`.
Náhodné číslo (`SESSION_SEED`) sa vygeneruje raz, keď appka načíta modul —
teda raz za spustenie appky (cold start). Rovnaký inzerát má počas
JEDNÉHO spustenia vždy tú istú titulku (nepreblikáva pri scrolle), inú
titulku dostane až pri ĎALŠOM otvorení appky.

`PropertyCard` teraz počíta `item.media[coverPhotoIndex(item.id, item.media.length)]`
namiesto natvrdo `item.media[0]`. Počítadlo fotiek v rohu karty (`2/6`
a pod.) ukazuje SKUTOČNÚ pozíciu zobrazenej fotky, nie vždy „1".

**Dôkaz**: `npx tsx scripts/check-cover-photo.ts` — **5/5**, Node bez appky:
index je v rámci jedného spustenia stály, nikdy mimo rozsahu, rôzne
spustenia dajú pre ten istý inzerát rôzny index, rôzne inzeráty v tom
istom spustení nemajú vždy tú istú fotku.

🟡 **Čo Rastio otestuje**: otvoriť appku (force quit + znova spustiť) aspoň
DVAKRÁT a porovnať titulnú fotku na karte inzerátu s viacerými fotkami —
mala by sa medzi spusteniami líšiť.

---

## 3. Admin — „Podozriví používatelia"

Nová sekcia v Nastaveniach (admin konzola), tri vzorce — **len signály na
ručnú kontrolu, appka nikoho neblokuje sama** (rovnaký princíp ako
existujúce „Opakované porušenia"):

1. **Záplava ponúk** — účet podal ponuku na ≥10 RÔZNYCH inzerátov za
   posledných 24 hodín.
2. **Opakovane nízke ponuky** — účet opakovane (≥3 rôzne inzeráty) ponúka
   pod 50 % orientačnej ceny. Jedna nízka ponuka je normálne vyjednávanie;
   vzorec naprieč viacerými inzerátmi už nie je. Inzeráty bez uvedenej
   orientačnej ceny sa do tohto počtu nerátajú.
3. **Opakovane ponúka tomu istému vlastníkovi** — **pridané bez pýtania**,
   podľa zadania „ak ťa napadne ďalší rozumný vzor, pridaj ho aj bez toho,
   aby si sa pýtal". Dôvod, prečo je to zvlášť dôležité pri Offerre:
   appka ukazuje ponuky OTVORENE (sumy aj prezývky sú verejné), takže
   vlastník má motiváciu založiť si druhý účet a sám si nadsadzovať
   vlastnú cenu, aby vytiahol ostatných záujemcov vyššie. Prah: záujemca
   podá ponuku na ≥3 rôzne inzeráty toho ISTÉHO predávajúceho.

**Prahy sú nastaviteľné** cez novú kartu „PODOZRIVÍ POUŽÍVATELIA — PRAHY"
v Nastaveniach (zadanie: „daj nejaké parametre, kde sa dá definovať, čo je
podozrivé") — rovnaký mechanizmus (`app_config`/`admin_set_config`) ako
existujúci limit aktívnych inzerátov. Zmena platí okamžite, bez nového
buildu.

**Existujúci check na rovnaký telefón/e-mail naprieč účtami** (spomenul si
ho ako „už riešené, over stav"): **je hotový a beží** —
`admin_duplicate_contacts()` z 9.8.2026, karta „ROVNAKÝ KONTAKT NA
VIACERÝCH ÚČTOCH" v Nastaveniach. Túto prácu som nerobil znova, len
overil, že tam skutočne je.

**Dôkaz**: `podozrivi_test.py`, **13/13** — reálne dáta (15 ponúk na rôzne
inzeráty, 5 nízkych ponúk, 4 ponuky tomu istému vlastníkovi) cez skutočné
RPC volania. Overené aj: bežný (nie admin) účet dostane prázdny zoznam,
nie cudzie dáta; bežný záujemca s 1–2 ponukami sa NIKDE neobjaví (žiadny
falošný poplach); zmena prahu cez `admin_set_config` naozaj mení výsledok;
bežný účet prah zmeniť nesmie (HTTP 403).

🟡 **Čo Rastio otestuje**: otvoriť Správa → Nastavenia a pozrieť si tri
nové karty — najmä, či texty a čísla dávajú zmysel s reálnymi dátami
appky (testy bežali na dočasných testovacích účtoch, nie na produkčných
dátach).

---

## Nasadenie

Všetko **IDE OTA** — žiadny natívny modul, `app.json` bez zmeny.
DB migrácia `mig_39_suspicious_users.sql` nasadená priamo (bez natívneho
dopadu — pridáva len funkcie a konfiguráciu).

`npx tsc --noEmit` — bez chýb, po každom bloku zmien.
