# App Store — návrh textov na priame prekopírovanie do App Store Connect

Súvisí s `OFFERRA_REGISTER.md` 33.11 (verejný TestFlight odkaz) a
požiadavkou Rastia 29.9.2026 „poďme to dostať do App Store". Repo
`rastioeu/offerra` je **verejné** — v tomto súbore preto nie je a nikdy
nebude žiadne heslo ani token, len texty pre App Store Connect.

**Build:** existujúci #5 (ten istý, čo je v TestFlighte), verzia `1.3.0`.
Netreba nový `eas build`/`eas submit` — plné review sa dá naviazať na
build, ktorý je tam už teraz.

---

## ⛔ Čo musí urobiť Rastio sám — nedá sa obísť

1. **Screenshoty appky.** V tomto prostredí nie je simulátor ani
   prehliadač — appku nemám ako spustiť a odfotiť, a vymyslený/mockupový
   obrázok nie je dôkaz stavu appky (rovnaká zásada ako CLAUDE.md §1).
   Apple ich vyžaduje ako POVINNÚ súčasť, review sa bez nich neodošle.
   Najjednoduchšie: na iPhone otvor appku z TestFlightu, na obrazovkách
   nižšie použi štandardný screenshot (bočné tlačidlo + hlasitosť hore),
   nahraj priamo v App Store Connect → App Store tab → 6,7" displej
   (povinná veľkosť, ostatné sa dajú z nej odvodiť). Odporúčam 3–6
   obrazoviek: katalóg, detail inzerátu, podanie ponuky, „Ako funguje
   Offerra", Moje inzeráty.
2. **Cena a dostupnosť** (App Store Connect → Pricing and Availability) —
   appka nemá platby, teda zadarmo; krajiny podľa uváženia (SK určite).
3. **Kategória** — podľa rozhodnutia z tejto konverzácie: **Lifestyle**
   (druhotná kategória voliteľná, napr. Utilities alebo Productivity).
4. **App Privacy dotazník** — Apple UI formulár v App Store Connect,
   návrh odpovedí nižšie, ale samotné vyplnenie je len tam.
5. **Vek (Age Rating)** dotazník — appka má obsah vytváraný používateľmi
   (inzeráty, správy, hodnotenia) s nahlasovaním a moderovaním, žiadny
   iný citlivý obsah. Očakávaná odpoveď na otázku „User Generated
   Content": Áno, s moderovaním. Zvyčajný výsledok pre takýto profil je
   **4+** alebo **12+** podľa toho, ako Apple vyhodnotí kombináciu —
   nechaj appku prejsť dotazníkom, neuhaduj to vopred.
6. **Finálne „Submit for Review"** tlačidlo — účet je Rastiov.

---

## Názov a podnadpis

- **Názov appky:** `Offerra` (bez zmeny)
- **Podnadpis (Subtitle, max 30 znakov):**
  `Obrátený trh s nehnuteľnosťami` (presne 30 znakov)

## Promo text (Promotional Text, max 170 znakov — dá sa meniť kedykoľvek bez nového review)

```
Predávajúci nemusí uviesť cenu — ty ponúkneš svoju. Ponuky sú verejné pod prezývkou, kontakt sa odkryje až po dohode. Bez realitiek, len medzi ľuďmi.
```

## Popis (Description, max 4000 znakov)

```
Offerra je obrátený trh s nehnuteľnosťami. Predávajúci nemusí uviesť cenu — záujemcovia predkladajú vlastné ponuky a každý vidí, ako sa vyvíjajú.

AKO TO FUNGUJE

• Cena je nepovinná — kto predáva alebo prenajíma, môže uviesť orientačnú sumu, alebo nechať pole prázdne a počkať, čo ľudia ponúknu.

• Ponuky sú verejné, ľudia nie — sumu, prezývku aj dátum každej ponuky vidí ktokoľvek. Kto za prezývkou stojí, sa nedozvie nikto — dovtedy.

• Kontakt až po dohode — keď predávajúci ponuku prijme, meno, telefón a e-mail sa odkryjú obom stranám naraz. To isté platí pri potvrdenej obhliadke.

• Píšte si hneď — pri každom inzeráte je súkromný chat len medzi vami dvomi, pod prezývkou. Telefón ani e-mail sa cezeň poslať nedajú.

• Len medzi ľuďmi — Offerra je pre fyzické osoby, nie pre realitné kancelárie. Inzerát, ponuku aj používateľa môžeš nahlásiť.

ČO V APPKE NÁJDEŠ

– Katalóg inzerátov na predaj aj prenájom, s filtrami a vyhľadávaním v slovenčine
– Podávanie a sledovanie ponúk s časovým odpočtom platnosti
– Žiadosti o obhliadku
– Súkromné správy k inzerátu
– Hypotekárnu kalkulačku pri predaji
– Hodnotenia po uzavretom obchode
– Dopyty — ak nehľadáš konkrétny inzerát, napíš, čo hľadáš, a majitelia ťa môžu osloviť sami

Appka je dostupná v slovenčine, angličtine a nemčine.
```

## Kľúčové slová (Keywords, max 100 znakov spolu, oddelené čiarkou bez medzier)

