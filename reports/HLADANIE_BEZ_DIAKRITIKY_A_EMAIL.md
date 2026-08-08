# Hľadanie bez diakritiky + e-mail v profile a v kontakte

**Dátum:** 8. augusta 2026 · **ide OTA**

---

## 1. Hľadanie bez diakritiky

### Zvolený prístup a prečo

Odmeral som, čo je v projekte dostupné:

```
unaccent  1.1   dostupné, nenainštalované
pg_trgm   1.6   dostupné, nenainštalované
```

Zvolil som **tretiu možnosť z tvojho zoznamu — generované stĺpce
s indexom**, presne ako si odporúčal. Dôvod je výkon:

| Prístup | Problém |
|---|---|
| `unaccent(name) ilike unaccent($1)` v dotaze | prepočíta celý číselník **2 925 obcí pri každom stlačení klávesy**, index sa nedá použiť |
| normalizácia na klientovi | musela by najprv stiahnuť všetky obce do telefónu |
| **generovaný stĺpec + index** | spočíta sa **raz pri zápise**, hľadanie ide cez index |

### Čo pribudlo

```sql
offerra.norm(text)                  -- unaccent + lower, IMMUTABLE
offerra.city.name_norm              -- generovaný, btree prefixový index
offerra.property.search_norm        -- generovaný, trigramový GIN index
offerra.buyer_request.search_norm   -- generovaný, trigramový GIN index
```

Dva detaily, ktoré by inak potichu nefungovali:

- **`norm()` musí byť `IMMUTABLE`**, inak ju generovaný stĺpec neprijme.
  Jednoargumentové `unaccent(text)` je len `STABLE` — použil som preto
  dvojargumentovú podobu s výslovne uvedeným slovníkom, tá immutable je.
- **Tabuľky majú stĺpcové granty.** Bez `grant select` na nové stĺpce by
  existovali, ale klient by ich nesmel čítať a hľadanie by vracalo
  prázdno — presne ten druh tichej chyby, na ktorý sme už raz narazili
  pri poliach prenájmu.

`property.search_norm` spája **názov + popis + obec + okres + ulicu +
kraj** do jedného stĺpca. Jeden index namiesto štyroch a jednoduchší
dotaz než pôvodné tri `or` vetvy.

### Aplikované všade, nie na jednom mieste

| Kde | Predtým | Teraz |
|---|---|---|
| výber obce vo formulári | `ilike name` | `like name_norm` |
| dohľadanie obce z vety v hľadaní | `ilike name` | `like name_norm` |
| fulltext v katalógu | 3× `or ilike` | `like search_norm` |
| fulltext v dopytoch | 2× `or ilike` | `like search_norm` |

`fold()` zo `search.ts` sa stal verejným **`normalizeText()`** a používa
sa všade, kde ide text od používateľa do dotazu.

### Dôkaz — 13/13

Najdôležitejší je prvý test: **JS a Postgres musia normalizovať
rovnako.** Keby sa líšili čo i len na jednom znaku, hľadanie by sa ticho
minulo cieľom.

```
OK  JS a Postgres normalizuju identicky (10 slovenskych nazvov)
       vsetkych 10 sedi   — vratane ľ, ô, ä, ĺ
OK  "banska bystrica" najde "Banská Bystrica"
OK  "petrzalka" najde "Petržalka"
OK  "sala" najde "Šaľa"
OK  "ziar" najde "Žiar nad Hronom"
OK  "dolny kub" najde "Dolný Kubín"
OK  fulltext hlada aj v POPISE bez diakritiky ("zahradou")
OK  dopyt sa najde podla "kosice" bez diakritiky
OK  dotaz na obce pouziva INDEX, nie sekvencny sken   ← Index Scan
13/13 preslo
```

### ⚠️ Známa hranica, na ktorú som pri testovaní narazil — SKLOŇOVANIE

Test odhalil vec, ktorú si nezadal, ale mal by si o nej vedieť:

Inzerát sa volá **„Priestranný 3-izbový byt v Petržalke"**. Kto napíše
**„petrzalka"**, ho **nenájde** — v texte je tvar „petrzalke". Hľadanie
podreťazcom nájde len spoločný kmeň „petrzalk".

