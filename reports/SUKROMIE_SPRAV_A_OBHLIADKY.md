# Únik správ pri ponukách, obhliadky a polia bytu

**Dátum:** 8. augusta 2026 · **ide OTA** (žiadny nový natívny modul)

---

## 1. Správa pri ponuke bola verejná — ✅ OVERENÉ RUNTIME (19/19)

### Čo sa stalo a prečo

Mal si pravdu, bol to únik. Príčina nebola v RLS, ako by sa čakalo:

```
RLS   offer_select_public   → riadok ponuky je VEREJNÝ   (správne, tak sme to chceli)
GRANT anon SELECT (tabuľkový, nie stĺpcový) → aj `message`   ← DIERA
```

Tabuľka mala **tabuľkový** `grant select`, nie stĺpcový. To je rozdiel,
ktorý nie je vidieť: `information_schema` ho vypisuje pri každom stĺpci
zvlášť, takže na pohľad vyzerá rovnako ako stĺpcové granty pri `profile`.
Rozdiel sa prejaví až v tom, že pri pridaní ĎALŠIEHO stĺpca sa ten nový
automaticky stane verejným.

Postgres nevie maskovať stĺpec podľa riadku. Rovnaká ponuka má byť pre
majiteľa čitateľná celá a pre cudzieho len čiastočne — to sa v jednom
`select` z tabuľky vyjadriť nedá. Preto sa čítanie správy z tabuľky
vybralo von.

### Ako je to teraz

```
grant select (id, property_id, bidder_id, amount, status,
              created_at, updated_at, viewed_by_owner_at)   -- `message` tam NIE JE
offerra.offer_messages(p_property)  -- vlastník: všetky · záujemca: len svoja · anon: nič
```

**Zápis som zámerne nechal na jednej vete.** Zvažoval som aj presun
`message` do vlastnej tabuľky (navrhoval si to ako alternatívu), ale
znamenalo by to dva zápisy pri podaní ponuky — a keby druhý zlyhal,
vznikla by ponuka bez správy a používateľ by ju už nemal ako doplniť.
Ponuka a jej správa vznikajú naďalej jedným `insert`.

**Vedľajší efekt, ktorý je v skutočnosti prínos:** `select('*')` na
`property_offer` už neprejde. Appka musí vymenovať stĺpce. Keby v tabuľke
raz pribudlo niečo citlivé, hviezdička by to zverejnila potichu —
vymenovaný zoznam nie.

### Dôkaz — päť identít

```
--- 1. Stĺpec `message` sa už z tabuľky NEDÁ prečítať ---
OK  ANON:               select ...,message → odmietnuté     42501
OK  cudzí prihlásený:   select ...,message → odmietnuté     42501
OK  vlastník inzerátu:  select ...,message → odmietnuté     42501
OK  záujemca (autor):   select ...,message → odmietnuté     42501
OK  ANON: select=*      → odmietnuté (hviezdička už nesiaha na message)

--- 2. Suma a prezývka VEREJNE OSTALI (oprava nezavrela viac, než mala) ---
OK  ANON vidí sumu aj prezývku pri oboch ponukách   [(900, 'ms_a'), (900, 'ms_b')]

--- 3. offer_messages(): kto čo dostane ---
OK  ANON               → žiadny prístup
OK  cudzí prihlásený   → 0 správ
OK  VLASTNÍK           → obe správy
OK  ZÁUJEMCA A         → LEN svoja, nie správa záujemcu B
OK  ZÁUJEMCA B         → LEN svoja, nie správa záujemcu A

--- 4. Žiadna obchádzka ---
OK  cudzí neuhádne obsah cez filter `message=ilike.*hypoteku*`
OK  cudzí nevytriedi podľa `order=message.asc`
```

Body 4 stoja za zmienku: aj keby stĺpec nebolo vidieť, dal by sa **uhádnuť
po písmenách** filtrom. Postgres to zaráža rovnako ako čítanie.

### Dvojitá kontrola, ktorú si žiadal

