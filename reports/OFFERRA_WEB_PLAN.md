# Offerra Web — plán postupu (NEIMPLEMENTOVANÉ, čaká na OK)

Tento report odpovedá na tvojich 5 bodov. Nič z toho nie je implementované —
presne ako si žiadal, len prieskum a návrh. `/root/offerra` (mobilná appka)
som sa nedotkol, len čítal.

**Skôr než čokoľvek: dve veci, ktoré potrebujem od teba, lebo si ich
nemôžem domyslieť ani vygúgliť:**

1. **Presný názov domény na Websupporte.** V mobilnej appke aj v
   `offerra_web` (ten repo s Privacy/Terms) som žiadnu doménu nenašiel —
   `offerra_web` beží len na `rastioeu.github.io/offerra_web/`, bez
   vlastnej domény napojenej. Bez presného mena ti neviem napísať
   konkrétny DNS záznam (bod 4).
2. **Ktorý spôsob HTTPS chceš** — vysvetlenie a tri možnosti nižšie
   (bod 3), lebo priamy A-záznam + Let's Encrypt naráža na jednu vec na
   serveri, ktorú by som bez tvojho OK nemenil.

---

## 3. Čo beží na Hetzneri teraz (zisťoval som priamo na serveri)

Tento stroj (`142.132.187.27`, hostname `famiglia-dev-2`) **je** ten istý
Hetzner server, na ktorom teraz sedím — nie je treba sa naň pripájať
zvlášť.

### Bežiace služby

| Port | Čo | Ako spravované |
|---|---|---|
| 80 | nginx — reverse proxy pre Famiglia Python API (`/api/face/`, `/api/nsfw/`, `/eleven/face/`) | systemd (`nginx.service`) |
| **443** | **sshd** — SSH beží VÝHRADNE na 443, nie na 22 (`Port 443` v `sshd_config`, žiadny listener na 22) | systemd |
| 8090–8094 | Python mikroslužby Famiglia (face-validator, nsfw-moderator, nsfw-worker...) | systemd, vlastné `.service` súbory |
| 5432 | lokálny PostgreSQL (Famiglia/MUTARK vec, nesúvisí s Offerra — tá má DB v cloude na Supabase) | systemd |
| 20241 (localhost) | `cloudflared` metrics | systemd (`cloudflared.service`) |

**Proces manager na tomto serveri je systemd, nie pm2** — `pm2` tu nie je
ani nainštalovaný. Node/Python služby idú ako `.service` jednotky
(`/etc/systemd/system/*.service`). Pre Next.js by som teda podľa zvyku
urobil `offerra-web.service` (spustí `next start` na internom porte, napr.
`3001` — voľný, nič tam nie je), nie pm2.

**Verejné HTTPS už na tomto serveri jedna doména má — cez Cloudflare
Tunnel, nie cez Let's Encrypt.** `joinfamiglia.com` a `api.joinfamiglia.com`
idú cez `cloudflared` (`/etc/cloudflared/config.yml`) — tunel robí odchádzajúce
spojenie na Cloudflare, tá vybavuje TLS na svojej hrane a dopraví požiadavku
na `localhost` na serveri. Server sám **nemá certbot nainštalovaný** a **nemá
otvorený port 443 pre HTTP(S) provoz** — 443 tu drží SSH (vyššie).

### Problém, ktorý treba vyriešiť pred HTTPS pre Offerra Web

