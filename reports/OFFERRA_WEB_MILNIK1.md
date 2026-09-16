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

**Apple Sign In na webe chýba** — vyžaduje Services ID naviazané na
konkrétnu doménu, dáva zmysel doplniť až s trvalou doménou.

**Čo je overené naozaj bežiacim serverom:** odhlásený stav hlavičky
(„Prihlásiť sa", nie e-mail), `/moje-inzeraty` bez prihlásenia vrátilo
presne `307 → /login?next=/moje-inzeraty`, katalóg aj detail
nezregresovali.

**Čo NEVIEM overiť sám:** samotný Google prihlasovací kolotoč (kliknutie
→ Google súhlas → návrat s session) — nemám prehliadač. Navyše na to,
aby to reálne prešlo, treba, aby si **pridal web redirect URL do
zoznamu povolených v Supabase Auth nastaveniach** — skúsil som to
urobiť sám cez Management API token, ktorý mám (rovnaký, čo sa používa
na DB zmeny), ale na túto časť nemá prístup (`401 Unauthorized`).
Skús to vyskúšať cez dočasný odkaz vyššie (tlačidlo „Prihlásiť sa cez
Google") — ak to zlyhá s chybou o redirect URL, presne to je dôvod, a
treba pridať `https://<aktuálna trycloudflare.com adresa>/**` (alebo
neskôr `https://app.offerra.sk/**`) v Supabase Dashboard →
Authentication → URL Configuration → Redirect URLs.

## Čo ešte chýba

- **Cloudflare API token** (popísané v `OFFERRA_WEB_DOMENA.md`) — na
  založenie TRVALEJ zóny `app.offerra.sk` a pomenovaného tunela. Do
  tej doby appku vidno cez dočasný odkaz vyššie.
- **Moje ponuky / Moje dopyty / Nastavenia** — rovnaký vzor ako „Moje
  inzeráty", ešte nespravené.
- **Otvorené rozhodnutie — i18n/EN/DE:** appka podporuje SK/EN/DE, web
  zatiaľ renderuje LEN SK (JSON slovník je prenesený, chýba len
  prepínanie a URL štruktúra pre viac jazykov — napr. `/en/...` vs.
  query param vs. Accept-Language, ovplyvňuje to SEO/hreflang). Keďže
  `offerra.sk` cieli primárne na slovenský trh, navrhujem toto vyriešiť
  AŽ PO tom, čo SK verzia reálne beží verejne — nie je to blokujúce pre
  míľnik 1.

## Ďalší krok

Moje ponuky a Moje dopyty (rovnaký vzor ako Moje inzeráty). Skús prosím
medzitým kliknúť „Prihlásiť sa cez Google" na dočasnom odkaze — potrebné
je to na overenie CELÉHO prihlasovacieho toku, nie len kódu, a sám to
overiť neviem.
