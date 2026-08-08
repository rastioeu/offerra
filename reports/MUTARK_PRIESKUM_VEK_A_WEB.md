# MUTARK prieskum · vek 18+ · web pre Apple review

**Dátum:** 8. augusta 2026

---

## 1. Mestské časti — prieskum MUTARK, a prekvapivý výsledok

Zadanie znelo: *„nerob nový geografický dataset, over najprv toto."*
Overil som. **MUTARK dataset by bol pre Offerru krok DOZADU.**

MUTARK a Offerra sú v tom istom Supabase projekte, takže som sa na
`public.cities` pozrel priamo:

| | MUTARK `public.cities` | Offerra `offerra.city` |
|---|---|---|
| celkovo miest | 68 823 (celý svet) | 2 925 |
| **slovenských** | **147** | **2 925** |
| slovenských mestských častí | **9** (len Bratislava) | Bratislava aj Košice ako samostatné riadky |
| okres | ✗ nemá | ✓ všetkých 79 |
| kraj | ✗ nemá | ✓ všetkých 8 |
| súradnice | ✓ | ✓ (2925/2925) |
| vzťah rodič–dieťa | ✓ `parent_city_id` | ✗ |

MUTARK je globálna hra, takže má celý svet, ale zo Slovenska len 147
najväčších miest. **Offerra má kompletný register 2 925 obcí** vrátane
okresov a krajov — pre realitnú appku je to nutnosť, lebo dom stojí aj
v Bajerovciach a Selciach, ktoré MUTARK vôbec nepozná.

**Prevziať MUTARK dataset by teda znamenalo prísť o 2 778 obcí.**
Neurobil som to a odporúčam to neurobiť.

### Čo z MUTARKu prevziať OPLATÍ — samotný vzťah, nie dáta

MUTARK má `parent_city_id` + `parent_name` + `parent_rule`. Offerra už
mestské časti **ako riadky má** (Petržalka, Ružinov, Staré Mesto…), len
im chýba väzba na mesto. Preto sa v appke zobrazuje „Petržalka" namiesto
„Bratislava – Petržalka".

**Návrh (nerealizovaný, čakám na tvoje slovo):** doplniť do
`offerra.city` stĺpec `parent_name` a vyplniť ho pre 17 mestských častí
Bratislavy a 22 mestských častí Košíc. Nie je to nový dataset — je to
väzba nad dátami, ktoré už máme, a dá sa odvodiť z okresu (okresy
Bratislava I–V a Košice I–IV). Výber by potom ukazoval
**„Bratislava – Petržalka"**, presne ako MUTARK.

Odhad: jedna migrácia, jedna úprava `CityPicker`. Chcem na to tvoje OK,
lebo to mení, čo ľudia v appke vidia.

---

## 2. Ulice — čo je reálne k dispozícii

MUTARK ulice **nemá vôbec** (`cities` je len city-level). Tu ide teda
naozaj o nový zdroj. Preskúmal som možnosti a **nič som nezabudoval** —
podľa zadania najprv nález:

| Zdroj | Pokrytie SK | Problém |
|---|---|---|
| **OpenStreetMap** (Overpass/Geofabrik) | veľmi dobré | export SK má stovky MB; ulice treba spárovať s obcou, čo je priestorová operácia (PostGIS) |
| **Nominatim API** | dobré | limit 1 dotaz/s, na autocomplete pri písaní **nepoužiteľný**; vlastná inštancia je server navyše |
| **Register adries MZ SR** | úplné a oficiálne | otvorené dáta existujú, ale formát a licenciu treba overiť |
| **Vlastné dáta používateľov** | na začiatku nula | funguje hneď, rastie s appkou, žiadna závislosť |

**Môj návrh: začať tvojím fallbackom, teda vlastnými dátami.** Dôvody:

1. Ulica je v Offerre **nepovinná a bez čísla domu** — presná adresa je
   zámerne skrytá do dohody. Nie je to pole, na ktorom appka stojí.
2. Autocomplete nad vlastnými dátami sa dá spraviť **dnes**, jedným
   pohľadom `distinct street where city = ?`, bez novej závislosti.
