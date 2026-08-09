# Seed dáta — fotky podľa typu a poriadny objem

**Dátum:** 9. augusta 2026 · doplnenie k bodu 7

---

## KONTROLA PRED HOTOVO

### [✅] Fotky zodpovedajú typu nehnuteľnosti pri KAŽDOM inzeráte

**Overené dvoma nezávislými spôsobmi.**

**1. Dotazom nad tým, čo je v databáze** — každá fotka musí ležať
v priečinku svojho typu:

```sql
select count(*) from offerra.media m join offerra.property p on p.id=m.property_id
 where p.is_seed and m.url not like '%/seed/' || p.property_type || '/%';
→  0
```

**2. Pohľadom na skutočne priradené fotky.** Dotaz dokazuje len zhodu
reťazcov — nie že na fotke je dom. Zložil som preto hárok z **prvých
fotiek náhodných inzerátov každého typu**, teda presne tých, ktoré appka
ukáže na karte, a pozrel sa naň:

| typ | čo na fotkách naozaj je |
|---|---|
| APARTMENT | panelové a mestské bytové domy, k tomu obývačky a kuchyne |
| HOUSE | rodinné domy s pozemkom, murované aj drevené |
| LAND | lúky, polia a trávnaté plochy bez budov |
| COMMERCIAL | obchodné priestory, výklady, prázdne prevádzky |

Hárok je `dokaz_fotky.jpg` v pracovnom priečinku.

### Prečo to predtým nesedelo

Fotky sa brali z **jedného spoločného bazéna** 22 súborov v úložisku
a rozdávali sa dokola bez ohľadu na typ. Dom teda dostal fotku bytovky
a pozemok fotku interiéru. Fotka, ktorá ukazuje niečo iné než inzerát, je
horšia než žiadna — v katalógu je to prvá vec, ktorú človek vidí.

### Odkiaľ sú nové fotky

**Wikimedia Commons**, 96 kusov, nahraté do
`offerra-media/seed/<TYP>/`. Vlastný priečinok je zámer: seed fotky sa
dajú zmazať jedným prefixom bez toho, aby sa dotkli fotiek skutočných
používateľov.

**Každú fotku som posúdil pohľadom, nie podľa názvu súboru.** Bolo to
nutné — vyhľadávanie klame. Pri dopyte „apartment building" bola druhým
výsledkom **pálenica**, pri pozemkoch vracalo prevažne budovy. Zo 195
stiahnutých kandidátov obstálo 96:

| typ | kandidátov | prijatých |
|---|---|---|
| APARTMENT | 54 | 26 |
| HOUSE | 65 | 30 |
| LAND | 55 | 23 |
| COMMERCIAL | 26 | 17 |

Vyhodené: stavby vo výstavbe s žeriavom, tabule „STAVBA POVOLENÁ",
reklamné bannery, historické čiernobiele snímky, architektonické kresby,
maľby, detaily kvetov, nočné vianočné stromčeky, satelitné snímky, parky
bez budovy a zábery z iných svetadielov.

**Licencie a autori sú v `reports/SEED_FOTKY_LICENCIE.md`** — repozitár je
verejný a väčšina licencií CC BY-SA žiada uvedenie autora.

### [✅] Dostatočné množstvo dát

| | pôvodne | predošlá dávka | **teraz** |
|---|---|---|---|
| inzeráty | 10 | 20 | **60** |
| ponuky | 3 | 28 | **124** |
| dopyty | 2 | 8 | **24** |
| oslovenia | 6 | 15 | **51** |
| fotky | 22 | 63 | **183** |
| seed profily | 1 | 6 | **6** |

- **12 miest, 8 krajov**
- **21 inzerátov má 3 a viac konkurenčných ponúk** — na tom sa dá vidieť,
  ako vyzerá súboj o nehnuteľnosť
- **0 inzerátov bez fotky**
- **0 inzerátov s viac než jednou prijatou ponukou**
- **0 inzerátov, kde je počet zobrazení nižší než počet ponúk**

**Rozloženie typov je ZÁMERNE nerovnomerné:**

| typ | predaj | prenájom | spolu |
|---|---|---|---|
| byty | 13 | 14 | **27** |
| domy | 17 | 1 | **18** |
| komerčné | 5 | 4 | **9** |
| pozemky | 6 | 0 | **6** |

Prvý beh dal presne 15 od každého typu. Reálny regionálny portál tak
nevyzerá — bytov je najviac, pozemkov málo, a dom sa skoro vždy predáva,
nie prenajíma. Rovnomerné rozloženie je presne to „umelo pôsobiace", pred
ktorým si varoval: nedá sa pomenovať, ale človek to cíti. To isté pri
izbách — dvoj- a trojizbové prevažujú, päťizbový byt je výnimka.

**Prečo 60 a nie 200:** pri 12 mestách je to ~5 inzerátov na mesto, čo
zodpovedá skutočnému regionálnemu portálu. Pri 200 by malo každé mesto
desiatky ponúk — a to pri appke bez jediného skutočného používateľa pôsobí
neprirodzene v opačnom smere. Ak chceš viac, je to jedno číslo v skripte
(`COUNT`).

### [✅] Tvoj účet má vlastný obsah

| | |
|---|---|
| vlastné inzeráty | **5**, všetky ACTIVE |
| prichádzajúce ponuky na ne | **17** |
| vlastné dopyty | **5** |
| oslovenia tvojich dopytov | **11** |

Tvoje inzeráty (mix predaj/prenájom/typy):

```
1-izbový byt na predaj, Nitra            3 ponuky (3 čakajú)
1-izbový byt na prenájom, Bratislava     3 ponuky (2 čakajú)
Obchodný priestor na prenájom, Žilina    4 ponuky (4 čakajú)
Rodinný dom na predaj, Košice            5 ponúk  (5 čaká)
Stavebný pozemok, Prešov                 2 ponuky (2 čakajú)
```

**Na tvojich inzerátoch zámerne NIE JE ani jedna prijatá ponuka.** Prijatie
inzerát zamkne — a ty máš práve na nich skúšať prijímanie a odmietanie sám.
Prijaté ponuky sú na cudzích inzerátoch, aby si videl aj ten stav.

Všetko je `is_seed = true`, teda zahoditeľné jedným dotazom.

---

## Čo sa pri tom pokazilo

**Wikimedia ma po ~33 sťahovaniach odrezala** a tri kategórie ostali
prázdne — skript to vtedy **zamlčal** a tváril sa, že skončil. Doplnené
čakanie, opakovanie a hlavne: prázdna kategória je odteraz **chyba**, nie
ticho.

**Metadáta prvého kola prepísalo druhé**, takže pri 52 z 96 fotiek chýbalo,
odkiaľ pochádzajú. Nedopísal som to od oka — vyhľadávania som spustil
znova a **párovanie overil veľkosťou súboru**. Nesediacich: **0**.

---

## Vydanie

**Žiadna zmena kódu appky** — je to výhradne obsah databázy a úložiska.
Netreba teda ani OTA, ani build. Zmeny uvidíš hneď po potiahnutí zoznamu.

**V changelogu pre používateľa toto zámerne nie je.** Changelog je o tom,
čo appka vie, nie o testovacích dátach, ktoré v ostrej prevádzke nebudú.
