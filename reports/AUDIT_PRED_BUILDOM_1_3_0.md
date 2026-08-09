# Tri audity pred buildom 1.3.0

**Dátum:** 9. augusta 2026 · **Výsledok: security ✅ 33/33 · funkčnosť ✅ 39/39 · web ✅ (dve veci som pri tom musel opraviť)**

Všetko meraním cez **reálny anon kľúč a druhý účet** — žiadny admin
endpoint, žiadna service role.

---

# 1. SECURITY AUDIT — ✅ 33/33

## Správa pri ponuke

| Bod | Stav | Dôkaz |
|---|---|---|
| ANON nevidí správu | ✅ | HTTP 401, `42501` |
| Cudzí prihlásený nevidí | ✅ | HTTP 403, `42501` |
| Nedostane ju ani cez `offer_messages()` | ✅ | 0 riadkov |
| Neuhádne ju filtrom `message=ilike.*` | ✅ | odmietnuté |

Ten posledný bod stojí za zmienku: aj keby stĺpec nebolo vidieť, dal by
sa **uhádnuť po písmenách** cez filter. Postgres to zaráža rovnako ako
čítanie.

## Dotazník nájomcu

| Bod | Stav |
|---|---|
| ANON nevidí | ✅ |
| Cudzí prihlásený nevidí | ✅ |
| Vlastník inzerátu vidí (má) | ✅ |
| Autor ponuky vidí (má) | ✅ |

## Kontakt — presne v tých momentoch, nikde skôr

```
PRED prijatím:  vlastník 0 riadkov · záujemca 0 · cudzí 0
                meno/telefón sa nedá vytiahnuť ani z tabuľky profile (403)
PO prijatí:     vlastník vidí telefón záujemcu ✅
                záujemca vidí telefón vlastníka ✅
                cudzí STÁLE 0 riadkov ✅
```

**Obhliadka — druhá cesta k odkrytiu, overená zvlášť:**

```
PRED žiadosťou: žiadna obhliadka neexistuje
PO žiadosti:    záujemca vidí kontakt vlastníka ✅
                cudzí 0 riadkov ✅
                ANON obhliadku ani nevidí (401) ✅
```

## Cudzí koncept (DRAFT)

ANON ani cudzí prihlásený ho **nevidí, neprepíše, nezmaže** — všetky tri
overené, obsah v DB ostal nedotknutý.

## RLS rekurzia

Katalóg prihláseného vracia inzeráty, v odpovedi **žiadne `42P17`**.
A overené aj štrukturálne: **limit inzerátov je trigger, nie politika** —
`0` politík na `property` obsahuje `count(`.

## Storage — a chyba v mojom vlastnom audite

| Bod | Stav |
|---|---|
| Do vlastnej zložky zapíšem | ✅ HTTP 200 |
| Do cudzej **nie** | ✅ `403 new row violates row-level security policy` |
| Cudzí mi súbor nezmaže | ✅ `403 Unauthorized` |
| Podvrhnutý súbor naozaj nevznikol | ✅ |

**Prvý beh auditu tu „prešiel" z nesprávneho dôvodu.** Posielal som
`text/plain`, ktorý bucket odmietne **ešte pred kontrolou oprávnení** —
takže test na izoláciu zložiek v skutočnosti netestoval izoláciu.
Prerobil som ho so skutočným JPEG-om a až teraz odpovede hovoria
`row-level security policy`, nie `invalid_mime_type`. Test, ktorý prejde
omylom, je horší než test, ktorý padne.

## Tajomstvá na klientovi

| Premenná | Stav | Poznámka |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | verejná z princípu |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | dekódované JWT: **`role: anon`**, nie service_role |
| `EXPO_PUBLIC_DEMO_PASSWORD` | 🟡 | **viď nižšie** |

`service_role` sa v `src/` nevyskytuje **ani raz**. ANON si nevytiahne
celý profil hviezdičkou (401).

### 🟡 Jediný nález celého security auditu

**Heslo demo účtu je v balíku appky.** `EXPO_PUBLIC_*` premenné sa
vpekajú do JS bundlu, takže ho vie z appky vytiahnuť ktokoľvek.

To, že v repozitári nie je (CLAUDE.md §4), je splnené — ale „nie je
v repe" sa nerovná „nedá sa získať".

