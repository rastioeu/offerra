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
- `npx tsc --noEmit` aj `npm run build` prechádzajú čisto.

## Čo ešte chýba

- **Cloudflare API token** (popísané v `OFFERRA_WEB_DOMENA.md`) — na
  založenie zóny `app.offerra.sk` a tunela, aby appka bola vôbec
  verejne dostupná mimo tohto servera. Bez neho appku vieš zatiaľ overiť
  len tak, že mi napíšeš, čo mám opísať — priamy odkaz do prehliadača
  ešte nemáš.
- **Detail inzerátu** (`/inzerat/[id]`) — katalógová karta naň už
  odkazuje, stránka samotná ešte neexistuje (404).
- **Filtre a vyhľadávanie** v katalógu (appka: `search.ts` +
  `use-properties.ts`).
- **Otvorené rozhodnutie — i18n/EN/DE:** appka podporuje SK/EN/DE, web
  zatiaľ renderuje LEN SK (JSON slovník je prenesený, chýba len
  prepínanie a URL štruktúra pre viac jazykov — napr. `/en/...` vs.
  query param vs. Accept-Language, ovplyvňuje to SEO/hreflang). Keďže
  `offerra.sk` cieli primárne na slovenský trh, navrhujem toto vyriešiť
  AŽ PO tom, čo SK verzia reálne beží verejne — nie je to blokujúce pre
  míľnik 1.

## Ďalší krok

Detail inzerátu, potom filtre. GitHub push aj Supabase dáta teraz
fungujú naživo — jediné, čo appku drží mimo prehliadača, je Cloudflare
token.
