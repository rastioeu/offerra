# Regresia: fotky zmizli z kariet katalógu

14.8.2026. Nahlásil Rastio: badge/srdiečko/zdieľať fungovali normálne,
obrázok chýbal — len prázdne farebné pozadie. Podrobnosti a presné
dôkazy podľa CLAUDE.md §1 sú v `OFFERRA_REGISTER.md` Fáza 24, toto je
zhrnutie.

---

## Koreňová príčina — nebola to rotujúca fotka ani seed dáta

Zadanie navrhovalo dve hypotézy: rotujúcu titulnú fotku (Fáza 22.2) a
nesúlad v novom dvojnásobnom seede. **Ani jedna sa nepotvrdila.**

Skutočná príčina: **moje vlastné testovacie dáta**, ktoré som nechal v
produkčnej DB. `rate_limit_test.py` a `gdpr_export_test.py` (dôkazové
skripty pre Fázu 23, spustené naživo proti produkčnému Supabase podľa
zavedeného vzoru CLAUDE.md §4) vytvorili 12 skutočných ACTIVE inzerátov s
falošnou fotkou `https://example.invalid/x.jpg` a po teste som ich
nezmazal.

Katalóg triedi najnovšie-prvé. Tieto testovacie inzeráty vznikli
tesne pred nahlásením (dnes ~02:49–02:53), takže sedeli na úplnom vrchu
— presne tam, kde ich bolo vidno ako prvé.

**Prečo prázdne pole, nie text „Bez fotky":** `cover` (URL) bol neprázdny
reťazec, takže appka vybrala `<Image>`, nie textový fallback (ten sa
doteraz spúšťal len pri PRÁZDNOM `cover`). Nedostupná URL vo `<Image>`
jednoducho nič nevykreslí — ostane len sivé pozadie karty. Presne to,
čo Rastio opísal.

**Zmerané:**
```sql
select count(*) from offerra.media where url like '%example.invalid%';
```
Pred opravou: **12**. Po zmazaní testovacích účtov: **0**.

Rotujúca titulná fotka aj seed dáta sú v poriadku — overené naživo na
reálnych ACTIVE inzerátoch (pozri Dôkaz nižšie).

---

## Oprava

1. **Zmazané testovacie dáta.** 10 testovacích Auth účtov zmazaných cez
   Admin API — kaskádové FK (`ON DELETE CASCADE`) samé zmazali ich
   12 inzerátov aj fotky. Overené: 0 zvyšných `example.invalid` URL, 0
   zvyšných testovacích profilov.

2. **Fallback placeholder** (`property-card.tsx`): `<Image>` má teraz
   `onError`, ktorý prepne kartu na rovnaký placeholder ako pri chýbajúcej
   fotke — ikona domu + „Bez fotky" na sivom pozadí. Platí teraz pre OBA
   prípady (prázdna URL aj nedostupná URL), nie len jeden. Aj keby sa
   podobná chyba niekedy zopakovala, appka už neukáže holé farebné pole
   bez akéhokoľvek signálu.

---

## Dôkaz

`foto_regresia_test.py` (mimo repa) — **4/4**, simuluje presne to, čo
appka robí (`useProperties()` cez anon REST + `coverPhotoIndex()`):

- žiadny ACTIVE inzerát nemá prázdnu titulnú URL,
- žiadna media URL v DB neobsahuje `example.invalid`,
- vzorka 15 titulných URL sa naozaj stiahne (skutočné HTTP 200, nie len
  záznam v DB).

`npx tsc --noEmit` — bez chýb.

🟡 **Čo Rastio otestuje**: otvoriť appku a katalóg — fotky by sa mali
zobrazovať normálne na viacerých kartách. Samotný vzhľad fallback
placeholderu (ikona domu na sivom) je 🟡 aj po tomto dôkaze — dá sa
reálne vyvolať len so skutočne rozbitou URL, čo je vec vizuálneho
overenia, nie len že sa kód spustí bez chyby.

---

## Poučenie do budúcna

Runtime dôkazové skripty s reálnymi Auth používateľmi (zavedený vzor
appky) musia po sebe **čistiť**, keď vytvárajú ACTIVE — teda verejne
viditeľné — dáta, nie len keď vytvárajú DRAFT alebo inak neverejné
testovacie záznamy. Doteraz som to pri DRAFT-only skriptoch nepotreboval
riešiť; pri ACTIVE inzerátoch to bola chyba a beriem to ako svoju.

---

## Nasadenie

**IDE OTA** — len JS zmena v `property-card.tsx`, `package.json` sa
nedotkol. Čistenie dát bolo priamo v DB, bez migračného súboru (nešlo o
zmenu schémy).