3. Keď sa ukáže, že to nestačí, doplní sa OSM alebo register MZ SR
   **do toho istého poľa** — appka sa meniť nemusí.

Ak chceš rovno plné dáta, viem sa pustiť do Registra adries MZ SR — ale
to je samostatná úloha na niekoľko hodín (stiahnuť, overiť licenciu,
naimportovať, spárovať s 2 925 obcami) a chcem na ňu tvoje výslovné OK.

---

## 3. MUTARK admin konzola — čo sa dá nastaviť za behu

MUTARK má tabuľku `public.config` s **jedným riadkom** a 24 stĺpcami.
Vypísal som ich všetky a rozdelil:

**Herné parametre — pre Offerru nezmyselné (nepreberám):**
`timer_seconds`, `round_hours`, `branches_from_author`,
`route_lifetime_hours`, `forward_daily_limit`, `slot_coefficient`,
`slots_min/max/current/locked`, `lottery_hours`, `active_window_hours`,
`silence_hours_min/max`, `seed_forward_*` (5 stĺpcov),
`max_nudge_batches_per_day`, `regulation_enabled`, `exceptions_bypass_daily`.

**Vzory, ktoré dávajú zmysel aj pre Offerru (návrh):**

| MUTARK | Analógia pre Offerru | Prečo |
|---|---|---|
| `is_test_mode` | `is_test_mode` | skryje ukážkové inzeráty naraz |
| `secret_max_length` | `max_photos_per_property`, `max_description_length` | limity dnes nikde nie sú |
| `max_secrets_per_day` | `max_properties_per_day`, `max_offers_per_day` | ochrana pred zaplavením |
| — | **`report_alert_threshold`** | dnes je **natvrdo 3** v SQL funkcii `admin_alerts` — na zmenu treba migráciu |

**Overil som tvoju otázku:** prah upozornenia pri nahláseniach **je
hardcoded**, nie konfigurovateľný. Sedí to, čo si tušil.

Návrh: tabuľka `offerra.config` s jedným riadkom, čítateľná všetkými,
zapisovateľná len adminom, a sekcia „Nastavenia appky" v tabe Správa.
**Nerobím to bez tvojho OK** — je to nová tabuľka a nová obrazovka.

---

## 4. MUTARK Nastavenia a horná lišta

MUTARK `settings.tsx` má 757 riadkov. Položky, ktoré Offerra **už má**:
upozornenia (granulárne), jazyk, Ako to funguje, Čo je nové, Odhlásiť sa,
Zmazať účet, verzný riadok. Dnes pribudli **Ochrana osobných údajov**
a **Podmienky používania**.

**Návrh na doplnenie (nezabudované):**

1. **„Pozastaviť moje inzeráty"** — tvoja analógia k MUTARK „vacation
   mode". Pre realitnú appku dáva zmysel: keď je človek na dovolenke
   alebo si to rozmyslel, stiahne všetky inzeráty naraz namiesto po
   jednom. Technicky `status DRAFT` hromadne, vratné.
2. **„Podpora / napíšte nám"** — otvorí e-mail. Apple to pri recenzii
   rád vidí.
3. **„Nahlásiť problém"** — to isté, ale s predvyplnenou verziou buildu.

**Horná lišta — návrh ikon, ako si žiadal (krátko, bez mockupu):**

| Ikona | Čo robí | Odporúčam |
|---|---|---|
| 🔔 zvonček | oznámenia — **už je** | ostáva |
| ⚙︎ ozubené koliesko | Nastavenia priamo z hlavnej obrazovky, nie cez Profil | **áno** |
| 🌙 mesiac | pozastaviť moje inzeráty (bod 1 vyššie) | až keď tá funkcia vznikne |
| ✨ sparkles | AI | **nie** — Offerra AI nemá a ikona bez funkcie je klam |

---

## 5. História používateľa — stav

Overil som, čo Profil naozaj ukazuje: **Moje inzeráty** (vrátane DRAFT
a skrytých správcom, nielen ACTIVE), **Obľúbené**, **Moje ponuky**,
**Moje dopyty** a **Časová os** so zlúčenými udalosťami. Všetky riadky
sú klikateľné (opravené dnes).

