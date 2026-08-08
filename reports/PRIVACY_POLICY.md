# Privacy Policy a Podmienky — hotové, čaká na jedno kliknutie

**Dátum:** 8. augusta 2026 · **ide OTA** (obrazovky v appke)
**Stav:** 🟡 texty hotové a overené, **GitHub Pages musíš zapnúť ty**

---

## Prečo to blokovalo Apple review

App Store Connect vyžaduje **verejnú URL** na ochranu osobných údajov.
Offerra nemala ani obrazovku v appke, ani web. Bez toho sa appka nedá
odoslať na recenziu.

---

## Ako som to postavil — jeden zdroj, dva výstupy

Texty sú **dáta** v `src/lib/legal.ts`. Z nich sa:

- vykresľuje **obrazovka v appke** (`legal/[doc]`), a
- **generuje HTML** pre web (`scripts/build-legal-html.mjs` → `docs/`).

Neurobil som dva ručne písané dokumenty schválne. O mesiac by si
odporovali — a **dokument o súkromí, ktorý klame, je horší než žiadny**.
Keď sa niečo v appke zmení, upraví sa jeden súbor a `node
scripts/build-legal-html.mjs` prepíše web.

Je to tá istá lekcia ako pri poslednej dvojici chýb: to isté rozhodnutie
nemá byť na dvoch miestach.

---

## Čo v texte je — overené proti kódu, nie opísané zo šablóny

Prešiel som schému `offerra` aj kód, aby text hovoril pravdu:

| Tvrdenie v dokumente | Kde som to overil |
|---|---|
| prezývka je verejná | `offer_select_public` RLS, karta v katalógu |
| meno a telefón sú neverejné a odkryjú sa len stranám prijatej ponuky | stĺpcové granty na `profile` + `offer_contact()` |
| dotazník nájomcu vidí len majiteľ | RLS na `tenant_profile` |
| appka nemá reklamu ani analytiku | žiadna taká závislosť v `package.json` |
| appka nepristupuje k polohe | `expo-location` v projekte nie je; mapa berie súradnice OBCE z číselníka |
| appka neposiela push | `expo-notifications` v projekte nie je |
| účet sa dá zmazať v appke | Nastavenia → Zmazať účet |
| údaje neopúšťajú EÚ | Supabase región **eu-north-1** (Štokholm) — zistené cez Management API, nie odhadnuté |

Podmienky používania hovoria aj vec, ktorá je právne dôležitá a v appke
inak nikde nezaznela: **ponuka podaná v aplikácii je prejav záujmu, nie
právne záväzná ponuka**, a Offerra nie je realitná kancelária ani
účastník obchodu.

---

## ⚠️ Dve veci, ktoré potrebujú teba

### 1. Zapni GitHub Pages — nemám na to oprávnenie

Skúsil som to cez API a token to nepustil:

```
POST /repos/rastioeu/offerra/pages
403  "Resource not accessible by personal access token"
```

Token je fine-grained (`github_pat_…`) a má len `metadata=read`.
Na zapnutie Pages treba oprávnenie **Pages: write**, ktoré mu dať neviem.

**Sprav to takto (30 sekúnd):**

1. `https://github.com/rastioeu/offerra/settings/pages`
2. **Source: Deploy from a branch**
3. **Branch: `main`**, priečinok **`/docs`** → **Save**

Súbory už na GitHube sú. O pár minút budú živé na:

```
https://rastioeu.github.io/offerra/privacy.html   ← do App Store Connect
https://rastioeu.github.io/offerra/terms.html
https://rastioeu.github.io/offerra/
```

Overil som ich lokálne cez HTTP server — všetky tri **HTTP 200**,
správne titulky, žiadny nezatvorený tag. Stránky sú responzívne a majú
tmavý režim podľa nastavenia telefónu.

Potom v App Store Connect: **App Information → Privacy Policy URL** →
vlož odkaz na `privacy.html`.

### 2. Kontaktný e-mail — teraz je tam tvoj osobný

V dokumente je `rastioeu@protonmail.com`, lebo GDPR kontakt vyžaduje
a inú skutočnú adresu na teba nemám. **Bude verejne na webe**, takže
počítaj so spamom.

Ak chceš inú (napr. `ochrana@offerra.sk`, ak tú doménu naozaj máš), je to
zmena **jedného riadku** v `src/lib/legal.ts` a jedno spustenie skriptu —
prepíše sa appka aj web naraz.

---

## Čo otestovať v appke

- [ ] Profil → Nastavenia → **Ochrana osobných údajov** a **Podmienky
      používania** — obe sa majú otvoriť a byť čitateľné.
- [ ] Odkaz „Otvoriť verejnú verziu v prehliadači" — po zapnutí Pages
      musí otvoriť rovnaký text na webe.
