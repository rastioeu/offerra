# Tri body zo zadania 19.8.2026: pád v PropertyTabs, tlačidlo „Ako to funguje", zrušená obhliadka

**Dátum:** 19.8.2026
**Vyžiadal:** Rastio
**Stav:** ✅ OVERENÉ RUNTIME (logika, 1+3), 🟡 čaká vizuálne overenie (dve veci) — presne po bodoch nižšie.

---

## 1. Pád „Cannot read property 'contentOffset' of null" — 🟡 OPRAVENÉ, ČAKÁ 5× OVERENIE NA TELEFÓNE

### Diagnostika (§2 — merať, nie hádať)

Jediné tri miesta v celej appke, ktoré čítajú `e.nativeEvent.contentOffset`:

| miesto | čo robí |
|---|---|
| `property-tabs.tsx:216` | scrollovateľný tab bar detailu — počíta `canScrollRight` |
| `nehnutelnost/[id].tsx:166` | počítadlo fotky v hero galérii (`onMomentumScrollEnd`) |
| `walkthrough.tsx:40` | stránkovanie úvodného sprievodcu |

Ani jedno z nich malo predtým ochranu — všetky tri čítali priamo
`e.nativeEvent.contentOffset.x`, presne ten reťazec, ktorý hlásenie
menuje. Zadanie hovorilo o „scroll ref", ale v kóde nie je žiadny
`scrollRef.current.contentOffset` (grep potvrdil) — jediný `scrollRef` v
appke (`walkthrough.tsx`) je použitý len na `scrollTo(...)`, už s `?.`.
Skutočný prístupový bod je `nativeEvent`, nie ref.

