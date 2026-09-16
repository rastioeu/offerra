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

## Čo ešte chýba

- **Cloudflare API token** (popísané v `OFFERRA_WEB_DOMENA.md`) — na
  založenie TRVALEJ zóny `app.offerra.sk` a pomenovaného tunela. Do
  tej doby appku vidno cez dočasný odkaz vyššie.
- **Admin konzola** — zatiaľ nespravená.
- **Otvorené rozhodnutie — i18n/EN/DE:** appka podporuje SK/EN/DE, web
  zatiaľ renderuje LEN SK (JSON slovník je prenesený, chýba len
  prepínanie a URL štruktúra pre viac jazykov — napr. `/en/...` vs.
  query param vs. Accept-Language, ovplyvňuje to SEO/hreflang). Keďže
  `offerra.sk` cieli primárne na slovenský trh, navrhujem toto vyriešiť
  AŽ PO tom, čo SK verzia reálne beží verejne — nie je to blokujúce pre
  míľnik 1.

## Ďalší krok

Nastavenia sú hotové. Čakám na tvoje potvrdenie z Supabase Dashboard
(Redirect URLs + Site URL), aby som vedel, že Google prihlásenie
skutočne prešlo, a na Cloudflare token pre trvalý odkaz. Dovtedy môžem
pokračovať na admin konzole.