**Chýba jediná vec:** *ponuky, ktoré som dostal na svoje inzeráty*, nemajú
v Profile samostatný zoznam — dostaneš sa k nim len cez konkrétny
inzerát. Navrhujem doplniť sekciu „Ponuky na moje inzeráty". Malá vec,
poviem si o ňu spolu s ostatnými návrhmi.

Kalendárový pohľad ako MUTARK **neodporúčam** — pri realitnej appke je
udalostí rádovo menej a časová os to pokrýva lepšie.

---

## 6. Vek 18+ — rozhodnuté a ZAPRACOVANÉ

Dal si mi voľnú ruku s odôvodnením. **Tvoje uvažovanie potvrdzujem
a implementoval som 18+.**

Dôvod, ktorý ma presvedčil, je presne ten tvoj: Offerra sprostredkúva
**reálne právne úkony**. Podľa § 9 Občianskeho zákonníka má maloletý
spôsobilosť len na úkony *primerané rozumovej a vôľovej vyspelosti
veku* — kúpa, predaj či nájom nehnuteľnosti tam ani zďaleka nepatria.
Nájomná zmluva uzavretá maloletým by bola neplatná.

**Protiargument som zvážil a zamietam ho:** dalo by sa povedať, že samotné
prezeranie a dopyty transakciou nie sú. Lenže Offerra nemá režim „len
prezerám" — kto má účet, môže **hneď** podať ponuku. Deliť to na dva
druhy účtov by bola zbytočná zložitosť pri appke, ktorá má jediný účel.
Prezerať katalóg sa dá **aj bez prihlásenia**, takže neplnoletý o nič
nepríde — len sa nemôže zaregistrovať a ponúkať.

