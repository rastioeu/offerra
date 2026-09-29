# App Store metadata cez EAS API — čo sa nahralo a čo ostáva manuálne

Nadväzuje na `APP_STORE_LISTING.md` (návrh textov) a `OFFERRA_REGISTER.md`
33.11 (verejný TestFlight odkaz). Rastio (29.9.2026) chcel texty nahrať
priamo cez `eas metadata:push` namiesto ručného kopírovania.

## Ako to prebehlo

1. `store.config.json` neexistoval — vytvoril som ho podľa **skutočnej
   JSON schémy** nainštalovaného `eas-cli` (lokálne
   `node_modules/eas-cli/schema/metadata-0.json`), nie podľa pamäti alebo
   dokumentácie naspamäť. Pred prvým behom som ho aj strojovo overil
   (`ajv` proti tej istej schéme) — `valid: true`.
2. `npx eas-cli metadata:pull` **naozaj pristúpil do App Store Connect**
   cez API kľúč z EAS účtu (ten istý, čo appka používa na `eas submit` —
   Rastiova poznámka, že je na úrovni účtu, sedí, žiadny nový kľúč sa
   nezakladal) a stiahol živý (takmer prázdny) stav appky.
3. Heslo demo účtu (`DEMO_PASSWORD` z `/root/.offerra-secrets`) som
   vložil do `store.config.json` **len tesne pred behom `metadata:push`**,
   nikdy nebolo pridané do gitu (`git status` pred aj po behu čisté,
   commit s heslom neexistuje). Hneď po behu `git checkout -- store.config.json`
   vrátil súbor na commitnutú, bezheslovú verziu.
4. **Overenie NIE JE len úspešný návratový kód.** Po pushi som spustil
   `metadata:pull` ešte raz a porovnal, čo sa NAOZAJ vrátilo z App Store
   Connect, s tým, čo som poslal — presne to isté (title, subtitle,
   popis, kľúčové slová, promo text, URL adresy, kategória, Age Rating aj
   kontakt recenzenta vrátane poznámok) sa zhodovalo do znaku. Následne
   som ten stiahnutý súbor (obsahoval heslo v čitateľnej podobe, keďže
   ASC API ho pri čítaní vracia) zahodil späť na commitnutú verziu —
   v repe ani na disku po dokončení nezostalo.

## ✅ OVERENÉ RUNTIME — nahralo sa a spätným čítaním z App Store Connect potvrdené

