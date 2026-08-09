# Push notifikácie — hotové, čakajú na nový build

**Dátum:** 9. augusta 2026 · **VYŽADUJE NOVÝ EAS BUILD** — natívny modul,
OTA ho nedoručí. **Zastavené pred `eas build`, čakám na „OK build".**

---

## 1. Čo som prevzal z MUTARKu

Prieskum som robil v `/root/mutark` a `/root/famiglia` ako read-only
referenciu. MUTARK to má hotové a vzor je jednoduchší, než by som čakal:

| Vec | Ako to má MUTARK | Ako to má Offerra |
|---|---|---|
| Modul | `expo-notifications` cez `require()` v try/catch | **rovnako** |
| Kedy sa pýta povolenie | **výhradne z akcie používateľa** v Nastaveniach — appka sa nepýta nikdy sama | rovnako **+ jedna kontextová ponuka** (viď nižšie) |
| Kam ide token | stĺpec `push_token` na `profiles` | **vlastná tabuľka** `offerra.push_token` |
| Kto posiela | **Postgres cez `pg_net`** priamo na Expo Push API | **rovnako** |
| Cesta | `exp.host/--/api/v2/push/send` | rovnako |

**Nie priamo APNs, ale cez Expo Push Service.** To je podstatné pre bod 3
nižšie — APNs kľúč drží Expo, appka ho nevidí.

### Dve veci, kde som sa od MUTARKu zámerne odchýlil

**Vlastná tabuľka namiesto stĺpca na profile.** MUTARK má jedno zariadenie
na človeka — druhé prihlásenie prepíše token prvého. Offerra má
`push_token (user_id, token)`, takže kto má telefón aj tablet, dostane
oznámenie na oboje. Zároveň to drží schému `offerra` oddelenú, ako je
v tomto projekte pravidlo.

