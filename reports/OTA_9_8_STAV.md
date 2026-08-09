# Čo je na tvojom telefóne — stav OTA, 9. augusta 2026

**Runtime `451767ea63364f29fedb9f7c117c80fa69dfe1b3`** = build #4.
Manifest overený: server ho klientovi buildu #4 preukázateľne vydáva.

**Ako to dostaneš:** force-quit appky → otvoriť → **ešte raz force-quit
a otvoriť**. Prvé spustenie po vydaní sťahuje na pozadí, prejaví sa až
druhé. V Profile → dole musí byť `rt451767ea…`, nie `embedded`.

---

## Hodnotenia sú teraz verejné

Tvoje rozhodnutie zapracované. Text komentára je verejný rovnako ako
hviezdičky.

**Overil som jednu vec PRED zmenou, ktorá by inak bola problém:**
v tabuľke bolo **nula hodnotení**. Nikto teda nič nenapísal pod predošlým
sľubom, že text je súkromný. Keby tam čo i len jedno bolo, spätné
zverejnenie by nebolo prijateľné a povedal by som ti to.

Pribudla karta **Hodnotenia** pri inzeráte — hviezdičky, priemer aj to,
čo o predávajúcom ľudia napísali. Je to tam, kde sa človek rozhoduje;
v profile, kam cudzí nechodí, by nikomu nepomohli.

Register 10.2 aj zdôvodnenie sú prepísané — pôvodne som argumentoval
opačne a to je v registri vidieť aj s tým, prečo tvoj dôvod prevážil.

---

## „Ako funguje Offerra" — plná verzia

| | |
|---|---|
| krátka karta na hlavnej | 1 veta + 4 body + „Čítať ďalej →" |
| plná verzia | **13 sekcií, cez 900 slov** |

Pokrytých je všetkých 11 tém, ktoré si vymenoval. **Nová je celá sekcia
„Nahlasovanie, moderovanie a blokovanie"** — v texte dovtedy nebola vôbec:
konkrétne dôvody nahlásenia, že nič sa nemaže automaticky, rozdiel medzi
skrytím inzerátu a zablokovaním účtu (a že to nie je zmazanie), a že
appka je len pre fyzické osoby vrátane dôsledkov.

Test stráži pokrytie po jednotlivých témach — padne, keď sa niektorá
z textu vytratí.

---

## Vlastné položky a počet zobrazení

**Tvoja obava, či to niečo neodkrýva, je overená meraním:** `owner_id`
aj `user_id` sú vo verejnom výpise **už teraz** — overil som to anonymným
dotazom PRED zmenou. Porovnanie na klientovi teda neodkrýva nič nové
a nerobí ani dotaz navyše.

Dôkaz dvoma účtami: server vracia obom **rovnaké dáta**, ale označené má
každý len svoje, a navzájom si cudziu vec neoznačia. Neprihlásený nemá
čo označiť.

**Rozhodnutie o počte zobrazení: verejný, ako si odporúčal.** Moja
pôvodná námietka („0 zobrazení vyzerá mŕtvo") sa dá vyriešiť lepšie než
skrývaním údaja — číslo sa **ukazuje až od piatich**. Pod tým nič
nehovorí; človek, ktorý inzerát práve otvoril, by videl „1 zobrazenie".
Je to ten istý prah ako pri konverzii v „Moje inzeráty", teda jedno
pravidlo, nie dve.

---

## Čo ešte prišlo touto OTA

- **Ponuky rozbalené priamo v „Moje"** vrátane Prijať / Odmietnuť /
  Uzavrieť obchod. Vzor **expand-in-place**, nie panel — máš najviac päť
  inzerátov, takže dlhé zoznamy nevznikajú, a panel by prekryl obrazovku
  a znemožnil porovnanie dvoch inzerátov.
- Tab **Moje**, kontaktné údaje v **Nastaveniach**, **ozubené koliesko
  v hornej lište** na 5 z 5 hlavných obrazoviek.
- **Ulice z Registra adries MV SR** — 31 314 ulíc v 767 obciach.
- **Skloňovanie** vo vyhľadávaní + oprava, že hľadanie viacerých slov
  nefungovalo vôbec.
- **Logo v tmavej téme** (kontrast 1,47:1 → 15,15:1) a teplý glow.
- Generované **avatary**, **časová os ceny**, **dátum späť na karte**,
  filter **Obľúbené**, klikateľné dlaždice v admin štatistike.

---

## Jedna vec, ktorá ma stála najviac času

Odloženie natívnej časti pushu **nestačilo** — runtime sa nevrátil.
Príčinou bol `package-lock.json`, ktorý po `expo install` a `npm prune`
už nebol identický. Mýlil som sa pritom dvakrát: lokálny
`@expo/fingerprint` tvrdil, že sa nič nezmenilo (počíta niečo iné než
EAS), a môj test „starý commit má tiež zlú hodnotu" bol znečistený —
meral starý commit s novými `node_modules`.

Čistý test (`checkout` + `npm ci`) dal správnu hodnotu a rozdiel sa zúžil
na zámok.

**Dve poučenia sú v registri 11.16:** fingerprint drží aj
`package-lock.json` a stav `node_modules`; a `eas fingerprint:generate`
vracia **tú istú hodnotu ako `eas update`, ale bez publikovania** — odteraz
sa overuje ním.

---

## Čo čaká na teba

**Push je hotový a otestovaný 16/16** (Expo Push API našu správu prijalo
a spracovalo), ale natívna aktivácia čaká na tvoje **„OK build"** —
presne ako si povedal. Kód je nasadený a bez modulu len ticho nefunguje.

Na prepnutie je `scripts/push-native.sh on`, ktorý už vracia aj zámok,
aby sa nezopakovalo to hore.

---

## Dôkazy z tejto dávky

```
obchod + verejné hodnotenia   25/25
pokrytie tém „Ako funguje"    15/15
označenie vlastných (kód)     12/12
označenie vlastných (naživo)  11/11   ← dva účty
štruktúra Moje/Nastavenia     20/20
push                          16/16
```