**Prečo to nepovažujem za blokujúce pre TestFlight:** demo účet je
zámerne zdieľané prihlásenie pre Apple review. Je to bežný účet bez
akýchkoľvek práv navyše — podlieha tomu istému RLS ako každý iný, takže
cudzie správy, dotazníky ani kontakty z neho nevidno.

**Odporúčanie do verejného vydania** (nie teraz): po skončení review
heslo zmeniť, alebo demo prihlásenie zapínať len pre review buildy.
Rozhodni ty.

---

# 2. AUDIT FUNKČNOSTI — ✅ 39/39

Prešiel som **celý tok naraz**, tou istou cestou, akou ide appka
(PostgREST + RPC), dvoma reálnymi účtami plus tretím a adminom.

## A. Registrácia a onboarding
- ✅ nový účet **nemá profil** → onboarding sa má zobraziť
- ✅ po uložení prezývky profil **už je** → druhýkrát sa nezobrazí
- ✅ drží obe potvrdenia (18+ aj fyzická osoba)

## B–C. Pridanie inzerátu, všetky polia
- ✅ vzniká ako **koncept**, zverejnenie je samostatný krok
- ✅ kraj, ulica, poschodie 3/5, výťah, mesačné náklady, uzávierka — a v DB to naozaj je
- ✅ prenájom: zábezpeka, dostupné od, min. doba, zariadenie, energie, **internet zvlášť**, zvieratá
- ✅ po zverejnení je verejne v katalógu

## D. Ponuka → prijatie → kontakt
- ✅ dvaja rôzni záujemcovia podajú ponuku
- ✅ ANON vidí obe **so sumou a prezývkou**
- ✅ prijatie odkryje kontakt **obom stranám**, vrátane e-mailu
- ✅ **po prijatí sa inzerát už nedá upraviť** (`42501`)

## E. Uzavretie obchodu
- ✅ druhá ponuka sa **stiahla** (`REJECTED`)
- ✅ jej autor dostal **notifikáciu**
- ✅ **bez mena a bez sumy víťaza** — overené na obsahu správy
- ✅ inzerát `CLOSED` s víťaznou ponukou a konečnou sumou

## F. Hodnotenie
- ✅ vlastník môže hodnotiť víťaza · ✅ **porazený nemôže** (`403`)
- ✅ hodnotenie je **verejné aj s textom** · ✅ priemer sa počíta

## G. Obhliadka
- ✅ žiadosť prejde · ✅ kontakt sa odkryje **hneď** · ✅ vlastník dostal oznámenie · ✅ „Bol som na obhliadke"

## H. Dopyt
- ✅ pridanie · ✅ verejné zobrazenie s prezývkou · ✅ oslovenie vlastným inzerátom

## I. Nahlásenie a admin
- ✅ dôvod **REALITKA** prejde · ✅ admin ho vidí · ✅ vie konať
- ✅ **bežný používateľ cudzie nahlásenia nevidí** · ✅ heuristiky chodia

## 🟡 Čo z tohto auditu overiť NEVIEM

Toto sú tri body z tvojho zoznamu, ktoré sa z môjho miesta zistiť nedajú
a **musíš ich potvrdiť ty na telefóne**:

- **Žiadny crash pri prepínaní tabov 5× za sebou.** Príčina pôvodného
  pádu je opravená a má trvalý test (6/6 reprodukuje starú chybu), ale
  „appka nespadla" je vizuálne pozorovanie.
- **Žiadny orezaný text.** Príčina bola nájdená a odstránená
  (`numberOfLines={1}`), no ako to vyzerá na displeji, dokázať neviem.
- **Onboarding sa zobrazí len raz** — dátovú podmienku mám overenú
  (profil existuje → brána nepustí na onboarding), ale samotný prechod
  obrazovkami je vizuálny.

---

# 3. OFFERRA_WEB — ✅ (po dvoch opravách)

```
index          HTTP 200
privacy.html   HTTP 200
terms.html     HTTP 200
support.html   HTTP 200
```

Appka odkazuje na `https://rastioeu.github.io/offerra_web` — zhoda
overená proti kódu.

## Dve veci, ktoré audit našiel a ktoré som opravil

**1. Web mal verziu z 8. augusta.** Privacy Policy som deň predtým
dopĺňal o push notifikácie, ale zmena sa na web nepushla. Teraz je tam
9. august a obsah sedí.

