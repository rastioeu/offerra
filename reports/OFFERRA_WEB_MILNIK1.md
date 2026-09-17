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

**✅ Správa používateľov DOKONČENÁ (17.9.2026)** — nová sekcia
„Používatelia" na `/admin`: zoznam cez `admin_users()` (nickname,
e-mail, rola, blokovaný stav, počet inzerátov), tlačidlo
Zablokovať/Odblokovať cez `admin_set_blocked()` (rovnaké RPC ako
appka, pattern skopírovaný z appkového `(tabs)/admin.tsx`). Admin
nevidí tlačidlo blokovania pri vlastnom účte (appka to robí rovnako).
Dôvod blokovania je pevný text („Zablokované administrátorom"), appka
má rovnaký princíp (pevný text cez `t('admin.blockedReason')`).

**✅ Overenie používateľa a rola správcu DOKONČENÉ (17.9.2026)** —
`admin_set_verified` (poznámka POVINNÁ pri overovaní, appka to isté)
a `admin_set_role` (bezpečnostné pravidlá — nemeniť vlastnú rolu,
aspoň jeden admin musí ostať — sú v databáze, nie v kóde).

**✅ Podozrivé vzorce a duplicitné kontakty DOKONČENÉ (17.9.2026)** —
nová sekcia „Podozrivé vzorce" na `/admin`: záplava ponúk
(`admin_suspicious_offer_flood`), opakovane nízke ponuky
(`admin_suspicious_lowball`), opakované ponúkanie tomu istému
vlastníkovi (`admin_suspicious_shill_bidding`), rovnaký telefón/e-mail
na viacerých účtoch (`admin_duplicate_contacts`) — rovnaké RPC ako
appka, len signály na ručnú kontrolu, žiadna automatická akcia (appka
to isté — „nikoho neblokuje sama").

**Ešte chýba oproti appke:** nastavenia prahov (`app_config` —
`SUSPICIOUS_CONFIG_KEYS`/`RATE_LIMIT_CONFIG_KEYS`), limit počtu
inzerátov, opakované porušenia (`admin_repeat_offenders`), upozornenia
(`admin_alerts`), top vystavovatelia (`admin_top_listers`). Odložené,
pridám na požiadanie.

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

**Stav k 17.9.2026 (predtým tu bol zoznam medzier, väčšina už hotová):**
- Rozhodovanie majiteľa — ✅ HOTOVÉ (16.9.2026).
- Dotazník nájomcu pri prenájme — ✅ HOTOVÉ (17.9.2026, `tenant_profile`).
- Živý odpočet platnosti ponuky — ✅ HOTOVÉ (17.9.2026).
- OfferTimeline (vizuálna história stavu) — ✅ HOTOVÉ (17.9.2026).

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

**✅ CityPicker DOKONČENÝ (17.9.2026)** — obec pri zakladaní dopytu ide
teraz cez ten istý `CityPicker` (2 925 obcí, živé vyhľadávanie priamo
v `offerra.city`), čo aj editor inzerátu.

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

**OPRAVA (17.9.2026) — preskúmané, `useFormDraft` nie je skutočná
medzera:** appkový `useFormDraft`/`form-draft.ts` NIE JE DB autosave —
appkový vlastný komentár to hovorí priamo („ÚMYSELNE obyčajná pamäť
procesu, nie AsyncStorage... nemá prežiť reštart appky"). Je to len
poistka proti KONKRÉTNEMU appkovému bugu z 9.8.2026: obrazovka napĺňala
formulár v `useEffect(…, [item])`, a každý `reload()` (napr. po pridaní
fotky) vytvoril nový objekt, čo prepísalo rozpísaný text hodnotami z
DB. Webový `ListingEditorForm` má formulár v `useState(() =>
formFromProperty(property))` — LENIVÝ inicializátor sa spustí len RAZ
pri prvom vykreslení, žiadny `useEffect` ho nerefreshuje pri zmene
`property` propu, takže rovnaký bug tu vzniknúť nemôže — appkový
mechanizmus by web riešil problém, ktorý nemá. Tlačidlo „Uložiť" pre
celý formulár naraz je preto konečné riešenie, nie zjednodušenie.

**✅ Mesto/ulica DOKONČENÉ (17.9.2026)** — `CityPicker`/`StreetPicker`
(port appkových, 2 925 obcí, živé vyhľadávanie), kraj/okres/súradnice
sa teraz zachytávajú spolu s obcou (predtým sa nezachytávalo nič).

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

**Dotazník nájomcu a OfferTimeline — ✅ HOTOVÉ (17.9.2026).**

Overené naozaj bežiacim serverom: detail s ponukami stále funguje bez
chyby (`offer_messages()` korektne vrátila prázdny výsledok pre
neprihláseného namiesto pádu), ostatné stránky nezregresovali. Samotné
prijatie/odmietnutie/uzavretie neviem overiť sám — vyžaduje
prihláseného vlastníka.

## Vizuálna identita — desktop redizajn (17.9.2026) — 🟡 KÓD HOTOVÝ, ✅ ČIASTOČNE OVERENÉ ŽIVÝM SERVEROM

Rastio (17.9.2026): appka má vyladenú vizuálnu identitu, web má z nej
prevziať presne TOTO (nie novú paletu), ale rozloženie má byť
skutočne desktopové, nie mobil roztiahnutý na monitor. Urobil som
audit appkových `theme/tokens.ts` vs webové `globals.css` (farby už
boli 1:1 zhodné od Fázy 1), a doplnil chýbajúce kusy:

- **Wordmark s teplým glow** (appka: `logo.tsx`, 6 priesvitných RN
  vrstiev bez natívneho blur) — web má skutočné CSS `filter: blur()`,
  stačí jedna vrstva rovnakého efektu. `Logo` komponenta, oba varianty
  (svetlý/tmavý) skopírované z appky (`assets/images/wordmark*.png`),
  v hlavičke namiesto textového „Offerra".
- **Chýbajúci token `--color-on-photo-surface`** — appka má vlastnú
  priesvitnú farbu pre odznaky NAD fotkou (`onPhotoSurface`), web ju
  nemal vôbec a používal `onPrimary` ako náhradu (v tmavom režime by to
  vyšlo takmer čierne, nie zamýšľaná teplá priesvitnosť). Doplnené do
  `globals.css`, uzávierková pilulka na karte ju teraz používa presne
  ako appkový `PhotoBadge`.
- **Cena vo Georgia serife v presnej appkovej veľkosti** — predtým
  generické Tailwind `text-xl`/`text-3xl` (20px/30px), teraz `22px`
  na karte / `27px` na detaile — presne appkové `Money.large`/`Money.hero`.
- **Odznak typu ponuky** — predtým svetlý priesvitný chip, teraz plná
  navy pilulka s bielym textom (appkový `Badge tone="navy"`).
- **`--shadow-card` token** (appkový `Shadow.card`: farebný, nízka
  krytosť) namiesto genérického Tailwind `shadow-lg`.
- **Katalóg — bočný panel filtrov na desktope** (`lg:` a vyššie):
  predtým tri riadky zalamovaných chipov nad výsledkami, teraz vertikálny
  panel vľavo (`Typ ponuky`/`Typ nehnuteľnosti`/`Triedenie` s nadpismi),
  mriežka výsledkov `sm:2 / xl:3` stĺpce. Mobil beží ako predtým (chipy
  sa vracajú do zalamovaného riadku pod `lg`), bez klientského JS — stále
  čisté odkazy/GET formulár.
- **Detail inzerátu — dvojstĺpcový layout na desktope**: galéria, popis,
  podrobnosti, hodnotenia a správy vľavo; cena + uzávierka + ponuky +
  obhliadka + hypotéka v LEPIVOM (`sticky`) paneli vpravo (`380px`) —
  klasické realitné rozloženie namiesto všetkého pod sebou. Mobil
  jednostĺpcový, poradie zachované.

Overené naozaj bežiacim serverom: `npm run build` čisto, regresný
prieskum `/`, `/dopyty`, `/moje-inzeraty`, `/nastavenia`, `/admin`,
`/inzerat/[id]` bez zmeny HTTP kódov, logo súbory sa reálne servujú
(`/brand/wordmark.png`, `/brand/wordmark-dark.png` vrátené v HTML),
presné veľkosti ceny aj `on-photo-surface` trieda potvrdené v
vygenerovanom HTML.

**Čo NEVIEM overiť sám:** ako to VYZERÁ (farby v prehliadači, blur
efekt glow, responzívne správanie pri zmene šírky okna, hover stavy) —
to vyžaduje skutočný prehliadač.

### Druhé kolo (17.9.2026) — ✅ zdieľaná `Button` komponenta + `Shadow.button`

Appkový avatar systém, `OfferCountdownPill` a počítadlo fotiek z
prvého kola sú hotové (pozri nižšie v „Čo ešte chýba" históriu). Druhé
kolo sa sústredilo na TOTO:

- **Zdieľaná `Button` komponenta** (`src/components/button.tsx`) —
  predtým **17 miest** v kóde kopírovalo rovnaké Tailwind triedy pre
  primárne/sekundárne/danger tlačidlá ručne (ľahko rozíditeľné,
  appkové pravidlo CLAUDE.md §5 „žiadna komponenta nesmie mať vlastnú
  hardcodovanú farbu" rozšírené aj na tlačidlá). Teraz `variant="primary"
  | "secondary" | "danger"`, padding/veľkosť ostáva na volajúcom
  zámerne (nechcem ticho zmeniť rozmery, ktoré sám nevidím).
- **`--shadow-button` token** — appkový `Shadow.button` (farebný
  terakotový tieň na primárnych tlačidlách, nie generický sivý),
  doplnený pre svetlý aj tmavý režim, aplikovaný na `variant="primary"`.
- **Vedome NEURČITÁ kompletná Type/Money škála ako tokeny** — appkový
  komentár v `globals.css` hovorí explicitne: „appkové minimá (13px) sú
  pre web zbytočne malé, tu je normálna webová škála" (Rastio,
  schválené pri prvom kole). 1:1 port appkových presných px hodnôt by
  preto bol KROK SPÄŤ, nie dokončenie — toto zámerne NEROBÍM, kým
  nepríde iný pokyn.

Overené naozaj bežiacim serverom: `npm run build` čisto, regresný
prieskum všetkých hlavných stránok bez zmeny HTTP kódov, `shadow-[var(--shadow-button)]`
trieda potvrdená vo vygenerovanom HTML na viacerých stránkach. **Čo
NEVIEM overiť sám:** ako presne tieň vyzerá v prehliadači.

## Čo ešte chýba

- **Živý odpočet uzávierky inzerátu** — ✅ HOTOVÉ (17.9.2026, `DeadlineBadge`
  + `useOfferCountdownTick`, port appkového hooku).
- **Živý, po sekundách tikajúci odpočet PLATNOSTI PONUKY** — ✅ HOTOVÉ
  (17.9.2026, `offerCountdown` doplnený do `offer-validity.ts` +
  `OfferCountdownPill`, presne appkový stupňovitý formát).
- **Appkový avatar systém, počítadlo fotiek na karte** — ✅ HOTOVÉ
  (17.9.2026, `avatar.tsx`, deterministický z prezývky, rovnaké CC0
  obrázky).
- **Dotazník nájomcu pri prenájme** — ✅ HOTOVÉ (17.9.2026, `tenant_profile`,
  sekcia „O nájomcovi" viditeľná len majiteľovi).
- **OfferTimeline** — ✅ HOTOVÉ (17.9.2026).
- **CityPicker/StreetPicker** — ✅ HOTOVÉ (17.9.2026), pozri vyššie.
- **Admin konzola — KOMPLETNÁ (17.9.2026)**: všetky appkové sekcie
  (prehľad, nahlásenia, používatelia, overenie, rola, podozrivé
  vzorce, duplicitné kontakty, nastavenia prahov, upozornenia,
  opakované porušenia, top vystavovatelia) má teraz aj web.
- **Živé vyhľadávanie v katalógu** — ✅ HOTOVÉ (17.9.2026, debounce
  350ms, žiadne tlačidlo „Hľadať", presne ako appka).
- **✅ Realtime správy HOTOVÉ (17.9.2026)** — nová vec pre web (appka
  toto pre správy sama nemá), postavená na appkovej Realtime
  infraštruktúre (`realtime.ts` + `use-realtime-channel.ts`, 1:1 port,
  dokázaný appkový vzor z notifikácií). Nová správa sa objaví bez
  obnovenia stránky. **DB zmena:** `offerra.message` pridaná do
  `supabase_realtime` publikácie — predtým tam nebola vôbec, žiadne
  `postgres_changes` by sa nedoručilo nikomu, appku ani web to
  predtým netrápilo, lebo appka na túto tabuľku realtime nepoužíva.
  **Čo NEVIEM overiť sám:** živé doručenie v dvoch prehliadačoch naraz
  vyžaduje dvoch prihlásených ľudí súčasne — over si to prosím
  otvorením konverzácie v dvoch okná/zariadeniach.
- **Priebežné autosave** — preskúmané a vyradené zo zoznamu medzier,
  pozri opravu vyššie pri Fáze 4: appkový `useFormDraft` rieši bug,
  ktorý web architektonicky nemá.
- **✅ SEO základ HOTOVÝ (17.9.2026)** — `robots.txt` a `sitemap.xml`
  CHÝBALI ÚPLNE (404), napriek tomu, že SEO je hlavný dôvod celého
  projektu. `sitemap.xml` teraz dynamicky vypíše VŠETKY `ACTIVE`
  inzeráty aj dopyty (vlastná URL, `lastmod`), `robots.txt` povoľuje
  verejný katalóg/detail a zakazuje prihlásením chránené stránky.
  Doplnený aj `metadataBase` v `layout.tsx` (predtým chýbal — Next.js
  by inak relatívne OG URL riešil voči `localhost:3000`, nie skutočnej
  doméne).

- **✅ AI viditeľnosť + bohatšie structured data (17.9.2026)** — Rastio:
  „aby to aj AI brala všade."
  - `llms.txt` (`llmstxt.org` — vznikajúci štandard, obdoba
    `robots.txt` pre AI asistentov) — stručný Markdown popis webu,
    odkazy na katalóg/dopyty/sitemap, priamo pri koreni domény.
  - `robots.txt` teraz EXPLICITNE povoľuje 14 známych AI crawlerov
    (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai,
    Claude-Web, PerplexityBot, Google-Extended, Applebot-Extended,
    Bytespider, CCBot, Amazonbot, meta-externalagent, DuckAssistBot) —
    predtým ich púšťal len všeobecný `*` riadok bez jasného zámeru.
  - `Organization` + `WebSite` (s `SearchAction`) JSON-LD na KAŽDEJ
    stránke (predtým nikde, len appka mala appkovú identitu).
  - `RealEstateListing` JSON-LD na detaile inzerátu obohatený o `geo`
    (súradnice z `CityPickera`), `numberOfRooms`, `floorSize`,
    `datePosted`, `offers.availability`.
  - Detail inzerátu, detail dopytu, katalóg (aj s filtrami) a zoznam
    dopytov majú teraz `openGraph`, `twitter` card a
    self-referencing `alternates.canonical` — predtým mal čiastočné OG
    len detail inzerátu, nič iné.
  - Katalóg s filtrami má DYNAMICKÝ title/description podľa kombinácie
    filtrov („Byty na prenájom v Bratislave"), plus `ItemList` JSON-LD
    zo zobrazených inzerátov.

  Overené naozaj bežiacim serverom: `/llms.txt` aj `/robots.txt`
  vracajú `200` aj na `app.offerra.sk`, `RealEstateListing` aj
  `Organization`/`WebSite` JSON-LD sú v skutočnom vygenerovanom HTML,
  regresný prieskum všetkých stránok bez zmeny HTTP kódov. **Čo
  NEVIEM overiť sám:** ako presne Google/Bing/AI asistenti tento
  obsah naozaj skonzumujú a zaindexujú — to je mimo môjho dosahu,
  viditeľné až s odstupom týždňov/mesiacov.

- **✅ Značkové favicon + vlastný OG obrázok (17.9.2026):**
  - `favicon.ico`/`icon.png`/`apple-icon.png` boli DOTERAZ predvolené
    Next.js scaffold ikony (generický trojuholník, nie Offerra) —
    nahradené appkovým 1024×1024 `icon.png` (rovnaký ako iOS App Icon).
  - Zistil som (a opravil) skutočnú chybu: keď stránka definuje
    VLASTNÝ `openGraph` objekt bez `images`, Next.js ho NEDOPLNÍ z
    `layout.tsx` (nie je to hĺbkové zlúčenie) — detail dopytu tak
    nemal ŽIADEN `og:image`, zdieľanie na Facebooku/Slacku/WhatsApp by
    ukázalo prázdnu kartu. Rovnaké riziko hrozilo pri inzeráte bez
    fotiek. Vyrobil som vlastný značkový `og-image.png` (1200×630,
    logo + teplý glow + tagline, PIL z appkového wordmarku a
    paletových farieb) a nastavil ho ako fallback všade, kde nie je
    vlastná fotka.
  - Overené naozaj bežiacim serverom: `<link rel="icon">`/`apple-touch-icon"`
    tagy aj `og:image` na detaile dopytu vrátené v skutočnom HTML,
    regresný prieskum bez zmeny.
  - **Ďalšia zistená chyba pri kontrole:** katalóg s filtrami (`/`)
    nedostával príponu „| Offerra" do `<title>` napriek `template` v
    `layout.tsx` — zmerané priamo (`/dopyty`, `/login`, obe so
    statickým `export const metadata`, príponu dostanú správne; táto
    JEDNA dynamická `generateMetadata` na koreňovej route nie, z
    dôvodu, ktorý som nedohľadal). Opravené explicitnou príponou v
    kóde namiesto spoliehania sa na dedenie.

- **Otvorené rozhodnutie — i18n/EN/DE:** appka podporuje SK/EN/DE, web
  zatiaľ renderuje LEN SK (JSON slovník je prenesený, chýba len
  prepínanie a URL štruktúra pre viac jazykov — napr. `/en/...` vs.
  query param vs. Accept-Language, ovplyvňuje to SEO/hreflang). Keďže
  `offerra.sk` cieli primárne na slovenský trh, navrhujem toto vyriešiť
  AŽ PO tom, čo SK verzia reálne beží verejne — nie je to blokujúce pre
  míľnik 1.

## Stav k 17.9.2026 (prepísané, predošlý text bol zastaraný)

**Celý pôvodný rozsah zo zadania beží na `https://app.offerra.sk`,
vrátane admin konzoly, dotazníka nájomcu, OfferTimeline, realtime
správ a dôkladného SEO/AI kola.** Prihlásenie (Google aj Apple)
potvrdené Rastiom, appka je plne vyskúšateľná ako prihlásený človek.

Za posledné kolá pribudlo aj mimo pôvodného zoznamu medzier:
- Menšie skutočné chyby nájdené a opravené priebežne (chýbajúci
  `og:image` na dopyte, chýbajúca title prípona na katalógu, sekvenčné
  dopyty namiesto paralelných v `OffersSection`/`ViewingSection`).
- Zdieľaná `Button` komponenta, appkový `Shadow.button`.
- Značková 404 stránka.
- **Web beží ako systemd služba** (`offerra-web.service`), nie ako môj
  ručne spustený `nohup` proces — Rastio nahlásil krátky výpadok pri
  mobilnom refreshi, ktorý sa ukázal ako môj vlastný reštart počas
  nasadzovania zmien (nie appkový bug — potvrdené v logoch aj tým, že
  o chvíľu to zase išlo). Skutočný nájdený nedostatok popri tom:
  appka doteraz NEMALA žiadny auto-reštart pri neplánovanom páde ani
  pri reštarte servera — teraz má (`Restart=on-failure`,
  `WantedBy=multi-user.target`, otestované priamym `kill -9` procesu,
  systemd ho postavil späť do 4 sekúnd bez zásahu).

**Otvorené, čaká na Rastiovo rozhodnutie, nie na prácu:** formálna
Type/Money škála ako tokeny (pozri „Druhé kolo" vyššie prečo som to
zámerne nespravil bez ďalšieho pokynu).

## i18n EN/DE (17.9.2026) — 🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE

URL štruktúra podľa Rastiovho výberu: SK bez prefixu (`/`, `/dopyty`,
...), EN/DE cez prefix (`/en/...`, `/de/...`) — odporúčané pre
SEO/hreflang, Rastio to takto potvrdil. Implementácia:

- Presun všetkých route súborov pod `src/app/[locale]/` (dynamický
  segment), `src/proxy.ts` prepisuje SK request interne na
  `/sk/...`, EN/DE idú cez segment priamo. `<html lang>` a
  `alternates.languages` (hreflang) nastavené per-locale v
  `app/[locale]/layout.tsx`.
- i18n modul rozdelený na dve časti — dôvod: Edge Middleware (`proxy.ts`)
  nesmie importovať `next/headers`, inak sa nezabalí:
  - `src/i18n/index.ts` — čistá časť (žiadny modulový stav, appka mala
    tento istý dôvod pri appkovom `createT`): `createT(locale)` vracia
    `t` funkciu, bezpečné volať aj z klientskych komponent.
  - `src/i18n/server.ts` — `getLocale()`/`getT()`, cez `React.cache()`
    (nie modulový singleton — Node obsluhuje viacero requestov
    súčasne, mutovateľná premenná na úrovni modulu by bola pretekom
    naprieč nimi).

**Skutočná chyba nájdená pri prvom nasadení, nie vopred predpokladaná:**
React Server Components zakazujú poslať FUNKCIU ako prop zo Server
Component do Client Component (serializačná hranica — platí bez
ohľadu na `"use client"`). Prvý pokus posielal `t: TFunc` priamo takto
na 11 miestach (`DeadlineBadge`, `OfferCountdownPill`, `OfferForm`,
`OwnerOfferActions`, `RatingCard`, `MessageThreadClient`, `ViewingCard`,
`OutreachPicker`, `NewDemandForm`, `ListingEditorForm`,
`MortgageCalculatorCard`) — spôsobilo to `500` na katalógu (`/`, `/en`,
`/de`) a pravdepodobne kdekoľvek inde v strome, čo sa práve vtedy
neoverilo. Zistené priamo z `journalctl -u offerra-web.service`
(`Error: Functions cannot be passed directly to Client Components...`),
nie odhadom. Oprava: tieto komponenty teraz dostávajú len
serializovateľný `language: Locale` (reťazec) a `t` si odvodia samé
cez `createT(language)`. Komponenty, ktoré si `t` posielajú MEDZI
sebou (klient → klient, napr. `OfferForm` → `OfferValidityPicker`,
`ListingEditorForm` → `DeadlinePicker`, `MessageThreadClient` →
`MessageSendForm`) hranicu neprekračujú, tam `t: TFunc` ostalo bezo
zmeny.

**✅ OVERENÉ RUNTIME:**
- `npm run build` čistý (TypeScript aj Turbopack), `systemctl restart
  offerra-web.service`, `journalctl` bez jedinej chyby po reštarte.
- curl `200` na `/`, `/en`, `/de`, `/dopyty` (+ `/en`, `/de` varianty),
  `/login` (+ varianty), na reálnom detaile inzerátu (`/inzerat/<id>`,
  ktorý renderuje práve opravené `DeadlineBadge`, `OffersSection`,
  `ViewingSection`, `MortgageCalculatorCard`) aj reálnom detaile dopytu
  (`/dopyt/<id>`, `OutreachPicker`) — všetko v SK/EN/DE.
- Commitnuté a pushnuté (`rastioeu/offerra_web`, `d3f72bf`).

**🟡 Čaká na Rastiove vizuálne overenie** (curl dokazuje HTTP 200, nie
že text vyzerá dobre — §1 pravidlo, neodvodzujem jedno z druhého):
otvor `https://app.offerra.sk/en` a `https://app.offerra.sk/de` na
telefóne aj počítači a over slovom:
- Vidno anglický/nemecký text namiesto slovenského (nadpisy, tlačidlá,
  labely formulárov)?
- Časť textov (napr. „Nehnuteľnosti", „Cena na dohodu", „Bez fotky" na
  karte v katalógu) je zatiaľ NAPEVNO po slovensky aj na `/en`/`/de` —
  vedomá, ešte nedokončená medzera, nie niečo, čo malo fungovať.

## Zvonček, „Ako funguje", prepínač jazyka, brána prezývky (17.9.2026)

Rastio prešiel appku a nahlásil chýbajúce: *„a nedal si tam vsetko neni
tam napriklad ako to funguje, prebehni vsetky funkcie ios appky ani
zvoncek tam neni"* → `pokracuj aj s tymito`. Postupne pridané, každé
✅ OVERENÉ RUNTIME (build → reštart → curl na skutočnom HTML), 🟡 len
tam, kde ide o vizuálne overenie, ktoré viem dokázať len HTTP kódom,
nie zážitkom:

- **Zvonček oznámení** — port appkového `use-notifications.ts`:
  `NotificationsProvider` (React kontext, jeden zdieľaný Realtime kanál
  na celý web, rovnaký dôvod ako appkový fix z 8.8.2026), `/oznamenia`
  stránka. `notification-route.ts` má webové zjednodušenie: web nemá
  appkovú samostatnú obrazovku správy ponúk majiteľa (`/ponuky/[id]`),
  ponuky sú priamo v `OffersSection` na `/inzerat/[id]` — tam preto
  vedú všetky typy s `property_id`.
- **„Ako funguje Offerra"** — port appkového `how-it-works.ts` (text už
  bol v zdieľanom i18n slovníku SK/EN/DE, chýbalo len UI): krátka karta
  na hlavnej + v Nastaveniach, plná verzia na `/ako-to-funguje`, odkaz
  aj priamo v hlavičke vedľa prihlásenia (Rastio: „ako to funguje by
  som dal niekde ako je prihlásenie").
- **Karta na hlavnej sa dá zavrieť** (`DismissibleCard`,
  `localStorage` — appka zatvorenie ukladá do profilu, web pre to
  zatiaľ nemá kam, vedomý kompromis) a hlavička katalógu je od tohto
  kola na `lg:` dvojstĺpcová (nadpis vľavo, karta vpravo fixnej šírky)
  — predtým „plávala krivo" na širokej obrazovke (Rastio).
- **Prepínač jazyka SK/EN/DE v hlavičke** — dovtedy sa dalo prepnúť len
  ručnou zmenou URL. Funguje aj bez prihlásenia, prepína na TEN ISTÝ
  obsah v inom jazyku (nie na domovskú), zachová aj query parametre.

### 🔴 Skutočná chyba nájdená pri tomto kole, nie vopred predpokladaná

Rastio hneď po nasadení prepínača nahlásil: *„ked vyberiem jazyk tak ho
zmeni a hned zmeni naspat"*. Prepínač sám bol správny (overené priamo
v HTML — `aria-current`, `href` ukazovali na správny cieľ). Skutočná
príčina: **úplne KAŽDÝ iný interný odkaz a presmerovanie na webe bolo
napevno bez jazykovej predpony** — `href="/inzerat/${id}"`,
`redirect("/login?next=/moje-inzeraty")`, `router.push("/")`, filtre v
katalógu/dopytoch, živé vyhľadávanie. Kliknutie na ČOKOĽVEK z `/de/...`
(kartu inzerátu, filter, odkaz „Prihlás sa", auth bránu na chránenej
stránke) skončilo na SK — presne dojem „jazyk sa hneď vrátil naspäť",
hoci to s prepínačom priamo nesúvisí.

Opravené na **~25 miestach** naprieč katalógom, dopytmi, správami,
editorom inzerátu, prihlásením, admin konzolou — `localizeHref(locale,
path)` na každom odkaze, nový `redirectLocalized()` +
`loginRedirectPath()` helper (`src/i18n/server.ts`/`href.ts`) pre
server-side presmerovania. **Aj `next=` v `/login?next=...` musí byť
lokalizovaný** — inak by prihlásenie z `/de/...` aj po oprave `/login`
samotného skončilo späť na SK.

**✅ OVERENÉ RUNTIME:** curl na chránené stránky z `/de/*` teraz
správne vracia `307 → /de/login?next=%2Fde%2F...` (predtým `/login` bez
predpony — zmerané priamo, nie odvodené). Verejné stránky (katalóg,
detail inzerátu/dopytu) v SK/EN/DE majú VŠETKY interné odkazy v
skutočnom vrátenom HTML správne s jazykovou predponou (grep na `curl`
výstupe, nie na kóde). `journalctl` bez chýb po reštarte.

### 🔴 Druhá, nezávislá kritická chyba nájdená pri tomto prieskume

Web **nikdy nezakladal `offerra.profile`** pri prvom prihlásení. Appka
to robí cez povinnú obrazovku prezývky (`prezyvka.tsx`, LOGIN → NICKNAME
→ appka) — web nemal ekvivalent VÔBEC. Zmerané priamo cez Supabase
Management API: `property`, `property_offer`, `buyer_request`,
`message`, `rating`, `viewing`, `notification` a ďalšie majú cudzí kľúč
na `offerra.profile`, a **žiadny DB trigger profil web-only používateľovi
nezaloží** (jediný trigger na `auth.users` zapisuje do `public.profiles`
— cudzia tabuľka, iný projekt na tej istej zdieľanej databáze, nie
`offerra.profile`). Overené aj nepriamo: len 3 neseed profily v DB,
2 z nich majú appkové polia `age_confirmed_at` — silný náznak, že
doteraz úplne KAŽDÝ testovaný účet mal profil už z appky, a web-only
registrácia s pokusom o ponuku/inzerát/správu nebola nikdy reálne
vyskúšaná až do konca.

**Dôsledok, keby sa to nenašlo teraz:** nový človek, čo príde na
`app.offerra.sk` cez Google/Apple (nikdy predtým appku neinštaloval),
by pri prvom pokuse podať ponuku/vytvoriť inzerát/napísať správu dostal
surovú chybu porušenia cudzieho kľúča z Postgresu — nezrozumiteľnú a
appka/web by ho nikam nenasmerovali.

**Oprava:** port appkovej `prezyvka.tsx` na `/prezyvka` (prezývka min. 3
znaky, meno-návrh z OAuth metadát, telefón POVINNÝ, potvrdenie 18+ a
vlastného mena — rovnaké právne náležitosti ako appka, s rovnakým
dôvodom v komentári prevzatým 1:1) + **brána v `proxy.ts`** (rovnaký
princíp ako appkový `_layout.tsx`): prihlásený človek bez profilu sa z
ktorejkoľvek stránky (okrem `/login`, `/prezyvka`, statických routov)
presmeruje na `/prezyvka` skôr, než sa čokoľvek iné stihne pokaziť.
Editácia existujúceho profilu (prezývka/meno/telefón) doplnená aj do
Nastavení.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `/prezyvka` vracia `200`
(SK/EN/DE) pre neprihláseného presmerovanie na `/login?next=/prezyvka`
(očakávané, rovnaké ako ostatné chránené stránky). Samotnú bránu (nový
človek bez profilu → automatické presmerovanie) **nejde overiť curl-om
bez reálneho Google/Apple prihlásenia** — logika je odvodená z
zmeraných DB grantov/FK a 1:1 zrkadlí appkový overený vzor, ale
**skutočné vyskúšanie novým účtom je 🟡, čaká Rastiovo potvrdenie.**

**🟡 Čaká na Rastiove overenie, konkrétne:**
- Skús sa odhlásiť a prihlásiť úplne NOVÝM Google účtom (taký, čo
  appku ani web ešte nikdy nepoužil) — mal by ťa web poslať na obrazovku
  prezývky skôr, než čokoľvek iné.
- Na `/en` a `/de` klikni na kartu inzerátu, na filter, na „Ako
  funguje" v hlavičke, prepni jazyk na inej stránke než domovskej — nikde
  by sa už nemalo skočiť späť na slovenčinu.
- Zvonček: príde ti niekedy nové oznámenie (napr. niekto podá ponuku na
  tvoj inzerát) — ukáže sa počet na zvončeku živo, bez obnovenia
  stránky?

### Preklady — prvé kolo (Rastio: „a doknči preklady, nie je všetko preložené")

Preložené tam, kde to má najväčší dopad (každá návšteva stránky):
katalógová karta („Bez fotky", „Cena na dohodu"), hlavná stránka
(nadpis, úvodný text, „Rozumiem:", „Vymazať filter", aj `<title>`),
celé Nastavenia vrátane potvrdzovacích dialógov pri zmazaní účtu a
exportu dát — appka mala bohatý `nastavenia` slovník už hotový, stačilo
ho použiť namiesto natvrdo napísaného textu.

**Druhé a tretie kolo (Rastio: „ale neni vsetko prelozene napriklad
vsetko vsetky inzeraty najnivsie" a následný grep na zvyšok):**
dokončené — editor inzerátu (celý, appkový `inzeratEdit` slovník bol
už hotový, stačilo ho napojiť), formulár ponuky, katalógové aj
dopytové filtre (Všetko/Všetky typy/Typ obchodu/Triedenie/Najnovšie/
Končí čoskoro/Hľadať), CityPicker/StreetPicker, nadpisy a prázdne stavy
na Moje inzeráty/ponuky/dopyty, prihlasovacia stránka, vlastná 404,
editor fotiek, texty „Hodnotenia"/„Ponuky (N)"/„Prihlás sa" pri
detaile inzerátu.

Systematická kontrola (`grep` na slovenskú diakritiku v JSX naprieč
celým webom) na konci potvrdila: mimo admin konzoly web už neobsahuje
napevno slovenský viditeľný text.

**🔴 VEDOME OTVORENÉ, nie tichá medzera:** len admin konzola —
jediný používateľ je Rastio, preklad by nemal praktický prínos, preto
zámerne vynechaná.

**Vedľajšie zistenie, nie chyba tejto fázy:** `/inzerat/<hocičo-nie-je-UUID>`
(neplatný formát, nie len neexistujúce id) vyhodí surovú chybu Postgresu
namiesto vlastnej 404 stránky — existovalo to už predtým, nesúvisí s
prekladmi, nízka priorita (interné odkazy vždy posielajú skutočné UUID,
zasiahne len ručne upravenú URL).

## Štvrté kolo prekladov + srdiečko obľúbených (17.9.2026)

Rastio pri ďalšom prezeraní webu opäť nahlásil zvyšky: *„este neni
prelozene vsetko pises stiahnut ponuku spat do katalogu"*. Predošlé
kolá hľadali len slová s diakritikou (`grep` na `áäčďéíĺľňóôŕšťúýž`) —
**tento sweep pridal aj čisto ASCII-vyzerajúce slovenské slová**
(„Popis", „Podrobnosti"), ktoré diakritický filter neodhalil.

**✅ OVERENÉ RUNTIME:**
- Dokončené: potvrdenia a tlačidlá pri Prijať/Odmietnuť/Uzavrieť
  obchod, Stiahnuť ponuku, chybové hlášky vo VŠETKÝCH formulároch
  (doteraz boli 100 % napevno po slovensky, aj keď zvyšok formulára už
  bol preložený — nízka viditeľnosť ich nechala prehliadnuté 3× po sebe),
  aria-label na hamburger menu a zatváracom krížiku, „Popis"/
  „Podrobnosti"/„Pridal:" na detaile inzerátu.
- Všetky zvyšné `<title>` (Moje inzeráty/ponuky/dopyty, editor, správy,
  nastavenia, prihlásenie) prevedené z napevno reťazca na
  `generateMetadata` + `t()` — predtým prekladal len VIDITEĽNÝ obsah
  stránky, karta v prehliadači zostávala po slovensky.
- **Nová funkcia, nie len preklad:** srdiečko obľúbených inzerátov.
  Appka to má len ako sekciu v Profile (žiadna appková samostatná
  obrazovka), web dostal vlastnú `/oblubene`. `FavoritesProvider`
  (rovnaký vzor ako `NotificationsProvider` — jeden zdieľaný stav pre
  celý web, appkový dôvod pre `favorite` tabuľku: RLS drží súkromie, nie
  len UI), srdiečko na katalógovej karte aj detaile inzerátu
  (optimistické, appkový kontrastný kruh pod ikonou prevzatý 1:1),
  odkaz v hlavičke aj hamburgeri.
- Build čistý, reštart, `/oblubene` `200` v SK/EN/DE, `<title>Sign in |
  Offerra</title>` priamo vo vrátenom HTML na `/en/login`, `journalctl`
  bez chýb.

**🟡 Čaká na Rastiovo overenie:** klikni na srdiečko pri inzeráte (v
katalógu aj na detaile) a skontroluj `/oblubene` — mal by tam byť.

## Piate kolo — dôvod, prečo predošlé štyri stále niečo nechali (17.9.2026)

Rastio: *„pozri este raz cely web a najdi zvysok."* Skutočná príčina,
prečo preklad unikal opakovane napriek štyrom kolám: **predošlé `grep`
sweepy hľadali len reťazcové literály v úvodzovkách** (`"Zrušiť"`).
Holý JSX textový uzol bez úvodzoviek (`<button>Zrušiť</button>`) im
unikal úplne — nová metóda (grep na CELÉ riadky, čo sú len
slovo/krátka fráza bez inej syntaxe) ho konečne odhalila.

Nájdené a opravené touto metódou: „Zrušiť" v `viewing-card.tsx` a
`outreach-picker.tsx`, „Bez fotky" v `photo-gallery.tsx` (tretie
miesto s týmto textom po karte a detaile — každé bolo samostatná
komponenta bez prístupu k jazyku), „Odosielam…" v
`message-send-form.tsx`, „Píšeš s {meno}." v `message-thread-client.tsx`.

**Skutočná chyba, nie len text:** `message-thread-client.tsx` mal
natvrdo `new Intl.DateTimeFormat("sk-SK", ...)` pre čas správy —
nezávisle od zvoleného jazyka by čas správy VŽDY vyzeral podľa
slovenského formátu, aj na `/en`/`/de`. Opravené (`localeTag()`
exportovaná z `lib/property.ts`, rovnaká funkcia, čo appka/web už
používa na dátumy inde).

**Druhý, systematickejší nález:** `throw new Error("...")` v SERVER
AKCIÁCH (`submitOffer`, `createOutreachAction`, `requestViewingAction`,
`createDemandAction`, `saveRatingAction`, `createDraftAction`,
`publishListingAction`, nahrávanie/mazanie fotky) — tieto reťazce idú
priamo do `e.message`, ktoré klientský `catch` zobrazí používateľovi.
**Obišli VŠETKY doterajšie `t()`-based fallbacky**, lebo `e instanceof
Error` je vždy `true` — fallback sa nikdy nespustil. Opravené vo
všetkých nájdených miestach cez `getT()` v server akcii.

**Vedľajšie, nie preklad, ale nájdené pri tomto prechode:** `robots.ts`
nemal v `disallow` zozname `/prezyvka`, `/oblubene`, `/oznamenia` (nové
chránené cesty z tejto session) — a **žiadna** chránená cesta nemala
`/en`/`/de` variant, čiže `/en/nastavenia` mohol dovtedy indexovať
vyhľadávač aj AI bot. Opravené. `sitemap.ts` nemal `/ako-to-funguje`,
doplnené.

**🔴 OTVORENÉ, vedome nie táto fáza:** `sitemap.xml` neobsahuje
`/en`/`/de` varianty stránok (hreflang `alternates` pole) — väčšia SEO
úprava, nie preklad, potrebuje samostatné rozhodnutie o rozsahu, nie
opravu popri inom.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `curl` na všetky verejné
aj chránené routy v SK/EN/DE, `robots.txt` obsahuje `/en/`, `/de/`
varianty všetkých chránených ciest, `sitemap.xml` obsahuje
`ako-to-funguje`, `journalctl` bez chýb.

## „Čo je nové" (17.9.2026) — posledná pôvodne nájdená chýbajúca funkcia

Rastio: „jazyky su ok podme dalej." Posledná položka z pôvodného
prieskumu appka-vs-web (spolu so zvončekom, „Ako funguje", prezývkou,
obľúbenými — všetky už hotové). **Nie port appkového changelogu**
(appkový je plný appkovo-špecifických vecí — natívne gestá, TestFlight
buildy — čo sa na webe nikdy nestali) — vlastný web changelog so
skutočnými dátumami zo `git log` (16.–17.9.2026, kedy web reálne
vznikol), zoskupený do používateľsky zmysluplných záznamov namiesto
jedného na commit.

**Rozhodnutie, nie prehliadnutie:** obsah `CHANGELOG` je zámerne LEN po
slovensky — rovnaký vzor, aký appka sama používa pre svoj vlastný
changelog (ten je tiež SK-only napriek tomu, že appka má EN/DE) — je to
historický záznam, nie časť webu, ktorú niekto reálne používa. Nadpis
a úvod okolo neho preložené sú.

Odkaz „Čo je nové" v Nastaveniach vedľa karty „Ako funguje", pridané aj
do `sitemap.xml`.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `/novinky` `200` v
SK/EN/DE, `<title>What's new | Offerra</title>` priamo v HTML na
`/en/novinky`, `/nastavenia` bez zmeny správania, `journalctl` bez chýb.

---

**Zvyšok z pôvodného prieskumu appka-vs-web:** appkový „Profil" mal dve
časti — časovú os aktivity a nahrávanie profilovky. Rastio (po otázke,
či je funkčne hotové všetko): „urob si ten profil čo si vynechal, veď
skryť [ho] vieme potom" — teda dorobiť, nie nechať otvorené.

## Časová os aktivity — `/aktivita` (17.9.2026)

Port appkového vzoru z `profil.tsx`: 4 zdroje (vlastné inzeráty, podané
ponuky, oslovenia vlastných dopytov, vlastné dopyty) zlúčené a zoradené
chronologicky — presne appkové poradie zdrojov aj appkové vynechanie
`PONUKA_PRIJATA` z reálneho zoznamu (appka má ten typ v definícii, ale
nikdy ho nepridáva do `timeline` poľa — zmerané priamo v appkovom kóde,
nie odvodené). Zoskupené podľa dňa (Dnes/Včera/dátum), zvislá os
s bodkou, rovnaký appkový vizuál.

Odkaz v Nastaveniach (sekcia Účet) a v mobilnom hamburger menu —
**zámerne NIE v hlavnom desktopovom riadku**, ten je už preplnený
(Rastio to predtým vytkol pri karte „Ako funguje").

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `/aktivita` `307`
(presmerovanie na prihlásenie bez session, rovnaký vzor ako ostatné
chránené stránky) v SK/EN/DE, `/nastavenia` bez zmeny správania,
`robots.txt` obsahuje `/aktivita`, `journalctl` bez chýb.

**🟡 Čaká na Rastiovo overenie** (prihlásený, s reálnymi dátami —
`curl` toto nevie dokázať): otvor `/aktivita` a skontroluj, či sa tam
objavia tvoje inzeráty/ponuky/dopyty zoradené podľa času, správne
zoskupené pod „Dnes"/„Včera".

**Nahrávanie profilovky — vedome NEURÝCHLENÉ, iný dôvod než zvyšok:**
appka ukladá fotku do Storage cez natívny `expo-image-picker`. Web má
už fungujúci vzor presne na toto (`PhotoManager` pri fotkách inzerátu),
takže technicky by to nebol veľký krok — ale profilovka sa dnes NIKDE
na webe nezobrazuje (žiadny avatar v hlavičke ani inde), takže by to
bola funkcia bez viditeľného efektu. Keď bude jasné, kde by sa
profilovka na webe vôbec ukázala, dorobí sa spolu s tým miestom.

## Overenie prihláseným demo účtom (17.9.2026)

Rastio: „skús to prihlásený ty, ja idem overiť." Doteraz som web overoval
LEN cez `curl` bez prihlásenia (§1: HTTP kód dokazuje, že stránka
existuje, nie že to, čo je za prihlásením, naozaj funguje). Prihlásil
som sa priamo cez Supabase (demo účet App Store review,
`applereview@offerra.app`, heslo z `/root/.offerra-secrets`
`DEMO_PASSWORD`) a s tou reláciou som na `app.offerra.sk` skutočne robil
veci, nie len pozeral:

- **Nastavenia** — formulár sa naplnil REÁLNYMI dátami účtu (prezývka,
  meno, telefón) — `my_profile()` cez skutočnú session funguje.
- **Obľúbené** — pridal som skutočný inzerát do obľúbených priamym
  zápisom (rovnaká cesta, akou by prešiel klik na srdiečko), `/oblubene`
  ho hneď ukázal.
- **Moje dopyty aj Moje inzeráty** — vytvoril som testovací dopyt aj
  koncept inzerátu, oba sa objavili v príslušných zoznamoch.
- **Moja aktivita** — obe nové udalosti sa ukázali správne zoradené
  (najnovšie hore), zoskupené pod „Dnes", so správnym štítkom stavu
  („Rozpracované") aj naformátovaným rozpočtom. Zlučovanie zo 4 zdrojov
  naozaj funguje, nie len teoreticky.
- Všetky testovacie dáta (dopyt, koncept, obľúbené) som po sebe zmazal
  — demo účet je presne taký, ako pred testom.

**Stále NEoverené** (vyžaduje to skutočný prehliadač): klik na srdiečko
cez UI, zvonček naživo (Realtime, vyžaduje dve súčasné relácie), nový
Google účet cez `/prezyvka` bránu, formuláre cez skutočné písanie do
polí. Dátová vrstva pod nimi je teraz overiteľne funkčná — zvyšok je na
Rastiovom vyskúšaní v prehliadači.

## Kontaktné údaje — telefón, e-mail (17.9.2026)

Rastio: telefón `+421 944 357 671`, e-mail `kontakt@offerra.sk`.

- **Hlavička** — dve kompaktné ikony (`tel:`/`mailto:`) na desktope
  vpravo vedľa prihlásenia/prepínača jazyka, na mobile schované do
  hamburger menu (appka: presne Rastiova požiadavka „nech nezaberá
  miesto"). `MobileNav` rozšírený o voliteľný `children` slot na toto.
- **Pätička** — dovtedy web ŽIADNU nemal. Plný telefón aj e-mail,
  odkazy na Ochranu osobných údajov a Podmienky používania (vedú na
  `rastioeu.github.io/offerra_web/privacy.html`/`terms.html` — appka
  odkazuje na TÚ ISTÚ verejnú verziu, „appka nemôže tvrdiť niečo iné než
  verejná stránka, na ktorú odkazuje App Store Connect" — preto odkaz
  von, nie nová kópia obsahu vo web appke), rok/copyright.
- **JSON-LD** (`schema.org` Organization) — `telephone`, `email` a
  `ContactPoint` (`customer service`, `areaServed: SK`,
  `availableLanguage: [sk, en, de]`) — Google to môže ukázať priamo vo
  výsledkoch vyhľadávania, presne ako si žiadal.
- Jeden zdroj pravdy pre číslo/e-mail (`src/lib/contact.ts`) — hlavička,
  pätička aj JSON-LD z neho čítajú, nemôžu sa rozísť.
- Všetko cez i18n kľúče (nová `footer` doména), SK/EN/DE.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `curl` na `/` v SK/EN/DE
ukazuje `tel:`/`mailto:` odkazy v hlavičke aj pätičke priamo vo vrátenom
HTML, správne preložené „Ochrana osobných údajov"/„Privacy Policy"/
„Datenschutz", JSON-LD obsahuje `telephone` aj `email`, žiadna regresia
na ostatných routách, `journalctl` bez chýb.

**🟡 Čaká na Rastiovo vizuálne overenie:** dve nové ikony v hlavičke —
vyzerajú decentne, nerozbíjajú riadok na desktope? Pätička — vyzerá
dobre na mobile aj širokej obrazovke?

## Nastavenia — prerobené (17.9.2026)

Rastio: „stránku nastavenia prerob nie je pekná a tam nemusí byť ako
funguje offerra."

- Každá sekcia (Účet, Prezývka a kontakt, Moje dáta, Nebezpečná zóna) je
  teraz skutočná karta (`rounded-2xl border bg-surface shadow-card`,
  rovnaký appkový vzhľad ako karta inzerátu/formulár ponuky) — predtým
  mali sekcie len malý nadpis bez akéhokoľvek vizuálneho rámca.
- Karta „Ako funguje Offerra" z tejto stránky preč — ostáva len na
  hlavnej stránke a ako obyčajný odkaz v hlavičke/pätičke.
- „Moja aktivita" a „Čo je nové" presunuté z roztrúsených miest do
  vlastnej karty „Rýchle odkazy".
- Nebezpečná zóna má jemné červené orámovanie — vizuálne odlíšená od
  ostatných kariet už na prvý pohľad, nie len cez nadpis.

**✅ OVERENÉ RUNTIME** (demo účtom, rovnaký postup ako vyššie): všetky
sekcie sa renderujú, karta „Ako funguje Offerra" na tejto stránke už nie
je prítomná, build čistý, reštart, `/nastavenia` bez zmeny správania
v SK/EN/DE, `journalctl` bez chýb.

## Pätička — zmenšená (17.9.2026)

Rastio hneď po nasadení: „pätička s kontaktom je príliš veľká a
výrazná... telefón a e-mail majú veľkosť skoro ako nadpisy, tučné."

- Nadpis „KONTAKT" preč — pri telefónnom čísle a e-maile je aj tak
  jasné, čo to je.
- Telefón/e-mail: `text-sm` namiesto `text-lg`, bez `font-semibold`,
  tlmená `text-secondary` farba namiesto `text-primary`.
- Odkazy vpravo (Ako funguje, Ochrana osobných údajov, Podmienky
  používania) teraz v JEDNOM riadku vedľa seba, nie pod sebou.
- Odsadenie zmenšené (`py-4` namiesto `py-8`, `gap-1.5` namiesto
  `gap-6`) — celá pätička teraz zaberá zlomok pôvodnej výšky.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `curl` na `/` potvrdzuje
žiadny nadpis „Kontakt", správne zmenšené/stlmené triedy priamo vo
vrátenom HTML, odkazy v jednom `<nav>` riadku, žiadna regresia,
`journalctl` bez chýb.

## Tri hlásené chyby po prezretí webu (17.9.2026)

Rastio prešiel `app.offerra.sk` a nahlásil tri konkrétne veci.

### 1. E-mail v pätičke rozbitý Cloudflare Email Obfuscation

„Cloudflare email obfuscation ho premenil na '[email protected]'... Vyzerá
to ako chyba webu."

Cloudflare Scrape Shield prehľadáva odpoveď a e-maily prepisuje na
zašifrovaný odkaz + JS dekodér — keď dekodér nespustí, vidno doslova
placeholder text.

**Prvý pokus (nefunkčný, zistené AŽ PO nasadení):** zakódovať `@` v
surových bajtoch ako HTML entitu `&#64;`, s teóriou, že Scrape Shield
skenuje bajty regexom, ktorý entitu nenájde. `curl` na živý web po
nasadení ukázal, že to nestačí — Scrape Shield entity DEKÓDUJE skôr, než
porovnáva, takže `href="mailto:kontakt&#64;offerra.sk"` napriek tomu
NAŠIEL a prepísal na `/cdn-cgi/l/email-protection#…`. Viditeľný text
(ten bol tiež ako entita) ostal čitateľný, takže PÔVODNÝ nahlásený
problém by bol vyriešený, ale odkaz by sa stále spoliehal na to, že sa
na klientovi stiahne a spustí Cloudflareov `email-decode.min.js` —
presne tá istá krehkosť, kvôli ktorej chyba vznikla prvýkrát.

**Skutočná oprava:** Cloudflare má na presne toto zdokumentovaný bypass
— `<!--email_off-->…<!--/email_off-->` okolo obsahu vypne Scrape Shield
pre všetko medzi týmito komentármi, bez ohľadu na API práva (token v
`.offerra-secrets` nemá právo meniť nastavenia zóny — to sa nezmenilo,
ale ani netreba). `href` aj viditeľný text teraz idú ako obyčajné
`mailto:kontakt@offerra.sk`, Cloudflare sa ich vôbec nedotkne.
(`src/components/contact-links.tsx`, `mailLinkHtml`.)

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `journalctl` bez chýb.
`curl` na živý `https://app.offerra.sk/` (aj `/en`, `/de`) po reštarte:
- `grep -c 'cdn-cgi/l/email-protection'` → **0**
- `grep -c 'data-cfemail'` → **0**
- `grep -c '\[email protected\]'` → **0**
- skutočný vykreslený DOM (nie len RSC dáta) obsahuje
  `<a href="mailto:kontakt@offerra.sk" ...>kontakt@offerra.sk</a>` —
  overené priamym `grep` v stiahnutom HTML zo všetkých troch jazykov.

Poznámka pre budúcnosť: JSON-LD (`application/ld+json`, pridané
v predošlom kroku) obsahuje `"email":"kontakt@offerra.sk"` ako obyčajný
JSON reťazec vnútri `<script>` — Cloudflare toto necháva bez zmeny (overené
tým istým `curl`, text v `<script>` ostal netknutý), takže sa netýka.

### 2. Ceny na kartách — chýbala najvyššia ponuka

„V appke pritom rozlišujeme ORIENTAČNÚ CENU a NAJVYŠŠIU PONUKU — to je
jadro celého konceptu Offerra (reverzný trh)... Na webe to vyzerá ako
obyčajný realitný portál s pevnými cenami."

Presne tak — karta doteraz ukazovala len `formatPrice(asking_price_hint)`
alebo „Cena na dohodu". Appkový modul `price-display.ts`
(`priceDisplay()`/`offerCountLabel()`) na webe vôbec neexistoval a
`fetchCatalog` nepočítal súhrn ponúk k inzerátom.

- **`src/lib/price-display.ts`** — nový, 1:1 port appkového modulu
  (`priceDisplay`, `offerCountLabel`). Hlavné číslo je NAJVYŠŠIA PONUKA
  vždy, keď nejaká živá (PENDING/ACCEPTED, nepremlčaná) existuje —
  orientačná cena sa vtedy ukazuje vedľa, menšia a sivá. Presne appkové
  pravidlo z mockupu „Dôveryhodne teplá" (8.8.2026): skutočná ponuka je
  dôležitejšia než želanie predávajúceho.
- **`src/lib/catalog.ts`** — nová `attachOfferStats()`, port appkového
  `attachOfferStats` z `use-properties.ts`: jeden dotaz na `property_offer`
  pre celú stránku výsledkov (nie N+1 na kartu), najvyššia SUMA a počet
  ŽIVÝCH ponúk sa počítajú v pamäti, platnosť PENDING ponuky sa overuje
  ŽIVO cez `isOfferExpired` (nie len podľa `status` — cron
  `expire_offers()` beží len raz za pár minút).
- **`src/lib/property.ts`** — `Property` typ má nové nepovinné polia
  `top_offer`/`top_offer_valid_until`/`offer_count` (rovnaký vzor ako
  appkový `property.ts`).
- **`src/components/property-card.tsx`** — karta teraz renderuje
  headline (Najvyššia ponuka/Orientačná cena, akcent vs. primárna farba),
  `asideLines` (druhé, menšie číslo vedľa), počet ponúk a — keď je
  ponuka aktívna a má platnosť — živý odpočet (`OfferCountdownPill`, už
  existujúci appkový port, len doteraz nepoužitý na karte).

Rozsah zámerne LEN karta v katalógu (`karta` je slovo, ktoré Rastio
použil trikrát) — obrazovka detailu inzerátu (`/inzerat/[id]`) cenu
zatiaľ nemenila a môže potrebovať rovnaké zjednotenie, ale to nebolo
súčasťou tohto hlásenia.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `journalctl` bez chýb.
`curl` na živý `https://app.offerra.sk/` (DE, cez `?` bez filtra, 48
kariet): **48/48 kariet ukazuje headline s cenou**, z toho karty
s ponukami zobrazujú „Höchstes Angebot" (akcentová farba) + menší sivý
„Richtwert" vedľa (keď orientačná cena existuje) — príklad z výstupu:
„Höchstes Angebot 150 000 €" + živý odpočet „Angebot noch 9h 31m 23s
gültig" + vedľa „Richtwert 152 000 €". Karty bez ponúk ukazujú
„Richtpreis" v primárnej (navy) farbe. Toto je dôkaz zo SKUTOČNÝCH DÁT
z produkčnej DB (rozdiel medzi kartami dokazuje, že `attachOfferStats`
naozaj našiel a zoradil reálne ponuky), nie len že sa kód skompiloval.

### 3. Chýbajúce vyhľadávanie

„V katalógu sú len filtre... ale žiadne vyhľadávacie pole."

Vyhľadávacie pole (`SearchBox`) aj jeho logika (`stemQuery`/`stemSk`/
`parseQuery` v `src/lib/search.ts`) už na webe BOLI — 1:1 port appkového
`src/lib/search.ts`, overené v predošlom kroku tejto session priamym
porovnaním appka vs. web súbor (identické, len komentár navyše). Problém
teda nebol v logike, ale v tom, že pole sedelo v úzkom `lg:w-64` bočnom
stĺpci filtrov bez ikony — dalo sa prehliadnuť.

Oprava:
- `SearchBox` presunutý z `CatalogFilters` (bočný stĺpec) na CELÚ ŠÍRKU
  stránky, nad riadok s filtrami a výsledkami (`src/app/[locale]/page.tsx`).
- Pridaná ikona lupy do poľa (`src/components/search-box.tsx`) — predtým
  to bol obyčajný text input bez vizuálneho signálu, že ide o
  vyhľadávanie.

**✅ OVERENÉ RUNTIME:** build čistý, reštart, `journalctl` bez chýb.
`curl` na živý web:
- pole je teraz nad dvojstĺpcovým rozložením (potvrdené v HTML —
  `<div class="relative w-full">` s SVG lupou pred `<input>`, mimo
  bočného stĺpca filtrov).
- `?q=bratislava` aj `?q=bratislave` (skloňovaný tvar bez diakritiky)
  vrátili ROVNAKÝCH **5 kariet** — diakritika aj skloňovanie fungujú
  zhodne ako appka.
- `?q=byt` vrátil 20 kariet (z 48 celkovo) — fulltextové hľadanie funguje.
- `?q=petrzalke` vrátilo 0 — overené, že to NIE JE regresia: v seed dátach
  jednoducho nie je inzerát s mestom/okresom Petržalka (nie chyba
  vyhľadávania, chýbajúce dáta).

## Zhrnutie pre Rastia

Všetky tri nahlásené veci sú opravené a overené priamo na živom
`app.offerra.sk` (nie len lokálnym buildom) — dôkazy vyššie sú z `curl`u
na skutočný vrátený HTML a zo skutočných dát v produkčnej DB, nie
z čítania kódu.

**🟡 KÓD HOTOVÝ, ČAKÁ VIZUÁLNE OVERENIE** — `curl` dokazuje, ČO je
v HTML a AKÉ dáta/triedy sa poslali, nie ako to vyzerá na obrazovke.
Prosím pozri sa na `app.offerra.sk` a over/opíš:
1. **E-mail v pätičke aj v hlavičke** — vidíš teraz čitateľné
   `kontakt@offerra.sk` (nie „[email protected]")? Funguje kliknutie
   (otvorí sa e-mailový klient)?
2. **Karty v katalógu** — vidíš pri inzerátoch s ponukou „Najvyššia
   ponuka X €" väčšie/akcentovou farbou a menšiu sivú orientačnú cenu
   vedľa nej? Vyzerá odpočet platnosti ponuky (pilulka) dobre, neláme
   sa karta?
3. **Vyhľadávanie** — je pole na prvý pohľad vidieť ako vyhľadávanie
   (ikona lupy, na celú šírku nad filtrami)? Funguje na telefóne aj na
   šírokej obrazovke?
