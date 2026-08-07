# FÁZA 2 — OTVORENÉ PSEUDONYMNÉ PONUKY, DOPYTY, PROFIL

**Verzia:** 1.3.0
**Dátum:** 7.8.2026
**Stav:** ⏸️ **čakám na jednu vec od teba** — „OK update"

---

## Zhrnutie v troch vetách

Zmena rozhodnutia zo slepých na otvorené pseudonymné ponuky je zapracovaná —
**na slepej verzii som nič nezačal, takže nebolo čo prepisovať**. Suma
a prezývka sú verejné, reálne meno a telefón chráni stĺpcový grant
v databáze a odkryjú sa až akceptáciou, obom stranám. **30 automatických
kontrol, všetky prešli**; na tvojom telefóne to zatiaľ nie je.

---

## Najprv dve veci k bodu 1 (dizajn)

**Návrhy si už videl a schválil.** V zadaní píšeš „ak som ich ešte
neschválil" — schválil si ich: 7.8.2026 si z troch vybral
**A — Navy & Azure**. Je aplikovaná v `tokens.ts`, na všetkých obrazovkách
aj v assetoch ikony (commit `95264ad`).

Návrhy sú stále tu: https://claude.ai/code/artifact/b4d6ac81-e6e0-4938-b2f9-1ade01a678b8

**Jediná výhrada, ktorá platí:** ikona na ploche je stále šablónová, lebo
app ikonu OTA vymeniť nevie — je to natívny asset v binárke. Rozhodol si sa
build odložiť; `buildNumber` je pripravené na 2 a čaká.

---

## ⛔ Čo od teba potrebujem

### „OK update" pre `eas update`

Fáza 2 **nepridala žiadny natívny modul** — `AsyncStorage`,
`expo-image-picker` aj `expo-image` už v builde sú a prepínač v Nastaveniach
je súčasť React Native. Nový build teda netreba.

---

## 🔑 Jadro veci: prečo tu RLS nestačila

Pri **slepých** ponukách by riadková RLS stačila — cudzí riadok proste
nevidíš. Pri **otvorených** to nestačí, a je dobré vedieť prečo:

Riadok profilu **musí** byť verejne čitateľný, inak sa nedá zobraziť
prezývka pri ponuke. Lenže v tom istom riadku je aj meno a telefón.
Riadková politika ich neochráni — pustí buď celý riadok, alebo nič.

Riešenie sú **stĺpcové granty**:

```sql
grant select (id, nickname, avatar_url, created_at) on offerra.profile
  to anon, authenticated;
```

`full_name` a `phone` v grantoch **nie sú vôbec**. Nedajú sa vypýtať ani
omylom, ani úmyselne — databáza vráti `42501`. Overené oboma spôsobmi:

```
anonym            GET profile?select=full_name,phone  → HTTP 401 (42501)
cudzí prihlásený  GET profile?select=full_name,phone  → HTTP 403 (42501)
JA SÁM            GET profile?select=full_name        → HTTP 403 (42501)
JA SÁM            rpc/my_profile()                    → Testovací Človek / +421 900 777 888
```

Aj ja sám sa k svojmu menu dostanem len cez funkciu. To je zámer — jedna
cesta, ktorá sa dá skontrolovať, namiesto stĺpca, na ktorý sa dá zabudnúť.

---

## 🤝 Odkrytie kontaktu — dôkaz, nie zmena statusu

Žiadal si overiť, že sa údaje **skutočne sprístupnia obom stranám**, nie že
sa len prepne stav. Presne to test robí:

```
PRED akceptáciou   vlastník  → []          (nedostane nič)
PRED akceptáciou   záujemca  → []          (nedostane nič)
cudzí sa pokúsi akceptovať   → 0 riadkov   (RLS ho nepustí)

vlastník prijme ponuku       → status ACCEPTED

PO akceptácii  vlastníkovi   → BIDDER: Záujemca Skutočný / +421 900 333 444
PO akceptácii  záujemcovi    → OWNER:  Vlastník Skutočný / +421 900 111 222
PO akceptácii  cudziemu      → []          (stále nič)
```

Sú to reálne hodnoty vrátené z databázy, nie tvrdenie o tom, čo by mala
vrátiť.

---

## 📋 Čo som pridal nad rámec zadania a prečo

