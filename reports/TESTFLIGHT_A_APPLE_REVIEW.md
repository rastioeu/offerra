# TestFlight, demo účet a príprava na Apple review

**Dátum:** 8. augusta 2026
**Build v App Store Connect:** 1.2.0 (4)

---

## 1. Ako pozveš rodinu do TestFlightu — dva spôsoby

Do App Store Connect sa cez CLI nedostanem (mám len submit kľúč), takže
toto je postup pre teba. **Oba spôsoby fungujú okamžite, bez čakania na
Apple review.**

### A) Interní testeri — najrýchlejšie, ale max. 100 ľudí

Interný tester musí mať účet vo tvojom App Store Connect tíme. Build
dostane **do pár minút po spracovaní**, bez akéhokoľvek schvaľovania.

1. **Pridaj človeka do tímu**
   App Store Connect → **Users and Access** → **+** →
   e-mail, meno, rola **Customer Support** (najnižšia, ktorá stačí) →
   zaškrtni **Access to Certificates, Identifiers & Profiles: NIE** →
   Invite. Príde mu pozvánka, potvrdí ju a založí si Apple ID, ak nemá.

2. **Zaraď ho do skupiny testerov**
   App Store Connect → **Offerra** → záložka **TestFlight** →
   vľavo **Internal Testing** → **+** pri „Testers" → vyber ľudí → Add.

3. **Priraď build**
   V tej istej skupine → **Builds** → **+** → vyber **1.2.0 (4)**.
   Testerom hneď príde e-mail aj upozornenie v appke TestFlight.

4. **Tester si stiahne appku TestFlight** z App Store a prihlási sa tým
   istým Apple ID, na ktoré prišla pozvánka.

**Obmedzenie:** 100 interných testerov, každý musí byť v tíme.

### B) Verejný odkaz — pohodlnejšie, ale prvý build čaká na Apple

Externí testeri nemusia byť v tíme a pozveš ich jedným odkazom. **Prvý
build skupiny ale musí prejsť Beta App Review** (bežne pár hodín až deň).
Ďalšie buildy už spravidla idú hneď.

1. TestFlight → **External Testing** → **+** pri „Groups" → názov
   napr. „Rodina".
2. V skupine zapni **Enable Public Link** → dostaneš odkaz
   `https://testflight.apple.com/join/XXXXXXXX` → pošli hocikomu.
3. Priraď build **1.2.0 (4)** → vyplň **What to Test** a **Beta App
   Review Information** (tam ide aj demo účet, viď nižšie) → **Submit for
   Review**.

**Moje odporúčanie:** na rodinu **teraz hneď A**, lebo netreba čakať;
verejný odkaz (B) si priprav na neskôr, keď budeš chcieť testerov mimo
rodiny.

### Spätná väzba od testerov — funguje, appka ju neblokuje

TestFlight má **Send Beta Feedback** zabudovaný a Offerra mu nijako
nebráni:

- v appke TestFlight → tlačidlo **Send Beta Feedback**;
- **priamo v Offerre stačí urobiť screenshot** — iOS ponúkne „Share Beta
  Feedback" a k nemu sa dá napísať text;
- pády sa posielajú automaticky (tester musí mať zapnuté zdieľanie).

Overil som, že Offerra nemá vlastný gesture handler na screenshot ani
`shake` a `RECORD_AUDIO` má blokované — nič z toho TestFlightu
neprekáža. Nová **záchranná obrazovka pri páde** navyše ukáže celú chybu,
takže tester vie odfotiť aj to.

---

## 2. Demo účet pre Apple review — ✅ hotový a overený

```
e-mail:  applereview@offerra.app
heslo:   pošlem ti ho v chate (do repa nesmie, viď nižšie)
```

**Vlož ho v App Store Connect do:**
App Store → Offerra → **App Review Information** → *Sign-In Required*
zaškrtnuté → **User Name** a **Password**.

Do poľa **Notes** odporúčam:

> Offerra umožňuje prihlásenie iba cez Apple alebo Google. Pre recenziu
> je pripravený prístup cez e-mail a heslo: na prihlasovacej obrazovke
> **päťkrát ťuknite na logo Offerra**. Odkryje sa tlačidlo
> **„Prihlásiť sa ako recenzent"** — jedno ťuknutie a ste v aplikácii
> s ukážkovými dátami. Alternatívne sa zobrazí aj formulár s e-mailom
> a heslom vyššie.

### Prečo doména `offerra.app`, keď neexistuje

Presne ako MUTARK (`applereview@mutark.app`) — **a `mutark.app` tiež
nerezolvuje**, overil som to. Nevadí to: účet zakladám cez Supabase admin
API s potvrdeným e-mailom, takže sa naň nikdy nič neposiela a Apple naň
tiež nepíše. Ak by si niekedy chcel skutočnú doručiteľnú adresu, zmena je
jeden príkaz.

### ⚠️ Jedna vec, v ktorej som sa MUTARKU zámerne NEDRŽAL

MUTARK má demo heslo **natvrdo v zdrojáku** (`src/lib/auth.ts`). Môže si
to dovoliť, lebo `rastioeu/mutark` je **private**. Repozitár Offerry je
**VEREJNÝ** a `CLAUDE.md` §4 doslova zakazuje dostať doň heslá demo účtov.

Urobil som to tak, aby recenzent mal **presne tú istú skúsenosť** (jedno
ťuknutie a je dnu), ale heslo v gite nebolo:

