# Pád pri „Upraviť" (systémovo) + fullscreen galéria

17.8.2026. Dve zadania od Rastia: (1) crash v editore inzerátu — s
výslovnou požiadavkou na architektonické riešenie, nie tretiu záplatu,
(2) fullscreen prehliadač fotiek. Podrobné statusy podľa CLAUDE.md §1 sú
v `OFFERRA_REGISTER.md` Fáza 25, toto je zhrnutie.

---

## 1. Crash — koreňová príčina je INÁ, než hovorilo zadanie

Zadanie navrhovalo: „`.on()` MUSÍ byť pred `.subscribe()`, v jednom
reťazi". **Toto nebola príčina ani pri tomto páde, ani pri tom v
`NotificationBell` 8.8.2026.** Poradie bolo na oboch miestach správne, v
jednej reťazi — dá sa to prečítať v `git show 83d6009`.

Skutočná príčina je v `realtime-js`, `RealtimeClient.channel()`:

```js
const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
if (!exists) { …vytvor nový… } else { return exists; }
```

`supabase.channel(topic)` pri rovnakom názve **nevracia nový kanál, ale
ten už existujúci — často už pripojený.** Druhé `.on()` naň potom padne.

**Konkrétne pri tomto páde:** `useProperty(id)` je na **štyroch**
obrazovkách — detail, editor, ponuka, ponuky — a expo-router necháva
predchádzajúcu obrazovku namontovanú. Klik na „Upraviť" na detaile teda
otvoril editor s tým istým `id`, `supabase.channel('property-<id>')`
vrátilo už pripojený kanál detailu, a `.on()` naň zhodilo appku. Presne
to isté ako v `NotificationBell`, kde bol `AppHeader` na štyroch taboch.

To je dôvod, prečo sa oprava nedala urobiť „správnym poradím" — poradie
už správne bolo. Musela zmiznúť možnosť kolízie názvov.

### Druhá, tichá chyba toho istého vzoru

Per-instance `removeChannel(channel)` v cleanupe: keď z dvoch obrazoviek
na tom istom kanáli odišla prvá, **vypla Realtime aj tej druhej**, ktorá
ostala otvorená. Appka nespadla, nič nenahlásila — len prestali chodiť
živé zmeny. Toto by samotná oprava crashu nechala nedotknuté.

---

## 2. Riešenie — zdieľaný register, nie záplata

Všetky Realtime kanály idú odteraz cez `src/hooks/use-realtime-channel.ts`
(čistá, v Node testovateľná vrstva: `src/lib/realtime.ts`). Volajúci
**nedostane do ruky `.on()`, `.subscribe()` ani samotný kanál** — odovzdá
odbery ako dáta:

```ts
useRealtimeChannel({
  topic: id ? `property-${id}` : null,
  bindings: [{ event: 'UPDATE', schema: 'offerra', table: 'property', filter: `id=eq.${id}` }],
  onChange: () => void reload(),
});
```

Tri veci naraz, každá zabíja jednu z pozorovaných chýb:

| Garancia | Čo tým zaniklo |
|---|---|
| `.on()` sa nedá napísať po `.subscribe()` — reťaz skladá register | nesprávne poradie sa nedá vyjadriť |
| jeden kanál na topic + **počítadlo odberateľov** (druhý vlastník už `.on()` nevolá, len pridá callback) | **pád, ktorý Rastio nahlásil** |
| kanál sa zatvorí až pri odchode **posledného** odberateľa | tichá strata živých zmien pri odchode prvej obrazovky |

Názov skutočného kanála navyše obsahuje odtlačok odberov, takže dva rôzne
odbery pod tým istým logickým topicom dostanú dva kanály a oba fungujú.

### Zoznam VŠETKÝCH miest s Realtime kanálom — a stav po prevode

`grep -rn "\.channel(" src/` pred prácou vrátil tri skutočné volania:

| Miesto | Topic | Stav |
|---|---|---|
| `src/hooks/use-properties.ts` (`useProperty`) | `property-<id>` | ✅ prevedené — **toto padalo** |
| `src/hooks/use-notifications.ts` (zvonček) | `notif-<userId>-<suffix>` | ✅ prevedené |
| `src/hooks/use-pending-reports.ts` (admin odznak) | `reports-<suffix>` | ✅ prevedené |

Po prevode nevracia grep **žiadne** ručné volanie — jediné miesto, kde
kanál naozaj vzniká, je register (cez vpichnutého klienta). Zostali tri
zásahy v komentároch.