Diakritika je teda vyriešená, **skloňovanie nie**. Pri slovenčine to
zabolí častejšie než pri angličtine.

Tri možnosti, vyberáš ty — **sám o tom nerozhodujem**:

1. **Trigramová podobnosť** (`pg_trgm` už nainštalovaný). „petrzalka" by
   našlo „petrzalke" na podobnosť. Najlepší pomer výsledku k práci, ale
   občas nájde aj niečo navyše.
2. **Hľadať po slovách od 4. znaku** — „petrzalka" by sa skrátilo na
   „petrzalk". Jednoduché, ale je to hrubý odhad slovenskej gramatiky.
3. **Nechať tak.** Obec sa dá vybrať z filtra a tam hľadanie funguje
   presne; skloňovanie zabolí len pri voľnom texte.

*Ešte jedna vec:* pri tom teste som si všimol, že inzerát
„Priestranný 3-izbový byt v Petržalke" má v poli obec **Stupava**. Neviem,
či si to prepol pri testovaní CityPickera — nesiahal som na to, sú to
tvoje dáta.

---

## 2. E-mail v profile a v odkrytom kontakte

### Časť 2 zadania už bola hotová

Overil som pred zásahom: e-mail **už bol** súčasťou odkrytého kontaktu.
`offerra.offer_contact()` ho vracia (`u.email` z `auth.users`) a
obrazovka „Ponuky na inzerát" ho zobrazuje. Register to má ako bod 2.18.

### Ale našiel som pri tom dieru, ktorú si nehlásil

**Záujemca odkrytý kontakt nevidel vôbec.** Obrazovka jeho ponuky
hľadala ponuku výhradne v stave `PENDING`:

```ts
const mine = offers?.find((o) => o.bidder_id === myId && o.status === 'PENDING');
```

Po **prijatí** ponuky teda `mine` bolo `undefined` a záujemcovi naskočil
prázdny formulár „Podať ponuku" — vlastnú prijatú ponuku ani kontakt na
predávajúceho nevidel, hoci mu ho databáza vydať vie. Odkrytie kontaktu
teda fungovalo len na **jednej strane z dvoch**.

Opravené: obrazovka pozná aj `ACCEPTED`, po prijatí sa formulár skryje
(meniť prijatú ponuku aj tak guard trigger nepustí) a namiesto neho je
karta **Odkrytý kontakt na predávajúceho** s prezývkou, menom, telefónom
a e-mailom.

### E-mail v profile — read-only

Pridaný do karty skrytých údajov. **Zámerne sa nedá upraviť**: zmena
e-mailu má vlastný overovací tok cez Supabase Auth (potvrdzovací odkaz na
starú aj novú adresu) a pole, ktoré sa tvári upraviteľne a nič neuloží,
je horšie než read-only. V režime úpravy to hovorí aj veta pod ním.

### Dôkaz — 7/7, proti živej DB, tromi rôznymi účtami

```
OK  PRED prijatim vlastnik NEDOSTANE kontakt      0 riadkov
OK  PRED prijatim zaujemca NEDOSTANE kontakt      0 riadkov
OK  PRED prijatim cudzi NEDOSTANE kontakt         0 riadkov
OK  e-mail sa neda vytiahnut z tabulky profile
OK  PO prijati VLASTNIK vidi meno+telefon+EMAIL zaujemcu
OK  PO prijati ZAUJEMCA vidi meno+telefon+EMAIL vlastnika
OK  PO prijati CUDZI stale nedostane nic          0 riadkov
7/7 preslo
```

Presne to, čo si žiadal overiť: pred prijatím je e-mail skrytý rovnako
ako telefón — **a to aj pred oboma stranami samotnej ponuky**, nielen
pred cudzími.

---

## Čo otestovať

- [ ] Vo formulári inzerátu vyber obec a napíš **„banska"** — musí
      ponúknuť Banskú Bystricu.
- [ ] V hľadaní napíš **„dom v ziari"** alebo **„byt kosice"** bez
      diakritiky.
- [ ] Profil → v karte skrytých údajov je **E-mail** (read-only).
- [ ] Ako záujemca otvor ponuku, ktorú ti niekto **prijal** — musíš
      vidieť kartu s kontaktom vrátane e-mailu, nie prázdny formulár.
