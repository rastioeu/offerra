# Tab bar v detaile inzerátu — bug, nie len tesný dizajn

**Dátum:** 13. 8. 2026
**Zadanie:** Rastio, so screenshotom — 5 podtabov (Ponuky/Správy/Obhliadka/
Hypotéka/Hodnotenia) natlačených na jeden riadok, stiesnené a zle čitateľné.
**Nasadenie:** **IDE OTA** — len JS, žiadna zmena `app.json`.

---

## Diagnostika najprv (§2)

Lišta v `src/components/property-tabs.tsx` **už bola** vo `ScrollView`
s `horizontal` — scroll bol tam od Fázy 13. Problém teda nebol „appka
nescrolluje", ale že **nikdy nemala prečo** — a to je iná, konkrétnejšia
chyba.

Príčina: `tab` mal `flex: 1` a bol vykreslený vo vnútri
`contentContainerStyle` horizontálneho `ScrollView`u. Vnútri
horizontálneho scrollu nemá obsah pevnú šírku — yoga layout preto `flex: 1`
vyriešil tak, že **VŠETKÝCH päť tabov vtesnal presne do šírky obrazovky.**
Scroll gesto nemalo čo posúvať, lebo obsah nikdy nebol širší než viewport.
Presne to bolo na tvojom screenshote: stlačené, orezané „Obhliadka".

Toto som **overil rozborom kódu, nie hádaním** — je to čítanie kódu, takže
podľa CLAUDE.md §1 to samo osebe nie je dôkaz, len diagnóza pred opravou.

---

## Riešenie — možnosť 1 (scroll), s dôvodom

Zvolil som **horizontálne scrollovateľnú lištu**, tak ako si odporúčal.
Skontroloval som, či appka má podobný vzor inde — **filter čipy v katalógu
(`search-bar.tsx`) WRAPUJÚ, nie scrollujú** (`flexWrap: 'wrap'`), takže
žiadny existujúci scroll vzor na zjednotenie nebol. To je ale správne aj
tak: filter čipy sú viacnásobný výber, kde má zmysel vidieť všetky naraz;
taby sú jediný-výber navigácia, kde je horizontálny scroll bežný iOS vzor
(App Store kategórie, Fotky, Mail).

**Dve reálne opravy, nie kozmetika:**

1. **`flex: 1` preč.** Tab má teraz šírku podľa textu a paddingu
   (`paddingHorizontal: Spacing.md`). Súčet piatich tabov teraz legitímne
   presahuje šírku obrazovky, takže scroll má čo robiť.
2. **Rámik (pozadie, orámovanie, zaoblenie) presunutý na VONKAJŠÍ `View`**,
   mimo scrollovaného obsahu. Predtým bol na `contentContainerStyle` —
   keby zostal tam, pri scrollovaní by sa rámik posúval s obsahom a pri
   pohľade na koniec zoznamu by chýbal vľavo. Teraz je pripnutý
   k viewportu a je vidieť pri KAŽDEJ pozícii scrollu.

**Náznak, že lišta pokračuje ďalej:** vonkajší `View` má `overflow: 'hidden'`,
takže posledný tab je pri prvom vykreslení zámerne **odrezaný** — rovnaký
vzor ako App Store alebo Fotky. Zvažoval som farebný fade na okraji, ale to
by vyžadovalo `expo-linear-gradient`, teda **nový natívny modul a nový
build** (CLAUDE.md §3/§9) — na signalizáciu toho, že sa dá posunúť prstom,
to nestojí. Odrezaný tab robí to isté bez jediného riadku natívneho kódu.

**Skratky názvov som nepoužil.** Skúšal si to ako možnosť len „ak scroll
naozaj nestačí" — a stačí. „Hyp." by nikomu nič nepovedalo a plné slová sa
teraz zmestia, len sa oň treba posunúť.

Aktívny tab (biele pozadie + tučné písmo oproti priehľadnému pozadiu
a `textMuted`) je nezmenený a funguje pri každej pozícii scrollu, keďže je
to vlastnosť jednotlivého tabu, nie pozície v zozname.

---

## Dôkaz

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

Skúšal som spustiť skutočnú appku vo webovom móde (`expo start --web`)
a odfotiť ju automatizovaným prehliadačom — to by bol silnejší dôkaz než
kresba. **V tomto prostredí to ale spoľahlivo nenabehlo** (React Native
DevTools sa pokúša spustiť Electron, ktorý v tomto sandboxe bez GUI padá)
a naťahovanie by aj tak dokazovalo len RN-web vykreslenie, nie natívne iOS
— to sú dve odlišné veci, presne to, pred čím varuje CLAUDE.md §3
(„Offerra sa netestuje cez Expo Go" — a RN-web je tretia vec, ešte ďalej
od TestFlight).

Namiesto toho: `reports/tab_bar_pred_po.png` — kresba **z hodnôt
v `tokens.ts` a z tej istej matematiky rozloženia, akú počíta React
Native** (rovnaký prístup ako pri placeholderoch 12.8.2026), pri šírke
zodpovedajúcej skutočnému iPhonu (390pt). PRED simuluje presne to, čo
robil starý `flex: 1` — vygenerovaný text sa orezáva presne tak, ako by ho
orezal skutočný layout pri nedostatku miesta. PO ukazuje prirodzené šírky
a odrezaný posledný tab.

**Nie je to screenshot appky.** Dokazuje logiku opravy, nie jej vzhľad na
telefóne — preto zostáva 🟡, nie ✅ (§1).

`npx tsc --noEmit` — bez chýb.

### Čo má Rastio overiť na telefóne

- [ ] Detail ľubovoľného inzerátu (najlepšie SALE, nech je vidno aj tab
      Hypotéka = 5 tabov) → lišta sa dá **potiahnuť prstom doľava/doprava**.
- [ ] Pri prvom otvorení je **posledný tab čiastočne odrezaný** — vidno, že
      pokračuje ďalej.
- [ ] Text v žiadnom tabe sa neorezáva ani nezalamuje.
- [ ] Aktívny tab je jasne odlíšený **pri každej pozícii scrollu** — skús
      to na taboch na oboch koncoch lišty, nielen na prvom.
- [ ] Rámik lišty (pozadie, zaoblené rohy) **zostáva na mieste** pri
      scrollovaní, neposúva sa s obsahom.
- [ ] PRENÁJOM inzerát (4 taby, bez Hypotéky) — over, že sa zmestí
      pohodlnejšie, ale scroll aj tam funguje rovnako.

---

## KONTROLA PRED HOTOVO

| bod | stav |
|---|---|
| Tab bar s 5 podtabmi je čitateľný, nie stiesnený — dôkaz (screenshot pred/po) | 🟡 kresba z tokenov priložená; skutočný screenshot appky nemám ako spraviť v tomto prostredí |
| Scroll funguje plynulo, jasný náznak že pokračuje ďalej | ✅ logika opravená a overená rozborom (`flex: 1` odstránený, obsah je teraz širší než viewport) / 🟡 plynulosť gesta overuje Rastio |
| Aktívny tab zostáva jasne odlíšený vo všetkých stavoch | ✅ farba/pozadie sú vlastnosť jednotlivého tabu, nezávisia od scroll pozície — logicky nemôže prestať fungovať / 🟡 vizuálne potvrdenie |
