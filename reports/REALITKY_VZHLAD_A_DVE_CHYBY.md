# Obrana proti realitkám, prepínač vzhľadu — a dve vážne chyby, ktoré sa pri tom našli

**Dátum:** 8. augusta 2026 · **ide OTA**

---

## Najprv to najhoršie: registrácia bola úplne neprejditeľná

Pri práci na deklarácii fyzickej osoby som otvoril `prezyvka.tsx` a
zistil, že **zaškrtávacie políčko „mám 18+" tam vôbec nie je vykreslené**.

```ts
const [adult, setAdult] = useState(false);   // stav existuje
if (!adult) { setError('Bez potvrdenia veku…'); return; }   // kontrola existuje
// …a políčko, ktorým sa to dá zaškrtnúť, v obrazovke NIE JE
```

`adult` teda ostal navždy `false` a **žiadny nový používateľ nevedel
dokončiť registráciu.** Bolo to už nasadené v OTA.

Zaviedol som to ja v dávke „vek 18+". Prečo to neodhalili testy: dôkazom
bol test proti databáze, ktorý overil, že sa `age_confirmed_at` správne
zapíše. To je pravda — a zároveň to nehovorí nič o tom, či to má
používateľ ako zadať. Je to ten istý zákaz odvodzovania, len obrátený:
**„dá sa to uložiť" nedokazuje „dá sa to vyplniť".**

Oprava nie je len dopísanie JSX. Urobil som z toho zdieľaný komponent
**`CheckRow`** — ručne skladaný `Pressable` + `View` + dva `Text` sa dá
omylom nedopísať, komponent nie. Ten istý komponent teraz nesie obe
potvrdenia.

---

## 1. Vzhľad — appka uviazla v tmavom režime

Mal si pravdu, bol to bug. `useTheme()` čítal výhradne systémovú tému a
manuálny prepínač neexistoval.

Pridal som `ThemeProvider` s voľbou **Svetlý / Tmavý / Podľa telefónu**,
uloženou v telefóne, ako **prvú kartu** v Nastaveniach. Kto sa sem prišiel
dostať z tmavej appky späť, nemá čo hľadať pod tromi kartami upozornení.

### Rozhodnutie, ktoré som spravil sám

**Predvolené je `Svetlý`, nie `Podľa telefónu`.** CLAUDE.md §5 hovorí, že
Offerra je light-first a schválená paleta je svetlá. Keby bolo predvolené
„podľa telefónu", väčšine ľudí s tmavým telefónom by sa appka ukázala
v podobe, ktorú nikto neschvaľoval — presne to, čo sa stalo tebe. Kto
chce nasledovať telefón, prepne to jedným ťuknutím.

### K tvojej obave, že tmavá je len „obrátená svetlá"

Nie je, a to je doložiteľné z `tokens.ts`:

| | Offerra tmavá | „obrátená" svetlá by bola |
|---|---|---|
| pozadie | `#161311` teplé uhlie | čierna alebo studená šedá |
| karta | `#211D1A` | `#FFFFFF` obrátené na `#000000` |
| akcent | terakota, zosvetlená pre tmavé pozadie | tá istá terakota, nečitateľná |

Je zámerne odlíšená aj od MUTARKu, ktorý má studenú `#0B1020`. Kontrast
bol overený vo Fáze 7.14 — 12 dvojíc × 2 témy, 0 zlyhaní WCAG AA.

**Vizuálne potvrdenie je ale na tebe** — že to má správne kontrasty, viem
dokázať; že to pôsobí ako premyslený tmavý variant, nie.

---

## 2. Prečo si nevidel najnovšie zmeny

Príčinu som našiel a opísal v samostatnom reporte
`reports/FINGERPRINT_A_OTA.md`. V skratke: pridal som `.claude/` do
`.gitignore`, čo **zmenilo EAS fingerprint**, a tým aj `runtimeVersion`
z `451767ea…` na `5b3a2e9c…`. Aktualizácia teda mierila na runtime, ktorý
na tvojom telefóne nie je.

Vrátené, znovu vydané, runtime je späť na `451767ea…` a server ho
klientovi buildu #4 preukázateľne vydáva (HTTP 200 z manifestu).

