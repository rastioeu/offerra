# Filtre v troch riadkoch podľa významu

**Dátum:** 17.8.2026
**Zadal:** Rastio — filtre boli premiešané, treba tri jasné riadky
**Rozsah:** `src/components/search-bar.tsx` (lišta pre OBA taby), nový
`src/lib/filter-rows.ts`, nový `src/lib/labels.ts`, nový
`scripts/check-filters.ts`

---

## 1. Prečo boli premiešané — a prečo to nebola chyba v poradí

Poradie čipov v kóde bolo **správne už od 12.8.2026**: typ obchodu, typ
nehnuteľnosti, triedenie, srdiečko. Problém bol, že všetky čipy boli v
**jednom `flexWrap` riadku** — takže sa lámali podľa **šírky obrazovky**, nie
podľa významu. Na Rastiovom telefóne z toho vyšlo presne to, čo nahlásil:

```
Predaj · Prenájom · Byt · Dom
Pozemok · Komerčný · Najnovšie
Čoskoro končí · ♥
```

Tri riadky tam teda boli — ale zalomené na nesprávnych miestach. Preto
oprava nie je „prehodiť poradie", ale **prestať sa spoliehať na zalamovanie**:
riadky sú odteraz dáta, každý vo vlastnom `View`.

---

## 2. Ako je to teraz

```
TYP OBCHODU          [Predaj] [Prenájom]                        ← Nehnuteľnosti
                     [Kúpim] [Hľadám prenájom]                  ← Dopyty
                          ↕ 8 px (dvojnásobok medzery medzi čipmi)
TYP NEHNUTEĽNOSTI    [Byt] [Dom] [Pozemok] [Komerčný priestor] [Iné]
                          ↕ 8 px + tenká linka
TRIEDENIE A OBĽÚBENÉ [Najnovšie] [Čoskoro končí] [♥]      ← Nehnuteľnosti
                     [Najnovšie]                          ← Dopyty
```

Vizuálne oddelenie robia dve veci, obe zámerne jemné (ako si písal):

- **medzera medzi riadkami je dvojnásobok** medzery medzi čipmi v riadku
  (8 px vs. 4 px) — riadok tak drží pohromade viac než k susednému,
- **tenká linka nad tretím riadkom** — tretí riadok je iná kategória než
  dva nad ním: prvé dva **zužujú**, čo hľadáš, tretí len mení **pohľad** na
  výsledok (tvoje rozhodnutie z 12.8.2026, teraz je aj vidieť).

Názvy kategórií sa **nevykresľujú** (zabrali by výšku nad vyhľadávaním), ale
idú čítačke obrazovky ako `accessibilityLabel` riadku. Ak chceš, aby boli
vidieť aj očami, je to jednoriadková zmena — povedz.

### Čo pribudlo: „Iné"

Filter na typ **„Iné"** dovtedy neexistoval, hoci `OTHER` je plnohodnotný
typ: dá sa vybrať **aj pri inzeráte** (`inzerat/[id].tsx:325`) **aj pri
dopyte** (`dopyt/novy.tsx:133`). Kto taký inzerát vytvoril, nedal sa nájsť.
Teraz sa dá.

**Poctivo:** dnes nemá typ „Iné" **ani jeden** inzerát (0 z 50 ACTIVE) ani
dopyt (0 z 26) — merané cez REST. Čip teda dnes vráti prázdny výsledok. Nie
je to chyba filtra, len stav dát.

---

## 3. Tretí riadok v Dopytoch — doplnené na tvoje slovo

Pri prvom nasadení tab Dopyty tretí riadok nemal a nahlásil som to ako
rozhodnutie pre teba. Povedal si **„pridaj Najnovšie do Dopytov"** — hotové.

- V Dopytoch je tretí riadok: **`Najnovšie`**.
- Triedenie ide **do dotazu** (`created_at` zostupne), nie je to len štítok.
  Keby sa do neho dostala nepodporovaná možnosť, vypíše to do logu a zoradí
  podľa novosti — nie tichý catch (§2).
- **„Čoskoro končí" tam nie je.** `buyer_request` nemá v modeli uzávierku,
  takže by nemalo podľa čoho triediť. Pridať ju znamená zmeniť model — to je
  iné zadanie, povedz, ak to chceš.
- **Srdiečko tam nie je** — dopyt sa nedá „obľúbiť".

**Čo si na tom všimneš:** keď je možnosť jediná, čip je **vždy aktívny** —
je to rádio s jednou voľbou, teda ukazovateľ toho, ako je zoznam zoradený.
Katalóg sa chová rovnako: ťuknutie na už aktívne triedenie tam tiež nič
nemení. Ak z toho má byť skutočná voľba, dá sa pridať druhé triedenie zo
stĺpcov, ktoré dopyt má (napr. podľa rozpočtu) — nepridal som ho, je to tvoje
rozhodnutie.

Poistka ostáva: keby obrazovka triedenie vôbec nepodala, riadok bez čipov sa
**nevykreslí** (žiadna medzera bez obsahu) — overené testom.

---

## 4. Dôkazy

