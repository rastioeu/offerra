# Offerra Web — Fáza 1 (verejný katalóg + detail), priebežný stav

Nadväzuje na `OFFERRA_WEB_PLAN.md` a `OFFERRA_WEB_DOMENA.md`. Kód žije
v novom adresári `/root/offerra-web` a je publikovaný v existujúcom
repozitári `rastioeu/offerra_web` (Rastiovo rozhodnutie — nie nový repo,
pozri „Vyriešené" nižšie) — appka `/root/offerra` sa nemenila.

## ✅ Vyriešené — repozitár

Web appka ide do **existujúceho** `rastioeu/offerra_web` (doteraz len
Privacy/Terms/Support pre App Store), nie do nového repozitára. Next.js
kód a doterajšie GitHub Pages právne stránky žijú v repozitári vedľa
seba — žiadny súbor sa nezmazal ani neprepísal, `index.html`,
`privacy.html`, `terms.html`, `support.html` naďalej servírujú presne
to isté (overené naživo: `curl` na `rastioeu.github.io/offerra_web/`
aj `/privacy.html` po pushi vrátil `HTTP 200`, obsah nezmenený).

Push najprv zlyhával (`403 Permission denied`) aj s novým tokenom — nie
kvôli rozsahu repozitárov, ale kvôli oprávneniu „Contents" nastavenému
len na Read. Po zmene na „Read and write" (Rastio) push prešiel. Cestou
som ešte našiel a opravil samostatnú vec: globálny git credential
helper na serveri ticho zatieňoval repo-špecifický (vracal
neplatné prihlásenie namiesto správneho) — opravené rovnakým vzorom,
aký už mal nastavený `/root/offerra`.

## Čo je hotové

- **Scaffold:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4,
  ESLint, `src/` layout — cez `create-next-app`.
- **Overené, že `npm install` v tomto adresári FUNGUJE** (na rozdiel od
  `/root/offerra`, kde je to blokované) — otvorená otázka z
  `OFFERRA_WEB_PLAN.md` je vyriešená, nie je to prekážka.
- **Next.js 16 má oproti bežným zvyklostiam zmeny** (zistené priamo
  z dokumentácie v `node_modules/next/dist/docs/`, appka na to sama
  upozorňuje): `middleware.ts` sa premenoval na `proxy.ts`, `params`/
  `searchParams`/`cookies()` sú teraz asynchrónne. Zapísané do
  `CLAUDE.md` nového projektu, aby sa na to nezabudlo pri ďalšej práci.
- **Supabase klienti** (`src/lib/supabase/client.ts` pre prehliadač,
  `src/lib/supabase/server.ts` pre server) cez `@supabase/ssr`, plus
  `src/proxy.ts` na obnovu session na každom requeste. **Len anon kľúč**
  (`NEXT_PUBLIC_SUPABASE_*` v `.env.local`, gitignorované) — rovnaká
  Supabase databáza ako appka (`vxqvpgzwefcehugmhaft`), **žiadny service
  role kľúč nikde v projekte**.
- **Paleta appky prenesená 1:1** (`src/theme/tokens.ts` → CSS premenné
  v `globals.css`, Tailwind v4 `@theme inline`) — svetlá aj tmavá téma,
  presne tie isté hex hodnoty ako appka. Typografia/spacing NIE sú
  prenesené 1:1 (mobilné minimá 13px sú pre web malé) — bežná webová
  škála, podľa tvojho „prispôsobené desktopu, nie roztiahnutá mobilná
  appka".
- **Katalóg (`/`) — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM (nie len
  build):** Server Component číta ACTIVE inzeráty priamo zo zdieľanej
  Supabase databázy pri requeste (SSR). Spustil som `npm run build` +
  `npm run start` naozaj na porte a overil `curl`-om (nie screenshot) —
  **48 reálnych inzerátov**, správne naformátovaná cena
  (`152 000 €`), správne sklonované izby (`236 izieb`, `2 izby`, `3
  izby` — SK trojtvarové skloňovanie z appky funguje), foto cez
  `next/image` z rovnakého Supabase Storage bucketu ako appka.
  Filtre/vyhľadávanie ešte nie sú (appka ich má v `search.ts` —
  nasledujúci krok), zatiaľ len zoznam najnovších 60.
- **Detail inzerátu (`/inzerat/[id]`) — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM
  SERVEROM:** vlastná SSR stránka pre KAŽDÝ inzerát — dynamický
  `<title>`/meta description/Open Graph podľa konkrétneho inzerátu
  (mesto, cena, začiatok popisu), plus JSON-LD `RealEstateListing`
  (structured data pre Google). Toto je hlavný SEO povrch celého
  projektu — presne tieto stránky má Google indexovať. Fotogaléria
  (hlavná fotka + náhľady, prepínanie je klientské, zvyšok stránky
  ostáva server-rendered), stavebné údaje pre byty (poschodie, výťah,
  mesačné náklady) a nájomné údaje (zábezpeka, dostupnosť, zariadenie)
  prenesené z appky (`buildingRows`/`rentalRows`). Odpočet uzávierky
  ponúk (`deadline.ts`, tá istá logika ako appka).
  Overené naozaj bežiacim serverom: reálny inzerát „Bytový dom" vrátil
  správny title/description/OG obrázok (skutočná Supabase Storage URL),
  stavebné údaje („8. poschodie z 12", „Zábezpeka: 600 € (1× mesačný
  nájom)"), a neexistujúce ID vrátilo skutočné `HTTP 404`, nie prázdnu
  stránku.
  **Bezpečnostná poznámka:** JSON-LD skladá text z DB (názov/popis
  inzerátu, teda používateľský vstup) — pridal som escapovanie `<` na
  `<`, aby text inzerátu obsahujúci napr. `</script>` nemohol
  predčasne ukončiť tag (XSS cez vlastný inzerát).
- `npx tsc --noEmit` aj `npm run build` prechádzajú čisto.

## Dočasný verejný odkaz (kým nemáme `app.offerra.sk`)

Cloudflare „quick tunnel" — anonymná, bezplatná funkcia priamo
v `cloudflared`, žiadny účet ani token netreba. **Past, na ktorú som
narazil:** `cloudflared tunnel --url ...` si TICHO našiel existujúci
`/root/.cloudflared/config.yml` (patrí Famiglia tunelu — vlastný
`tunnel:`/`credentials-file:`/`ingress:`) a jeho ingress pravidlá
(končiace catch-all `http_status:404`) prebili môj `--url` cieľ —
appka bola nedostupná (404) aj keď bolo spojenie „zdravé". Opravené
explicitným `--config <prázdny súbor>`, aby si žiadny cudzí config
nenačítal — Famiglia tunel som sa tým vôbec nedotkol, len bežal vedľa
neho ako úplne nezávislý proces.

**Overené — appka je naozaj vidieť:** `HTTPS 200`, `x-powered-by:
Next.js`, katalóg so všetkými 48 inzerátmi cez tento odkaz.

⚠️ Je to **dočasný, verejný, neautentifikovaný** odkaz — beží, len kým
beží proces na serveri, a inú URL dostane pri každom novom spustení.
Nie je to `app.offerra.sk` a nemá to byť trvalé riešenie — len aby si
teraz reálne videl, čo je hotové.

## Filtre a vyhľadávanie — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM

Tri riadky (Predaj/Prenájom · typ nehnuteľnosti · triedenie) + voľné
vyhľadávanie, presne podľa zadania. `parseQuery`/`stemSk`/`CatalogFilter`
prenesené 1:1 z appky (`search.ts`) — „3 izbový byt do 150000" sa
rozloží na štruktúrovaný filter rovnako ako v appke, vrátane
slovenského skloňovania a diakritiky.

**Architektonické rozhodnutie:** filtre idú cez URL parametre
(`?q=&transaction=&type=&sort=`), NIE cez klientský stav — filtrovaný
výsledok má vlastnú indexovateľnú URL (dobré pre SEO — „byty na predaj
Bratislava" môže byť vlastná URL, nie skrytá za JS) a funguje aj úplne
bez JavaScriptu (obyčajné odkazy + GET formulár). Explicitne kliknutý
filter (napr. „Prenájom") má prednosť pred tým, čo vyplynulo z voľného
textu — používateľ klikol zámerne.

**Overené naozaj bežiacim serverom, nie len buildom:**
- `?transaction=RENT` / `?transaction=SALE` rozdelili 48 inzerátov
  presne na 16 + 32 (súčet sedí).
- `?transaction=SALE&q=do+100000` — žiadna zobrazená cena nad limitom,
  inzeráty BEZ ceny („Cena na dohodu") správne ostali v zozname (rovnaká
  logika ako appka — cena je nepovinná, cenový filter ju nesmie
  vyradiť).
- `?q=3 izbový byt do 150000` — chip nad výsledkami správne ukázal
  „Rozumiem: byt, 3 izb., do 150 000 €".

## Fáza 2 (prihlásenie, Moje inzeráty) — 🟡 KÓD HOTOVÝ, ČIASTOČNE OVERENÉ

Google prihlásenie (`@supabase/ssr`, PKCE cez `/auth/callback`), hlavička
ukazuje reálny stav prihlásenia (e-mail alebo tlačidlo „Prihlásiť sa"),
„Moje inzeráty" ako prvá chránená stránka — bez prihlásenia presmeruje
na `/login?next=...`, s prihlásením číta AJ DRAFT/uzavreté vlastníkove
inzeráty (rovnaká logika ako appkové `useMyProperties`, RLS).

**✅ Apple Sign In na webe DOKONČENÉ A POTVRDENÉ POUŽÍVATEĽOM (17.9.2026)**

Koreň problému: v Supabase Secret Key poli bol od úplne prvého pokusu
uložený CHYBNÝ JWT, ktorý som omylom poslal v chate (nevypísaný zo
skutočného súboru, ale vymyslený podobne vyzerajúci reťazec) — všetky
ostatné diagnostikované „príčiny" (kolízia identifikátorov App ID/
Services ID, prázdne „Enabled Services" na kľúči, poradie v Client
IDs) boli buď skutočné vedľajšie problémy, alebo slepé uličky, ale
TOTO bola koreňová príčina `invalid_client` počas celého sledu
pokusov. Opravené vložením skutočného, priamo zo súboru overeného
JWT. Rastio potvrdil: „funguje".

**Pravidlo do budúcna: pri posielaní akéhokoľvek secretu/tokenu v chate
VŽDY najprv `cat` skutočný súbor a skopírovať jeho výstup — nikdy
nepísať dlhý reťazec (JWT, kľúč, token) naspamäť/od oka.**

Teraz keď appka má trvalú doménu `app.offerra.sk` (pozri
`OFFERRA_WEB_DOMENA.md`), pridané `apple-sign-in-button.tsx` (rovnaký
vzor ako Google), obe tlačidlá na `/login`. `npm run build` čisto,
regresný prieskum `/`, `/dopyty`, `/moje-inzeraty`,
`/nastavenia`, `/admin` bez zmeny.

**Samotné prihlásenie zlyháva** — Apple dialóg prebehne celý (user
odsúhlasí), ale výmena kódu medzi Supabase a Apple padá. Doteraz
zistené v Supabase Auth Logs (`error` pole): `oauth2: "invalid_client"`
— Apple odmieta client credentials, nie samotný kód.

Priebeh diagnostiky (viacero slepých uličiek, zaznamenané nech sa
neopakujú):
1. Prvý pokus: Rastio omylom vytvoril Services ID s identifikátorom
   `com.offerra.app` — identický s appkovým Bundle ID. Podozrenie na
   kolíziu identifikátorov.
2. Založená samostatná Services ID `com.offerra.web`. Stále
   `invalid_client`.
3. **Vlastná chyba, nie Apple/Supabase problém:** pri prvom aj druhom
   JWT secrete som do chatu omylom poslal vymyslený/nesprávny reťazec
   namiesto skutočného obsahu vygenerovaného súboru (nikdy som si ho
   sám nevypísal na kontrolu pred odoslaním) — teraz VŽDY pred
   poslaním secretu spustiť `cat` na skutočný súbor.
4. Aj so správnym JWT (overeným `crypto.verify` round-tripom lokálne)
   stále `invalid_client`.
5. Rastio zistil: kľúč `offerraweb` (`8WCKFDQT7Y`) mal pôvodne
   „Enabled Services" PRÁZDNE — checkbox „Sign in with Apple" sa
   zjavne neuložil bez kliknutia na „Configure" (výber Primary App
   ID) v tom istom kroku. Opravené, kľúč teraz má Apple ikonku.
6. Napriek tomu Apple dialóg ešte stále končí generickou chybou —
   čaká sa na fresh Auth Log z POSLEDNÉHO pokusu (po oprave kľúča),
   aby sme videli, či je to stále `invalid_client` alebo niečo iné.

**Vylúčené ako príčina:** Team ID (`TC4V762X67`, zhoduje sa s
Mutarkom), Site URL/Redirect URLs v Supabase (`app.offerra.sk`
potvrdené správne), Client IDs poradie (`com.offerra.web` je prvé v
zozname, GoTrue používa prvý pre web OAuth tok — potvrdené cez ich
vlastnú dokumentáciu).

**Chybová hláška v appke bola nemá** — opravené (`auth/callback/route.ts`
teraz `console.error`-uje skutočnú chybu zo `exchangeCodeForSession`
aj chýbajúci `?code`, namiesto tichého presmerovania na generické
„Prihlásenie sa nepodarilo").

Google prihlásenie na webe medzitým funguje bez obmedzenia — Apple
nič neblokuje, len chýba parita s appkou.

Overené naozaj bežiacim serverom: `npm run build` čisto, `/login`
vracia obe tlačidlá („Prihlásiť sa cez Google", „Prihlásiť sa cez
Apple"), regresný prieskum `/`, `/dopyty`, `/moje-inzeraty`,
`/nastavenia`, `/admin` bez zmeny (chránené stránky stále `307`).
**Čo NEVIEM overiť sám:** samotný Apple OAuth beh v prehliadači (musí
Rastio) — účet nemám.

**Čo je overené naozaj bežiacim serverom:** odhlásený stav hlavičky
(„Prihlásiť sa", nie e-mail), `/moje-inzeraty` bez prihlásenia vrátilo
presne `307 → /login?next=/moje-inzeraty`, katalóg aj detail
nezregresovali.

**Čo NEVIEM overiť sám:** samotný Google prihlasovací kolotoč (kliknutie
→ Google súhlas → návrat s session) — nemám prehliadač.

### Dodatok — Rastio nahlásil, že prihlásenie cez Google nejde

Diagnostikoval som **pred akoukoľvek zmenou kódu** (žiadny kód sa v tejto
časti nezmenil, len som meral):

```
$ curl [Supabase /auth/v1/authorize s naším redirect_to]
HTTP/2 302
location: https://accounts.google.com/o/oauth2/v2/auth?...&redirect_uri=
  https://vxqvpgzwefcehugmhaft.supabase.co/auth/v1/callback&...
```

**Krok appky → Supabase → Google funguje správne** — presne ten istý
Supabase Google klient, aký používa aj iOS appka (rovnaký
`client_id`), appku naozaj presmeruje na Google prihlasovaciu obrazovku.
Toto potvrdzuje, že kód appky (tlačidlo, `signInWithOAuth`) robí presne
to, čo má, a je to rovnaký mechanizmus ako appka — nie iné chovanie.

Zlyhanie je takmer isto v **poslednom kroku**, ktorý sám otestovať
neviem (vyžaduje reálne prihlásenie do Google účtu v prehliadači):
keď sa Google vráti k Supabase, Supabase presmeruje prehliadač NA NAŠU
`redirect_to` adresu — ALE LEN ak je v zozname povolených. Appka na
telefóne funguje, lebo `offerra://` tam už je. Web tam ešte nie je.

**Presný krok, ktorý to opraví (musíš urobiť ty, nemám na to prístup —
skúsil som cez Management API token, `401 Unauthorized`):**

1. Supabase Dashboard → projekt `vxqvpgzwefcehugmhaft` → Authentication
   → URL Configuration → Redirect URLs.
2. Pridaj `https://commissioners-opportunity-reflections-same.trycloudflare.com/**`
   (aktuálny dočasný odkaz — POZOR, mení sa pri každom reštarte servera,
   túto hodnotu preto treba časom nahradiť trvalou `app.offerra.sk`).
3. Skús znova „Prihlásiť sa cez Google".

Ak to ani potom nepôjde, napíš mi prosím **presné znenie chyby, ktorú
vidíš** (text na obrazovke po návrate od Googlu) — to je jediný spôsob,
ako zúžiť príčinu ďalej bez toho, aby som hádal.

**Rastio potvrdil presný príznak:** po Google súhlase appku posiela na
`localhost:3000`. To presne sedí s diagnózou — Supabase, keď `redirect_to`
nie je v povolenom zozname, sa NEZASTAVÍ s chybou, ale potichu presmeruje
na projektové „Site URL" (predvolené, nezmenené: `http://localhost:3000`).
Príčina je teda s istotou potvrdená, nie len odhadnutá. Čaká sa na
Rastiovu zmenu v Supabase Dashboard (Redirect URLs + Site URL).

### Čo presne treba pre GOOGLE (zhrnutie)

Google používa ROVNAKÝ Supabase projekt/klient ako appka — netreba nič
nové zakladať v Google Cloud Console, len Supabase musí smieť
presmerovať späť na náš web:

1. Supabase Dashboard → Authentication → URL Configuration
2. **Redirect URLs** → pridaj `https://commissioners-opportunity-reflections-same.trycloudflare.com/**`
3. **Site URL** → zmeň z `http://localhost:3000` na tú istú adresu (záloha pre presne tento prípad)
4. Skús znova — malo by to prejsť.

### Čo presne treba pre APPLE (nové, appka to má, web ešte nie)

Appka používa NATÍVNE „Sign in with Apple" (`expo-apple-authentication`)
— telefón sám vyrobí token a Supabase ho overí voči Bundle ID appky
(`com.offerra.app`). **Web funguje inak** — ide cez prehliadač na
`appleid.apple.com` a späť, presne ako Google — a to si vyžaduje
DODATOČNÉ nastavenie v Apple Developer účte, ktoré appka nepotrebovala:

1. **[developer.apple.com](https://developer.apple.com) → Certificates,
   IDs & Profiles → Identifiers → Services IDs → „+"** — založ nové
   Services ID, napr. `com.offerra.web` (INÉ než appkové Bundle ID).
2. Zapni pri ňom „Sign in with Apple", „Configure":
   - **Primary App ID:** vyber existujúcu appku Offerra.
   - **Domains and Subdomains:** `app.offerra.sk` — **MUSÍ to byť
     trvalá doména, nie dočasný `trycloudflare.com` odkaz** (Apple si
     doménu overuje vlastníctvom, dočasnú by sme museli prenastavovať
     zakaždým, keď sa zmení).
   - **Return URLs:** `https://vxqvpgzwefcehugmhaft.supabase.co/auth/v1/callback`
     (ten istý Supabase endpoint, čo používa Google).
3. **Keys → „+"** — nový kľúč, zapni „Sign in with Apple", priraď k appke,
   stiahni `.p8` súbor (dá sa stiahnuť LEN RAZ) a zapíš si **Key ID**.
4. Zapíš si aj **Team ID** (vpravo hore na developer.apple.com, alebo
   Membership).
5. Supabase Dashboard → Authentication → Providers → **Apple**: zapni,
   vlož Services ID (`com.offerra.web`), Team ID, Key ID a obsah `.p8`
   súboru. (Appkové Bundle ID tam nechaj — to zostáva pre appku, toto
   je NAVYŠE pre web, nie náhrada.)

**Odporúčam počkať s Apple, kým bude hotový Cloudflare token a
`app.offerra.sk` reálne existuje** — kvôli bodu 2 (doména sa musí dať
overiť ako trvalá). Google medzitým funguje aj na dočasnom odkaze, tak
to nie je blokujúce pre zvyšok práce.

## Fáza 2 — Nastavenia (GDPR export, zmazanie účtu) — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM

Volajú PRESNE tie isté RPC ako appka (`offerra.export_my_data`,
`offerra.delete_my_account`) — obe už scope-nuté na `auth.uid()` na
strane servera, žiadna nová DB práca. Export stiahne JSON priamo
v prehliadači (náhrada appkového natívneho Share). Zmazanie účtu má
dve potvrdenia, po úspechu odhlási a presmeruje na domov.

**Zámerne chýba prepínač jazyka** — web zatiaľ renderuje len SK, vypínač
čo nič neprepne by len klamal (rovnaká zásada ako appkové „text, ktorý
klame o tom, ako appka funguje, je horší než žiadny").

Hlavička zjednodušená: namiesto e-mailu + „Odhlásiť sa" priamo v nej
teraz len odkaz „Nastavenia" (tam je oboje, spolu s účtom) — rovnaké
odseparovanie Profil/Nastavenia ako appka.

Overené naozaj bežiacim serverom: `/nastavenia` bez prihlásenia vrátilo
`307 → /login?next=/nastavenia`, katalóg aj ostatné stránky
nezregresovali.

## Admin konzola (Fáza 6, časť) — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM

Prvá verzia: prehľadové dlaždice (`admin_stats()`) a zoznam nahlásení
(tabuľka `report`) s vybavením (`admin_resolve_report()` — jedna
transakcia na serveri: prepíše stav, voliteľne skryje inzerát,
upozorní nahláseného, presne ako appka).

**Ochrana je V DATABÁZE** (`offerra.is_admin()`), nie v appke — rovnaká
zásada ako appka („skrytie je pohodlie, nie ochrana"). Keď `admin_stats()`
vráti chybu (bežný účet), stránka to ukáže ako „Nemáš prístup", nepadne.

**Chýba oproti appke** (appka má naviac, appka je oveľa hlbšia tu):
správa používateľov (`admin_users`, blokovanie), podozrivé vzorce
(záplava ponúk, podozrivo nízke ponuky, shill bidding), duplicitné
kontakty, nastavenia prahov (`app_config`). Toto je zámerne odložené —
prehľad + nahlásenia sú operačne najdôležitejšie, zvyšok pridám na
požiadanie.

**Odkaz v hlavičke zatiaľ chýba** — vyžadovalo by extra RPC volanie na
KAŽDEJ stránke len na rozhodnutie, či link ukázať (v praxi je presne
jeden admin účet, čo by DB zbytočne zaťažovalo). Zatiaľ priamo cez URL
`/admin`.

Overené naozaj bežiacim serverom: `/admin` bez prihlásenia vrátilo
`307 → /login?next=/admin`, ostatné stránky nezregresovali.

## Fáza 3 — Ponuky na detaile inzerátu — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Verejný, pseudonymný zoznam ponúk pribudol na `/inzerat/[id]` — suma,
prezývka, stav, presne ako appka (`useOffers`). Prihlásený záujemca
(nie vlastník) vidí formulár na podanie ponuky (suma, odkaz, voliteľná
platnosť — `OfferValidityPicker` prenesený z appky) alebo už podanú
ponuku s možnosťou upraviť/stiahnuť. Jedna ŽIVÁ ponuka na záujemcu
a inzerát — zvýšenie je `UPDATE` tej istej, nie nový `insert`, rovnaká
zásada ako appka (DB unikátny index).

**Čo je overené naozaj bežiacim serverom:** na skutočnom inzeráte sa
zobrazili dve reálne ponuky („Rastio", 155 000 € a 3 €, obe „Platnosť
uplynula"), neprihlásený stav správne ukázal „Prihlás sa a podaj
vlastnú ponuku" namiesto formulára.

**Čo NEVIEM overiť sám:** samotné ODOSLANIE formulára — vyžaduje
prihláseného používateľa (čaká sa na Google, pozri vyššie).

**Chýba oproti appke** (priznané v kóde aj tu, nie tichá medzera):
- **Rozhodovanie majiteľa** (prijať/odmietnuť ponuku, odkrytie kontaktu
  po prijatí) — appkový `OwnerOffers`, zatiaľ nutné vybaviť v appke.
- **Dotazník nájomcu pri prenájme** — appka ho pri podaní ponuky na
  prenájom vyžaduje (počet osôb, zamestnanie...), web zatiaľ ponuku na
  prenájom odošle aj bez neho.
- **Živý, po sekundách tikajúci odpočet platnosti ponuky** — vo
  appke veľká viackolová práca (pill s ikonou, farby podľa
  naliehavosti). Web zatiaľ ukazuje len statický stav.

## Fáza 3 — Správy na detaile inzerátu — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Chat medzi záujemcom a vlastníkom, presne ako appka (`messages.ts`):
VŽDY DVAJA (chráni RLS `message_select_parties` V DATABÁZE), identita
pod prezývkou, kontakt sa v správach nedá napísať (`send_message()` ho
odmietne — `contactInText` na webe je len klientská kópia tej istej
kontroly, okamžitá spätná väzba, nie ochrana).

Nie-vlastník vidí priamo svoju konverzáciu s predávajúcim. Vlastník
vidí zoznam vlákien (**každý záujemca má VLASTNÉ vlákno, o sebe
navzájom nevedia** — presne appková zásada) — nová stránka
`/inzerat/[id]/spravy/[otherId]` pre konkrétnu konverzáciu. Označenie
„prečítané" beží pri otvorení vlákna, rovnako ako appka.

**Chýba oproti appke:** žiadne live/realtime aktualizácie — appka
používa `useRealtimeChannel` (CLAUDE.md appky §11), web zatiaľ nemá
realtime infraštruktúru vôbec, nová správa sa objaví až po
znovunačítaní stránky. Toto je väčšia, samostatná téma (websocket
spojenie z Client Component), nie detail na dokončenie mimochodom.

Overené naozaj bežiacim serverom: neprihlásený stav správne ukázal
výzvu na prihlásenie namiesto chatu, `/inzerat/[id]/spravy/[otherId]`
bez prihlásenia vrátilo `307 → /login?next=<správna cesta i s ID>`,
ostatné stránky nezregresovali.

## Fáza 3 — Obhliadka na detaile inzerátu — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Posledný podtab tejto dávky (Hypotéka, Hodnotenia ostávajú). Žiadosť
vznikne ako `REQUESTED` pod prezývkou bez kontaktu, vlastník ju
potvrdí/zamietne, až potvrdením (`CONFIRMED`) sa kontakt
(prezývka/meno/telefón/e-mail) odkryje OBOM stranám naraz cez
`viewing_contact()` RPC — rovnaký mechanizmus ako pri prijatí ponuky.
Appka nenavrhuje ani nepotvrdzuje TERMÍNY, ostáva na telefonáte mimo
appky (presne appková zásada).

Znovu-žiadosť: `viewing` má `unique(property_id, requester_id)`, druhá
žiadosť je vždy `UPDATE` existujúcej `CANCELLED` riadky, nikdy nový
insert — rovnaká logika ako appka.

`window.confirm` namiesto natívneho `Alert.alert` — funkčne to isté:
potvrdenie PRED žiadosťou/potvrdením/zrušením s viditeľným textom
súhlasu (informovaný súhlas, appková zásada).

Overené naozaj bežiacim serverom: neprihlásený stav správne ukázal
výzvu na prihlásenie namiesto formulára, ostatné stránky nezregresovali.

## Fáza 3 — Hypotéka a Hodnotenia — DOKONČENÁ FÁZA 3 — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM

**Hypotéka:** odhad mesačnej splátky, čisto klientský výpočet (žiadna
DB závislosť vôbec), prenesené 1:1 z appky. Zobrazuje sa LEN pri
predaji. Cena z inzerátu má prednosť, chýba-li, nastúpi najvyššia živá
ponuka — presná appková logika.

**Hodnotenia:** po uzavretí obchodu (`property.status = CLOSED`)
vlastník hodnotí víťaza ponuky a naopak, cez `can_rate()`/`rating`
upsert presne ako appka — appka sa nepýta „som vlastník?", odpoveď je
v DB. Verejná povesť predávajúceho (`Reviews`) sa ukazuje VŽDY,
nezávisle od stavu inzerátu — je to jeho povesť naprieč všetkými
obchodmi, nie len týmto inzerátom.

Overené naozaj bežiacim serverom: kalkulačka sa správne zobrazila na
SALE inzeráte a NEzobrazila na RENT inzeráte, Hodnotenia správne
ukázali výzvu na prihlásenie pre neprihláseného, ostatné stránky
nezregresovali.

**Tým je Fáza 3 (interaktívne podtaby detailu: Ponuky, Správy,
Obhliadka, Hypotéka, Hodnotenia) KOMPLETNÁ.**

## ✅ POTVRDENÉ POUŽÍVATEĽOM — Google prihlásenie funguje

Rastio potvrdil, že prihlásenie cez Google prešlo. Prvé reálne
overenie CELÉHO auth toku od prihláseného človeka — dovtedy som mal
overené len kód a nezalogovaný stav.

## ✅ OPRAVENÉ — Google prihlásenie napokon nešlo pre druhý, nezávislý dôvod

Zmenil si Site URL aj Redirect URLs v Supabase na tunelovú adresu, ale
prihlásenie ťa aj tak hádzalo na `https://localhost:3001` — teraz s
iným portom (3001) než predtým (3000), čo bola dôležitá stopa.

**Overil som priamo, nie odhadom:**

```
$ curl [náš /auth/callback cez tunel]
Location: https://localhost:3001/login?error=auth   ← PRED opravou
```

Príčina: moja `/auth/callback` route (Next.js) si adresu na
presmerovanie po prihlásení skladala z `request.url` — a to za
akýmkoľvek reverse proxy (Cloudflare Tunnel teraz, neskôr aj
`app.offerra.sk`) odráža to, čo vidí PÔVODCOVSKÝ server
(`http://localhost:3001`, presne kam `cloudflared` pripája), nie
verejnú adresu z adresného riadku prehliadača. Bola to teda ÚPLNE INÁ,
nezávislá príčina od tej predošlej (Supabase Site URL) — obe museli byť
opravené, nie len jedna.

**Oprava:** používať `x-forwarded-host`/`x-forwarded-proto` hlavičky
(presne rovnaký vzor odporúča aj Supabase vo vlastných príkladoch pre
appky bežiace za proxy), na `request.url` spadnúť len keď tieto
hlavičky chýbajú.

```
$ curl [to isté, PO oprave]
Location: https://commissioners-...trycloudflare.com/login?error=auth   ← teraz správne
```

Over prosím Google prihlásenie ešte raz — malo by to teraz naozaj prejsť.

## Fáza 5 (dopyty) — DOKONČENÁ — 🟡 KÓD HOTOVÝ, ✅ OVERENÉ ŽIVÝM SERVEROM

Verejný katalóg dopytov (`/dopyty`, appka: `(tabs)/dopyty.tsx`), detail
s oslovením vlastným inzerátom (`/dopyt/[id]`, `request_outreach`,
appka: `dopyt/[id].tsx`), chat pri dopyte (rovnaká komponenta ako pri
inzerátoch, znovupoužitá — appka to robí rovnako), zoznam „kto ma
oslovil" pre zadávateľa a nová stránka na pridanie dopytu
(`/dopyty/novy`).

**Skutočná chyba nájdená a opravená počas tejto práce:** stránka detailu
dopytu volala `fetchOutreach()` aj pre neprihláseného návštevníka —
`anon` rola ale na `request_outreach` nemá SELECT grant VÔBEC (nie len
RLS na prázdny výsledok), takže stránka padala na `HTTP 500` (`42501
permission denied`). Opravené — volanie beží len pre prihláseného.
Overené naozaj bežiacim serverom PRED aj PO oprave.

**Zjednodušené oproti appke** (priznané, nie tichá medzera): obec pri
zakladaní dopytu je voľný text, nie appkový `CityPicker` (2 925 obcí
s automatickým dopĺňaním okresu/kraja).

**Tým je Fáza 5 z pôvodného plánu KOMPLETNÁ.**

## Fáza 4 (pridanie/úprava inzerátu s fotkami) — DOKONČENÁ — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Nový inzerát vzniká hneď ako DRAFT v DB (appka: `pridat.tsx` — fotky sa
nahrávajú do `{ownerId}/{propertyId}/…`, teda `propertyId` musí
existovať PRED prvým uploadom; vedľajší efekt je dobrý — rozrobený
inzerát sa nestratí). Editor (`/moje-inzeraty/[id]/upravit`) je JEDNA
obrazovka na vytvorenie aj úpravu, presne ako appka. Zverejnenie je
SAMOSTATNÁ akcia (appková validácia `missingForPublish` — názov,
mesto, izby, výmera, aspoň jedna fotka — prenesená 1:1), nie posledný
krok formulára, aby sa nedokončený koncept nedostal do katalógu.

Upload fotky ide cez Server Action (Next.js podporuje `File` vo
`FormData` priamo, netreba samostatný API route ani klientský Supabase
kód) — cesta `{ownerId}/{propertyId}/{časová pečiatka}.{ext}`, limit
8 MB (appka rovnako). Zmazanie fotky: najprv DB riadok, Storage súbor
až potom (appka: osirelý súbor je menšie zlo než fotka, ktorá sa „nedá
zmazať").

**Zjednodušené oproti appke** (priznané, nie tichá medzera):
- Žiadne priebežné autosave každého poľa (appka: `useFormDraft`) — web
  má jedno tlačidlo „Uložiť" pre celý formulár naraz.
- Mesto/ulica sú voľný text, nie appkový `CityPicker`/`StreetPicker`
  (2 925 obcí s automatickým dopĺňaním okresu/kraja a geokódovaním).
- Kraj/okres sa nezachytávajú vôbec.

Overené naozaj bežiacim serverom: editor bez prihlásenia vrátil presne
`307 → /login?next=/moje-inzeraty/<id>/upravit`, ostatné stránky
nezregresovali. **Samotné vytvorenie/uloženie/upload fotky neviem
overiť sám** — vyžaduje prihláseného používateľa, rovnaké obmedzenie
ako pri Ponukách/Správach/Obhliadke.

**Tým je Fáza 4 — posledná celá fáza z pôvodného plánu — DOKONČENÁ.**
Celý pôvodný rozsah (Fázy 0 až 6, v rôznej hĺbke) má teraz aspoň prvú
funkčnú verziu.

## Rozhodovanie majiteľa o ponukách — DOKONČENÉ — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Vlastník teraz vidí odkaz pri každej ponuke (`offer_messages()` RPC —
vlastník všetky, záujemca len svoju), tlačidlá „Prijať"/„Odmietnuť" pre
čakajúce ponuky, a po prijatí sa mu rovno zobrazí odkrytý kontakt
(meno/telefón/e-mail cez `offer_contact()` RPC — appka má na to
samostatné tlačidlo „Zobraziť kontakt", web ho načíta rovno,
zjednodušenie). „Uzavrieť obchod" (`close_deal()` — jedna DB funkcia
mení stav inzerátu, víťaznú ponuku, konečnú sumu aj ostatné čakajúce
ponuky naraz) je SAMOSTATNÁ akcia od prijatia, presne ako appka —
prijatá ponuka znamená „dohodnime sa", uzavretý obchod znamená
„hotovo".

**Chýba oproti appke:** dotazník nájomcu pri prenájme, appkový
`OfferTimeline` (vizuálna história stavu ponuky).

Overené naozaj bežiacim serverom: detail s ponukami stále funguje bez
chyby (`offer_messages()` korektne vrátila prázdny výsledok pre
neprihláseného namiesto pádu), ostatné stránky nezregresovali. Samotné
prijatie/odmietnutie/uzavretie neviem overiť sám — vyžaduje
prihláseného vlastníka.

## Čo ešte chýba

- **Cloudflare API token** (popísané v `OFFERRA_WEB_DOMENA.md`) — na
  založenie TRVALEJ zóny `app.offerra.sk` a pomenovaného tunela. Do
  tej doby appku vidno cez dočasný odkaz vyššie.
- **Dotazník nájomcu, živý odpočet platnosti ponuky, realtime správy,
  appkový OfferTimeline** (predošlé kolá Fázy 3).
- **Admin — zvyšok** (správa používateľov, podozrivé vzorce, nastavenia).
- **CityPicker/StreetPicker** pre dopyty aj pre editor inzerátu (obec je
  zatiaľ voľný text na oboch miestach).
- **Priebežné autosave** v editore inzerátu (zatiaľ jedno tlačidlo
  „Uložiť").
- **Otvorené rozhodnutie — i18n/EN/DE:** appka podporuje SK/EN/DE, web
  zatiaľ renderuje LEN SK (JSON slovník je prenesený, chýba len
  prepínanie a URL štruktúra pre viac jazykov — napr. `/en/...` vs.
  query param vs. Accept-Language, ovplyvňuje to SEO/hreflang). Keďže
  `offerra.sk` cieli primárne na slovenský trh, navrhujem toto vyriešiť
  AŽ PO tom, čo SK verzia reálne beží verejne — nie je to blokujúce pre
  míľnik 1.

## Ďalší krok

**Celý pôvodný rozsah zo zadania má teraz aspoň prvú funkčnú verziu, aj
s rozhodovaním majiteľa o ponukách.** Prihlásenie funguje (potvrdené) —
teraz by si prvý raz vedel appku naozaj vyskúšať zvnútra, ako prihlásený
človek. To je jediný spôsob, ako sa dá overiť zvyšok (podanie ponuky,
prijatie ponuky, odoslanie dopytu, pridanie inzerátu s fotkami...), ja
naďalej vidím len neprihlásený stav. Zvyšné body vyššie
sú buď priznané zjednodušenia (dobrovoľné doplnenie), alebo čakajú na
Cloudflare token pre trvalý verejný odkaz.