**Ako si to overíš ty:** Profil → dole je riadok `v… · rt… · <hash>`.
Musí ukazovať `rt451767ea63364f29fedb9f7c117c80fa69dfe1b3`. Ak tam je
`embedded`, appka ešte beží z buildu a OTA nestiahla — force-quit a
otvoriť **dvakrát** (prvé spustenie sťahuje na pozadí, prejaví sa až
druhé).

---

## 3. „Počet zobrazení" — pýtal si sa na správnu vec

Zmeral som to: **v Profile → Moje inzeráty naozaj nebol.** `view_count`
je v modeli od Fázy 1, ale zobrazoval sa výhradne na detaile inzerátu.

Doplnený tam, kam patrí — do riadku každého tvojho inzerátu, spolu
s počtom ponúk:

```
Nitra · 3 fotiek · 47 zobrazení · 2 ponúk
```

**Do hlavného katalógu ho zámerne nedávam.** Cudzieho človeka nezaujíma,
koľkokrát niekto videl inzerát; vlastníka áno. Ak to chceš aj v katalógu,
poviem si o slovo.

---

## 4. Nahlásenie „Realitka/sprostredkovateľ"

Overil som stav skôr, než som písal kód: číselník dôvodov je **spoločný
pre všetky ciele** a cieľ drží samostatný stĺpec. Jeden zápis teda
pokryl inzerát aj používateľa — nemusel som to robiť dvakrát. Overené je
to však zvlášť pre oboje:

```
OK  nahlásenie PROPERTY s dôvodom REALITKA prijaté     HTTP 201
OK  nahlásenie USER s dôvodom REALITKA prijaté         HTTP 201
OK  vymyslený dôvod DB odmietne                        23514
OK  admin obe nahlásenia nájde filtrom na dôvod        2 riadky
```

V admin konzole je nad zoznamom **rad chipov s počtami** — „Realitka (3)"
oddelíš jedným ťuknutím. Filtruje sa na klientovi; 200 riadkov nestojí za
ďalší dotaz na server.

---

## 5. Deklarácia „konám vo vlastnom mene"

**Kde:** pri registrácii, nie pri prvom inzeráte. Pýtal si sa, čo je
jednoduchšie — registrácia, lebo tam už rovnaký vzor je (potvrdenie veku)
a pokrýva všetkých, nielen tých, čo raz niečo pridajú.

Ukladá sa čas, nie `true` — pri spore je podstatné KEDY to človek
odklikol.

**Pri tom sa našla druhá chyba:** `my_profile()` nevracala ani
`age_confirmed_at`, hoci typ `MyProfile` ho deklaroval. Appka teda držala
pole, ktoré v dátach nikdy nebolo. Opravené.

Text v Podmienkach používania dostal celú novú sekciu — je v appke aj na
webe (`rastioeu/offerra_web`, commit `22d8e51` **pushnutý**):

> Realitné kancelárie, sprostredkovatelia, makléri a osoby konajúce na
> cudzí účet alebo za odmenu službu používať NESMÚ, a to ani cez účet
> vedený na fyzickú osobu. […] Nepravdivé potvrdenie je porušením týchto
> podmienok a je dôvodom na okamžité zablokovanie účtu.

Doplnil som tam aj zákaz zakladania viacerých účtov na obídenie limitu —
bez toho by bol limit z bodu 6 obíditeľný a podmienky by o tom mlčali.

---

## 6. Limit aktívnych inzerátov — nastaviteľný z konzoly

`offerra.app_config`, default **5**, sekcia **Nastavenia** v admin
konzole. Vynucuje trigger pri zakladaní **aj pri zverejňovaní** — inzerát
sa vie stať aktívnym oboma cestami a strážiť jednu by znamenalo nestrážiť
nič.

Dôkaz je celý o tom, čo si žiadal — že zmena hodnoty má reálny vplyv
**bez nového buildu**:

```
OK  konfigurácia existuje s defaultom 5
OK  bežný používateľ limit VIDÍ (appka ho má povedať, nie len naraziť)
OK  bežný používateľ limit NEZMENÍ                  „Len správca."
OK  ADMIN limit zmení na 2
OK  tretí aktívny inzerát pri limite 2 NEPREJDE
OK  a správa povie PREČO a koľko ich má
      „Naraz môžeš mať zverejnených najviac 2 inzerátov. Máš ich 2.
       Archivuj niektorý starší a skús znova."
OK  po zvýšení limitu na 3 ten istý inzerát PREJDE   ← bez nového buildu
OK  KONCEPT sa do limitu nepočíta
OK  archivovaním sa miesto uvoľní
OK  0 = bez limitu
OK  nečíslo admin nezadá
```

