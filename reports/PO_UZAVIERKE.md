# Čo sa stane po uzávierke ponúk

**Dátum:** 17.8.2026
**Vyžiadal:** Rastio (bod 1 z návrhu)
**Rozsah:** `src/lib/deadline.ts`, nový `src/components/deadline-decision.tsx`,
`src/app/nehnutelnost/[id].tsx`, `src/lib/how-it-works.ts`,
`scripts/check-deadline.ts`

---

## 1. Čo bolo zlé — zmerané, nie tušené

```
ACTIVE inzeráty, ktorým uzávierka UŽ PREŠLA:  2
  · Zvolen:   Stavebný pozemok                — prešla pred 2 dňami
  · Trenčín:  Obchodný priestor na prenájom   — prešla pred 5 dňami
```

Oba sedeli v katalógu ako živé. Ponuku na ne už nikto podať nemohol (uzávierku
drží aj RLS, nie len tlačidlo), ale **majiteľovi to nikto nepovedal a nemal
ako z toho vyjsť.** Odpočet dobehol a ďalej sa nestalo nič.

Verejná strana bola pritom v poriadku už predtým: `deadlineLabel` po termíne
vracia **„Príjem ponúk ukončený"** a karta aj detail to zobrazujú. Chýbal
posledný krok pre toho, kto sa má rozhodnúť.

---

## 2. Čo je teraz

Na detaile **vlastného** inzerátu, keď uzávierka prešla a inzerát je ešte
živý, je karta s otázkou a tromi cestami von:

```
Uzávierka prešla
Ponuky sa uzavreli 15. augusta 2026 (pred 2 dňami).
Máš 3 ponuky — vyber jednu, alebo uzávierku predĺž.

[Vybrať z ponúk]  [Predĺžiť o 7 dní]  [Archivovať]
```

Bez jedinej ponuky je text iný a tlačidlo „Vybrať z ponúk" **tam nie je** —
viedlo by na prázdny zoznam:

```
Ponuky sa uzavreli 12. augusta 2026 (pred 5 dňami).
Nikto ponuku nepodal. Predĺž uzávierku, alebo inzerát archivuj.

[Predĺžiť o 7 dní]  [Archivovať]
```

Detaily, ktoré nie sú náhodné:

- **„Vybrať z ponúk"** vedie na `/ponuky/[id]` — obrazovku správy ponúk, kde
  máš inzerát sám pre seba, bez galérie a verejnej časti. Vedie tam aj
  upozornenie o novej ponuke, takže je to cesta, ktorú už poznáš.
- **„Predĺžiť o 7 dní"** počíta **odo dneška**, nie od pôvodného termínu.
  Predĺženie uzávierky, ktorá prešla pred 5 dňami, „o 7 dní" od pôvodného
  termínu by dalo 2 dni — to nikto nechce.
- **„Archivovať"** má **undo okno** („Inzerát bude archivovaný" + Zrušiť),
  rovnaké ako „Zmazať inzerát" a „Odmietnuť ponuku" z Fázy 23. Nie Alert —
  jeden vzor spätnej väzby, nie dva. Archivovaný inzerát zmizne z katalógu
  (ten filtruje `status = 'ACTIVE'`), ponuky ostávajú v prehľade.
- **Archivovanie predtým v appke vôbec nešlo.** `ARCHIVED` bol stav
  s názvom („Archivované"), ktorý sa nedal nastaviť — dalo sa len zmazať.
- Karta sa ukáže **len majiteľovi**. Záujemcovi štítok „Príjem ponúk
  ukončený" povedal všetko, čo sa ho týka.
- **Žiadne upozornenie neposielam a ani to netvrdím.** Appka nemá serverovú
  časť, takže kým majiteľ appku neotvorí, nemá to kto poslať. Je to napísané
  aj v „Ako funguje Offerra" — sľubovať oznámenie, ktoré nikto nepošle, je
  presne to, čo zakazuje CLAUDE.md §12a.

Texty aj to, ktoré tlačidlá sa ponúknu, rozhoduje **jedna čistá funkcia**
`deadlineOutcome()` v `src/lib/deadline.ts`. Komponent iba kreslí — aby ten
istý text nezačal vznikať druhý raz na inej obrazovke.

---

## 3. Dôkazy

| Čo | Ako | Výsledok |
|---|---|---|
| logika uzávierky + rozhodnutia | `npx --yes tsx scripts/check-deadline.ts` | **30/30 OK** (bolo 12) |
| filtre | `check-filters.ts` | 22/22 OK |
| gestá galérie | `check-gallery.ts` | 33/33 OK |
| Realtime (§11) | `check-realtime.ts` | 20/20 OK |
| typy | `npx tsc --noEmit` | čisté |
| dáta | SELECT ACTIVE + `offer_deadline < now` | 2 inzeráty (viď §1) |
| `package.json` (§9) | `git status` | nedotknutý |

Test si našiel chybu v mojom vlastnom texte: prvá verzia písala **„Máš 1
ponuka"** namiesto „ponuku" (po „Máš" musí byť akuzatív). Preto má
skloňovanie po číslovke vlastných päť kontrol — 1 / 2 / 4 / 5 / 11.

**Čo dôkaz NEDOKAZUJE:** ako karta vyzerá a či sa tlačidlá naozaj dotknú
databázy na telefóne. Preto je to nižšie 🟡.

---

## 4. OTA

Nový natívny modul nepribudol, `package.json` nedotknutý → **IDE OTA**.

| | Runtime |
|---|---|
| posledný `finished` iOS build (#5) | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |
| publikovaná OTA (iOS), group `d46c1e65-3160-4085-b538-b89413a64175` | `24919867e1bcc84715b1b4d6998cb6b27886e5d9` |

Zhodné → dorazí k tebe (§9). Commit `1302dba`. Android publikovaný zvlášť
(group `7a1e9629-90fc-49f3-9d8b-81230f13d909`).

---

## 5. Čo mi máš potvrdiť (slovami)

Potrebuješ **vlastný** inzerát s uzávierkou v minulosti. Ak taký nemáš,
najrýchlejšie: uprav si vlastný inzerát a daj uzávierku na dnes/včera.

1. Otvor svoj inzerát s prešlou uzávierkou — je nad parametrami karta
   **„Uzávierka prešla"** so správnym dátumom a „pred X dňami"?
2. Sedí počet ponúk v texte? (a je skloňovanie v poriadku — „1 ponuku",
   „3 ponuky", „5 ponúk")
3. **Predĺžiť o 7 dní** → karta zmizne a namiesto nej beží odpočet
   („Ponuky do… · ostáva 6 dní" alebo 7).
4. **Archivovať** → dole vyskočí odpočet s **Zrušiť**; keď ho necháš
   dobehnúť, inzerát zmizne z katalógu.
5. Na inzeráte, ktorý **nie je tvoj** a má prešlú uzávierku, karta byť
   **nesmie** — tam ostáva len štítok „Príjem ponúk ukončený".
6. Nastavenia → **Ako funguje Offerra** → je tam nová karta „Uzávierka
   ponúk — a čo po nej"?
7. §10: na karte v katalógu je stále **„Ponuky do… · ostáva X dní"** a
   **„Pridané [dátum]"**.