---

## 3. Dôkaz k bodu 1

`npx --yes tsx scripts/check-realtime.ts` — **20/20**.

Test má cenu len preto, že jeho napodobenina klienta sa chová presne ako
`realtime-js` v tých dvoch vlastnostiach, ktoré pád spôsobili: rovnaký
názov vracia ten istý objekt, a `.on()` po `.subscribe()` hodí chybu s tou
istou hláškou. **Prvá kontrola v teste to priamo dokazuje** — pustí starý
ručný kód a čaká, že padne:

```
OK   napodobenina vyrobí PÔVODNÝ pád (starý ručný kód)
     Error: cannot add postgres_changes callbacks for
     realtime:property-9a0aac62 after subscribe()
```

Bez tejto kontroly by test nedokazoval nič — mohol by prechádzať aj s
napodobeninou, ktorá pád nevie vyrobiť. Ďalej overuje presne ten scenár zo
zariadenia (detail + editor s tým istým `id` → bez pádu, jeden kanál,
poradie `on → subscribe`, zmena dorazí obom), štyri obrazovky naraz,
životnosť kanála pri postupnom odchode, rôzne odbery na tom istom topicu,
stav pre neskoro pripojenú obrazovku, dvojitý cleanup a chybu v jednom
handleri.

**Test našiel skutočnú dieru v mojom vlastnom kóde:** register otváral
kanál aj pri prázdnom zozname odberov — pripojil by sa a nikdy nič
nedoručil. Poistka je teraz v registri, nie len v hooku, aby ju nešlo
obísť iným volajúcim.

---

## 4. Fullscreen galéria

`src/components/photo-lightbox.tsx`, napojené na hero galériu detailu.

- **Otvára sa dvoma spôsobmi** — ťapnutím priamo na fotku (prirodzenejšie
  gesto, ako si žiadal) aj ikonou `arrow.up.left.and.arrow.down.right`
  v rohu galérie. Ikona je tam preto, že bez nej by nebolo vidieť, že sa
  to dá.