Poradie sa dovtedy dalo overiť **len okom na telefóne**. Preto som ho
vytiahol z komponentu do čistého modulu `src/lib/filter-rows.ts` — riadky sú
dáta a tá **istá funkcia** ich dáva katalógu aj Dopytom, takže sa medzi tabmi
nemôžu rozísť.

| Čo | Ako | Výsledok |
|---|---|---|
| poradie a zloženie riadkov | `npx --yes tsx scripts/check-filters.ts` | **22/22 OK** |
| gestá galérie | `check-gallery.ts` | 33/33 OK |
| Realtime register (§11) | `check-realtime.ts` | 20/20 OK |
| countdown (§10) | `check-deadline.ts` | 12/12 OK |
| typy | `npx tsc --noEmit` | čisté |
| dáta pre „Iné" | REST SELECT po typoch | 0 inzerátov, 0 dopytov (viď §2) |
| `package.json` (§9) | `git status` | nedotknutý |

Prvá kontrola v teste **naschvál vyrobí pôvodnú chybu** — bez toho by test
nedokazoval nič:

```
── 1. pôvodná chyba: jeden zoznam mieša kategórie ──
  OK   zalamovaný zoznam by v prvom riadku zmiešal typ obchodu s typom nehnuteľnosti
        „Predaj · Prenájom · Byt · Dom" — presne to, čo Rastio nahlásil
  OK   v troch riadkoch sa to už stať NEMÔŽE — prvý riadok má len typ obchodu
── 3. tab DOPYTY: iné slová v 1. riadku, rovnaká štruktúra ──
  OK   1. riadok — smer trhu z pohľadu hľadajúceho: Kúpim · Hľadám prenájom
  OK   Dopyty majú TRI riadky — tretí je „Najnovšie"
  OK   „Čoskoro končí" v Dopytoch NIE JE (dopyt nemá uzávierku v modeli)
  OK   PRÁZDNY tretí riadok sa NEVYKRESLÍ (žiadna medzera bez obsahu)
── 4. žiadny riadok nesmie miešať kategórie ──
  OK   Nehnuteľnosti: každý čip patrí do kategórie svojho riadku
  OK   Dopyty: každý čip patrí do kategórie svojho riadku
```

**Čo dôkaz NEDOKAZUJE:** ako to vyzerá — či je medzera dosť výrazná a linka
dosť jemná. Test overuje poradie a zloženie, nie vzhľad. Preto je vzhľad
**🟡**, nie ✅ (§1).

Vedľajšia vec, ktorú si zmena vyžiadala: štítky `TRANSACTION_LABEL`,
`DEMAND_LABEL` a `PROPERTY_LABEL` sa presunuli do nového `src/lib/labels.ts`
(čistý modul bez importov), pretože `property.ts` importuje `./supabase` a
v Node sa načítať nedá. `property.ts` ich **re-exportuje**, takže žiadne
existujúce miesto sa nemenilo — presne ako pri `deadline.ts` 13.8.2026.

---

## 5. OTA

Nový natívny modul nepribudol, `package.json` sa nemenil → **IDE OTA.**

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS), group `2f157477-b508-4a43-bf8e-27719aa7fb0b` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → balík k tebe dorazí (§9). Commit v OTA: `10ad946`.

Poznámka pre budúcnosť: publikovanie **oboch platforiem naraz** tu padá na
`SIGKILL` (prostredie má 3,8 GB RAM, Metro bundluje iOS aj Android
súčasne). Odteraz publikujem **po platformách** — najprv iOS, potom
Android. Nie je to chyba appky.

---

## 6. Čo mi máš potvrdiť (slovami, žiadne screenshoty)

Screenshoty od teba nechcem a už ich ani nebudem navrhovať — zapísané do
CLAUDE.md §1, aby to nezáviselo od pamäti. Stačí mi, čo vidíš:

**Tab Nehnuteľnosti:**

1. Sú tam **tri riadky** v tomto poradí: `Predaj · Prenájom` →
   `Byt · Dom · Pozemok · Komerčný priestor · Iné` →
   `Najnovšie · Čoskoro končí · ♥`?
2. Je na prvý pohľad vidno, že sú to **tri skupiny**, nie jeden zoznam?
   Ak nie, napíš to — ďalší krok sú viditeľné názvy kategórií nad riadkami.
3. Je nad tretím riadkom **tenká linka**?
4. Ťukni na **Iné** — má vyjsť prázdny výsledok (dnes taký inzerát nikto
   nemá) a filter sa má dať zrušiť.

**Tab Dopyty:**

5. Prvý riadok hovorí **`Kúpim · Hľadám prenájom`** (nie Predaj/Prenájom)?
6. Druhý riadok je rovnaký ako v Nehnuteľnostiach, vrátane **Iné**?
7. Tretí riadok obsahuje **`Najnovšie`** (a nič iné) — nad ním linka?
   Čip je vždy aktívny, to je zámer (viď §3).

**Že sa nič nestratilo (§10):** na karte v katalógu je stále vidieť
**„Ponuky do… · ostáva X dní"** a **„Pridané [dátum]"**.
