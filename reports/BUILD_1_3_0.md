# Build 1.3.0 — zhrnutie pred spustením

**Dátum:** 9. augusta 2026 · **Schválené Rastiom:** „ok build s push notifikaciami"

---

## Čo sa mení oproti buildu #4

| | build #4 | build #5 |
|---|---|---|
| verzia | 1.2.0 | **1.3.0** |
| buildNumber | 4 | **5** |
| runtime | `451767ea…` | **`b9c2ff9e…`** |
| natívne moduly | bez push | **`expo-notifications`** |

**Runtime sa mení, a to zámerne.** Build #4 preto od tejto chvíle novú
OTA nedostane — čo je v poriadku, lebo všetko, čo v ňom má byť, sa doňho
už doručilo. Po nainštalovaní #5 z TestFlightu pôjdu ďalšie OTA naň.

---

## Jediná natívna zmena: push notifikácie

`expo-notifications` + config plugin (nastaví iOS entitlement
`aps-environment`). Všetko ostatné v tomto builde je JS a už si to videl
cez OTA.

**Čo build odblokuje:** appka si vypýta povolenie a získa push token.
Zvyšok už beží — databáza posiela cez Expo Push API a je to otestované
(Expo našu správu prijalo a spracovalo, 16/16).

**APNs:** `eas build` sa pri prvom builde s pushom spýta. MUTARK aj
Offerra sú v tíme `TC4V762X67` a APNs kľúč je per-tím, takže by mal
ponúknuť existujúci. Ak by chcel vytvoriť nový, potrebuje prihlásenie do
Apple Developer — to isté, aké si robil pri builde #4.

---

## Stav pred spustením

```
security audit      33/33
funkčnosť E2E       39/39
zástupcovia správcu 19/19
RLS rekurzia        26/26
telefón             18/18
srdiečko            18/18
karta (meta riadok) 11/11
„Ako funguje"       15/15
označenie vlastných 12/12
modály              16/16
odozva po akcii     21/21
logo                15/15
```

Jeden test počas prípravy padol a **nebuildoval som, kým som ho
nevyriešil**: `odozva_test.js` hľadal v karte hodnotenia vetu „Text
prečíta len on". Tú som zmenil, keď sa hodnotenia stali verejnými —
vysvetlenie tam je, len hovorí pravdu. Chyba bola v teste, opravený.

---

## Changelog

Štrnásť záznamov z 9. augusta som presunul z 1.2.0 na **1.3.0** — sú to
zmeny tohto vydania. Záznamy z 8. augusta ostávajú pri 1.2.0, lebo tie
sa naozaj vydali OTA na tú verziu. Pribudol záznam o push notifikáciách.

---

## Čo som NEOVERIL a treba to na zariadení

Tri veci z auditu funkčnosti, ktoré sú vizuálne:

- prepínanie tabov 5× bez pádu,
- žiadny orezaný text,
- onboarding sa zobrazí len raz.

Príčiny všetkých troch sú opravené a majú testy, ale „appka nespadla"
a „text nie je orezaný" sú pozorovania, nie merania.

Po nainštalovaní #5 pribudne štvrtá vec, ktorú viem overiť len ja
čiastočne: **skutočné doručenie push notifikácie na zamknutú obrazovku**.
Reťaz je otestovaná až po Expo; posledný článok Expo → APNs → telefón
potvrdíš ty.

---

## Po builde

`eas submit` som **nespúšťal** — schválil si build, nie odoslanie. Keď
build dobehne, napíšem a počkám.