- **Otvorí sa na tej fotke, ktorú človek práve pozerá**, nie od prvej.
- **Listovanie** do strán medzi všetkými fotkami inzerátu.
- **Počítadlo `n/N` sa nepísalo druhý raz** — použitý `PhotoBadge` z
  `ui.tsx`, ten istý komponent ako v hero galérii a na karte, presne ako
  si žiadal („appka už počítadlo má, prenes ho aj sem").
- **Pinch-to-zoom** + dvojťap na priblíženie/vrátenie. Kým je fotka
  priblížená, vodorovné listovanie sa vypne — inak si pinch a paging
  kradnú to isté gesto.
- **Zatvorenie:** X v rohu (vždy na tom istom mieste, spoľahlivá cesta),
  potiahnutie dole, a na Androide aj systémové Späť.

Jediná hardcodovaná farba je čierne pozadie prehliadača — vedomá výnimka
z §5, zapísaná v komentári: fullscreen fotky majú byť neutrálne čierne
v oboch režimoch, aby plocha nefarbila fotku.

---

## 5. Dôkaz k bodu 4 — a čo z neho NEVYPLÝVA

`npx tsc --noEmit` čisté a `npx expo export --platform ios` prešiel —
5,2 MB Hermes balík. To dokazuje, že sa kód **preloží a je v balíku**, nie
že gestá na telefóne fungujú.

Overil som, že nový kód sa do balíka naozaj dostal, nie len že build
nespadol. Hermes ukladá ne-ASCII reťazce ako UTF-16, takže prvé hľadanie
v `grep` falošne hlásilo „chýba" — po prehľadaní oboma kódovaniami:

```
JE V BALÍKU (utf-16-le)  Dvojťap priblíži
JE V BALÍKU (utf-16-le)  [GALÉRIA] Otváram fullscreen
JE V BALÍKU (utf-16-le)  Zavrieť fotku
JE V BALÍKU (utf-16-le)  pripájam sa na existujúci kanál
JE V BALÍKU (utf-16-le)  posledný odberateľ
JE V BALÍKU (utf-8)      __workletHash
```

`__workletHash` v balíku znamená, že sa babel plugin pre worklety naozaj
spustil — `babel.config.js` v repe nie je, o plugin sa stará
`babel-preset-expo`.

🟡 **Gestá a vzhľad prehliadača sú vizuálne overenie — to som nedával
✅ a dať nemôžem (§1).** Čo presne otestovať, je nižšie.

---

## 6. OTA — overené, nie predpokladané

Fullscreen je **prvé použitie `react-native-reanimated` v appke**, takže
som overil, či je vôbec v binárke buildu #5 — cez OTA by inak spadol:

```
$ git show 40e3db0:package.json | grep -E "reanimated|worklets|gesture-handler"
    "react-native-gesture-handler": "~2.32.0",
    "react-native-reanimated": "4.5.1",
    "react-native-worklets": "0.10.1"
```

`40e3db0` je commit, z ktorého vznikol build #5. Verzie sú **identické**
s dnešnými → moduly sú skompilované v binárke, nový build netreba.

**IDE OTA.** `package.json` ani `package-lock.json` sa nezmenili.

**Publikované 17.8.2026, runtime overený podľa §9:**

| | Runtime |
|---|---|
| publikovaná OTA (iOS), group `e67997d3` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → balík sa na TestFlight build **dostane**. Commit v OTA `8a8a1fa`.

### 🔴 Skoro som zopakoval incident z 13.8.2026

`npx expo lint` si **sám doinštaloval `eslint` a `eslint-config-expo` do
`devDependencies`** — teda presne tá zmena `package.json`, ktorá 13.8.2026
odstrihla dva OTA balíky od Rastiovho buildu (§9). Všimol som si to hneď
po behu, `git checkout -- package.json package-lock.json` to vrátil a
finálna kontrola je čistá.

**Dôsledok: `expo lint` sa v tomto repe nedá spustiť bez porušenia §9.**
Lint teda v tejto dávke NEPREBEHOL — je to vedomá diera v overení, nie
prehliadnutie. Ak ho chceš mať, treba to rozhodnúť zvlášť: eslint v
`devDependencies` znamená nový build.

---

## 7. §10 — kontrola vecí, čo sa tichi strácajú

Dotkol som sa obrazovky detailu inzerátu, takže povinná kontrola:

- **Countdown logika** — `check-deadline.ts` 12/12 OK
- **Countdown dáta** — 3 ACTIVE inzeráty s uzávierkou v budúcnosti
  (Prievidza 5 dní, Poprad 12, Martin 21)
- **„Pridané [dátum]" na karte** — `property-card.tsx:233`, nedotknuté
- Zvyšky testovacích dát: `example.invalid` v `media` = **0**, ACTIVE bez
  fotky = **0**, vzorka titulných fotiek **12/12 HTTP 200**

---

## 8. Pravidlo v CLAUDE.md

Nová sekcia **§11 „SUPABASE REALTIME — LEN CEZ `useRealtimeChannel`"**:
zákaz ručného `supabase.channel(...)`, vysvetlenie, prečo príčinou nikdy
nebolo poradie `.on()`/`.subscribe()`, a kontrolný zoznam (grep na ručné
volania, test 20/20, zákaz `tsx` v `package.json`).

§8 („Ako funguje Offerra") som **nemenil zámerne** — ani oprava pádu, ani
fullscreen nemenia mechaniku appky, len ju prestali kaziť.

---

## 9. Čo má Rastio otestovať na telefóne

**Pád (hlavné):**
1. Otvor **vlastný** inzerát → **Upraviť**. Nesmie spadnúť. Skús to
   viackrát a aj tak, že sa z editora vrátiš a klikneš znova.
2. Zmeň niečo v inzeráte a ulož — detail pod editorom sa má obnoviť sám.
3. Prepínaj taby (Nehnuteľnosti → Pridať → …) — zvonček nesmie spadnúť
   (tá istá trieda chyby, po prevode na register).
4. Ak si správca: otvor Admin a nechaj pribudnúť nahlásenie — odznak sa
   má prepočítať.

**Fullscreen galéria:**
5. Inzerát s viac fotkami → **ťapni na fotku**. Otvorí sa na tej, ktorú
   si pozeral — nie od prvej.
6. To isté **ikonou** ⤢ v rohu galérie.
7. Vo fullscreene: listuj do strán, počítadlo `n/N` vpravo dole má
   zodpovedať.
8. **Dvojťap** priblíži, druhý dvojťap vráti. **Pinch** tiež. Kým je fotka
   priblížená, listovanie do strán nemá ísť — to je zámer.
9. Zatvor **X** vpravo hore, potom znova a zatvor **potiahnutím dole**.
10. Inzerát s **jednou** fotkou — počítadlo sa nemá zobraziť vôbec.
