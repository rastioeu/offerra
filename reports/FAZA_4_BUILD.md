# BUILD #3 — PRED SPUSTENÍM

**Verzia:** 1.1.0 · buildNumber 3
**Dátum:** 7.8.2026
**Stav:** ⏸️ zhrnutie pred `eas build` (CLAUDE.md §3)

---

## Prečo build, keď doteraz stačila OTA

Nazbierali sa **tri veci, ktoré OTA doručiť nevie** — všetky menia natívnu
časť appky:

| Čo | Prečo to OTA nevyrieši |
|---|---|
| **App ikona a splash** | sú natívne assety skompilované do binárky (`Assets.car`) |
| **Haptika** | `expo-haptics` je natívny modul |
| **Zdieľacia kartička 9:16** | `react-native-view-shot` je natívny modul |

Haptika je jediná položka z porovnania s MUTARKom, ktorú som cez OTA
dorovnať nemohol — MUTARKov vlastný komentár hovorí to isté, aj on na ňu
čakal na build.

---

## Čo sa v tomto builde mení

```
version          1.0.0 → 1.1.0
buildNumber      2     → 3
runtimeVersion   appVersion → fingerprint
+ expo-haptics ~57.0.1
+ react-native-view-shot 5.1.0
+ app ikona, splash, android adaptive sada (identita A — Navy & Azure)
```

### `runtimeVersion` → `fingerprint` — čo to znamená

Zadanie (bod 8A) žiada **zvýšiť `version` pri každej zmene**. S doterajšou
politikou `appVersion` to nešlo: `runtimeVersion` sa odvádzal z `version`,
takže každé zvýšenie by **odstrihlo appku v telefóne od OTA**.

Politika `fingerprint` počíta runtime z natívnej časti projektu — mení sa
len vtedy, keď pribudne alebo sa zmení natívny modul. Verzia sa tým pádom
dá dvíhať slobodne a OTA ďalej chodí.

> ⚠️ **Dôsledok, ktorý treba vedieť:** doterajší build v TestFlighte má
> runtime `1.0.0`. Po tomto builde budú OTA mieriť na nový fingerprint,
> takže **starý build už ďalšie aktualizácie nedostane**. Kým si nový
> build nainštaluješ, ostávaš na tom, čo máš teraz.

---

## Čo build NEODBLOKUJE

Vizuálna kartička 9:16 bude mať po builde k dispozícii modul, ale samotná
kartička **ešte nie je napísaná** — to je 2–3 hodiny práce po builde
(rozloženie, vykreslenie mimo obrazovky, odoslanie do share sheetu).

---

## Po builde

`eas submit` do TestFlightu. `ascAppId 6799028421` je v `eas.json`, takže
podanie už nepotrebuje Apple login ani interaktívny režim.
