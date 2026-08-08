# `.gitignore` odstrihol OTA od buildu — príčina, oprava, dôkaz

**Dátum:** 8. augusta 2026 · **stav:** ✅ OVERENÉ RUNTIME (server) / 🟡 čaká overenie na telefóne

---

## Čo sa stalo

Pri commite som pridal `.claude/` do `.gitignore` (pracovný adresár
nástroja, do repa nepatrí). Vyzeralo to ako neškodný riadok v súbore,
ktorý s appkou nemá nič spoločné.

Po `eas update` vypísal EAS runtime **`5b3a2e9c…`**, hoci build #4 beží na
**`451767ea…`**. Aktualizácia by teda na tvoj telefón **nikdy nedorazila**
— tichý, neviditeľný výpadok.

Všimol som si to na výstupe príkazu, nie po tom, čo by si hlásil, že sa
nič nezmenilo.

---

## Príčina — odmeraná, nie odhadnutá

`runtimeVersion` má politiku **`fingerprint`**. `@expo/fingerprint`
prechádza projekt a rešpektuje pritom `.gitignore` — ten súbor je teda
sám vstupom do hashu. Zmena `.gitignore` = iný fingerprint = iný runtime.

Rovnaký strom, jediný rozdiel jeden riadok:

```
BEZ zmeny .gitignore:  7f785591052fffea6f19e921262a441271a31b5f
SO zmenou .gitignore:  3bdaf73a35fa92cf2300af347da2c7a93cacf466
```

(Lokálne hashe sa od tých z EAS líšia — smerodajný je rozdiel medzi nimi,
nie ich absolútna hodnota. To isté sme videli už pri builde #4.)

`CLAUDE.md` §9 varuje pred zdvihnutím `version`. Toto je **tá istá pasca
inými dverami**: nie je to jediné, čo runtime posunie.

---

## Oprava

`.gitignore` vrátený do pôvodného stavu. `.claude/` je vylúčené cez
**`.git/info/exclude`** — ten súbor je lokálny, do repa sa neposiela,
takže do fingerprintu nevstupuje.

---

## Dôkaz

### 1. Runtime je späť

```
Runtime version  451767ea63364f29fedb9f7c117c80fa69dfe1b3   iOS
Runtime version  761c4e5beb1fa47ee5ee0d24de9a8b05431751e5   Android
```

Zhoduje sa s runtime predošlých funkčných OTA („Hľadanie bez diakritiky",
„Vek 18+").

### 2. Server aktualizáciu naozaj vydáva klientovi buildu #4

Oslovil som manifest endpoint **presne tak, ako sa pýta appka** — s
hlavičkami, ktoré posiela klient bežiaci na builde #4:

```
GET https://u.expo.dev/31b8063a-d351-4e3c-bfc4-5c384e432b61
    expo-platform: ios
    expo-runtime-version: 451767ea63364f29fedb9f7c117c80fa69dfe1b3
    expo-channel-name: production

HTTP/2 200
runtimeVersion  451767ea63364f29fedb9f7c117c80fa69dfe1b3
id              019fe2e6-2192-784c-a515-caaf6d7dbdf5
createdAt       2026-08-08T19:42:40.530Z     ← znovu vydaná aktualizácia
```

### 3. Čo tým dokázané NIE JE

**Že to naskočilo na tvojom telefóne.** To dokázať neviem — iOS zariadenie
ani simulátor tu nemám, píšem to pri každej takej položke.

HTTP 200 z manifestu dokazuje, že server aktualizáciu **vydáva** klientovi
s tým runtime. Nedokazuje, že ju appka **stiahla, uložila a spustila**.
To je presne ten druh odvodenia B z A, ktorý CLAUDE.md §1 zakazuje.

**Overenie je na tebe:** force-quit appky → znovu otvoriť → počkať pár
sekúnd → **ešte raz force-quit a otvoriť** (prvé spustenie po vydaní
aktualizáciu stiahne na pozadí, prejaví sa až pri druhom). Potom
v Nastaveniach → Čo je nové musí byť záznam **„Súkromie správ, obhliadky
a polia navyše"**.

---

## Tvoja otázka: nespôsobí `.git/info/exclude` iný problém?

Áno, jedno riziko tam je, a je presne to, na ktoré si sa pýtal.

| | Kto je chránený | Vplyv na fingerprint |
|---|---|---|
| `.git/info/exclude` (teraz) | **len tento klon** | žiadny |
| `.gitignore` | každý, kto repo klonuje | **mení runtime → treba nový build** |

Riziko je reálne, ale menšie, než to na prvý pohľad vyzerá: kto si repo
naklonuje, **môj `.claude/` nedostane** — ten adresár si vyrobí až jeho
vlastný nástroj a bude to jeho vlastný neverzovaný adresár. Riziko je
teda „niekto si spustí Claude Code nad týmto repom a spraví `git add -A`",
nie „moje súbory sa niekomu prilepia".

**Návrh, ktorý ti dávam na rozhodnutie:** riadok `.claude/` pridať do
`.gitignore` **v tom istom kroku, keď sa bude robiť najbližší natívny
build**. Vtedy sa fingerprint mení tak či tak, takže to nič nestojí. Do
registra som to zapísal ako otvorený bod, aby sa na to nezabudlo.

Ak by ti prekážalo aj to medziobdobie, druhá možnosť je spraviť to hneď —
ale znamená to nový EAS build, teda kredit a čas, a to je tvoje
rozhodnutie, nie moje.

---

## Poučenie do registra

**Fingerprint nemení len `version` a natívne moduly.** Mení ho každý
súbor, ktorý doň vstupuje — vrátane `.gitignore`. Pred každým `eas update`
sa preto pozerám na vypísaný runtime a porovnávam ho s runtime buildu,
nie len na to, či príkaz skončil úspešne.
