# Offerra Web — Fáza 1 (verejný katalóg + detail), priebežný stav

Nadväzuje na `OFFERRA_WEB_PLAN.md` a `OFFERRA_WEB_DOMENA.md`. Kód žije
v novom, samostatnom adresári `/root/offerra-web` (zatiaľ len lokálny git,
pozri „Čo chýba" nižšie) — appka `/root/offerra` sa nemenila.

## Čo je hotové — 🟡 KÓD HOTOVÝ, NIE JE ČO VIZUÁLNE OVEROVAŤ (ešte žiadna
obrazovka)

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
- `npx tsc --noEmit` aj `npm run build` prechádzajú čisto.

## Čo chýba, aby appka niekam smerovala

- **Nový GitHub repozitár `rastioeu/offerra-web-app` sa NEDÁ založiť môjmu
  tokenu** — `GITHUB_TOKEN` v `.offerra-secrets` je (správne, podľa
  tvojho vlastného pravidla „vlastný token na projekt") obmedzený len na
  existujúci repozitár `offerra`, nemá právo zakladať nové repozitáre
  (GitHub vrátil `403 Resource not accessible by personal access
  token`). Kód je zatiaľ len lokálny git commit na serveri, nikde
  nepublikovaný.
  **Potrebujem buď:** založ prázdny `rastioeu/offerra-web-app` repozitár
  ty a ja doň pushnem, ALEBO mi daj nový token s právom `Contents: Write`
  + „Administration: Write" (na založenie repa) scoped buď na celý účet,
  alebo (menej pohodlné, ale bezpečnejšie) založ repo ty a token nechaj
  ako je.
- **Cloudflare API token** (popísané v `OFFERRA_WEB_DOMENA.md`) — na
  založenie zóny `app.offerra.sk` a tunela, aby appka bola vôbec
  verejne dostupná.
- Skutočné obrazovky (katalóg, detail) — zatiaľ je tam len defaultná
  Next.js úvodná stránka zo scaffoldu, nič appke vlastné.

## Ďalší krok

Pokračujem na dizajnových tokenoch (port palety/typografie appky do
Tailwindu) a i18n scaffolde, potom katalóg. GitHub/Cloudflare prístupy
nie sú blokujúce pre túto prácu — appku viem stavať a testovať lokálne
na serveri (`npm run dev`/`npm run build`) bez nich.
