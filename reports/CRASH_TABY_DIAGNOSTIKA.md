# Pád pri ťuknutí na spodné taby — príčina a oprava

**Dátum:** 8. augusta 2026
**Stav:** 🟡 **PRÍČINA NÁJDENÁ A OPRAVENÁ, ČAKÁ VIZUÁLNE OVERENIE**
**Nasadené:** OTA na runtime `451767ea…` = **build #4**

---

## Chyba zo zariadenia (referencia)

```
Error: cannot add `postgres_changes` callbacks for
realtime:notif-33fadff3-69a5-4b6f-9e62-cd6e554b8a05 after `subscribe()`.

    NotificationBell
    ← AppHeader
    ← PridatScreen
```

---

## Koreňová príčina — odmeraná, nie odhadnutá

Tvoj tip bol, že `.on()` sa volá až po `.subscribe()`. **Poradie bolo
správne od začiatku** — `.on()` aj `.subscribe()` boli v jednej reťazi
v jednom `useEffect`. Skutočná príčina je o úroveň nižšie.

V `@supabase/realtime-js` 2.112.2, `RealtimeClient.channel()`, riadky
330–342:

```js
channel(topic, params = { config: {} }) {
  const realtimeTopic = `realtime:${topic}`;
  const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
  if (!exists) { …vytvor nový… }
  else { return exists; }        // ← TOTO
}
```

**`supabase.channel(topic)` nevytvára nový kanál — pri rovnakom názve vráti
ten už existujúci.**

A `AppHeader` (teda aj `NotificationBell`) je na štyroch taboch naraz.
Taby v expo-routeri po prvom otvorení ostávajú namontované. Takže:

| Krok | Čo sa stalo |
|---|---|
| 1. tab Nehnuteľnosti | `channel('notif-X')` vytvorí kanál → `.on()` → `.subscribe()` |
| 2. tab **Pridať** | `channel('notif-X')` vráti **ten istý, už pripojený** kanál |
| 3. | `.on('postgres_changes', …)` na pripojený kanál → **vyhodí výnimku** |

Podmienka výnimky v `RealtimeChannel.on()` je
`isJoined() || isJoining()` — a `isJoining()` je `true` **hneď po zavolaní
`subscribe()`**, takže stačilo prepnúť tab a padlo to okamžite.

Sedí to na hlásenie do posledného detailu: chybová hláška menuje presne
`notif-<tvoje user id>` a stack menuje `PridatScreen`, teda **druhú**
obrazovku s hlavičkou.

---

## Oprava — jeden kanál na celú appku

`NotificationsProvider` v koreni appky (`src/app/_layout.tsx`), presne ako
už existujúci `ProfileProvider`. Drží stav aj jedno jediné predplatné;
`NotificationBell` a obrazovka Oznámenia sú už len konzumenti.

Poistka navyše: názov kanála má **jednorazovú príponu**
(`notif-<uid>-<náhoda>`). Aj keby v appke niekedy omylom vznikli dva
providery, nesiahnu na ten istý kanál a táto trieda chyby sa nemá ako
vrátiť.

### Vedľajšie chyby, ktoré tým zmizli

Neboli nahlásené, ale boli tam a stoja za zmienku:

- **štyri rovnaké dotazy do DB** — každá inštancia hlavičky si ťahala
  celý zoznam oznámení sama;
- **rozchádzajúci sa stav** — otvorenie Oznámení označilo správy za
  prečítané, ale zvonček v ostatných taboch svietil ďalej, lebo mal
  vlastnú kópiu stavu;
- **cleanup si kanál kradol** — `removeChannel()` pri odmontovaní jednej
  inštancie odstránil kanál aj ostatným, ktoré naň spoliehali.

---

## Runtime dôkaz

`realtime_test.js` beží proti **skutočnému** `@supabase/realtime-js`, nie
proti atrape, a reprodukuje pôvodnú chybu doslova:

```
OK  channel() vracia pri rovnakom nazve TEN ISTY kanal
       a === b: true  (toto je korenova pricina)
OK  STARY vzor pada presne hlaskou zo zariadenia
       cannot add `postgres_changes` callbacks for
       realtime:notif-33fadff3-69a5-4b6f-9e62-cd6e554b8a05 after `subscribe()`.
OK  hlaska sedi na konkretny kanal z hlasky
OK  NOVY vzor nepada ani ked vzniknu dva providery
OK  removeChannel() kanaly odstrani            3 -> 1
OK  .on() pred .subscribe() v jednej retazi prejde

6/6 preslo
```

Prvé tri riadky dokazujú **príčinu** (test padne presne tvojou hláškou),
ďalšie tri dokazujú **opravu**.

Ďalej: `npx tsc --noEmit` 0 chýb, `npx expo export --platform ios` prešiel.

**Čo tieto dôkazy NEDOKAZUJÚ:** že appka na tvojom telefóne pri prepínaní
tabov nepadne. To sa dá overiť len na zariadení a to je na tebe — nemám
iOS simulátor ani tvoj telefón.

---

## Čo predtým nebolo pravda a je to moja chyba

V predošlom reporte som napísal, že príčina je „v kóde, nie v dátach", a
nechal to tam bez pokračovania. Bolo to správne, ale málo — mal som
v tom istom kroku prejsť miesta, kde sa niečo montuje viackrát. Zvonček
na štyroch taboch je presne taký prípad.

**Countdown platnosti inzerátu** (z predošlého reportu, opakujem pre
úplnosť): nie je stratený, pri redizajne som ho presunul z riadku pod
cenou na štítok priamo na fotke, vľavo dole. Dáta aj výpočet som overil —
4 zo 7 zverejnených inzerátov má uzávierku a text vychádza
„Ponuky do 21. augusta 2026 · ostáva 13 dní". Že som presun nenapísal, je
moja chyba v komunikácii, nie regresia v kóde.

---

## Čo otestovať na telefóne

1. **Zavri appku úplne**, otvor (stiahne update), **zavri a otvor znova**
   (použije ho).
2. **Prepni všetky štyri taby aspoň 5× po sebe** — Nehnuteľnosti → Dopyty
   → Pridať → Profil a dokola.
3. Otvor **zvonček** a obrazovku Oznámenia, vráť sa a prepni taby znova.
4. Ak by predsa niečo padlo, naskočí červená obrazovka **„Appka spadla"**
   s celou hláškou — odfoť ju.

Kým to nepotvrdíš, ostáva to 🟡. Ďalšiu novú funkcionalitu nerobím.