**Ako je to spravené:** v onboardingu (obrazovka „Ako ťa máme volať?")
je povinné zaškrtávacie pole **„Mám 18 rokov a viac a súhlasím
s podmienkami používania."** Bez neho je tlačidlo Pokračovať neaktívne.
Ukladá sa `age_confirmed_at` — **čas potvrdenia, nie `true`**, aby sa pri
prípadnej zmene podmienok dalo zistiť, kedy to človek odklikol.

Overenie dokladom nerobíme — čestné vyhlásenie je to, čo majú bežné
appky tohto druhu.

**Vedomé rozhodnutie:** bránu drží onboarding, **nie databáza**. DB nevie
rozlíšiť „ešte neodklikol" od „klame", a tvrdý `NOT NULL` by rozbil
existujúce účty vrátane tvojho. Test to výslovne overuje a hovorí to
nahlas.

**Dôkaz — `vek_test.py` 4/4:**

```
OK  profil sa zalozi s potvrdenim veku            HTTP 201
OK  razitko je naozaj v DB                        2026-08-08 12:00:00+00
OK  appka si ho vie precitat spat (stlpcovy grant)
OK  DB nevynucuje potvrdenie (branu drzi onboarding)
```

*Vedľajší nález:* pri písaní testu mi PostgREST vrátil 403 na vloženie
profilu s `return=representation`. Nie je to chyba — rola
`authenticated` **nemá SELECT na `full_name` a `phone`** (ochrana
kontaktu z Fázy 2), takže PostgREST nemôže vrátiť celý riadok späť.
Appka to tak isto nerobí. Pekné nezávislé potvrdenie, že tá ochrana
naozaj funguje.

---

## 7. Apple Age Rating — nevyplním, ale mám pre teba presné odpovede

**Nemám prístup do App Store Connect** (mám len submit kľúč, nie API na
metadáta). Dotazník musíš preklikať ty. Tu sú odpovede podľa **skutočného
stavu appky**, nie odhadom:

| Otázka | Odpoveď | Prečo |
|---|---|---|
| Cartoon or Fantasy Violence | None | — |
| Realistic Violence | None | — |
| Sexual Content or Nudity | None | — |
| Profanity or Crude Humor | None | — |
| Alcohol, Tobacco, or Drug Use | None | — |
| Horror/Fear Themes | None | — |
| Mature/Suggestive Themes | None | — |
| Medical/Treatment Information | None | — |
| Simulated Gambling | None | žiadne súťaže ani lotéria |
| Contests | None | — |
| **User Generated Content** | **Yes** | inzeráty, ponuky, dopyty píšu ľudia |
| Does the app contain unrestricted web access? | **No** | appka nemá prehliadač |

Pri **User Generated Content** sa Apple dopýta na moderovanie —
odpovedz, že appka má **nahlasovanie obsahu aj používateľov, blokovanie
používateľov a ľudské posúdenie každého nahlásenia** (všetko funguje,
overené 24/24 v `admin_test.py`).

**Kľúčová otázka, na ktorú si sa pýtal — chat.** Overil som, ako appka
naozaj funguje: **in-app chat NEMÁ**. Jediné, čo sa deje, je
**jednorazové odkrytie telefónu a e-mailu po prijatí ponuky**; ďalej si
ľudia píšu mimo appky. V dotazníku teda **nie je** „unrestricted messaging
with strangers" — je to výmena kontaktu po obojstrannom súhlase.

**Očakávaný výsledok: 4+**, prípadne **12+**, ak Apple UGC posunie
vyššie. Presné číslo vypočíta Apple po odoslaní odpovedí — **napíš mi, čo
ti vyšlo**, doplním to do registra.

Ako si sám napísal, rozdiel medzi App Store hodnotením (4+/12+) a vekom
registrácie (18+) je v poriadku a bežný: prvé hovorí, pre koho appka nie
je nevhodná, druhé je naše vlastné pravidlo.

---

## 8. Web pre Apple review — hotový, ale **nemám ho kam nahrať**

Repo `rastioeu/offerra_web` **existuje** a je verejné. Vygeneroval som
doň kompletný web a lokálne aj commitol:

```
index.html     landing + ako to funguje
privacy.html   Ochrana osobných údajov
terms.html     Podmienky používania
support.html   kontakt, nahlásenie obsahu, zmazanie účtu
README.md      ako sa web prepisuje
```

**Push prešiel** (8.8.2026, po tom, čo mi Rastio dal token s prístupom
na tento repozitár). Súbory sú na GitHube:

```
.nojekyll        0 B
README.md      726 B
index.html   2 916 B
privacy.html 6 514 B
support.html 2 743 B
terms.html   4 756 B
```

### 🔴 Ostáva JEDEN krok — zapnúť Pages

Token má **Contents: write**, ale nie **Pages: write**:

```
POST /repos/rastioeu/offerra_web/pages   →  403
"Resource not accessible by personal access token"
```

Sprav to prosím ty (30 sekúnd):

1. `https://github.com/rastioeu/offerra_web/settings/pages`
2. **Source: Deploy from a branch**
3. **Branch: `main`**, priečinok **`/ (root)`** → **Save**

Alebo mi doplň tokenu oprávnenie **Pages: Read and write** a zapnem to sám.

### URL do App Store Connect (platné po zapnutí Pages)

```
Privacy Policy URL   https://rastioeu.github.io/offerra_web/privacy.html
Terms of Use URL     https://rastioeu.github.io/offerra_web/terms.html
Support URL          https://rastioeu.github.io/offerra_web/support.html
Marketing URL        https://rastioeu.github.io/offerra_web/
```

Appka na tieto adresy **už odkazuje** — v Nastaveniach sú obe obrazovky
a v nich odkaz na verejnú verziu.

### Vlastná doména

Overil som MUTARK aj Famigliu: **ani jeden nemá hostované právne stránky**
ani vlastnú doménu v repe. MUTARK má texty len ako obrazovky v appke.
Nie je teda kam Offerru „pridať" — GitHub Pages je najrýchlejšia cesta.
`offerra.sk` rezolvuje na 37.9.175.195, ale netuším, či je tvoja.

### Anglická verzia

Nestihol som ju a zámerne som ju neodfláknil strojovým prekladom —
právny text preložený nedbalo je horší než slovenský. Apple review
v angličtine nevyžaduje, aby bola politika v angličtine. Ak ju chceš,
poviem si o samostatný krok.