**2. Odkrytie kontaktu pri OBHLIADKE nebolo v politike vôbec** — ani
lokálne. Politika hovorila len o odkrytí po prijatí ponuky, hoci appka
od 8.8. odkrýva kontakt aj pri žiadosti o obhliadku. To je presne ten
bod, na ktorý si sa pýtal, a bola to skutočná diera.

Teraz text hovorí o **oboch** prípadoch a o tom, že pri obhliadke je
človek vopred výslovne informovaný. Doplnené aj to, že **hodnotenia sú
verejné vrátane textu**.

## Pokrytie Privacy Policy

| Požiadavka | Stav |
|---|---|
| spracúvané dáta | ✅ vrátane push tokenu a hodnotení |
| spracovatelia Supabase / Expo / Apple / Google | ✅ všetci štyria |
| kde sú uložené | ✅ `eu-north-1`, neopúšťajú EÚ |
| doba uchovávania | ✅ |
| práva dotknutej osoby + dozorný úrad | ✅ |
| **odkrytie kontaktu po akceptácii aj obhliadke** | ✅ **doplnené dnes** |

## Pokrytie Terms

✅ len fyzické osoby · ✅ zákaz realitiek a sprostredkovateľov ·
✅ doslovná deklarácia „Konám vo vlastnom mene" · ✅ dôsledky
(zablokovanie účtu) · ✅ limit inzerátov

## Kontakt

`rastioeu@protonmail.com` na stránke podpory. **Funkčnosť schránky
overiť neviem** — e-mail som naň neposielal.

---

# Telefón — nová požiadavka, vyriešená v tejto dávke

## Povinný — ✅ 18/18

Onboarding bez telefónu nepustí ďalej. Meno ostalo nepovinné, ako si
pripustil.

Kontrola je **zámerne mierna** — aspoň deväť číslic. Prijme slovenské
s predvoľbou aj bez, so zátvorkami, aj zahraničné (CZ, AT). Prísny formát
by odmietol legitímne čísla a **číslo, ktoré appka odmietne, je horšie
než číslo v inom tvare**.

## Overenie SMS kódom — 🔴 ODLOŽENÉ, a tu je dôvod

Zistil som stav priamo v projekte, nie z dokumentácie:

```
external_phone_enabled   = False
sms_provider             = twilio
sms_twilio_account_sid   = None      ← žiadne kredenciály
sms_twilio_auth_token    = None
sms_vonage_api_key       = None
sms_textlocal_api_key    = None
```

**Appková časť by veľká nebola.** Supabase vie pridať telefón
k existujúcemu Apple/Google účtu cez `updateUser({ phone })` +
`verifyOtp({ type: 'phone_change' })` — auth flow sa teda prestavovať
nemusí. Odhad: **2–3 hodiny** (obrazovka s kódom, opätovné odoslanie,
ošetrenie chýb, stĺpec `phone_verified_at`).

**Blokátor je mimo appky:** SMS sa nemá čím poslať. Potrebný je účet
u Twilia (alebo Vonage/MessageBird/Textlocal), zaplatené telefónne číslo
a **platba za každú SMS** — pri Twiliu je to rádovo 5–9 centov za správu
na Slovensko.

To je **externá platená služba a tvoje rozhodnutie**, nie technická
prekážka, ktorú viem obísť. Preto podľa tvojho pokynu odkladám.

**Odznak „✓ overený telefón" som ZÁMERNE NEPRIDAL.** Overenie nie je
hotové, takže odznak by tvrdil nepravdu — a to je presne to, čomu sme sa
pri odznaku „overený používateľ" vyhli. Test to aj stráži.

Ak to budeš chcieť, potrebujem od teba Twilio Account SID, Auth Token
a odosielacie číslo.

---

# Zhrnutie

| Audit | Stav |
|---|---|
| **1. Security** | ✅ **33/33** · jediný nález je 🟡 demo heslo v balíku, nie je blokujúce pre TestFlight |
| **2. Funkčnosť** | ✅ **39/39** · tri body sú 🟡, lebo sú vizuálne a musíš ich potvrdiť ty |
| **3. offerra_web** | ✅ · dve diery som pri audite našiel a opravil |

**Z môjho pohľadu je 1.3.0 pripravená na build.** Blokujúci nález žiadny.

Než dáš „OK build", odporúčam, aby si na existujúcej OTA potvrdil tie tri
vizuálne body — prepínanie tabov, neorezaný text a onboarding raz. Sú to
jediné veci, ktoré som nevedel odmerať, a stálo by za to nezistiť ich až
po odoslaní.
