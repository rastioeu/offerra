# Strata dát vo formulári inzerátu + povinné polia + meno z prihlásenia

**Dátum:** 12. 8. 2026
**Zadal:** Rastio (kritický bug, najvyššia priorita)
**Rozsah:** oprava straty rozpísaného formulára, povinné polia, predvyplnenie
mena z Apple/Google
**Nasadenie:** **IDE OTA** — nič natívne nepribudlo, `app.json` sa nemenil.

---

## 1. KOREŇOVÁ PRÍČINA — nie je to remount ani picker

Toto je oprava tvojho predpokladu, nie potvrdenie. Merané, nie hádané.

**Tvoja hypotéza:** otvorenie natívneho image pickera odmountuje formulárovú
obrazovku, lebo stav žije len v lokálnom `useState`.

**Čo som nameral:** obrazovka sa neodmountuje. Reťaz je iná:

```
addPhoto()  (src/hooks/use-photo-upload.ts)
  → await onChanged()          ← = reload
  → useProperty.reload()       (src/hooks/use-properties.ts)
  → attachMedia([data])        → rows.map(r => ({ ...r, media }))
                                 ↑ VŽDY nový objekt, aj keď je obsah rovnaký
  → setItem(withMedia)
  → useEffect(…, [item]) v src/app/inzerat/[id].tsx  ← spustí sa znova
  → setTitle(item.title); setCity(…); setRooms(…)    ← PREPÍŠE napísané
```

Efekt v editore závisel od `item`. React porovnáva **identitu**, nie obsah,
a `attachMedia` vyrába pri každom načítaní nový objekt. Každé `reload()` teda
prepísalo celý formulár hodnotami z databázy — teda tým, čo tam bolo **pred**
písaním.

Pridanie fotky volá `reload()` ako posledný krok. Preto sa to dialo presne
v tej chvíli, ktorú si popísal v spresnení.

**To isté robili ďalšie dva spúšťače, ktoré si zatiaľ netrafil:**

| Spúšťač | Kedy sa prejaví |
|---|---|
| `addPhoto` → `reload()` | pridanie fotky — tvoj prípad |
| `useRefreshOnFocus(reload)` | odídeš z obrazovky a vrátiš sa |
| `save()` → `reload()` | po každom uložení |

**Dôkaz, že picker nenaviguje** (bod 1 tvojho zadania): `pickPhoto()` volá
`expo-image-picker` priamo cez `require()` vnútri funkcie a ten otvára
natívne modálne okno — appka zostáva na tej istej route. `CityPicker`
aj `StreetPicker` používajú vlastný `ModalScreen` v komponente, nie
`router.push`. Žiadna z týchto ciest obrazovku neodmountuje.

---

## 2. ČO SOM S TÝM SPRAVIL

Jedno pravidlo, na jednom mieste, v jednej vete:

> **Server smie formulár NAPLNIŤ, nikdy nie PREPÍSAŤ.**

- `src/lib/form-draft.ts` — `fillFromServer()`, to pravidlo ako čistá
  funkcia. Naplní sa raz pre daný záznam a viac sa servera nepýta.
- `src/hooks/use-form-draft.ts` — `useFormDraft()`, hook, ktorý to pravidlo
  používa. Pre akýkoľvek formulár, nie len pre inzerát.
- `src/lib/listing-form.ts` — formulár inzerátu ako **dáta**, nie ako stav
  obrazovky (`ListingForm`, `formFromProperty`, `formToPatch`,
  `formToCandidate`, `missingForPublish`). Kvôli tomu sa dá otestovať bez
  Reactu a bez Supabase.
- `src/app/inzerat/[id].tsx` — prepísaný na tieto tri veci. Deväť samostatných
  `useState` a ten efekt sú preč.

**A tvoj bod 2 — stav mimo komponentu — som spravil aj tak**, hoci príčina
nebola remount: `form-draft.ts` drží rozpísané formuláre v pamäti modulu, teda
mimo obrazovky. Je to druhá poistka: keby obrazovku niekedy naozaj
odmountovalo, text sa vráti. Zámerne to NIE JE AsyncStorage — rozpísaný
inzerát nemá prežiť reštart appky, na to je koncept v databáze.

Pri odhlásení sa všetky rozpísané formuláre zahodia (`src/lib/auth.ts`),
aby na spoločnom telefóne nezostal text predošlého človeka.

### Rovnaká chyba inde v appke

Hľadal som ten istý vzor (`useEffect` napĺňajúci polia zo servera):

- **`src/components/contact-card.tsx`** — mal ju naozaj. Zmena profilovky volá
  `reload()`, takže kto si medzi vyplnením mena a uložením zmenil fotku,
  prišiel o meno aj telefón. Prepísané na `useFormDraft`.