**Tabuľka `offerra.profile`.** V zadaní nie je, ale bez nej sa nedá splniť
ani prezývka, ani odkrytie kontaktu — meno a telefón musia niekde bývať.

**Prezývka je vynútená databázou, nie len obrazovkou.**
`property.owner_id` aj `property_offer.bidder_id` mieria cudzím kľúčom na
`offerra.profile`, kde je `nickname NOT NULL`. Bez prezývky teda inzerát
ani ponuka **neprejdú**, nech by klient robil čokoľvek. Obrazovka
`prezyvka.tsx` je len pohodlná cesta k tomu istému pravidlu.

**Jedna živá ponuka na záujemcu a inzerát.** Zvýšenie ponuky je úprava tej
istej, nie nová — inak by sa verejný zoznam dal zaplaviť. Drží to čiastočný
unikátny index v DB.

**Mazanie účtu SQL funkciou, nie edge funkciou.** MUTARK má
`delete-account` ako edge funkciu. U nás to robí
`offerra.delete_my_account()` — nepotrebuje samostatný deploy a testuje sa
rovnako ako zvyšok schémy. Overené: `auth.users 1→0`, `profile → 0`.

---

## ⚠️ Kde som bol zámerne opatrný

**„Osloviť" nie je notifikácia.** Overil som v registri aj v kóde:
Offerra **nemá notifikácie vôbec** — žiadne `expo-notifications`, žiadny
push token. Oslovenie je preto **záznam**, ktorý adresát vidí vo svojom
dopyte. Je to medzikrok, nie hotová vec, a v registri je to tak napísané.

**Prepínač upozornení v Nastaveniach je len predvoľba.** Uloží sa, ale
nateraz nič neposiela — a priamo pod ním to tak aj píše. Nechcel som tam
dať prepínač, ktorý sa tvári, že niečo robí.

---

## 🏠 Seed

6 pseudonymných záujemcov, **13 ponúk, 8 dotazníkov nájomcu, 6 dopytov**.
Jeden inzerát je zámerne bez ponúk, aby bolo vidieť aj prázdny stav.
Mená a telefóny seed záujemcov sú vyplnené — inak by sa nedalo ukázať
odkrytie kontaktu.

Zmazanie: `delete from offerra.profile where is_seed;`

---

## Čo budeš testovať na telefóne

1. **Po spustení ťa má appka pýtať PREZÝVKU** — bez nej sa nedostaneš ďalej.
   Vyplň aj meno a telefón (potrebné pre bod 6).
2. **Detail inzerátu** — namiesto „Ponuky: čoskoro" je teraz zoznam ponúk
   s prezývkami a sumami, zoradený od najvyššej.
3. **Odhlás sa a pozri detail bez prihlásenia** (alebo požiadaj niekoho) —
   ponuky musia byť vidieť aj tak. To je celá pointa otvoreného modelu.
4. **Podaj ponuku** na cudzí inzerát. Pri **prenájme** ti pribudne dotazník
   nájomcu — ten sa vo verejnom zozname zobraziť **nesmie**.
5. **Na svojom inzeráte** daj „Spravovať ponuky" → uvidíš dotazník
   a tlačidlá Prijať/Odmietnuť.
6. **Prijmi ponuku** — musí sa ti zobraziť meno a telefón záujemcu.
   **Odfoť to.**
7. **Dopyty** — tab má 6 dopytov. Otvor jeden a skús „Osloviť so svojím
   inzerátom".
8. **Pridať → „+ Pridať dopyt"** — vyplň a zverejni, musí sa objaviť v tabe.
9. **Profil** — už to nie je debug obrazovka. Skús pridať fotku.
10. **Nastavenia (ozubené koliesko)** — odhlásenie a mazanie účtu.
    **Mazanie účtu netestuj na svojom účte**, pokiaľ oň nechceš prísť —
    pýta si dve potvrdenia, ale potom naozaj maže.
11. **Ak sa niekde „nestane nič"** — je to chyba, napíš mi to.

---

## Čo sa NEZMENILO

`/root/mutark` aj `/root/famiglia` sú `git status --porcelain` prázdne, na
tých istých commitoch. Čítal som z MUTARKu vzor pre nickname (`setup.tsx`)
a pre mazanie účtu (`settings.tsx`) — **nezapisoval som do nich nič**.

Testovacie skripty a seed (obsahujú heslá a service role kľúč) sú
**zámerne mimo repa** — `rastioeu/offerra` je verejný.