**Jedna kontextová ponuka navyše.** MUTARK sa pýta len v Nastaveniach —
to je bezpečné, ale väčšina ľudí tam nezájde. Offerra sa preto raz
opýta po **prvej akcii, na ktorú niekto odpovie**: po podaní ponuky
(„keď predávajúci odpovie, dáme ti vedieť") alebo po zverejnení inzerátu.

Nikdy pri štarte appky. Dôvod je technický, nie estetický: **kto povolenie
raz odmietne, systém sa ho druhýkrát nespýta.** Otázka položená skôr, než
človek pozná dôvod, tú možnosť natrvalo spáli. Odpoveď „teraz nie" sa
pamätá v `dismissed_hint` a viac sa neopýtame.

---

## 2. Ako je to napojené na existujúci systém

Toto je celý trik a stojí za to ho pomenovať:

```sql
offerra.push_notification()   -- už existovala, zakladá in-app oznámenie
  ├─ should_notify()          -- už kontrolovala notification_preference
  ├─ insert into notification -- in-app
  └─ send_expo_push()         -- ← JEDINÝ pridaný riadok
```

Push tým automaticky dostal **každý typ oznámenia, ktorý appka pozná** —
nová ponuka, prijatie, odmietnutie, zhoda s uloženým hľadaním, obhliadka,
uzavretie obchodu — **aj tie, čo pribudnú neskôr**.

A `notification_preference` platí bez ďalšej práce: vypnutý typ nevytvorí
oznámenie, takže nepošle ani push. Overené oboma smermi.

Keby sa push volal zvlášť pri každej udalosti, bolo by to to isté
rozhodnutie na N miestach — presne trieda chyby, ktorá nás tu stála
zvonček (7.15) aj chybové hlášky (7.18).

---

## 3. Čo potrebujem od teba z Apple Developer účtu

**Dobrá správa: pravdepodobne NIČ.**

Zistil som, že MUTARK aj Offerra sú v **tom istom Apple tíme**:

```
MUTARK   com.mutark.app     appleTeamId TC4V762X67
Offerra  com.offerra.app    appleTeamId TC4V762X67
```

**APNs Auth Key (.p8) je per-TÍM, nie per-appku.** Jeden kľúč obsluhuje
všetky bundle id v tíme. Apple ich povoľuje najviac dva naraz — a jeden
už pre ten tím existuje (používa ho MUTARK).

Sú teda dve cesty a **obe zvládne `eas build` sám**, keď sa ho pri buildе
opýtam:

1. **EAS použije existujúci kľúč** — ak ho v EAS účte nájde, ponúkne ho
   znovu použiť. Nič nerobíš.
2. **EAS vytvorí nový** — potrebuje na to prihlásenie do Apple Developer
   (to isté, aké si robil pri prvom builde). Vytvorí kľúč aj entitlement
   sám.

**Čo si over ty, ak chceš mať istotu vopred:**
`developer.apple.com` → Certificates, Identifiers & Profiles →
**Keys** → pozri, či tam je kľúč so službou **Apple Push Notifications
service (APNs)**. Ak áno, si hotový. Ak sú tam už **dva**, jeden by sa
musel zmazať — vtedy mi napíš a vyriešime to.

Ešte jedna vec, ktorú `eas build` spraví sám, ale nech o nej vieš:
identifikátor `com.offerra.app` musí mať zapnutú schopnosť **Push
Notifications**. Config plugin `expo-notifications` pridá aj iOS
entitlement `aps-environment`.

---

## 4. Dôkazy

### Čo je overené (16/16)

```
--- Uloženie tokenu ---
OK  používateľ si uloží vlastný token                    HTTP 201
OK  ten istý token druhýkrát nepridá riadok              HTTP 409
OK  druhé ZARIADENIE toho istého človeka ide             HTTP 201
OK  človek môže mať viac zariadení                       2 tokeny

--- RLS: token je identifikátor ZARIADENIA ---
OK  cudzí cudzí token NEVIDÍ
OK  ANON nevidí žiadny
OK  cudzí NEZAPÍŠE token v mene niekoho iného            42501
OK  cudzí cudzí token NEZMAŽE
OK  vlastník svoje tokeny VIDÍ

--- Napojenie ---
OK  push_notification volá send_expo_push
OK  a STÁLE sa pýta should_notify (predvoľby platia)
OK  posiela sa cez Expo Push API
OK  cez pg_net (async, nezhodí transakciu)

--- Predvoľby ---
OK  vypnutý typ: žiadne oznámenie, teda ani push         0 → 0
OK  zapnutý typ: oznámenie vzniklo (a s ním push)        0 → 1
```

### Najsilnejší dôkaz, aký sa bez zariadenia dá získať

`pg_net` naozaj odoslal a **Expo odpovedalo**:

```
status 200
{"data":{"status":"error",
 "message":"\"ExponentPushToken[TESTxxx…]\" is not a registered push
            notification recipient…",
 "details":{"error":"DeviceNotRegistered"}}}
```

Celá reťaz teda funguje: **udalosť → oznámenie → `send_expo_push` →
`pg_net` → Expo Push API → Expo prijalo a spracovalo našu správu.**
Odmietlo len môj vymyslený token — čo je presne správne správanie.

### Čo overené NIE JE

**Posledný článok: Expo → APNs → tvoj telefón.** Na to treba skutočný
token zo skutočného buildu na skutočnom zariadení. Screenshot push
notifikácie na zamknutej obrazovke, ktorý si žiadal, viem dodať až po
builde — a spraviť ho musíš ty.

---

## 5. ⚠️ Dôležité: OTA je odteraz zablokovaná

Pridanie `expo-notifications` zmenilo fingerprint, takže **`eas update`
už nedoručí nič na build #4**. Všetko, čo od teraz spravím, sa k tebe
dostane až novým buildom.

Máš dve možnosti a je to tvoje rozhodnutie:

- **Ideme na build** — povedz „OK build" a spustím ho. Push aj všetka
  ostatná práca prídu naraz.
- **Chceš najprv otestovať zvyšok cez OTA** — viem push dočasne vybrať
  z `package.json` a `app.json` (dva riadky), OTA sa odblokuje a push
  vrátim až pri builde. Kód v `src/` môže ostať, je písaný tak, aby bez
  modulu len ticho nefungoval.

---

## 6. Čo som pri tom musel opraviť

`legal.ts` tvrdil **„Neposiela push notifikácie"**. To sa novým buildom
stane nepravdou a §8 hovorí, že text, ktorý klame o fungovaní appky, je
horší než žiadny. Ochrana osobných údajov teraz popisuje push token,
Expo Push Service aj APNs — vrátane toho, že bez povolenia sa neodovzdáva
nič. Web je pregenerovaný.