```
OK  ANON: dotazník nájomcu NEDOSTANE
OK  cudzí prihlásený: dotazník nájomcu NEDOSTANE
OK  VLASTNÍK dotazník vidí (má ho vidieť)
OK  ANON: oslovenie k dopytu NEDOSTANE
OK  cudzí prihlásený: oslovenie NEDOSTANE
```

`tenant_profile` ani `request_outreach` tú istú chybu nemajú — ani jedna
z nich nemá pre `anon` grant vôbec. Nebola to teda plošná trieda chyby,
ale konkrétne `property_offer`.

---

## 2. Obhliadky — ✅ OVERENÉ RUNTIME (dáta) / 🟡 ČAKÁ VIZUÁLNE OVERENIE

### Na starom zložitom toku nebolo urobené nič

Píšeš „ak si na starom flowe už robil kus práce, zjednoduš ho". **Nerobil
som naň nič** — tabuľka `viewing` v databáze neexistovala vôbec. Takže
nebolo čo orezávať a jednoduchá verzia je jediná, ktorá kedy vznikla.

### Tabuľka

```
id · property_id · requester_id · status · created_at · updated_at
unique (property_id, requester_id)
```

Žiadne `proposed_times`, žiadne `confirmed_time`.

**Jedna vec, ktorú by som inak spravil inak, a preto ju hlásim:** stav
`REQUESTED` si vymenoval v zadaní, tak som ho v číselníku nechal — ale
v tomto toku sa naň nikdy nikto nedostane, žiadosť vzniká rovno ako
`CONTACT_SHARED`. Je to jediná hodnota, ktorá dnes nemá použitie. Ak
chceš, zmažem ju; nechal som ju, lebo som ju nechcel z tvojho zadania
potichu vyhodiť.

### Text nad tlačidlom

Žiadal si, aby človek vedel, čo sa stane, PREDTÝM než klikne. Veta je
konštanta `VIEWING_CONSENT`, nie text v obrazovke — aby sa nedala zmeniť
na jednom mieste a zabudnúť na druhom:

> Kliknutím sa tvoje meno, telefón a e-mail okamžite zobrazia majiteľovi
> inzerátu a jeho kontakt tebe. Termín si dohodnete telefonicky mimo
> aplikácie. **Späť sa to vziať nedá.**

Je nad tlačidlom **aj** v potvrdzovacom dialógu — kto dialóg odklikne
zo zvyku, videl ju už predtým.

### Obhliadka nie je verejná, na rozdiel od ponuky

To je rozhodnutie, ktoré som spravil sám a chcem ho pomenovať: ponuka je
súťaž a jej suma patrí na oči všetkým, ale obhliadka je súkromná dohoda
dvoch ľudí. Keby bola verejná, každý by videl, kto sa chodí pozerať.

### Dôkaz — 23/23

```
OK  záujemca požiadal o obhliadku                          HTTP 201
OK  ZÁUJEMCA hneď vidí meno+telefón+e-mail VLASTNÍKA
OK  VLASTNÍK hneď vidí meno+telefón+e-mail ZÁUJEMCU
OK  žiadne čakanie na potvrdenie — stav je rovno CONTACT_SHARED
OK  cudzí prihlásený: 0 riadkov
OK  cudzí obhliadku ani nevidí v zozname
OK  ANON: obhliadka nie je verejná (na rozdiel od ponuky)
OK  vlastníkovi prišlo oznámenie ZIADOST_O_OBHLIADKU
OK  o ten istý inzerát sa nedá požiadať dvakrát             23505
OK  cudzí nežiada v mene niekoho iného                      42501
OK  vlastník nežiada obhliadku sám u seba                    42501
OK  obhliadku nemožno prepísať na iného záujemcu             42501
OK  záujemca označí COMPLETED                                HTTP 204
OK  z uzavretej obhliadky sa už nikam nejde                  42501
```

---

## 3. Placeholder podľa SALE/RENT — 🟡 ČAKÁ VIZUÁLNE OVERENIE

