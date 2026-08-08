# Počítadlo fotiek + triedenie katalógu

**Dátum:** 8. augusta 2026 · **ide OTA**

---

## 1. Počítadlo fotiek

### Kde sa to zmestilo — overené, nie odhadnuté

Prešiel som, čo na fotke karty už je:

| Miesto | Čo tam je |
|---|---|
| ľavý horný roh | pilulky `PREDAJ` + typ |
| pravý horný roh | zdieľať + srdiečko |
| ľavý dolný roh | „Ponuky do… · ostáva X dní" |
| **pravý dolný roh** | **voľné** |

Počítadlo teda ide **vpravo dole**. Neriešil som to ale dvomi absolútne
umiestnenými prvkami — text uzávierky je dlhý („Ponuky do 21. augusta
2026 · ostáva 13 dní") a pri užšom telefóne by sa s počítadlom prekryl.

Spodok fotky je preto **jeden riadok** (`space-between`): uzávierka vľavo
sa zmršťuje, počítadlo vpravo má pevnú šírku. **Prekryť sa nemajú ako** —
ani pri najdlhšom texte, ani na malom displeji.

### Jedna rodina štítkov, nie tri podobné veci

Presne ako si žiadal. Vznikol spoločný komponent **`PhotoBadge`**, ktorý
teraz používa uzávierka aj obe počítadlá: rovnaké poloprehľadné pozadie
(`onPhotoSurface`), rovnaké zaoblenie, rovnaká veľkosť písma. Líši sa
**len farba textu** a tá nesie význam:

```
muted   sivá        počítadlo fotiek, uplynutá uzávierka
warm    terakota    bežiaca uzávierka
urgent  červená     ostávajú menej než 3 dni
```

Keby som to spravil ako samostatný prvok, časom by sa rozišli — takto sa
zmena vzhľadu prejaví naraz na všetkých.

### Správanie

- **Karta v katalógu:** statické `1/5`, len keď má inzerát **viac než
  jednu** fotku. Pri jednej sa nezobrazí vôbec.
- **Detail — hero galéria:** `3/5`, **mení sa pri každom prehodení
  fotky**. Je to **doplnok k bodkám, nie náhrada**: bodky ukazujú polohu
  v poradí, číslo povie presne koľkú z koľkých. Bodky sú v strede,
  počítadlo vpravo — nekolidujú.

---

## 2. Triedenie katalógu

### Predvolené: od najnovšieho — už to tak bolo

Overil som stav pred zmenou: `useProperties` už radilo
`.order('created_at', { ascending: false })`, teda **od najnovšieho, bez
ohľadu na filtre**. Nič náhodné ani podľa iného poľa tam nebolo. Nechal
som to a doplnil explicitný test, aby to tak ostalo.

### Nové: „Čoskoro končí"

Prepínač je **medzi filtrové chipy**, hneď nad nimi — rovnaký tvar
a správanie ako `Predaj / Prenájom`, takže sa nemusíš učiť nové
ovládanie. Dve možnosti: **Najnovšie** · **Čoskoro končí**.

**Kde to má háčik, a prečo to nie je v SQL.** Obyčajné
`order by offer_deadline asc` by dalo úplne hore inzeráty, ktorým termín
**dávno vypršal** — teda presný opak urgencie, ktorú má toto triedenie
ukazovať. Triedi sa preto v appke, v čistej funkcii `sortProperties`, do
**troch** skupín:

```
1.  inzeráty s BEŽIACOU uzávierkou   → od tej, čo končí najskôr
2.  inzeráty, ktorým termín UPLYNUL  → od tej, čo skončila naposledy
3.  inzeráty BEZ časovača            → na konci, od najnovšieho
```

Skupina 3 je presne to, čo si žiadal: bez časovača = žiadna urgencia,
tak ich netlačíme hore ani dole medzi tie s termínom.

### Dopyty túto možnosť NEMAJÚ — a je to zámer

Overil som model: `buyer_request` **nemá `offer_deadline` ani iný časový
aspekt**, podľa ktorého by sa dalo triediť. Prepínač sa preto v tabe
Dopyty vôbec nezobrazuje — `SearchBar` ho vykreslí len keď mu ho
obrazovka podá.

### Zvýraznenie blížiaceho sa konca

Štítok uzávierky sa **sfarbí červeno, keď ostávajú menej než 3 dni**.
Text ostáva ten istý, mení sa len farba — urgencia patrí do farby, nie do
ďalšej vety.

---

## Dôkazy

`sort_test.js` — **11/11**, čistá funkcia bez appky a bez DB:

```
OK  NEWEST: od najnovsieho podla created_at
OK  ENDING_SOON: bezi -> uplynulo -> bez casovaca
OK  ENDING_SOON: inzeraty BEZ casovaca su az na konci
OK  ENDING_SOON: uplynuty NIE JE hore (to by bol opak urgencie)
OK  povodne pole sa nemeni (bez mutacie)
OK  urgencia: bez casovaca / o 2 h / o 2 dni / o 4 dni / vcera
11/11 preslo
```

`npx tsc --noEmit` 0 chýb, `npx expo export --platform ios` prešiel.

### Aby si mal urgentný štítok na čom vidieť

Stav dát bol taký, že **žiadny inzerát nekončil do 3 dní**, takže by si
červený štítok nemal ako uvidieť. Nastavil som preto inzerátu
**„Svetlý 3-izbový byt s loggiou, Nitra"** (ten z demo účtu, nie tvoj)
uzávierku na **~2 dni**. Ostatné som nechal tak.

Aktuálny stav katalógu:

| Inzerát | Uzávierka | Štítok |
|---|---|---|
| Svetlý 3-izbový byt, Nitra | o 2 dni | **červený** |
| 3-izbový byt, Banská Bystrica | 21. 8. | terakota |
| Priestranný 3-izbový byt, Petržalka | 28. 8. | terakota |
| Rodinný dom, Selce | 6. 9. | terakota |
| Stavebný pozemok, Súľov-Hradná | 21. 9. | terakota |
| ostatné 4 | bez časovača | žiadny |

Všetkých **9 zverejnených inzerátov má 2–3 fotky**, takže počítadlo bude
vidieť na každom.

---

## Čo otestovať

- [ ] **Katalóg:** na každej karte vpravo dole `1/2` alebo `1/3`,
      vľavo dole uzávierka. **Nesmú sa prekrývať.**
- [ ] Karta **Nitra** má uzávierku **červenú**, ostatné terakotovú.
- [ ] Prepni **Čoskoro končí** — hore musí byť Nitra, potom Banská
      Bystrica, Petržalka, Selce, Súľov; **4 inzeráty bez časovača až
      na konci**.
- [ ] Prepni späť na **Najnovšie** — poradie sa zmení na podľa dátumu
      pridania.
- [ ] **Detail:** potiahni galériu do strán — číslo vpravo dole sa musí
      meniť `1/3 → 2/3 → 3/3` a bodky v strede sa musia hýbať s ním.
- [ ] **Dopyty:** prepínač triedenia tam **nesmie byť** (dopyty nemajú
      uzávierku).
