# Autosave · GDPR export · Rate limiting · Undo okno · Walkthrough

14.8.2026. Päť samostatných položiek z jedného zadania, zaradených AŽ PO
dokončení predošlého backlogu (obhliadka s potvrdením, Moje zjednotené,
chat — Fázy 16/19/21, potvrdené s Rastiom ako uzavreté pred štartom tejto
dávky). Podrobnosti a dôkazy podľa CLAUDE.md §1 sú v `OFFERRA_REGISTER.md`
Fáza 23 — toto je zhrnutie pre kontext.

---

## 1. Autosave rozpracovaného inzerátu

DRAFT riadok v DB existoval od tapnutia „+ Pridať nehnuteľnosť" už od
Fázy 1 (kvôli fotkám) — appka tak mala polovicu poistky. Chýbalo priebežné
ukladanie POLÍ formulára: doteraz sa zapisovali do DB až na tlačidlo
„Uložiť koncept", takže rozpísaný, ale neuložený text sa pri vynútenom
zavretí appky stratil.

**Čo som pridal**: `inzerat/[id].tsx` teraz autosavuje ticho 2,5 s po
poslednej zmene. `pridat.tsx` navyše ponúkne najnovší rozpracovaný
inzerát rovno hore ako kartu „Pokračovať v rozpracovanom inzeráte?" —
nie len ako riadok v zozname nižšie, ako doteraz.

**Dôkaz**: `npx tsx scripts/check-draft-resume.ts` — 6/6 (ktorý koncept
sa ponúkne). Samotné časovanie autosave je klientský `setTimeout`,
nedá sa dokázať bez zariadenia.

🟡 **Čo Rastio otestuje**: rozpísať pár polí, počkať pár sekúnd, appku
force-quit-núť, znova otvoriť, ísť do „Pridať" — má sa objaviť ponuka na
pokračovanie s tým, čo bolo naozaj rozpísané.

---

## 2. GDPR export „Stiahnuť moje dáta"

Nová RPC `export_my_data()`, scope-nutá výhradne na volajúceho
(`auth.uid()`), vracia JSON so všetkým: profil, inzeráty s fotkami,
podané aj prijaté ponuky, dopyty, oslovenia, obhliadky, hodnotenia,
správy, uložené vyhľadávania. Tlačidlo v Nastaveniach používa natívny
`Share` z `react-native` — **zámerne nie** `expo-file-system`/
`expo-sharing`, ktoré by pridali nový natívny modul a odstrihli OTA
presne tak, ako sa appke stalo pri incidente s `tsx` v `package.json`
(register 21.4).

**Dôkaz**: `gdpr_export_test.py` — **21/21** naživo. Dvaja používatelia
s krížovými ponukami/obhliadkami/hodnoteniami/správami/dopytom: export
každého obsahuje presne jeho dáta a nikdy dáta toho druhého. Neprihlásený
dostane 401/403.

---

## 3. Rate limiting proti spamu

Server-side (BEFORE INSERT triggery na `property_offer`, `message`,
`property`, `viewing`) — dopĺňa plánovaných „Podozrivých používateľov"
(Fáza 22.3): toto je prevencia, tamto je spätná detekcia.

Predvolené prahy: 10 ponúk/60 min, 20 správ/min, 5 nových inzerátov/60 min,
10 žiadostí o obhliadku/60 min. Všetky sú admin-nastaviteľné cez novú
kartu „RATE LIMITING — PRAHY" v Nastaveniach (rovnaký mechanizmus ako
existujúce prahy pri Podozrivých používateľoch).

Kontrola beží len vtedy, keď prihlásený človek (`auth.uid()`) sedí so
stĺpcom pôvodcu záznamu — seed skripty a migrácie idú priamo cez SQL bez
JWT, takže sa ich netýka. Overené priamo, nie len predpokladané.

**Dôkaz**: `rate_limit_test.py` — **14/14** naživo. Admin zníži prah na
malé číslo, presne N akcií prejde a (N+1). je zablokovaná s ľudsky
čitateľnou hláškou; bežný účet prah zmeniť nesmie (403); 6 priamych SQL
insertov (ako pri seedovaní) rate limit vôbec nevidí.

---

## 4. „Zrušiť" undo okno

`toast.tsx` dostal druhú funkciu v tom istom provideri (nie druhý systém
spätnej väzby vedľa seba) — `confirmWithUndo(text, commit)`: zobrazí 5 s
odpočet s tlačidlom „Zrušiť", server sa akcie dotkne až po dobehnutí.
Zapojené presne na troch miestach zo zadania:

- **Odmietnuť ponuku** — doteraz bez akéhokoľvek potvrdenia, teraz undo
  okno ako jediná poistka.
- **Zmazať inzerát** — undo okno PRIDANÉ K existujúcemu dvojitému Alert
  potvrdeniu, nie namiesto neho: potvrdenie chráni pred omylom v úmysle,
  undo pred preklikom tesne predtým.
- **Zablokovať používateľa** (admin) — len smer blokovania, odblokovanie
  nie je tá riziková akcia zo zadania.

**Dôkaz**: `npx tsx scripts/check-undo-countdown.ts` — 4/4 (odpočet
dobehne presne v 5 tikoch, nikdy sa nezacyklí). Vykreslenie a tap na
„Zrušiť" na zariadení je klientský timer, nedá sa dokázať bez zariadenia.

🟡 **Čo Rastio otestuje**: odmietnuť ponuku / zmazať inzerát / zablokovať
používateľa a hneď ťuknúť „Zrušiť" — akcia sa nesmie vykonať. Potom skúsiť
znova a nechať odpočet dobehnúť — akcia sa musí vykonať.

---

## 5. Úvodný walkthrough pred prvým prihlásením

Nová obrazovka `walkthrough.tsx`, PRED loginom. Obsah je zámerne
**zdieľaný** `HOW_STEPS` z `how-it-works.ts` (5 krokov), nie nový text —
CLAUDE.md §8 vyžaduje jedno miesto pravdy o mechanike appky; tretia kópia
toho istého textu by bola presne to riziko, kvôli ktorému §8 vzniklo.
Preskočiteľné, zobrazí sa len raz cez nový `WalkthroughProvider`
(AsyncStorage) — rovnaký princíp zdieľaného stavu ako `ProfileProvider`.

**Vedľajší nález**: komentár v `gate.ts` už dlho tvrdil „pokryté testom",
ale v repe žiadny test pre `decideRoute` nebol. Doplnené
(`scripts/check-gate.ts`) pri tejto príležitosti.

**Dôkaz**: `npx tsx scripts/check-gate.ts` — **13/13**, vrátane
explicitného dôkazu, že existujúci prihlásený účet walkthrough NIKDY
nedostane dodatočne.

🟡 **Čo Rastio otestuje**: appku predtým odinštalovať/vymazať dáta (inak
appka podľa predošlého inštalu rovno skočí na login) — pri úplne prvom
spustení sa má ukázať 5 obrazoviek s „Preskočiť" a „Ďalej"/„Začať", po
dokončení alebo preskočení už nikdy znova.

---

## Nasadenie

Všetko **IDE OTA**. `package.json` sa v tejto dávke vôbec nezmenil —
overené `git diff --stat package.json package-lock.json` pred aj po
(prázdne oba razy). Žiadny nový natívny modul: `Share` z `react-native`
a `@react-native-async-storage/async-storage` sú už súčasťou existujúcej
binárky. `npx tsc --noEmit` čisté po každom bloku zmien.

DB migrácie `mig_40_gdpr_export.sql`, `mig_41_rate_limiting.sql`
nasadené priamo (mimo repa, CLAUDE.md §4).