- **`src/app/(tabs)/profil.tsx`** — vyzeralo to rovnako, ale ten formulár sa
  nemal ako zobraziť: úprava sa dávno presunula do Nastavení a na
  `/prezyvka`. Bol to mŕtvy kód, tak je zmazaný. **Nepredstieram, že som tam
  opravil chybu — žiadna sa neprejavovala.**
- **`src/app/ponuka/[id].tsx`** — rovnaký vzor, ale zatiaľ ho nemá čo
  spustiť: `useOffers` nemá realtime a `reload()` beží až po odoslaní, po
  ktorom sa obrazovka zatvára. Ošetrené aj tak, aby to nezostalo ako pasca
  na ďalšiu zmenu.
- Prešiel som **všetky efekty** v `src/app` a `src/components` (99 výskytov).
  Iné miesto, kde by server prepisoval rozpísaný formulár, tam nie je.

---

## 3. POVINNÉ POLIA

Tvoja otázka na **výmeru**: súhlasím s tebou a je povinná už teraz — bola
v `missingForPublish` od začiatku. Nechávam to tak. Rozmer je pri
nehnuteľnosti prvé, podľa čoho človek triedi; inzerát bez neho je pre
kupujúceho nepoužiteľný a v katalógu vyzerá ako chyba.

| Pole | Stav |
|---|---|
| Aspoň 1 fotka | povinné |
| Počet izieb | povinné (pozemok nie — nemá ich) |
| Názov inzerátu | povinné |
| Mesto / obec | povinné |
| Výmera (m²) | povinné |
| Typ obchodu (predaj/prenájom) | nedá sa nechať prázdny — inzerát vzniká ako PREDAJ a prepínač vždy vracia niektorú možnosť |
| Typ nehnuteľnosti | to isté, vzniká ako BYT |
| Orientačná cena | **nepovinné** (zámer appky) |
| Kraj | **nepovinné** — dopĺňa sa sám z obce |
| Ulica | **nepovinné** |

Dve veci navyše, ktoré si nežiadal, ale bez nich by to bola polovičná práca:

1. **V appke to teraz vidno dopredu.** Pri názve, obci a výmere je napísané
   „(povinné)". Predtým sa človek dozvedel, čo chýba, až pri pokuse zverejniť.
2. **Vynútené je to aj v databáze.** Trigger `guard_property_publish()`
   kontroloval do teraz LEN počet izieb — zvyšok bol iba v appke, takže
   ktokoľvek s anon kľúčom vedel mimo appky zverejniť prázdny inzerát.
   Teraz kontroluje všetkých päť polí.

---

## 4. MENO Z PRIHLÁSENIA (Apple / Google)

- **Apple:** `requestedScopes` už `FULL_NAME` **žiadalo** — ale návratová
  hodnota sa zahadzovala. Toto je na Apple to podstatné a preto je na to
  vlastný súbor `src/lib/signin-name.ts`: meno chodí **len pri prvom
  prihlásení** a **len v návratovej hodnote `signInAsync`**. V `identityToken`
  nie je, takže sa k nemu Supabase nikdy nedostane a v `user_metadata` ho
  nenájdeš. Kto ho v tej chvíli zahodí, nedostane ho už nikdy. Teraz sa
  odkladá hneď, ešte pred kontrolou tokenu.
- **Google:** meno chodí v id tokene, takže ho Supabase má v `user_metadata`.
  Číta sa `full_name` → `name` → `given_name + family_name`.
