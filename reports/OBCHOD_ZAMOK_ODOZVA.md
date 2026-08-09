# Uzavretie obchodu, hodnotenia, zámok inzerátu a jednotná spätná väzba

**Dátum:** 9. augusta 2026 · **ide OTA** · nasadené na runtime `451767ea…` (build #4)

---

## 0. Najprv to blokujúce: katalóg padal na RLS rekurziu

Samostatný report je v `reports/RLS_REKURZIA_KATALOG.md`. V skratke:

**Nebol to limit inzerátov**, ako znel tvoj tip — ten je trigger, nie
politika, a trigger sa takto zacykliť nevie. Vinníkom bola politika
`property_select_closed_parties`, ktorú som pridal o pár minút skôr pri
uzavretí obchodu. Cyklus viedol **cez druhú tabuľku**:

```
property        → politika sa pýta property_offer
property_offer  → offer_select_public sa pýta property
property        → tá istá politika znova
```

Opravené `SECURITY DEFINER` funkciou. **Oprava je v databáze, takže
platila okamžite — bez OTA a bez čakania.**

Trieda chyby, ktorú si pomenoval, sedela presne. Len konkrétny riadok bol
iný, než si tipoval.

**Prečo to nechytili moje testy — a to je to podstatné:** po tej migrácii
som overil dotaz **anonymne** a dostal HTTP 200. Politika mieri na
`authenticated`, takže anonymný dotaz sa k nej vôbec nedostane. Overil som
niečo iné, než čo bolo treba. Nové pravidlo v registri: *každú RLS politiku
overiť identitou, na ktorú MIERI.* Nový trvalý test prechádza 16 tabuliek
× 3 identity.

---

## 1. Uzavretie obchodu

`close_deal()` robí všetko **jednou vetou v databáze**: stav inzerátu,
víťaznú ponuku, konečnú sumu a **uzavretie ostatných čakajúcich ponúk**.
Keby to appka robila štyrmi dotazmi, pád medzi nimi by nechal obchod
v polovici — a ľudí čakať na rozhodnutie, ktoré už padlo.

Jeden stav `CLOSED` pre predaj aj prenájom; slovo („Predané" / „Prenajaté")
vyrába typ obchodu. Dva stavy by boli dve miesta, kde sa dá zabudnúť na
jedno z nich.

Obchod sa dá uzavrieť aj **bez ponuky** — keď ste sa dohodli mimo Offerry.
Zamlčať tú možnosť by znamenalo, že inzerát visí naveky.

Uzavretý inzerát zmizne z katalógu, ale **druhá strana ho vidí ďalej** —
inak by nemala čo hodnotiť a v jej histórii by ostala diera.

---

## 2. Hodnotenia — a jedno rozhodnutie, ktoré som spravil sám

Po uzavretí sa obe strany môžu ohodnotiť 1–5 hviezdičkami. Hviezdičky sú
pri prezývke v zozname ponúk aj na inzeráte — v profile, kam nikto
nechodí, by nikomu nepomohli.

**Text hodnotenia som spravil NEVEREJNÝ.** Číta ho len ten, koho sa týka,
a jeho autor. Priemer hviezdičiek je verejný.

Dôvod: verejné voľné pole pripnuté k menovanému človeku je priestor na
osočovanie, ktorý Offerra pri svojej veľkosti neustráži. Jedna nepravdivá
veta o konkrétnom človeku napácha viac škody než koľko úžitku prinesie
celý zvyšok. Dôveru unesie priemer.

Ak to chceš inak, je to zmena jednej RLS politiky — povedz.

**Čo sa nedá:** hodnotiť môžu len tí dvaja, len po uzavretí, len raz na
obchod, a porazený uchádzač nie (inak by sa dalo pomstiť za odmietnutie).
Overené všetkými štyrmi identitami.

---

## 3. Zámok inzerátu po prijatí ponuky

**Prečo trigger a nie RLS:** RLS vie povedať „na tento RIADOK nesmieš",
nie „tieto STĹPCE nie a tamtie áno". Rozlíšiť zmenu stavu od zmeny ceny
vie len trigger, ktorý vidí `old` aj `new`.

Overil som menovite to, na čo si sa pýtal: **„Uzavrieť obchod" prejde aj
so zámkom** — povolené sú presne tie polia, ktoré mení.

### Fotky — rozhodnutie a jeho dôvod

Nechal si to na mne. Rozhodol som **pridávať áno, mazať nie**:

| | | |
|---|---|---|
| pridať fotku | povolené | nemení cenu, podmienky ani ktorá nehnuteľnosť to je; kupujúci si pred podpisom často vypýta ďalšie zábery a je lepšie, keď ostanú v appke než v súkromnej správe |
| zmazať fotku | zakázané | odstraňuje **dôkaz** o tom, ako vec vyzerala v čase dohody — presne to riziko, ktorému má zámok brániť |
| prepísať fotku | zakázané | je to prepísanie existujúcej, nie doplnenie novej |

Tvoja intuícia („fotky sú menej rizikové než text/cena") bola správna, len
nie pre všetky operácie rovnako.

### Nález, ktorý z toho vypadol

`restrictive` RLS pri DELETE vráti **HTTP 204 a nezmaže nič**. V appke by
to bolo „nestane sa nič", čo §2 zakazuje. Preto sa pri zámku **krížik na
fotke vôbec nezobrazí** a nad formulárom je pás s vysvetlením, čo sa dá
a čo nie — vrátane kontaktu, keby zmenu naozaj potreboval.

---

## 4. Modály pod dynamic islandom — koreňová príčina

Hlásil si to **druhýkrát**, a mal si pravdu aj v diagnóze: predošlá oprava
bola lokálna.

**Príčina:** `SafeAreaView` **vnútri `<Modal>`** nedostane správne
odsadenie. Modál sa na iOS vykresľuje vo vlastnej natívnej hierarchii MIMO
`SafeAreaProvider`, kontext k nemu nedosiahne a insety vyjdú **nula**.

A keďže je „Zavrieť" prekryté, nedá sa naň ani ťuknúť — **to bola tvoja
druhá otázka a je to ten istý bug.** Jedna príčina, dva symptómy.

Netýkalo sa to jednej obrazovky. **Tri modály** mali vlastnú hlavičku
a rovnakú chybu: nahlásenie (vo všetkých troch podobách — inzerát, ponuka,
používateľ), výber obce, oslovenie k dopytu.

Teraz je jedna zdieľaná hlavička `ModalScreen` s **dvoma cestami von** —
šípka vľavo (kam siahne palec zo zvyku) a „Zavrieť" vpravo (kde to hľadá
oko). Na obrazovke, z ktorej sa nedalo vrátiť, je jedna cesta málo.

Dôkaz je **štrukturálny**, 16/16: žiadny `<Modal>` už neobsahuje vlastný
`SafeAreaView` a test padne aj vtedy, keď niekto pridá štvrtý modál po
starom. **Že to vyzerá správne, dokázať neviem** — to je na tebe.

---

## 5. „Moje inzeráty" — a odpoveď na tvoju otázku

Pýtal si sa, prečo tá špecifikácia prešla ako hotová, keď hotová nebola.

**Faktická odpoveď: nikdy nebola označená za hotovú.** V registri tá
päťbodová špecifikácia **nie je vôbec** a v prepise session sa nenašla ani
doslovným hľadaním („miniatúra", „ostáva X dní", „pomer ponúk" → nula
zhôd). Dnešný report hovoril výslovne len o počte zobrazení a ponúk.
Najbližšie tomu je moja vlastná návrhová poznámka v inom reporte.

**Chyba je moja a je procesná:** §6 hovorí, že register sa dopĺňa
priebežne. Zadanie, ktoré do registra nezapíšem, sa pri kompakcii kontextu
stratí a niet ho kde nájsť.

Nie je to o tom, ako štruktúruješ zadania. **Zaviedol som si pravidlo:
každé prijaté zadanie dostane riadok v registri hneď, pred začiatkom
práce** — nie až s výsledkom.

Riadok teraz nesie:

```
[foto]  Priestranný 3-izbový byt v Petržalke
        215 000 € · najvyššia ponuka            ← terakota, keď ponuka existuje
        3 ponuky · 2 čaká na teba                ← zvýraznené, keď niečo čaká
        Petržalka · 47 zobrazení · 6 % z pozretí ponúklo
        Ponuky do 12. augusta                    ← červené pod 3 dni
                                    [Zverejnené]
```

**Rozhodnutia, ktoré som spravil sám:**
- Konverzia sa **pri menej než 5 pozretiach nezobrazuje** — z troch
  návštev percento nič nehovorí. Je to jediné číslo, ktoré povie, či je
  problém v návštevnosti alebo v cene.
- Ťuknutie vedie k **ponukám** (zverejnený, uzavretý) a k **úprave**
  (koncept) — na koncepte niet čo spravovať.
- Preto do hlavičky „Ponuky na inzerát" pribudlo **„Upraviť"**; bez neho
  by k zverejnenému inzerátu neviedla cesta.

---

## 6. Spätná väzba po akcii

**Zoznam toho, čo ju nemalo — nahlásený, nie mlčky opravený:**

| Akcia | Stav pred |
|---|---|
| Srdiečko (obľúbené) | len animácia, po úspechu nič |
| Chcem obhliadku / Bol som na obhliadke / Zrušiť | nič |
| Hodnotenie | vlastný inline text, iný než všade inde |
| Uložiť koncept inzerátu | nič |
| Uložiť profil | nič |
| Zmeniť profilovku | nič |
| Zverejniť dopyt | nič |

**Pravidlo, ktoré tým vzniklo:**

- **Toast** = akcia prebehla. Krátke, samo zmizne, nič nepýta.
- **Alert** ostáva na potvrdenie pred nezvratným krokom a na chybu.

Modálne okno s tlačidlom OK zastaví človeka uprostred práce kvôli správe,
ktorú netreba odklikávať. Pri srdiečku je to trest za používanie appky.
Zmazanie účtu naopak okno **má** — toast, čo za dve sekundy zmizne, je na
nezvratnú vec málo.

**Výnimky sú v teste vypísané aj s dôvodom** (výnimka bez dôvodu je diera,
ktorá sa tvári ako pravidlo): prepínače upozornení (prepínač sám je
odozvou a pri zlyhaní sa vráti), fotky (objaví sa / zmizne), tipy (zmiznú),
založenie konceptu (otvorí editor).

**Kontextové vysvetlenia doplnené:** Pridať, Nový dopyt, formulár inzerátu,
Nastavenia → Účet a všetky tri sekcie admin konzoly. Hodnotenie
a obhliadka ich mali už predtým — boli to vzory, podľa ktorých som písal
ostatné.

---

## GitHub Pages — hotové

Tretí token to vedel. Právne stránky sú **živé**:

```
200  https://rastioeu.github.io/offerra_web/privacy.html   ← do App Store Connect
200  https://rastioeu.github.io/offerra_web/terms.html
200  https://rastioeu.github.io/offerra_web/support.html
```

Obsahujú aj novú sekciu o zákaze sprostredkovateľov.

---

## Dôkazy

```
rekurzia RLS   21/21     obchod + hodnotenia  25/25
zámok          16/16     realitky             21/21
modály         16/16     správa (súkromie)    19/19
odozva         20/20     obhliadky            23/23
riadky         11/11     RLS                  15/15
budova         20/20     flow                 10/10
admin          24/24     + ostatné suity
```

---

## Čo otestovať ráno

- [ ] **Katalóg** — musí ukazovať inzeráty (prihlásený aj odhlásený).
- [ ] **Verzia** — Profil dole musí byť `rt451767ea…`, nie `embedded`.
      Ak `embedded`, force-quit a otvor **dvakrát**.
- [ ] **Nahlásiť používateľa** — nadpis a „Zavrieť" musia byť POD
      ostrovčekom, a musí byť vidieť aj šípku späť vľavo.
- [ ] **Nahlásiť realitku** — vlastné tlačidlo pri prezývke, dôvod má byť
      predvyplnený.
- [ ] **Moje inzeráty** — miniatúra, ponuky, zobrazenia, zvýraznenie tam,
      kde niečo čaká.
- [ ] **Srdiečko** — dole musí vyskočiť „Pridané do obľúbených".
- [ ] **Uzavretie obchodu** — v „Ponuky na inzerát" pri prijatej ponuke,
      potom skús inzerát upraviť: musí to odmietnuť s vysvetlením.
- [ ] **Hodnotenie** — na uzavretom inzeráte, obe strany.
- [ ] **Vzhľad** — Nastavenia → prvá karta, prepni Svetlý/Tmavý.