**Rozhodnutia, ktoré som spravil sám:** koncepty sa nepočítajú (rozrobený
inzerát nikoho neruší), `0` znamená bez limitu (potrebuješ vypínač bez
mazania riadku), horná hranica 1000 (aby preklep nespravil z limitu
nezmysel).

---

## 7. Admin heuristiky — stihnuté, nie 🟡

- **Najviac inzerátov** — účty zoradené podľa počtu aktívnych, s e-mailom
  a s tým, či majú deklaráciu.
- **Rovnaký kontakt na viacerých účtoch** — telefón po odstránení
  nečíselných znakov a e-mail **bez `+`-časti** (`jan+offerra1@` a
  `jan+offerra2@` je tá istá schránka; bez tohto by sa najbežnejší trik
  minul).

Obe sú **signály na ručnú kontrolu, nie dôvod na ban** — dve osoby
v jednej domácnosti majú tiež jeden telefón. Je to napísané priamo
v obrazovke, aby to nikto nečítal ako obvinenie.

---

## Chyba, ktorú našlo až upratovanie po teste

`app_config.updated_by` mal cudzí kľúč **bez `on delete`**. Znamenalo to,
že **správca, ktorý raz zmenil nastavenie, by si už nevedel zmazať účet**
— `delete_my_account()` by padlo na 23503. Zmenené na
`on delete set null`: historická stopa nemá držať účet pri živote.

Našlo sa to len preto, že som opravil **tichý catch vo vlastnom
testovacom nástroji**: Supabase Management API vracia chybu ako objekt
s kľúčom `message`, nie nenulovým exit kódom, takže zlyhaný príkaz
vyzeral ako prázdny výsledok. Teraz to spadne nahlas.

---

## Regresný prechod — 282 testov, 0 zlyhaní

Päť zlyhaní počas cesty bolo v MOJICH testoch, nie v appke. Jedno z nich
však odhalilo skutočnú vec, ktorú som nevedel: **RLS nepustí vložiť
inzerát rovno ako `ACTIVE`.** Inzerát vzniká ako koncept a zverejní sa až
úpravou — test to teraz robí tou istou cestou ako appka, čím mimochodom
overuje trigger aj na UPDATE.

---

## Čo stále čaká na teba

**GitHub Pages.** Skúsil som všetky tri tokeny, ktoré mám. GitHub sám
hovorí, čo im chýba:

```
POST /repos/rastioeu/offerra_web/pages → 403
x-accepted-github-permissions: pages=write, administration=write
```

Tvoje tokeny majú `metadata=read`. Rozdelenie, ktoré teraz platí:
`GITHUB_TOKEN` pushuje do `offerra`, `PAGES_TOKEN` do `offerra_web` —
ale zapnúť Pages nevie ani jeden.

Najrýchlejšie je jedno kliknutie:
`github.com/rastioeu/offerra_web/settings/pages` → **Source: Deploy from
a branch** → `main` / `/ (root)` → Save.

---

## Čo otestovať na telefóne

- [ ] **Vzhľad:** Nastavenia → prvá karta → prepni Svetlý/Tmavý/Podľa
      telefónu. Musí sa prepnúť okamžite a pamätať po zatvorení appky.
- [ ] **Registrácia:** ak máš ako sa odhlásiť a vyskúšať nový účet —
      musia byť vidieť DVE zaškrtávacie políčka a bez oboch sa nedá ďalej.
- [ ] **Verzia:** Profil → dole musí byť `rt451767ea…`, nie `embedded`.
- [ ] **Počet zobrazení:** Profil → Moje inzeráty → pri každom inzeráte
      „… zobrazení".
- [ ] **Nahlásenie:** ťukni Nahlásiť pri cudzom inzeráte aj pri
      používateľovi — v oboch musí byť dôvod „Realitka/sprostredkovateľ".
- [ ] **Admin:** tab Správa → Nastavenia → zmeň limit na 1, skús
      zverejniť druhý inzerát, musí prísť jasná hláška. Potom vráť na 5.
- [ ] **Admin filter:** tab Správa → Nahlásenia → chip „Realitka".
