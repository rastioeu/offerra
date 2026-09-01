# Duplicitné tlačidlá v detaile inzerátu

**Dátum:** 2.9.2026
**Vyžiadal:** Rastio (nález zo screenshotov)
**Rozsah:** `src/components/property-tabs.tsx` (podtab „Ponuky"),
lokalizácia SK/EN/DE. `nehnutelnost/[id].tsx` (sticky lišta) sa nemenil —
overený, nie opravovaný.

---

## 1. Čo bolo zle

Na detaile inzerátu (`nehnutelnost/[id].tsx`) je **prilepená spodná lišta**
so vždy dostupným hlavným tlačidlom — presne kvôli tomu vznikla (7.8.2026,
orezané „Zdieľať" v predošlom dizajne). V podtabe „Ponuky" (`property-tabs.tsx`,
komponent `OffersTab`) bola ale **rovnaká akcia znova**, v karte „Moja
ponuka" — to isté tlačidlo, ten istý cieľ (`/ponuka/[id]`), len o pár
centimetrov nižšie. Konkrétne tri prípady, všetky v tom istom podtabe:

| Stav záujemcu | Duplicitné tlačidlo v karte | Rovnaké tlačidlo v spodnej lište |
|---|---|---|
| neprihlásený | „Prihlás sa a ponúkni" | „Prihlás sa a ponúkni" (`loginToOfferAction`) |
| prihlásený, bez ponuky | „Podať ponuku" | „Podať ponuku" (`makeOfferAction`) |
| prihlásený, ponuka PENDING | „Upraviť moju ponuku" | „Upraviť moju ponuku" (`editMyOfferAction`) |

Text sedel doslova (rovnaký i18n reťazec „Prihlás sa a ponúkni" v oboch
doménach), takže to nebola náhoda — druhá kópia vznikla, keď pribudla
sticky lišta (mockup 8.8.2026), a pôvodné tlačidlá v karte nikto neodstránil.

---

## 2. Čo je teraz

Z karty „Moja ponuka" (aj z karty „Chcem ponúknuť" pre neprihláseného)
zmizli všetky tri vyššie uvedené tlačidlá. Karta si drží **len informačnú
hodnotu**:

- suma a stav mojej ponuky (nezmenené),
- text „Cena je len orientačná…" / „Ponuky sú verejné, ale podať ju môže
  len prihlásený človek…" (nezmenené),
- **„Stiahnuť ponuku" ZOSTÁVA** — spodná lišta túto akciu neponúka vôbec
  (má len Podať/Upraviť), takže tu nejde o duplicitu.

Jediná akcia, ktorá teraz vedie na `/ponuka/[id]` alebo `/login`, je
tlačidlo v prilepenej spodnej lište — presne jedno miesto, ako žiadal
Rastio.

**Nepoužívané i18n kľúče** (`propertyTabs.submitOffer`, `.editMyOffer`,
`.signInAndOffer`) odstránené zo všetkých troch jazykov — bez odkazu v kóde
by v appke ticho ostal mŕtvy text, ktorý by nikto nikdy neuvidel.

---

## 3. Sticky lišta — overené, NEMENENÉ

`nehnutelnost/[id].tsx`, funkcia `primaryAction()` — jedno miesto, ktoré
rozhoduje o texte aj cieli hlavného tlačidla:

```
isOwner            → „Upraviť inzerát"
uzávierka prešla /
inzerát CLOSED     → žiadne tlačidlo (lišta zmizne úplne)
!myId              → „Prihlás sa a ponúkni" → /login
myOffer existuje    → „Upraviť moju ponuku" → /ponuka/[id]
inak               → „Podať ponuku" → /ponuka/[id]
```

Táto funkcia sa touto opravou nemenila — text sa už predtým menil správne
podľa stavu (Rastiov screenshot to aj ukazoval). Overené **čítaním kódu**,
nie behom appky — to, že sa po odstránení duplicitných tlačidiel z karty
nič nerozbilo (žiadny iný kód na tie tlačidlá neodkazoval), potvrdzuje aj
čistý `tsc --noEmit` a `check-i18n.ts`. Že lišta v appke NAOZAJ mení text
pred očami, vie potvrdiť len pohľad na telefón (§4).

---

## 4. Dôkazy

| Čo | Ako | Výsledok |
|---|---|---|
| typy | `npx tsc --noEmit -p .` | čisté |
| lokalizácia SK/EN/DE (odstránené kľúče nikde nechýbajú, žiadne osirotené) | `npx --yes tsx scripts/check-i18n.ts` | **15/15 OK** (bolo 1047 t()-volaní, teraz 1044 — presne o 3 menej, zodpovedá 3 odstráneným kľúčom) |
| `package.json` (§9) | `git diff --stat package.json` | prázdne — fingerprint nedotknutý, žiadny natívny modul nepribudol → **IDE OTA** |

**Čo dôkaz NEDOKAZUJE:** ako karta a lišta vyzerajú na telefóne po zmene,
a že tam naozaj ostalo len jedno tlačidlo na pohľad, nie na papieri.
Screenshoty **nedávam** (stojace pravidlo appky, Rastio 17.8.2026) — pozri
§6, čo si máš pozrieť a slovami potvrdiť.

---

## 5. Ostatné obrazovky — nájdený ĎALŠÍ prípad rovnakého vzoru

Prešiel som appku na ten istý vzor (akcia duplicitne v karte AJ v lište/
inde na tej istej obrazovke). Prilepenú lištu má **len jedna obrazovka**
(`nehnutelnost/[id].tsx`) — iné časti appky sticky lištu vôbec nemajú, takže
sa tento PRESNE tento vzor nemohol zopakovať inde. Na tej istej obrazovke
som ale našiel jeden ďalší prípad, TEN ISTÝ princíp (rovnaká akcia dvakrát):

### 🔎 Nález — tlačidlo „Zdieľať" dvakrát na tej istej obrazovke

`nehnutelnost/[id].tsx`:
- riadok ~328 — ikona „Zdieľať" (`square.and.arrow.up`) v pravom hornom
  rohu HERO fotky, vedľa srdiečka obľúbených. Zmizne, len čo človek
  odscrolluje fotku preč.
- riadok ~579 — TA ISTÁ akcia (`shareProperty(item)`), ikona v PRILEPENEJ
  spodnej lište, vedľa hlavného tlačidla.

Presne ten istý mechanizmus ako pri ponuke: sticky ikona pribudla
7.8.2026 (viď hlavička súboru: „orezané »Zdieľať«"), pôvodná ikona nad
fotkou ale ostala. Rozdiel oproti ponuke: toto sú dve MALÉ ikony, nie dve
plné tlačidlá vedľa seba, takže vizuálne to nebije do očí tak silno — ale
princíp (jedna akcia, dve miesta, jedno z nich vzniklo ako náhrada za
druhé) je identický.

**Dodatok 2.9.2026 — OPRAVENÉ:** Rastio sa rozhodol ikonu nad fotkou
odstrániť. `nehnutelnost/[id].tsx` — `Pressable` so `shareProperty(item)`
nad hero fotkou zmizol, zostáva len ikona v prilepenej spodnej lište.
`shareProperty` aj `propertyDetail.shareListing` naďalej používa sticky
lišta, takže sa nemazali. Register Fáza 32.5.

**Skontrolované a BEZ nálezu** (žiadna duplicita):
- Obľúbené (srdiečko) — len jedno miesto.
- „Upraviť inzerát" (majiteľ) — len v spodnej lište, nikde inde na obrazovke.
- Karta po uzávierke ponúk (`DeadlineDecision`) — tri vlastné akcie
  (vybrať ponuku / predĺžiť / archivovať), žiadna nie je duplikát tlačidla
  v spodnej lište.
- Obhliadka (`ViewingCard`), Správy, Hypotéka, Hodnotenia — vlastné akcie,
  nič, čo by robilo to isté ako iné tlačidlo na tej istej obrazovke.
- `OwnerOffers` (Prijať/Odmietnuť/Uzavrieť obchod) — tieto akcie existujú
  len v spodnom paneli s detailom ponuky, nikde inde na obrazovke.
- Obrazovka „Podať ponuku" (`/ponuka/[id]`), správa ponúk (`/ponuky/[id]`),
  editácia inzerátu (`/inzerat/[id]`), dopyt (`/dopyt/[id]`) — samostatné
  obrazovky bez sticky lišty, žiadne tlačidlo sa neopakuje na tej istej
  obrazovke.

---

## 6. Čo mi máš potvrdiť (slovami — žiadne screenshoty)

1. V tabe „Ponuky" vidíš pri svojej ponuke (alebo pri „Chcem ponúknuť", ak
   ešte ponuku nemáš) LEN informačný text a prípadne „Stiahnuť ponuku" —
   **žiadne** „Podať ponuku" / „Upraviť moju ponuku" / „Prihlás sa a
   ponúkni" v karte.
2. To isté tlačidlo (s rovnakým textom podľa stavu) je stále dostupné dole
   v prilepenej lište a mení text správne — over aspoň dva stavy (napr.
   bez ponuky → „Podať ponuku"; po podaní → „Upraviť moju ponuku").
3. „Stiahnuť ponuku" v karte stále funguje (skús na testovacej ponuke).
4. Nad fotkou už nie je ikona „Zdieľať" — vidíš tam už len ikonu na
   celoobrazovkové zobrazenie a srdiečko obľúbených (ak si prihlásený).
   Zdieľanie funguje len z prilepenej spodnej lišty.
