# Súhrn behu backlogom — 9. augusta 2026

**Všetko nasadené OTA na runtime `451767ea…` (= build #4). Všetko pushnuté.**

---

## Čo je hotové

| Bod z tvojho zoznamu | Stav |
|---|---|
| Obhliadky | ✅ dáta overené (23/23) · 🟡 obrazovka |
| Obrana proti realitkám (4 body) | ✅ overené (21/21), vrátane heuristík |
| Prepínač tmavého režimu | ✅ hotový · 🟡 vizuálne |
| „Počet zobrazení" | ✅ doplnený, aj s konverziou |
| **Uzavretie obchodu** | ✅ overené (25/25) |
| **Hodnotenia** | ✅ overené (25/25) |
| **Uložené vyhľadávanie** | ✅ overené (13/13) |
| **História cien** | ✅ overené (10/10) |
| **Overený badge** | ✅ overené (9/9) |
| Zámok inzerátu po prijatí ponuky | ✅ overené (16/16) |
| Modály pod dynamic islandom | ✅ štrukturálne (16/16) · 🟡 vizuálne |
| „Moje inzeráty" | ✅ hotové podľa všetkých 5 bodov · 🟡 vizuálne |
| Jednotná spätná väzba | ✅ štrukturálne (20/20) · 🟡 vizuálne |
| Kontextové vysvetlenia | ✅ doplnené na 6 miestach |
| GitHub Pages | ✅ **živé** |

**Zostáva jediné z tvojho zoznamu: ULICE.** Nechal som ich naposledy
zámerne — potrebujú rozhodnutie o zdroji dát, ktoré si mi ešte nedal
(prieskum je v `reports/MUTARK_PRIESKUM_VEK_A_WEB.md`, odporúčam začať
vlastnými dátami). Je to jediná položka, ktorá nie je len práca, ale aj
voľba.

---

## Dôkazy — 22 suít proti živej DB + 10 čistých

```
admin 24 · avatar 8 · dopyty 11 · diakritika 13 · e-mail 7 · chyby 2
flow 10 · funkcie 5 · diery 5 · prenájom 12 · RLS 15 · vek 4 · videnie 10
správa 19 · obhliadka 23 · realitky 21 · obchod 25 · rekurzia 23
zámok 16 · hľadania 13 · cena 10 · overený 9

dopyt-parse 9 · chyby-js 15 · cena-zobrazenie 14 · realtime 6
prenájom-čistý 18 · triedenie 11 · budova 20 · modály 16 · riadky 11
odozva 20
```

**Spolu 415 testov, 0 zlyhaní.**

---

## Rozhodnutia, ktoré som spravil sám (a prečo)

Toto je zoznam vecí, kde som podľa tvojho pokynu nezastavoval — a ktoré
môžeš kedykoľvek prehodiť.

1. **Text hodnotenia je neverejný**, verejný je len priemer hviezdičiek.
   Verejné voľné pole pripnuté k menovanému človeku je priestor na
   osočovanie, ktorý Offerra pri svojej veľkosti neustráži. Zmena je jedna
   RLS politika.

2. **Fotky po prijatí ponuky: pridávať áno, mazať nie.** Pridaná fotka
   nemení dohodu; zmazaná odstraňuje dôkaz o stave veci v čase dohody.

3. **Predvolený vzhľad je svetlý, nie „podľa telefónu".** §5 hovorí
   light-first a schválená paleta je svetlá — nechcel som ťa prekvapiť
   tmavou druhýkrát.

4. **Overený odznak sa nedá získať automaticky** a bez uvedenia dôvodu ho
   DB neprijme. Odznak, ktorý nevie povedať, na základe čoho vznikol, je
   pri nehnuteľnostiach nebezpečná ozdoba.

5. **História cien je verejná.** Orientačná cena je verejná od začiatku;
   jej zmena je informácia rovnakej povahy. Inak by sa dala ticho zdvihnúť
   týždeň pred uzávierkou.

6. **Konverzia „X % z pozretí ponúklo" sa pri menej než 5 pozretiach
   nezobrazuje** — z troch návštev percento nič nehovorí.

7. **Toast na úspech, Alert na potvrdenie a chybu.** Modálne okno s OK
   zastaví človeka kvôli správe, ktorú netreba odklikávať. Výnimka:
   zmazanie účtu okno má.

8. **Uložené hľadanie je nad katalógom, nie v Profile** — ukladá sa
   a používa v tom istom okamihu na tom istom mieste.

9. **Ťuknutie na „Moje inzeráty" vedie k ponukám, nie k úprave** (pri
   koncepte naopak). Preto do hlavičky ponúk pribudlo „Upraviť".

---

## Tri chyby, ktoré som po ceste našiel a spôsobil

1. **RLS rekurzia položila celý katalóg** prihláseným ľuďom. Moja politika
   z tej istej hodiny. Opravené v DB, teda platilo okamžite.

2. **Registrácia bola neprejditeľná** — chýbalo JSX zaškrtávacieho políčka
   18+. Nikto nový nedokončil vytvorenie účtu.

3. **`.gitignore` odstrihol OTA od buildu** — zmenil fingerprint, a preto
   si nevidel najnovšie zmeny.

Všetky tri majú spoločné to, že dôkaz overoval niečo iné než to, na čom
záležalo. Z každej je pravidlo v registri.

---

## Procesná vec, ktorú si si vypýtal

Pýtal si sa, prečo „Moje inzeráty" prešli ako hotové. **Nikdy neprešli** —
tá špecifikácia v registri nebola vôbec. Chyba je moja a je procesná:
zadanie, ktoré nezapíšem do registra hneď, sa pri kompakcii kontextu
stratí. Zaviedol som si, že **každé zadanie dostane riadok v registri
pred začiatkom práce**, nie až s výsledkom.

---

## Čo otestovať ráno

Zoznam je v `reports/OBCHOD_ZAMOK_ODOZVA.md` na konci. Najdôležitejšie
tri veci:

1. **Profil dole musí ukazovať `rt451767ea…`**, nie `embedded`. Ak
   `embedded`, force-quit a otvor **dvakrát** — prvé spustenie sťahuje.
2. **Katalóg musí ukazovať inzeráty** (to bola tá blokujúca chyba).
3. **Nahlásiť používateľa** — hlavička už musí byť pod ostrovčekom
   a musí byť vidieť šípku späť aj „Zavrieť".
