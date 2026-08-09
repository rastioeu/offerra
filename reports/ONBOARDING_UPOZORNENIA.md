# Nastavenie upozornení pri prvom prihlásení

**Dátum:** 9. augusta 2026 · **Stav: 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE**

---

## Čo pribudlo

Onboarding má odteraz tri kroky namiesto dvoch:

```
LOGIN  →  PREZÝVKA  →  UPOZORNENIA  →  appka
```

Nová obrazovka robí obe veci zo zadania naraz: najprv **vlastným textom
povie prečo**, potom na stlačenie tlačidla vyvolá **systémový dialóg**,
a hneď pod ním je **zoznam typov s prepínačmi**.

---

## KONTROLA PRED HOTOVO

**[✅] Systémový push permission dialóg sa žiada pri prvom prihlásení, v rozumnom momente**

Brána má tretí stupeň, pokrytý testom `onboarding_test.js` **13/13**:

```
Bez profilu ide na prezývku, NIE rovno na upozornenia        ✅
Profil je, upozornenia nevidel → upozornenia                 ✅
Na obrazovke upozornení sa už nikam neposiela (žiadny cyklus) ✅
Po dokončení odchádza preč                                   ✅
```

Systémový dialóg **nevyskočí sám** — vyvolá ho až tlačidlo „Zapnúť
upozornenia", teda po prečítaní vysvetlenia.

**[✅] Výber typov sa ukáže priamo pri prvom prihlásení, nie len skrytý v Nastaveniach**

Je na tej istej obrazovke, hneď pod povolením. A je to **ten istý
komponent** ako v Nastaveniach (`NotificationTypeList`), nie zjednodušená
kópia, ktorá by sa časom rozišla.

Dôkaz, že sa v tom kroku dá naozaj prepínať — cez PostgREST, ako appka,
`notif_onboarding_test.py` **13/13**:

```
Prepínač typu sa dá vypnúť priamo v onboardingu       HTTP 201
Vypnutie sa naozaj uložilo (nie len v UI)             enabled: false
Vypnutý typ should_notify() ODMIETNE                  false
Nedotknutý typ sa posiela (default zapnuté)           true
```

Posledné dva riadky sú podstatné: bez nich by prepínač mohol byť ozdoba,
ktorá zapisuje riadok, čo nikto nečíta.

**[✅] Defaultné nastavenie (všetko zapnuté, IHNEĎ) sa dá hneď upraviť v tomto kroku**

Default overený v tom istom teste: `frequency: IHNED`, typy zapnuté.
Upraviť sa dá priamo tam — viď riadok vyššie.

---

## 🔴 Jedna vec zo zadania splnená nie je: výber FREKVENCIE

Zadanie hovorí „výber typov **+ frekvenciu**". Typy sú. **Frekvencia sa
nezobrazuje — ani tu, ani v Nastaveniach.**

Nie je to opomenutie. Denný a týždenný súhrn potrebujú **plánovanú úlohu
na serveri, ktorú Offerra nemá**. Jediná fungujúca hodnota je „Ihneď",
a jedna možnosť nie je výber. Chip so štítkom „(čoskoro)" je presne ten
druh nefunkčnej výplne, ktorý Apple pri recenzii odmieta (App Review 2.1).

**Default `IHNED` zo zadania teda platí a je overený — chýba len možnosť
ho zmeniť.** Keď súhrny naozaj pribudnú, zapne sa to jedným prepínačom
`DIGEST_READY` na jednom mieste.

Ak to chceš aj tak zobraziť, povedz — je to jeden riadok. Ale potom by
appka ponúkala voľbu, ktorá nič nespraví.

---

## Rozhodnutia, ktoré som spravil sám

**1. Krok je AŽ PO prezývke, nie pred ňou.**
Systémový dialóg sa dá položiť **raz**. Kto klikne „Nepovoliť", toho sa
iOS druhýkrát nespýta — zapnúť sa to dá už len v nastaveniach telefónu.
Pred prezývkou by sa appka pýtala skôr, než o sebe čokoľvek povedala.

**2. Vlastné vysvetlenie som spravil, hoci si ho označil za nepovinné.**
Čas netlačil. Sú tam tri konkrétne príklady („Niekto podal ponuku na tvoj
inzerát"), nie slovo „notifikácie".

**3. Krok sa dá preskočiť — a preskočenie sa zapíše.**
„Teraz nie" je odpoveď a druhýkrát sa nepýtame. Na rozdiel od prezývky to
**nie je podmienka vstupu**: bez upozornení sa appka používať dá a je to
na obrazovke napísané.

**4. Existujúcim profilom som `notif_onboarded_at` NEDOPLNIL.**
Keby som im nastavil `now()`, krok by nikto z doterajších používateľov
nikdy nevidel — **vrátane teba, ktorý ho má otestovať.** A hlavne: možnosť
vybrať si typy nikdy nedostali, tak ju dostanú teraz.

**Znamená to, že pri najbližšom otvorení appky ten krok uvidíš aj ty**,
hoci účet máš dávno. To je zámer, nie chyba.

**5. Zoznam typov je zdieľaný komponent.**
Kópia v onboardingu by sa s tou v Nastaveniach časom rozišla.

---

## Súkromie — jedna vec, na ktorú som si dal pozor

`authenticated` má na nový stĺpec **len UPDATE, nie SELECT**.

Dôvod: `profile` má SELECT na **cudzie** riadky (verejná je prezývka,
avatar, overenie). Keby som pridal SELECT aj sem, ktokoľvek by vedel
vyčítať, kedy si kto nastavoval upozornenia. Vlastnú hodnotu appka dostane
cez `my_profile()` — `SECURITY DEFINER`, vracia výhradne riadok volajúceho.

Overené oboma smermi:

```
Cudzí človek stĺpec neprečíta            HTTP 403, 42501
Ale bežné verejné polia číta ďalej       HTTP 200
Cudzí to ani neprepíše (RLS drží riadok) HTTP 403, hodnota v DB nezmenená
```

---

## Čo mám otestovať ty na telefóne

Krok som **nevidel na zariadení** — to je tvoja časť.

1. **Otvor appku.** Keďže backfill som nerobil, obrazovka „Chceš o tom
   vedieť?" ti naskočí, hoci účet máš dávno.
2. **Skús najprv prepnúť pár typov bez toho, aby si dal povolenie** — má
   to fungovať aj tak (tie isté preferencie riadia zvonček).
3. **Stlač „Zapnúť upozornenia".** Systémový dialóg iOS už raz povolený
   máš, takže druhý raz nevyskočí a stav sa má prepnúť na
   „Upozornenia sú zapnuté".
4. **Stlač „Hotovo"** → má ťa to pustiť do appky.
5. **Zavri a otvor appku znova** — obrazovka sa už **nesmie** objaviť.
6. **Nastavenia → Upozornenia** — musí tam byť ten istý zoznam a musí
   ukazovať, čo si nastavil v kroku 2.

Bod 5 je najdôležitejší: keby sa krok objavoval znova, bola by to presne
tá trieda chyby, ktorú sme už mali s prezývkou.

---

## Vydanie

**IDE OTA** — žiadny nový natívny modul, len JS. Migrácia 29 je v databáze
už teraz.
