# FÁZA 2 — OTVORENÉ PSEUDONYMNÉ PONUKY, DOPYTY, PROFIL

**Verzia:** 1.3.3
**Dátum:** 7.8.2026
**Stav:** ⏸️ **čakám na jednu vec od teba** — otestovať to na telefóne

---

## Zhrnutie v troch vetách

Zmena rozhodnutia zo slepých na otvorené pseudonymné ponuky je zapracovaná —
**na slepej verzii som nič nezačal, takže nebolo čo prepisovať**. Suma
a prezývka sú verejné, reálne meno a telefón chráni stĺpcový grant
v databáze a odkryjú sa až akceptáciou, obom stranám. **30 automatických
kontrol, všetky prešli**, a Fáza 2 je publikovaná cez OTA.

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

## ✅ OTA je vonku

Fáza 2 **nepridala žiadny natívny modul** — `AsyncStorage`,
`expo-image-picker` aj `expo-image` už v builde sú a prepínač v Nastaveniach
je súčasť React Native. Nový build teda nebol potrebný.

```
Branch             production
Runtime version    1.0.0
Update group ID    883e0fda-6f77-4591-830c-84aa3370a154
Commit             f122d0f
```

**Zavri appku úplne a znova ju otvor.** Pri prvom spustení si od teba
vypýta prezývku — bez nej sa ďalej nedostaneš, a je to zámer.

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

## 🔴 Štyri diery, ktoré som našiel sám — a opravil

Po dokončení Fázy 2 som si prešiel oprávnenia na ponukách a našiel štyri
diery. **Nenahlásil si ich ty, našiel som ich vlastnou kontrolou** — píšem
to sem, lebo dve z nich boli vážne.

RLS pustila úpravu ponuky obom stranám, ale nikde nebolo povedané, **kto
smie meniť ktorý stĺpec**. Riadková politika to ani vyjadriť nevie.

Namerané PRED opravou:

```
🔴 záujemca si vedel SÁM akceptovať vlastnú ponuku
🔴 a tým si vytiahnuť tvoje meno a telefón
🔴 majiteľ vedel prepísať SUMU cudzej ponuky (190 000 → 1)
🔴 majiteľ vedel prepísať SPRÁVU záujemcu
```

Prvé dve rušia celé pravidlo, na ktorom Fáza 2 stojí — že kontakt sa
odkryje až vtedy, keď ponuku prijme majiteľ.

Opravené triggerom v databáze:

| Kto | Smie zmeniť |
|---|---|
| majiteľ | **len** stav, a len z „čaká" na „prijatá/odmietnutá" |
| záujemca | svoju sumu a správu, alebo ponuku stiahnuť |
| nikto | ponuku presunúť na iný inzerát či iného človeka |
| nikto | už uzavretú ponuku |

Po oprave **5/5 ošetrených, 0 dier**, a plný test Fázy 2 naďalej **25/25** —
trigger nerozbil bežné používanie.

> Kde je hranica: RLS odpovedá na „smieš siahnuť na tento RIADOK".
> Stĺpcový grant na „smieš čítať tento STĹPEC". A na „smieš ho zmeniť NA
> TÚTO hodnotu" už odpovedá len trigger. Fáza 2 mala prvé dve, tretie
> chýbalo.

---

## 🔴 Druhé kolo — päť ďalších dier

Prešiel som aj zvyšné tabuľky. Namerané pred opravou:

```
🔴 ponuku sa dalo podať AJ PO uplynutí uzávierky
🔴 majiteľ si vedel nafúknuť počítadlo zobrazení        → 99 999
🔴 majiteľ si vedel označiť inzerát ako „UKÁŽKA"
🔴 majiteľ vedel spätne datovať inzerát                 → 2000-01-01
🔴 nájomca vedel prepísať dotazník PO prijatí ponuky    2 000 → 9 000 €
```

**Najhoršia je prvá.** Detail píše „Ponuky do 28. augusta · ostáva 21 dní"
a ponuku po termíne pokojne prijal. **Appka klamala** — časovač bol len
ozdoba. To je presne to, čo máme v pravidlách zakázané.

Spätné datovanie nie je kozmetika: katalóg radí podľa dátumu pridania,
takže sa ním dalo preskočiť dopredu pred ostatných.

Po oprave **6/6 ošetrených, 0 dier**. V appke sa navyše tlačidlo „Podať
ponuku" po uzávierke vôbec nezobrazí — namiesto neho je dôvod. Server má
posledné slovo, ale ty nemáš vidieť chybu z databázy.

---

## 🔁 Ďalšie dve veci, ktoré som pri tom dorobil

**Obrazovky sa neobnovovali po návrate.** Tá istá trieda chyby ako profil:
podal si ponuku, vrátil sa na detail a videl starý zoznam. To isté po
zverejnení inzerátu a po vytvorení dopytu. Obrazovky sa teraz obnovia, keď
sa na ne vrátiš.

**Počítadlo zobrazení.** `view_count` bol v modeli od Fázy 1, ale nemal ho
kto zvyšovať — úpravu cudzieho inzerátu RLS nepustí, a práve cudzí ho aj
pozerá. Teraz sa počíta (vlastné pozeranie sa nepočíta) a vidno ho
v parametroch inzerátu.

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

## ✅ Stav všetkých testov

```
rls_test.py      15/15    RLS Fáza 1
flow_test.py     10/10    reťazec formulára
rls_test_f2.py   25/25    otvorené pseudonymné ponuky
fn_test.py         5/5    my_profile / delete_my_account
hole_test.py       5/5    oprávnenia na ponukách
hole_test2.py      6/6    uzávierka a integrita
                 ──────
                 66/66
```

Pri regresii mi spadli dve staré sady z Fázy 1. **Nebola to nová chyba** —
tie testy vytvárali inzerát pre používateľa bez prezývky, čo Fáza 2
zakázala. Testy boli zastarané voči schéme a ja som ich po tej zmene
nepustil znova. Opravené — a je to zároveň dôkaz, že pravidlo „bez
prezývky sa nedá inzerovať" naozaj drží.

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