```
nehnutelnosti,byty,domy,predaj,prenajom,realitka,ponuka,dopyt,byvanie,pozemok,reality
```
(85 znakov — over si presný počet priamo v App Store Connect, ukazuje
počítadlo; netreba opakovať slová už v názve/podnadpise „Offerra"/
„nehnuteľnosti").

## What's New / Čo je nové (prvá verzia, max 4000 znakov)

```
Prvá verzia appky Offerra.
```

---

## App Review Information — poznámky pre recenzenta

**Kontakt:** meno a e-mail vyplň podľa svojich údajov v App Store Connect
(Rastislav Janek, rastioeu@protonmail.com — tak, ako je to aj vo verejnom
`privacy.html`).

**Poznámky pre recenzenta (Notes):**

```
Offerra je realitný trh, kde predávajúci/prenajímateľ nemusí uviesť cenu — záujemcovia predkladajú vlastné ponuky. Prihlásenie je LEN cez Sign in with Apple alebo Google, appka nemá vlastné heslá pre bežných používateľov.

PRÍSTUP PRE RECENZENTA (skryté za gestom, aby ho bežný používateľ nespustil omylom, nie preto, že by appka niečo tajila):
1. Na prihlasovacej obrazovke ťukni 5-krát rýchlo za sebou na logo Offerra hore.
2. Odomkne sa tlačidlo „Prihlásiť sa ako recenzent" — jedno ťuknutie prihlási demo účet bez zadávania hesla.
3. Ak by tlačidlo z akéhokoľvek dôvodu nebolo vidieť, pod ním je aj bežné pole na e-mail/heslo — e-mail sa po odomknutí gestom predvyplní automaticky. Heslo k demo účtu je [DOPLNÍ RASTIO PRIAMO V APP STORE CONNECT — hodnota je v /root/.offerra-secrets, DEMO_PASSWORD; NEPOSIELAŤ do repozitára ani do tohto súboru].

Demo účet má vlastné aktívne aj rozpracované inzeráty, podané ponuky a správy, takže je vidno plnú funkčnosť appky — katalóg, podanie ponuky, žiadosť o obhliadku, chat, hodnotenia.

Appka nepristupuje k polohe zariadenia (mapa ukazuje len obec z verejného číselníka). Push notifikácie sú voliteľné, appka funguje aj bez ich povolenia.
```

⚠️ **Heslo demo účtu (`DEMO_PASSWORD`) je v `/root/.offerra-secrets` —
Rastio ho do poľa v App Store Connect vloží priamo, tento report (aj
celý repozitár `rastioeu/offerra`) je verejný a nesmie ho nikdy
obsahovať.**

---

## App Privacy — návrh odpovedí (Apple formulár v App Store Connect)

Vychádza z toho, čo appka NAOZAJ robí, podľa `privacy.html`
(`rastioeu.github.io/offerra_web/privacy.html`, aktualizované
9.8.2026) — over si to priamo oproti aktuálnemu textu tej stránky,
keby sa medzičasom zmenil.

**Sledovanie naprieč appkami iných vývojárov (Tracking):** NIE — appka
nemá reklamu, analytiku ani sledovacie nástroje tretích strán.

**Zbierané typy údajov a účel (App Functionality, prepojené s
identitou používateľa):**

| Typ údaja | Čo presne | Povinné? |
|---|---|---|
| Contact Info → Email Address | prihlásenie cez Apple/Google | áno |
| Contact Info → Name | meno, priezvisko | nie — odkryje sa len obom stranám po prijatej ponuke/obhliadke |
| Contact Info → Phone Number | telefónne číslo | nie — rovnako |
| User Content → Photos or Videos | fotky inzerátu, profilová fotka | fotka inzerátu áno (min. 1), profilovka nie |
| User Content → Other User Content | text inzerátu, ponuky, správy, hodnotenia, dopyty | áno (obsah appky) |
| Identifiers → Device ID | push token pre notifikácie | nie — len ak používateľ povolí notifikácie |
| Usage Data → Product Interaction | obľúbené, uložené vyhľadávania, počet zobrazení inzerátu | nie |

**NEzbiera sa:** poloha, zdravotné údaje, financie (okrem orientačnej
ceny inzerátu, čo je obsah appky, nie údaj o používateľovi),
prehliadanie webu, kontakty telefónu, údaje na reklamné sledovanie.

**Prezývka** (verejná, viditeľná pri inzerátoch) sa v Apple kategóriách
zvyčajne zaraďuje pod „User Content" alebo „Identifiers → User ID" —
Rastio nech zvolí podľa aktuálneho znenia formulára, obe možnosti sú
obhájiteľné.

---

## Adresy

- **Privacy Policy URL:** `https://rastioeu.github.io/offerra_web/privacy.html`
- **Support URL:** `https://rastioeu.github.io/offerra_web/support.html`
- **Marketing URL (voliteľné):** `https://offerra.sk`

---

## Stav

🟡 **NÁVRH TEXTOV HOTOVÝ, ČAKÁ NA RASTIA.** Nič z tohto som nezapisoval
priamo do App Store Connect — nemám tam prístup. Skopíruj podľa potreby,
priprav screenshoty a prejdi dotazníky (App Privacy, Age Rating) priamo
v ich UI. Keď to odošleš na review, napíš mi — zapíšem stav a čas do
registra.