| | MUTARK | Offerra |
|---|---|---|
| heslo v zdrojáku | áno | **nie** |
| heslo v EAS Environment Variables | — | áno (`EXPO_PUBLIC_DEMO_PASSWORD`) |
| recenzent musí písať heslo | nie | nie |

Overené: v exportovanom bundli sa heslo nachádza (takže tlačidlo bude
fungovať), v repozitári **0 výskytov**. Uložené je aj v
`/root/.offerra-secrets` mimo repa.

Poctivo dodávam nevýhodu: `EXPO_PUBLIC_*` sa zapeká do bundlu, takže kto
rozbalí IPA, heslo nájde. Pri účte s výhradne ukážkovými dátami je to
prijateľné a stále o triedu lepšie než verejný commit. Ak by ti aj to
prekážalo, alternatíva je nechať len formulár a heslo dať výhradne do
review notes — povedz a prepnem to.

---

## 3. Obsah demo účtu — appka nepôsobí prázdno

| Čo | Koľko |
|---|---|
| vlastné inzeráty | **2** (predaj Nitra s uzávierkou, prenájom Trnava) |
| fotky | **6** |
| ponuky prijaté na jeho inzeráty | **4**, z toho **1 PRIJATÁ** |
| ponuky, ktoré sám podal | **2** |
| dopyty | **2** (Kúpim dom, Hľadám prenájom) |
| oznámenia v zvončeku | **4** |

Celý katalóg má **9 zverejnených inzerátov** v 9 obciach naprieč
7 krajmi, **9 dopytov** a **19 ponúk**.

**Seed sedí s AKTUÁLNYM modelom**, nie so starým — presne ako si žiadal:

- prenájom demo účtu má vyplnené **všetky nové polia**: zábezpeka 1 240 €
  (2× nájom), dostupné od, minimálna doba 12 mesiacov, zariadený, energie
  čiastočne, zvieratá povolené;
- **kraj a ulica** sú vyplnené;
- **súradnice** má 9/9 inzerátov, takže mapa nie je prázdna;
- prijatá ponuka má aj **dotazník nájomcu**, takže recenzent vidí
  odkrytie kontaktu naživo.

---

## 4. „Coming soon" — vyriešené

Apple pri recenzii odmieta nefunkčné výplne (App Review 2.1). Našiel som
jednu a odstránil:

**V Nastaveniach** boli pri každom type upozornenia tri chipy frekvencie,
z toho dva so štítkom **„(čoskoro)"** — denný a týždenný súhrn. Potrebujú
plánovanú úlohu na serveri, ktorú Offerra nemá.

Výber frekvencie sa preto **vôbec nezobrazuje**, kým funguje jediná
možnosť: jedna možnosť nie je výber. Je to za konštantou `DIGEST_READY`
— keď súhrny naozaj pribudnú, prepne sa jedno slovo.

Zmazal som aj `screen-placeholder.tsx` (dočasná výplň z Fázy 0, ktorú už
nikde nič nepoužívalo).

**Zvyšné miesta, kde appka priznáva hranice, som NECHAL** — nie sú to
výplne, sú to pravdivé vety o tom, ako appka funguje: „Offerra zatiaľ
push upozornenia neposiela" a „Oslovenie autor uvidí vo svojom profile".
Skryť ich by znamenalo klamať používateľa.

---

## 5. Čo na Apple review ešte CHÝBA — a čaká na tvoje rozhodnutie

### 🔴 Privacy Policy — bez nej sa nedá odoslať

App Store Connect **vyžaduje verejnú URL**. Offerra nemá ani obrazovku
v appke, ani web. MUTARK má právne texty ako obrazovky (`/legal/[doc]`),
hostovanú URL som v jeho repe nenašiel — musí byť zadaná ručne.

Návrh, ktorý viem spraviť hneď, ako povieš: napíšem texty
(Privacy Policy + Podmienky) po slovensky, dám ich do appky ako obrazovky
a zároveň publikujem cez **GitHub Pages** z verejného repa —
`https://rastioeu.github.io/offerra/privacy`. Zadarmo, bez domény,
funguje hneď.

### Kategória — moje odporúčanie

**Primárna: Lifestyle. Sekundárna: Business.**
Offerra je pre bežného človeka, ktorý predáva alebo hľadá bývanie, nie
pre realitných maklérov. Konkurencia (Nehnuteľnosti.sk, Idealista) sedí
v Lifestyle. Ak by si mieril na profesionálov, otočil by som to.

### Vekové hodnotenie

**4+.** Appka nemá používateľmi generovaný obsah, ktorý by bol rizikový
nad rámec textu inzerátu, nemá chat ani reklamu. Pri dotazníku odpovedz
„None" na všetko okrem *User Generated Content* — tam „Yes", lebo
inzeráty a ponuky píšu ľudia. Offerra má nahlasovanie aj moderovanie,
čo je presne to, čo Apple pri UGC vyžaduje.

### Screenshoty

Potrebné pre 6,7" (iPhone 15/16 Pro) a 6,9". **Toto viem spraviť len ja
z tvojho telefónu neviem** — najrýchlejšie je, keď odfotíš: katalóg,
detail inzerátu, mapu, ponuky a Dopyty. Rád z nich poskladám texty
a poradie.

---

## ⚠️ NEODOSLAL som na Apple review

Podľa tvojho pokynu. Build je nahratý do App Store Connect a je
k dispozícii **interným testerom hneď**. Krok „Submit for Review" čaká
na tvoje výslovné OK a najprv treba Privacy Policy.