| | Text |
|---|---|
| **SALE** | „napr. mám schválenú hypotéku, viem sa dohodnúť rýchlo" |
| **RENT** | „napr. sťahujem sa kvôli práci, zmluvu viem podpísať do týždňa" |

Pri tom som opravil aj popisok nad poľom — pri prenájme hovoril „Správa
pre **predávajúceho**", hoci tam nikto nič nepredáva. Pri nájme je to
teraz „prenajímateľa". A pod pole pribudla veta, že správu vidí len druhá
strana — to je nová pravda od bodu 1 a používateľ ju musí vedieť.

---

## 4. + 5. Polia bytu a internet — ✅ OVERENÉ RUNTIME (dáta) / 🟡 (formulár)

| Pole | Kde | Kedy sa ukáže |
|---|---|---|
| `floor` + `floors_total` | `property` | byt, predaj aj prenájom |
| `has_elevator` | `property` | byt, predaj aj prenájom |
| `monthly_costs` | `property` | byt, predaj aj prenájom |
| `internet_included` | `property` | len prenájom |

**Rozhodnutie o umiestnení, ktoré si nechal na mne:** dal som ich do
`property`, nie do zvláštnej tabuľky pre nájom. Poschodie ani výťah nie sú
vlastnosti obchodu, ale **budovy** — kupca zaujímajú rovnako ako nájomcu.
To isté pri mesačných nákladoch: fond opráv platí aj ten, kto byt kúpi.
Jediné, čo je naozaj len o nájme, je internet.

Databáza stráži aj to, či zadané čísla dávajú zmysel:

```
OK  vlastník uloží poschodie/výťah/náklady/internet   HTTP 204
OK  a sú verejne čitateľné aj neprihlásenému          {floor: 3, floors_total: 5, …}
OK  „7. z 5" DB nepustí                               23514
OK  záporné mesačné náklady DB nepustí                23514
OK  suterén (-1) DB pustí                             HTTP 204
```

Suterén je dôvod, prečo pole poschodia používa inú klávesnicu než ostatné
číselné polia — `numeric` na iPhone nemá mínus, takže by sa suterén nedal
zadať vôbec.

---

## 6. Počet osôb pri prenájme — ✅ OVERENÉ RUNTIME, tvoja obava bola oprávnená

**Nebolo povinné.** Zmeral som to skôr, než som čokoľvek menil:

```
tenant_profile.num_people   is_nullable = YES
19 dotazníkov celkom, z toho 4 BEZ počtu osôb
```

Bolo teda len zobrazené, presne ako si tušil.

Opravené v oboch vrstvách — v appke aj v DB, lebo kontrola len v appke je
kontrola, ktorú vie ktokoľvek obísť:

```
OK  dotazník BEZ počtu osôb DB odmietne     23514
OK  počet osôb 0 DB odmietne                23514
OK  počet osôb 2 DB prijme                  HTTP 201
```

Podmienka je `NOT VALID` — platí na všetko nové a na každú úpravu, ale
štyri staré dotazníky nechá tak. Dopísať im počet osôb by znamenalo
vymyslieť údaj, ktorý nikto nezadal.

---

## 7. Kto inzeruje — 🟡 ČAKÁ VIZUÁLNE OVERENIE

Pod adresou na detaile je **„Pridal: {prezývka}"**, pri vlastnom inzeráte
„Pridal: ty". Ťahá sa spolu s inzerátom jedným dotazom, nie druhým.
Prezývka je verejná; meno ani telefón sa tam nepýtajú a stĺpcový grant by
ich ani nevydal.

---

## 9. Orezaný text v mriežke — 🟡 PRÍČINA NÁJDENÁ, opravená inak než minule

**Prečo minulá oprava nezabrala:** riešil som vtedy šírku bunky. Skutočná
príčina bola inde — `ParamCell` mala natvrdo:

```tsx
<Text numberOfLines={1}>   ← toto
```

Hodnota „1 600 € (2× mesačný nájom)" sa na jeden riadok do polovičnej
bunky nezmestí **pri žiadnej šírke**. Šírka teda nikdy nemohla pomôcť.

