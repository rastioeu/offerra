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
TRIEDENIE A OBĽÚBENÉ [Najnovšie] [Čoskoro končí] [♥]
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

## 3. Jedna vec, ktorú som NEDOROBIL — a prečo

**Tab Dopyty nemá tretí riadok.** Nie je tam triedenie ani srdiečko:

- **Triedenie**: `buyer_request` nemá v modeli uzávierku, takže „Čoskoro
  končí" by nemalo podľa čoho triediť — rozhodnuté a zapísané 8.8.2026,
  nevymyslel som to teraz.
- **Obľúbené**: srdiečko je filter nad inzerátmi, dopyty sa nedajú
  „obľúbiť".

Prázdny riadok by nechal v UI medzeru, ktorá vyzerá ako chyba, takže sa
riadok bez čipov **nevykreslí** (overené testom).

**Ak chceš v Dopytoch triediť, dá sa — ale je to tvoje rozhodnutie**, nie
moje: „Najnovšie" by fungovalo hneď (`created_at` existuje), „Čoskoro končí"
by potrebovalo pridať dopytom uzávierku do modelu. Sám som to nepridal,
lebo to mení mechaniku appky, a to nie je „preorganizuj poradie".

---

## 4. Dôkazy

Poradie sa dovtedy dalo overiť **len okom na telefóne**. Preto som ho
vytiahol z komponentu do čistého modulu `src/lib/filter-rows.ts` — riadky sú
dáta a tá **istá funkcia** ich dáva katalógu aj Dopytom, takže sa medzi tabmi
nemôžu rozísť.

| Čo | Ako | Výsledok |
|---|---|---|
| poradie a zloženie riadkov | `npx --yes tsx scripts/check-filters.ts` | **19/19 OK** |
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

## 5. Čo mi máš potvrdiť (slovami, žiadne screenshoty)

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
7. **Chýba** tretí riadok — a nie je po ňom prázdna medzera ani linka? (Tak
   to má byť, viď §3. Ak tam triedenie chceš, povedz.)

**Že sa nič nestratilo (§10):** na karte v katalógu je stále vidieť
**„Ponuky do… · ostáva X dní"** a **„Pridané [dátum]"**.