- **Názov, podnadpis** („Obrátený trh s nehnuteľnosťami")
- **Popis appky** (celý text „Ako to funguje" + „Čo v appke nájdeš")
- **Kľúčové slová** (11 slov, spolu 85 znakov)
- **Promo text**
- **Marketing URL** (`offerra.sk`), **Support URL**, **Privacy Policy
  URL** (obe `rastioeu.github.io/offerra_web/…`)
- **Kategória:** Lifestyle
- **Age Rating dotazník (advisory):** `userGeneratedContent: true`,
  `messagingAndChat: true`, všetko ostatné (násilie, sexuálny obsah,
  alkohol, hazard, reklama…) `NONE`/`false` — zodpovedá tomu, čo appka
  naozaj obsahuje.
- **App Review Information:** meno, priezvisko, e-mail, telefón,
  demo účet (`applereview@offerra.app`), `demoRequired: true`, aj celý
  text poznámok s presným postupom „5× ťukni na logo → Prihlásiť sa ako
  recenzent".
- **Demo heslo** sa nahralo (potvrdené spätným čítaním), no v repe
  nikdy nebolo a nie je.

**Dôkaz je čítanie priamo z App Store Connect** (`metadata:pull` po
`push`-i), nie len to, že príkaz doletel bez chyby — presne kvôli tomuto
rozdielu prvý spôsob overenia (len exit kód) nestačí.

## 🔴 NEDOKONČENÉ / MUSÍŠ MANUÁLNE — API to nepodporuje, nie lenivosť

- **App Privacy dotazník („nutrition label" — aké dáta appka zbiera).**
  Overil som priamo v `eas-cli` schéme (`metadata-0.json`) — objekt pre
  Apple má LEN `version`, `copyright`, `release`, `categories`,
  `advisory` (= Age Rating, nie App Privacy), `review`, `info`,
  `appClip`. Žiadne pole pre dátové kategórie/tracking neexistuje.
  `eas metadata:push` túto časť **cez API vôbec nevie nahrať** — musíš
  ju vyplniť ručne v App Store Connect → App Privacy. Presný návrh
  odpovedí (tabuľka podľa `privacy.html`) je v `APP_STORE_LISTING.md`.
- **Cena a dostupnosť (Pricing and Availability), teda aj krajiny.**
  Rovnako som to overil priamo v schéme — v `AppleConfig` neexistuje
  žiadne pole na cenu ani krajiny. Musíš to zaklikať ručne v App Store
  Connect → Pricing and Availability.
- **„Čo je nové" (release notes) sa NEnahralo — a je to správne, nie
  chyba.** Prečítal som si priamo zdrojový kód `eas-cli`
  (`metadata/apple/config/reader.js:151`):
  `whatsNew: context.versionIsFirst ? undefined : info.releaseNotes …`
  — pre ÚPLNE PRVÚ verziu appky v App Store (táto je) Apple pole „Čo je
  nové" vôbec neprijíma (dáva zmysel len pri aktualizácii existujúcej
  appky), `eas-cli` ho preto zámerne vynecháva. Text ostáva v
  `store.config.json` v repe pre budúcu aktualizáciu — vtedy sa nahrá.
- **Screenshoty** — podľa tvojho rozhodnutia ich robíš ty sám z
  TestFlightu, nespúšťal som na to nič.
- **Finálne „Submit for Review"** — tvoje tlačidlo, tvoj účet.

## Poznámka k „zvýš verziu"

V pôvodnom pokyne bola na konci veta „zvýš verziu". Appkovú natívnu
verziu (`app.json` `expo.version`/`buildNumber`) som **nezvýšil** —
podľa CLAUDE.md §9 to odstrihne existujúci TestFlight build od OTA a
vyžaduje si to nový `eas build`, čo je vždy tvoje explicitné „OK build"
(§3), nie samozrejmosť pri metadátovej úlohe bez zmeny appky. Namiesto
toho som v `store.config.json` nastavil `apple.version: "1.3.0"`, aby
metadáta smerovali na SPRÁVNU, existujúcu verziu appky (predtým tam
`eas-cli` mal predvolené `1.0`, čo by inak založilo prázdnu, nesprávnu
verziu). Ak si myslel skutočné zvýšenie natívnej verzie appky, napíš mi
to výslovne — je to samostatné rozhodnutie s dopadom na OTA.

## Zhrnutie stavu

| Položka | Stav |
|---|---|
| Texty appky (popis, podnadpis, kľúčové slová, promo, URL) | ✅ OVERENÉ RUNTIME |
| Kategória (Lifestyle) | ✅ OVERENÉ RUNTIME |
| Age Rating dotazník | ✅ OVERENÉ RUNTIME |
| App Review notes + demo účet | ✅ OVERENÉ RUNTIME |
| App Privacy („nutrition label") | 🔴 API to nepodporuje — vyplň ručne, návrh je v `APP_STORE_LISTING.md` |
| Cena a dostupné krajiny | 🔴 API to nepodporuje — vyplň ručne |
| „Čo je nové" | 🔴 Apple ho pre prvú verziu vôbec neprijíma — netreba, nahrá sa pri ďalšej aktualizácii |
| Screenshoty | 🔴 na teba (dohodnuté) |
| Submit for Review | 🔴 tvoje tlačidlo |

`store.config.json` je v repe (bez hesla) — pri ďalšej zmene textu stačí
upraviť ho a znova `eas metadata:push`, heslo sa vtedy vloží rovnakým
dočasným spôsobom.