**Prečo je `nativeEvent` niekedy `null`, sa v tomto prostredí nedá zmerať**
— potrebuje to skutočné zariadenie a konkrétnu sekvenciu (§3, žiadny
simulátor tu nie je). RN 0.86 už nemá event pooling, takže najpravdepodobnejšie
vysvetlenie je scroll event doručený JS vrstve tesne po/počas
unmountu obrazovky (presne to, čo Rastio opísal — „choď späť a znova
dnu"), keď natívna strana eventu už nemá čo vyplniť. Namiesto ďalšieho
hádania sa pridala ochrana na PRESNE tie tri miesta, čo hlásenie ukazuje,
plus log, aby bolo vidno, ak sa to stane znova.

### Oprava

Všade rovnaký vzor — `e.nativeEvent?.contentOffset?.x`, s tichým
`return` (nie pádom) keď chýba:

```ts
onScroll={(e) => {
  const x = e.nativeEvent?.contentOffset?.x;
  if (x == null) {
    console.log('[TABY] onScroll bez contentOffset — event preskočený');
    return;
  }
  setScrollMeta((m) => ({ ...m, scrollX: x }));
}}
```

Rovnako aj `onLayout` v tom istom tab bare (`e.nativeEvent?.layout?.width`)
— rovnaká trieda prístupu, rovnaká ochrana.

### Dôkaz

- `npx tsc --noEmit` — čisté.
- `npx --yes tsx scripts/check-gallery.ts` — 33/33 (logika listovania sa
  nezmenila, len sa pridala ochrana pred ňou).
- **Toto NEDOKAZUJE, že appka viac nespadne** — je to ochrana proti
  presne tomu prístupu, ktorý hlásenie cituje, nie dôkaz, že som
  reprodukoval pád (nemohol som, žiadny simulátor).

🟡 **Čo Rastio otestuje:** presne to, čo v zadaní — otvoriť detail
inzerátu, prepínať medzi VŠETKÝMI podtabmi, ísť späť a znova dnu, aspoň
5×. Ak appka aj tak spadne (rovnaká alebo iná hláška), napíš mi presné
znenie a KEDY presne (pri ktorom tabe / pri ktorom prechode) — teraz mám
log (`[TABY] onScroll bez contentOffset…`), takže ak pôjde o tento istý
prípad, appka to nabudúce prežije a v konzole to bude vidno.

---

## 2. Tlačidlo „Ako to funguje" v hornej lište — 🟡 ČAKÁ VIZUÁLNE OVERENIE

Appka mala plnú obrazovku vysvetlenia (`/ako-funguje`) len z karty na
hlavnej obrazovke a z Nastavení — po zavretí karty krížikom sa k nej
nedalo dostať inak než cez Nastavenia.

**Pridané:** ikona otáznika (`questionmark.circle`, SF Symbol) v
`AppHeader`, medzi zvončekom a ozubeným kolieskom, na VŠETKÝCH piatich
hlavných taboch (`index`, `dopyty`, `pridat`, `profil`, `admin` — všetky
používajú spoločný `AppHeader`). Vedie na tú istú `/ako-funguje`
obrazovku ako karta aj Nastavenia — žiadny nový text, žiadna tretia
kópia (CLAUDE.md §8).

`expo-symbols` je v builde od SDK šablóny (Fáza 7 poznámka v `icon.tsx`),
takže nová ikona ide OTA, nový natívny modul nepribudol.

🟡 **Čo Rastio otestuje:** otvoriť ktorýkoľvek hlavný tab, ťuknúť na
otáznik vedľa zvončeka — má sa otvoriť plné vysvetlenie appky.

---

## 3. Zrušená/odmietnutá obhliadka — ✅ OVERENÉ RUNTIME (DB, 6/6), 🟡 appka

### Prečo to NEBOL len UI bug

Tlačidlo „Chcem obhliadku" mizlo natrvalo, lebo `viewing` má
`unique (property_id, requester_id)` — druhá žiadosť na ten istý
inzerát od toho istého záujemcu **nikdy nie je nový riadok**, vždy je to
UPDATE tej istej. `guard_viewing_update()` (databázová funkcia, ktorá
stráži prechody stavov) mala pre `CANCELLED` aj `COMPLETED` spoločný
blanket blok „uzavretá sa nemení" — žiadna cesta von, ani appka by to
nevedela obísť, lebo databáza by UPDATE odmietla.

Zadanie hovorilo o „novej žiadosti" a „stará zostáva v histórii" — to v
tejto schéme doslovne nejde (jeden pár záujemca+inzerát = jeden riadok
navždy), takže „nová žiadosť" znamená posun TEJ ISTEJ riadky
CANCELLED → REQUESTED. História sa nestráca inak — je to tá istá
riadka, ktorá teraz len ukazuje aktuálny stav namiesto histórie viacerých.

Opravu preto nešlo urobiť len v appke — musela ísť do DB, cez rovnakú
cestu ako všetky doterajšie zmeny (Management API, `SUPABASE_ACCESS_TOKEN`
z `/root/.mutark-secrets`, CLAUDE.md §4).

### Čo sa zmenilo v DB (`scripts/apply-viewing-reopen.mjs`)

**`guard_viewing_update()`** — CANCELLED už nie je v tom istom bloku ako
COMPLETED. Prechod CANCELLED → REQUESTED je povolený, ale:

- **len pôvodnému záujemcovi** (nie vlastníkovi, nie tretej strane) —
  overuje `v_actor is distinct from old.requester_id`,
- **len ak účet nie je blokovaný** — rovnaká kontrola ako pri prvej
  žiadosti (`offerra.is_blocked()`, doteraz len v INSERT politike),
- **s cooldownom proti spamu** — reopen tej istej riadky sa nedá
  zopakovať skôr, než ubehne `rate_limit_viewings_window_minutes`
  (admin-nastaviteľné v Nastaveniach → RATE LIMITING — PRAHY, predvolené
  60 min) od jej posledného zrušenia. **Toto zapadá do existujúceho
  rate-limitingu (Fáza 23.3), nie je to nový mechanizmus** — len dopĺňa
  medzeru: `trg_viewing_rate_limit` beží LEN na INSERT, takže reopen
  (ktorý je vždy UPDATE) by inak nemal žiadny limit vôbec.
- **COMPLETED ostáva úplne nezmenené** — plný blok „uzavretá sa nemení"
  platí ďalej, mimo rozsahu tohto zadania.

**`on_viewing_decided()`** — pri reopene teraz pošle vlastníkovi
notifikáciu `ZIADOST_O_OBHLIADKU` (rovnaký typ ako pri prvej žiadosti,
`on_viewing_insert()`), inak by o novej žiadosti nevedel — predtým sa
táto funkcia spúšťala len na prechodoch Z `REQUESTED`, reopen (Z
`CANCELLED`) by prešiel potichu.

### Dôkaz — DB, 6/6 (`scripts/check-viewing-reopen.mjs`)

Beží priamo cez Management API (rovnaký prístup ako oprava), simuluje
`auth.uid()` cez `set local request.jwt.claim.sub` na REÁLNYCH
seedovaných riadkoch (nie vymyslených) — `guard_viewing_update()` aj RLS
na `viewing` čítajú tú istú funkciu, takže to overuje tú istú
autorizačnú logiku, akú appka spustí cez PostgREST.

```
1. vlastník NESMIE reopenúť cudziu žiadosť               OK (42501, „len pôvodný záujemca")
2. cudzí (iný) používateľ NESMIE reopenúť                 OK (RLS ho k triggeru vôbec nepustí)
3. pôvodný záujemca SMIE požiadať znova                   OK (CANCELLED → REQUESTED prešlo)
4. vlastník dostal novú notifikáciu o žiadosti             OK (ZIADOST_O_OBHLIADKU pribudla)
5. cooldown: hneď znova zrušiť a reopenúť MUSÍ zlyhať      OK (P0429)
6. COMPLETED ostáva plne uzavreté (nezmenené)              OK (42501, „už nemení")
```

Skript je opakovateľný aj v tej istej hodine (testovacia riadka sa pred
behom resetne na `updated_at` spred 2 hodín, mimo cooldownu) a po behu
necháva testovaciu riadku vo funkčne rovnakom stave (CANCELLED), akom ju
našiel.

**Čo tento test NEDOKAZUJE:** že appka to tlačidlo v UI naozaj zobrazí a
ťuknutie skutočne zavolá tento UPDATE. To je bod nižšie.

### Zmena v appke (`viewing-card.tsx`)

- `ask()` teraz vie oboje: ak `mine.status === 'CANCELLED'`, zavolá
  `setViewingStatus(mine.id, 'REQUESTED')` (reopen), inak pôvodný
  `requestViewing()` (prvá žiadosť). Rozhoduje o tom appka len ako
  pohodlie — databáza presadzuje to isté nezávisle.
- Tlačidlo „Chcem obhliadku" sa zobrazí znova, keď `!mine || mine.status
  === 'CANCELLED'` (predtým: `!mine`, čo skrylo tlačidlo natrvalo po
  prvej žiadosti bez ohľadu na jej stav).
- Nad tlačidlom pribudla veta „Predošlá žiadosť bola zrušená · Môžeš
  požiadať znova." — presne podľa zadania, len keď je relevantná.
- Text tlačidla je „Požiadať znova" namiesto „Chcem obhliadku", keď ide
  o reopen — používateľ vie, že nejde o prvú žiadosť.
- Stará CANCELLED riadka sa ďalej zobrazuje pod kartou („Zrušená.") —
  história neprepadla, len teraz vedľa nej pribudlo tlačidlo.
- Chybová hláška z cooldownu (P0429) je už ľudská zo servera
  („Túto obhliadku si nedávno zrušil/zamietol. Skús požiadať znova o
  chvíľu.") — `errorText()` ju zobrazí ako je, netreba nový preklad.

### `how-it-works.ts` / changelog

Sekcia „Obhliadka — vlastník ju potvrdí" dostala novú vetu o tom, že
zrušená/odmietnutá žiadosť nie je koniec a že reopen je časovo obmedzený
proti spamu (CLAUDE.md §8 — mechanika sa zmenila, text sa upravuje
v TOM ISTOM kroku). Tri nové záznamy v `changelog.ts` (19.8.2026).

### 🟡 Čo Rastio otestuje

- **Requester strana:** na cudzom inzeráte požiadaj o obhliadku, potom ju
  **stiahni**. Tlačidlo „Chcem obhliadku" by sa malo objaviť znova ako
  „Požiadať znova", s vetou o zrušenej žiadosti nad ním.
- **Vlastník strana:** na vlastnom inzeráte **odmietni** žiadosť o
  obhliadku od záujemcu (ak máš testovací účet, ktorý môže požiadať) —
  po odmietnutí sa má tlačidlo objaviť znova na strane záujemcu.
- Skús požiadať znova HNEĎ po zrušení — appka by mala ukázať chybu
  o počkaní (cooldown), nie ticho zlyhať.
- Toto sú DVA prípady zrušenia zo zadania (žiadateľ stiahol / vlastník
  odmietol) — obe idú cez ten istý CANCELLED stav a ten istý mechanizmus,
  takže jeden test typicky overí oboje, ale prejdi si obe cesty, ak máš
  na to dva účty.

---

## Zhrnutie IDE OTA / VYŽADUJE BUILD (CLAUDE.md §7)

Všetky tri body **IDE OTA** — žiadny natívny modul, `app.json` sa
nemení, DB zmeny idú mimo appky (Management API).