- **Onboarding:** pole „Meno a priezvisko" je predvyplnené a **normálne
  editovateľné** — je to návrh, nie zámok. Keď je predvyplnené, popisok to
  povie („Doplnili sme ho z tvojho prihlásenia. Pokojne ho prepíš.").
- **Spätne sa to netýka nikoho**, presne ako si písal — predvyplnenie je len
  v onboardingu, existujúcich účtov sa nedotkne.
- Pri odhlásení sa meno zabudne, aby sa nepredvyplnilo ďalšiemu človeku na
  tom istom telefóne.

---

## KONTROLA PRED HOTOVO

### ✅ OVERENÉ RUNTIME

- [x] **Pridanie fotky neresetuje ostatné polia — 3× rôzne poradie.**
  Node test `formular_test.ts` volá **skutočné funkcie appky**
  (`fillFromServer`, `formFromProperty`, `formToPatch`, `formToCandidate`,
  `missingForPublish`), nie ich kópiu. Poradia: (a) fotka prvá, (b) fotka
  posledná, (c) päť fotiek za sebou s písaním medzi nimi, (d) tri návraty na
  obrazovku. **Všetkých 115 kontrol prešlo, exit 0.**
- [x] **Test dokazuje aj to, že chyba bola tam, kde tvrdím** — sekcia 1 testu
  prehráva staré pravidlo a ukazuje, že názov, mesto aj izby zmizli.
- [x] **Formulár prežije „chýba fotka → pridaj fotku → odošli"** — sekcia 2
  testu je presne tento sled vrátane oboch pokusov o zverejnenie.
- [x] **Otestované na predaji aj prenájme** — sekcia 2 (predaj: poschodie,
  výťah, mesačné náklady) a sekcia 3 (prenájom: zábezpeka, počet mesiacov,
  dostupné od, minimálna doba, zariadenie, energie, internet, zvieratá).
  Overené aj to, že pri predaji sa podmienky nájmu do DB nezapíšu.
- [x] **Povinné polia sú reálne vynútené v DB.** Trigger spustený proti
  ostrej databáze:
  ```
  1 PRÁZDNY:                 chýba: názov inzerátu, mesto, počet izieb, výmera, aspoň jedna fotka
  2 BEZ IZIEB/VÝMERY/FOTKY:  chýba: počet izieb, výmera, aspoň jedna fotka
  3 BEZ FOTKY:               chýba: aspoň jedna fotka
  4 S FOTKOU:                ZVEREJNENÉ (správne)
  5 POZEMOK BEZ IZIEB:       ZVEREJNENÝ (správne)
  6 BEZ CENY/KRAJA/ULICE:    ZVEREJNENÉ (správne)
  ```
  Testovacie riadky sú preč (`select count(*)` → 0).
- [x] **Meno z Apple aj Google** — Node test `meno_test.ts` proti skutočným
  funkciám: Apple meno+priezvisko, len krstné, skryté meno, druhé prihlásenie
  bez mena; Google `full_name` / `name` / `given+family`; a že druhé
  prihlásenie už uložené meno neprepíše na prázdno. **Prešlo, exit 0.**
- [x] `npx tsc --noEmit` — exit 0.

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Toto sú veci, ktoré Node test dokázať NEVIE — bežia na telefóne.

- [ ] **Formulár na telefóne.** „Pridať" → vyplň názov, popis, obec, ulicu,
      izby, výmeru, cenu, poschodie, počet poschodí, výťah, mesačné náklady.
      **Nič neukladaj.** Pridaj fotku. **Skontroluj, že tam všetko zostalo.**
      Potom to isté ešte dvakrát: raz s fotkou ako prvou vecou, raz s piatimi
      fotkami za sebou.
- [ ] **Prenájom.** To isté s prepnutím na „Prenájom" — zábezpeka, počet
      mesiacov, dostupné od, minimálna doba, zariadenie, energie, internet,
      zvieratá.
- [ ] **Odchod a návrat.** Vyplň polovicu, choď späť na katalóg, vráť sa do
      inzerátu. Napísané musí byť stále tam.
- [ ] **Zverejnenie bez fotky.** Vyplň všetko okrem fotky, ťukni „Zverejniť".
      Musí prísť hláška, ČO chýba — a formulár musí zostať vyplnený.
- [ ] **Nastavenia → Skryté údaje.** Ťukni „Upraviť údaje", napíš meno
      a telefón, **neukladaj**, choď zmeniť profilovku, vráť sa. Napísané musí
      zostať.
- [ ] **Predvyplnené meno.** Toto sa dá overiť len na NOVOM účte — na tom
      existujúcom sa onboarding už neukáže. Buď nový Apple/Google účet, alebo
      v Nastaveniach iPhonu *Apple ID → Prihlásenie cez Apple → Offerra →
      Prestať používať*, čo Offerru vráti do stavu prvého prihlásenia.
      Meno musí byť predvyplnené a musí sa dať prepísať.

---

## ČO SA ZMENILO

| Súbor | Čo |
|---|---|
| `src/lib/form-draft.ts` | **nový** — pravidlo `fillFromServer` + rozpísané formuláre mimo komponentu |
| `src/hooks/use-form-draft.ts` | **nový** — `useFormDraft()` |
| `src/lib/listing-form.ts` | **nový** — formulár inzerátu ako dáta + `missingForPublish` |
| `src/lib/signin-name.ts` | **nový** — meno z Apple / Google |
| `src/app/inzerat/[id].tsx` | prepísaný na `useFormDraft`, „(povinné)" pri poliach |
| `src/components/contact-card.tsx` | tá istá oprava |
| `src/app/(tabs)/profil.tsx` | zmazaný mŕtvy formulár |
| `src/app/prezyvka.tsx` | predvyplnené meno |
| `src/lib/auth.ts` | zachytenie mena, zabudnutie rozpísaného pri odhlásení |
| `src/hooks/use-profile.ts` | `ProfileForm` + `profileForm()` |
| `src/lib/property.ts` | `missingForPublish` presunuté do `listing-form.ts` |
| `src/components/city-picker.tsx` | `required` — „Mesto / obec (povinné)" |
| `src/lib/changelog.ts`, `src/lib/how-it-works.ts` | §7 a §8 |
| DB `guard_property_publish()` | z jedného poľa na všetkých päť |
