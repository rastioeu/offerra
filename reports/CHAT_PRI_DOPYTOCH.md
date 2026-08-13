# Chat aj pri dopytoch

**Dátum:** 13. 8. 2026
**Zadanie:** Rastio — „pridaj chat aj pri dopytoch"
**Nasadenie:** **IDE OTA** pre appku. Databáza: `mig_35_message_request.sql`
a `mig_36_notification_request.sql` už nasadené.

---

## Čo pribudlo

Detail dopytu (`dopyt/[id].tsx`) má nový blok **„Správy"** — rovnaká
mechanika ako pri inzeráte (12.8.2026), len druhá strana je zadávateľ
dopytu, nie vlastník inzerátu:

- Zadávateľ vidí **zoznam vlákien** — s každým, kto mu napísal, plus
  s tými, čo dopyt **oslovili svojím inzerátom**, ale ešte nenapísali
  („Oslovil ťa svojím inzerátom, nepísali ste si. Ozvi sa prvý.").
- Ktokoľvek iný má **jedno vlákno** so zadávateľom — dostupné **skôr, než
  formálne osloví**, presne z toho istého dôvodu ako pri inzeráte: overiť
  si, či to, čo ponúka, naozaj sedí na to, čo niekto hľadá.
- **Identita ostáva pod prezývkou**, kontaktné údaje sa v správach
  nedajú poslať (zákaz je server-side, rovnaká funkcia ako pri inzeráte).

## Ako je to postavené — jeden kód, nie kópia

`Conversation` aj `OwnerThreads` z `message-thread.tsx` sú teraz
**exportované a znovupoužité nezmenené** v novom `demand-messages.tsx`.
Mení sa jediná vec: **`subject`** (`{ requestId }` namiesto
`{ propertyId }`) — všetky RPC (`send_message`, `mark_messages_read`) to
už vedeli od 12.8.2026 (`send_message` mala `p_request_id` od začiatku),
takže v databáze bola pripravená len jedna medzera.

**Tú medzeru som doplnil migráciou:** `mark_messages_read()` poznala
výhradne `p_property_id`. `src/lib/messages.ts` (predtým: samostatné
funkcie s `propertyId: string`) je prerobené na typ `MessageSubject` —
`{ propertyId: string } | { requestId: string }` — takže volanie so
subjektom, ktorý nesie oboje naraz, sa **v TypeScripte nedá ani napísať**
(`propertyId?: never` na druhej vetve).

## Bug, ktorý by inak zostal skrytý: push nikam nesmeroval

Pri implementácii som si všimol, že `offerra.notification` mala stĺpce
`property_id` a `offer_id`, ale **žiadny `request_id`**. `send_message()`
posielala oznámenie s `p_property_id = null` (predmetom je dopyt) a
nemala kam uložiť, ktorého dopytu sa to týka.

`notification-route.ts` má presne kvôli podobnej chybe z 9.8.2026 strážny
riadok:

```ts
if (!propertyId) return null;
```

— takže ťuknutie na takéto oznámenie **by nikam nesmerovalo**. Presne tá
istá trieda chyby, ktorú tento riadok mal zabrániť pri inom type
oznámenia, by sa cez nový chat vrátila zadným vchodom.

**Oprava:**

- `offerra.notification` dostala stĺpec `request_id`.
- `push_notification()` dostala tretí parameter `p_request_id` a ukladá
  ho aj do `data` posielanej cez Expo Push (`requestId`), nech appka po
  ťuknutí na notifikáciu na zamknutej obrazovke vie, kam ísť.
- `notificationRoute()` (čistá funkcia, testovateľná bez zariadenia — presne
  na to bola navrhnutá) dostala vetvu: `NOVA_SPRAVA` bez `propertyId`, ale
  s `requestId` → `/dopyt/[id]`. Inzerátové správy sa nezmenili.
- `oznamenia.tsx` aj `routeFromPushData()` posielajú `requestId` ďalej.

### Poučenie z predošlej chyby, zopakované správne

Pri `mark_messages_read()` (12.8.2026) som skúsil pridať parameter cez
`create or replace` a **vznikli dve pretažené funkcie naraz**, čo pri
volaní s pôvodným počtom argumentov skončilo `function is not unique`.
Vedel som to už z toho predošlého opravovania, takže pri `push_notification()`
som **najprv zhodil starú 6-argumentovú signatúru** a až potom vytvoril
novú so siedmym parametrom. Overené testom nižšie — staré volania (vrátane
`mark_messages_read` pre inzeráty) fungujú ďalej bez zmeny na volajúcej
strane.

---

## KONTROLA — dôkaz

### ✅ OVERENÉ RUNTIME — 13 / 13

`dopyt_spravy_test.py` (mimo repa, §4), traja ľudia — zadávateľ, ponúkač,
cudzí:

```
── 1. chat pred formálnym oslovením ──
  OK  ponúkač napíše zadávateľovi (predtým než formálne oslovil)   HTTP 200

── 2. zákaz kontaktu (rovnaká funkcia ako pri inzeráte) ──
  OK  ZABLOKOVANÉ: telefón   HTTP 400 „…obsahuje telefónne číslo…"

── 3. RLS ──
  OK  zadávateľ odpovie
  OK  ponúkač vidí SVOJE vlákno            2 správy
  OK  CUDZÍ na tom istom dopyte NEVIDÍ NIČ  []

── 4. prečítané (mark_messages_read s p_request_id) ──
  OK  ponúkač si označí prijaté za prečítané    označených=1
  OK  STARÉ 2-argumentové volanie pre inzerát ešte funguje (žiadna ambiguity)

── 5. oznámenie nesie request_id (routovanie bolo bug) ──
  OK  zadávateľ dostal NOVA_SPRAVA
  OK  property_id je NULL (predmet je dopyt, nie inzerát)
  OK  request_id NESIE id dopytu — BEZ toho by push nikam nesmeroval

── 6. notificationRoute() — čistá funkcia, testovaná mimo appky (Node) ──
  OK  dopytová správa → /dopyt/[id]
  OK  inzerátová správa → /nehnutelnost/[id] (nezmenené)
  OK  bez oboch id → null (žiadny pád)
```

Bod 6 beží priamo cez Node, nie cez databázu — je to presne tá istá
funkcia (`notificationRoute`), skopírovaná do testu 1:1 pre overenie bez
zariadenia. Overuje aj to, že sa **NIČ nepokazilo pri inzerátových**
oznámeniach — to je práve ten typ regresie, ktorý by sa dal ľahko
prehliadnuť.

Po behu upratané — dopyt, inzerát, správy, oznámenia aj traja používatelia.

### 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

- [ ] Otvor **cudzí dopyt** (nie svoj) → tab/karta **Správy** je nad
      „Osloviť so svojím inzerátom" → napíš správu → funguje aj bez toho,
      aby si dopyt predtým oslovil.
- [ ] Skús napísať telefón/e-mail → zablokované s hláškou, rovnako ako pri
      inzeráte.
- [ ] Otvor **svoj dopyt** → sekcia Správy ukazuje zoznam vlákien; ak ťa
      niekto oslovil svojím inzerátom, ale nenapísal, je v zozname
      s poznámkou „Ozvi sa prvý".
- [ ] Nechaj si napísať k dopytu z druhého účtu → **príde push/zvonček**
      a ťuknutie naň **otvorí ten dopyt** (nie prázdnu/zlú obrazovku).
- [ ] Chat pri INZERÁTOCH funguje ďalej bez zmeny (regresia).

---

## KONTROLA PRED HOTOVO

| bod | stav |
|---|---|
| Chat pri dopytoch funguje, rovnaká mechanika ako pri inzeráte | ✅ **OVERENÉ RUNTIME** (13/13) / 🟡 vzhľad na telefóne |
| Zákaz kontaktných údajov platí aj tu | ✅ **OVERENÉ RUNTIME** |
| Oznámenie o novej správe pri dopyte vedie na správne miesto | ✅ **OVERENÉ RUNTIME** — opravený bug, kde by predtým nesmerovalo nikam |
| Chat pri inzerátoch bez regresie | ✅ **OVERENÉ RUNTIME** (staré 2-arg volanie aj `/nehnutelnost/[id]` routing nezmenené) |

`npx tsc --noEmit` — bez chýb.