Tvoj plán („A-záznam na Websupporte → nginx + Let's Encrypt na Hetzneri")
narazí presne na toto: **nginx nemôže počúvať na 443, lebo ten port už
drží sshd — a sshd je JEDINÁ cesta, ako sa na tento server dostať cez
SSH** (nie je záložný listener na 22). Trojité možnosti, zoradené od
najbezpečnejšej:

1. **Cloudflare Tunnel (odporúčam)** — presne to isté, čo už beží pre
   `joinfamiglia.com`. Žiadny zásah do SSH, žiadny nový port na
   verejnej strane servera, HTTPS zadarmo a automaticky. Cena: doména
   sa musí presunúť pod Cloudflare DNS (nameservery), nie len jeden
   A-záznam na Websupporte — Websupport ostáva registrátorom, len
   DNS zóna sa presunie. Ak s tým súhlasíš, bod 4 nižšie bude iný
   (nie A-záznam, ale zmena nameserverov + CNAME).
2. **`sslh`/nginx `stream` s `ssl_preread`** — SSH aj HTTPS zdieľajú
   port 443, server rozpozná podľa prvých bajtov spojenia, kam to
   poslať. Umožní presne to, čo si pôvodne chcel (A-záznam priamo na
   Hetzner IP + Let's Encrypt), bez presunu SSH portu — ale je to
   ďalšia bežiaca komponenta a treba to opatrne overiť predtým, než sa
   zavrie existujúce spojenie (aby sa server náhodou nezamkol).
3. **Presunúť SSH na iný port** (napr. 2222) a uvoľniť 443 pre nginx +
   certbot úplne. Najbližšie tvojmu pôvodnému zadaniu, ale je to zásah
   do JEDINEJ cesty prístupu na server — najvyššie riziko, ak sa
   pokazí, a vyžaduje si to zmenu aj v tvojom lokálnom SSH klientovi.

**Odporúčam možnosť 1** — je to už overený, bežiaci vzor na tom istom
serveri, nič sa nemusí riskovať okolo SSH. Ale je to tvoje rozhodnutie,
nie moje — napíš, ktorú z troch chceš.

### Pamäť — druhá vec, čo treba zohľadniť

Server má **3,7 GB RAM celkovo, ~2,7 GB reálne k dispozícii**, 2 CPU, popri
už bežiacich Famiglia službách. Mobilná appka Offerra už raz narazila na
presne tento limit — `expo export` tu padal na `SIGKILL` pri OOM (viď
`CLAUDE.md` a register). `next build` pre stredne veľkú appku vie
ľahko zožrať 1–2 GB — na zdieľanom 3,7 GB stroji vedľa živých produkčných
služieb je to riziko, že buildovanie zhodí buď seba, alebo Famiglia
služby. Navrhujem **buildovať mimo tohto servera** (GitHub Actions CI, alebo
lokálne u teba) a na Hetzner nasadzovať už hotový build (`next build`
output), server len spúšťa `next start`. To je aj bežnejší produkčný
vzor, nielen obchádzka pamäte.

### Ešte jedna vec, čo overiť predtým, než začnem kódiť

V tomto prostredí je `npm install <knižnica>` v mobilnom projekte
blokovaný permission-klasifikátorom (zaznamenané z minula). Neviem ešte,
či to isté platí aj v novom, samostatnom adresári `/root/offerra-web` —
je to nastavenie prostredia, nie kódu. Vyskúšam to hneď na začiatku
implementácie (scaffold Next.js si `npm install` vyžiada nutne) a ak
narazím na rovnaký blok, dám vedieť namiesto tichého zaseknutia.

---

## 1. Plán postupu — v akom poradí

Hlavný dôvod pre Next.js/SSR je SEO — nech Google reálne indexuje
inzeráty. Poradie fáz je podľa toho: **najprv to, čo je verejné a
indexovateľné**, až potom prihlásené a interaktívne veci.

**Fáza 0 — Základ (nič vidieť, ale bez toho nejde nič ďalšie)**
Scaffold Next.js + TypeScript + Tailwind, Supabase klient pre server aj
klient (anon kľúč len v prehliadači, service role len na serveri — ak ho
vôbec budeme potrebovať, RLS by mal stačiť aj s anon kľúčom rovnako ako
v appke), port dizajnových tokenov appky (farby, typografia) do
Tailwind configu, i18n scaffold (SK/EN/DE, rovnaké JSON slovníky ako
appka), základný layout (header, footer, navigácia) prispôsobený
desktopu.

**Fáza 1 — Verejný SEO povrch (najvyššia priorita, toto je dôvod projektu)**
Katalóg nehnuteľností (SSR, filtre, vyhľadávanie s diakritikou/skloňovaním
— rovnaká logika ako appka), detail inzerátu (SSR, základné info +
fotky; interaktívne podtaby môžu byť zatiaľ jednoduché). K tomu `sitemap.xml`,
`robots.txt`, structured data (schema.org `RealEstateListing`) — bez toho
sa SEO cieľ reálne nesplní, aj keby stránka bola SSR. Toto by malo byť
prvý nasaditeľný medzník — dáva zmysel pustiť to von skôr, než bude
appka mať 1:1 paritu so všetkým ostatným.

**Fáza 2 — Prihlásenie a základné prihlásené obrazovky**
Google/Apple prihlásenie cez Supabase Auth (web flow, iný než appkový
`expo-auth-session`), Moje inzeráty / Moje ponuky / Moje dopyty (zobrazenie),
Nastavenia vrátane prepínača jazyka.

**Fáza 3 — Interaktívne podtaby detailu inzerátu**
Ponuky (vrátane živého odpočtu platnosti — presne tá logika, čo sme
minulý týždeň dolaďovali v appke), Správy, Obhliadka, Hypotéka,
Hodnotenia — prenesené pravidlo za pravidlom z appky.

**Fáza 4 — Tvorba obsahu**
Pridanie/úprava inzerátu vrátane uploadu fotiek do `offerra-media` (rovnaký
bucket ako appka — treba overiť, že existujúce RLS politiky fungujú aj
z web klienta, nie len appkového).

**Fáza 5 — Dopyty**
Katalóg dopytov, pridanie dopytu, oslovenie inzerátom.

**Fáza 6 — Admin konzola a zvyšok**
Admin štatistiky a nástroje, nahlasovanie obsahu — parita s appkou.

---

## 2. Odhad rozsahu

Úprimne: toto nie je malý projekt. Rozsah, čo si vymenoval, je vecne
**celá appka ešte raz, v inej technológii** — appka sama vznikala postupne
cez desiatky sedení (register má fázy 0 až 32+). Web pôjde rýchlejšie na
niektorých miestach (netreba riešiť natívne buildy, App Store review,
gestá v `react-native-gesture-handler`...), ale pribúda SSR-špecifická
réžia, ktorú appka vôbec nemá (server-side session, cookie handling,
oddelenie server/client komponentov, iný auth flow).

Nedávam do toho falošne presné číslo dní/hodín — namiesto toho: **Fáza 1
(verejný katalóg + detail, teda presne to, kvôli čomu ideme na SSR)** je
reálne zvládnuteľná fáza sama o sebe a odporúčam ju brať ako prvý
míľnik na nasadenie — appka bude naživo a plniť SEO cieľ, kým sa
zvyšok (fázy 2–6) dopĺňa postupne za chodu, presne ako sme doteraz
postupovali pri appke (malé kroky, OTA/redeploy po kroku, nie jeden
veľký balík na konci). Plná parita so všetkým vymenovaným (fázy 0–6) je
viacnásobok práce Fázy 1.

---

## 4. DNS záznam pre Websupport

**Zatiaľ neviem dať presnú hodnotu — chýba mi názov domény (pozri úvod).**
Konkrétny tvar záznamu navyše závisí od toho, ktorú z troch HTTPS
možností v bode 3 vyberieš:

- **Ak Cloudflare Tunnel (možnosť 1):** nie je to jeden A-záznam na
  Websupporte. Doména sa presunie pod Cloudflare DNS (zmena
  nameserverov u registrátora — to je tá jedna vec, čo urobíš na
  Websupporte), samotný CNAME na tunel (`<tunnel-id>.cfargotunnel.com`)
  potom nastavím ja v Cloudflare, nie na Websupporte.
- **Ak priamy A-záznam (možnosti 2 alebo 3):** `@` (alebo `www`, podľa
  toho, čo bude hlavná doména) → typ `A` → hodnota `142.132.187.27`.
  Presné meno subdomény ti napíšem, keď poviem, akú doménu registruješ.

Akonáhle poviem doménu a vyberieš spôsob HTTPS, doplním tento bod
presne.

---

## 5. Repo a zdieľanie logiky s appkou

**Navrhujem DVA samostatné repozitáre**, nie monorepo:

- `rastioeu/offerra` (mobilná appka) ostáva presne tak, ako je — žiadny
  zásah do jej štruktúry, CI ani EAS nastavení kvôli webu.
- Nový `rastioeu/offerra-web-app` (tvoj návrh mena, súhlasím), úplne
  nezávislý Next.js projekt, vlastné `package.json`, vlastné nasadenie.

**Prečo nie monorepo:** appka má prísny register/OTA/fingerprint režim
(`CLAUDE.md` §9) — jeden omylom pridaný riadok v `package.json` appky raz
už odstrihol produkčný OTA kanál (incident 13.8.2026). Presun appky do
monorepo štruktúry (workspaces, zdieľané root `package.json`) je presne
ten typ zmeny, čo by znova mohla zmeniť fingerprint bez toho, aby si to
niekto všimol. Riziko pre bežiacu appku nie je úmerné výhode.

**Čo sa DÁ zdieľať bez monorepa — a reálne to stojí za to:**
appka už dnes drží väčšinu obchodnej logiky v **čistých moduloch bez
importu z React Native** (presne kvôli testovateľnosti mimo appky —
rovnaký dôvod, prečo existuje napr. `offer-validity.ts`). Pozrel som
`src/lib/*.ts` — takto vyzerá rozdelenie:

| Čisté (bez RN importu, priamo prenositeľné) | Viazané na RN/Expo (netýka sa webu priamo) |
|---|---|
| `offer-validity.ts`, `deadline.ts`, `labels.ts`, `price-display.ts`, `price-history.ts`, `viewing.ts`, `rating.ts`, `messages.ts`, `offers.ts`, `admin.ts`, `tab-badges.ts`, `report.ts`, `errors.ts`, `gallery-gesture.ts`, `draft-resume.ts`, `signin-name.ts`, `phone.ts`, `how-it-works.ts`, `notifications.ts`, `changelog.ts`, `property.ts` (dátový model) | `auth.ts` (expo-auth-session), `supabase.ts` (AsyncStorage), `photo.ts`, `push.ts` |
| plus všetky `src/i18n/locales/*.json` slovníky | |

To je väčšina pravidiel appky — presne to, čo web potrebuje 1:1 rovnaké
(ako počíta odpočet platnosti, ako sa skloňuje „3 dni", pravidlá
hodnotení, dotazník nájomcu...). Namiesto copy-paste (ktorý sa časom
rozíde) navrhujem **malý, verziovaný balík** (`@offerra/core` na GitHub
Packages alebo len git submodule) s TÝMITO čistými modulmi + i18n JSON,
ktorý si appka aj web natiahnu ako závislosť. Netreba ho robiť hneď na
začiatku — pokojne začneme s ručným prenosom (skopírovať tieto súbory
do webu tak, ako sú, s poznámkou odkiaľ pochádzajú) a formalizovať do
balíka až keď sa prvý raz reálne rozíde niečo dôležité. Menej
infraštruktúry vopred, viac istoty, že to bude naozaj treba.

RN komponenty (`property-card.tsx` a pod.) sa preniesť nedajú a ani
netreba — web bude mať vlastnú vrstvu komponentov v Tailwinde, ale nad
tou istou dátovou/business logikou.

---

## Zhrnutie — čo od teba potrebujem, aby som mohol začať

1. **Presný názov domény.**
2. **Ktorý spôsob HTTPS** — Cloudflare Tunnel (odporúčam), sslh na 443,
   alebo presun SSH na iný port.
3. Samotné **„OK build"/„OK začni"** — podľa tvojho pôvodného zadania
   ešte nezačínam kódiť.