Teraz:

- text sa smie zalomiť (`numberOfLines` je preč),
- hodnota dlhšia než 16 znakov si vezme **celý riadok** namiesto polovice.

```
OK  „2. poschodie z 6"          → polovičná bunka
OK  „1 600 € (2× mesačný nájom)" → celý riadok
```

Nech je to povedané rovno: toto je oprava, ktorú **musíš vidieť na
telefóne**. Že sa reťazec nezreže, viem dokázať; že to vyzerá dobre, nie.

---

## Regresný prechod — 261 testov, 0 zlyhaní

Zmena grantov na `property_offer` je zásah, ktorý vie potichu rozbiť
čokoľvek, čo z tej tabuľky číta. Preto som prešiel všetko:

```
admin 24/24 · avatar 8/8 · dopyty 11/11 · diakritika 13/13
e-mail 7/7 · chyby 2/2 · flow 10/10 · funkcie 5/5 · diery 5/5
prenájom 12/12 · RLS 15/15 · vek 4/4 · videnie 10/10
správa 19/19 · obhliadka 23/23
dopyt-parse 9/9 · chyby 15/15 · cena 14/14 · realtime 6/6
prenájom-čistý 18/18 · triedenie 11/11 · budova 20/20
```

Tri suity najprv spadli. **Neboli to regresie appky** — moje testy robili
`POST … return=representation` bez výberu stĺpcov, čo je práve to, čo som
utesnil. Appka to takto nikde nerobí (`.select('id')`), overil som to
predtým, než som granty menil.

### Vec, ktorú musím priznať

Pri tom prechode vyšlo najavo, že v tvojom **živom katalógu ostali štyri
moje testovacie inzeráty** — „Test videnia" ×2, „Diera test", „Test email
kontakt". Zostali tam, keď testy spadli uprostred a nedobehli po sebe
upratovanie. Je to tá istá vec ako minule s „Test videnia", takže druhýkrát.

Zmazal som ich (overil som najprv, že všetky štyri patria `@offerra.test`
účtom) a upratovanie som vytiahol zo záveru testu do samostatného kroku,
ktorý beží **aj keď test spadne**. To bola príčina — nie zabudnutie, ale
upratovanie umiestnené tam, kam sa pri páde nedôjde.

---

## Čo otestovať na telefóne

- [ ] **Súkromie:** otvor inzerát s cudzími ponukami — pri ponukách iných
      ľudí **nesmie byť vidieť žiadna správa**. Pri svojej vlastnej áno.
      Na svojom inzeráte musíš vidieť správy pri všetkých ponukách.
- [ ] **Obhliadka:** na cudzom inzeráte klikni „Chcem obhliadku" — nad
      tlačidlom musí byť vysvetlenie ešte pred kliknutím a po kliknutí sa
      hneď objaví karta s menom, telefónom a e-mailom majiteľa.
- [ ] Na svojom inzeráte skontroluj, že ti žiadosť pribudla aj so
      záujemcovým kontaktom, a že prišlo oznámenie.
- [ ] **Placeholder:** otvor „Podať ponuku" na PRENÁJME a na PREDAJI —
      príklad v poli správy musí byť iný.
- [ ] **Počet osôb:** skús pri prenájme odoslať ponuku bez počtu osôb —
      musí sa objaviť hláška, nie ticho.
- [ ] **Byt:** v úprave inzerátu vyplň poschodie, výťah a mesačné náklady;
      v detaile musí pribudnúť karta „O byte a budove".
- [ ] **Internet:** pri prenájme musí byť „Internet v cene nájmu" ako
      samostatná otázka pod energiami.
- [ ] **Pridal:** na detaile musí byť pod adresou prezývka toho, kto
      inzerát pridal.
- [ ] **Orezanie:** v mriežke „Podmienky prenájmu" musí byť **ZÁBEZPEKA
      celá**, vrátane zátvorky s počtom nájmov — dlhé hodnoty teraz
      zaberajú celý riadok.
