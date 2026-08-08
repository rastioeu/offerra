/**
 * „Čo je nové" — changelog pre POUŽÍVATEĽA.
 *
 * Rozdiel oproti `OFFERRA_REGISTER.md`: register je pracovný denník so
 * statusmi a dôkazmi, tento zoznam je pre človeka, ktorý appku používa.
 * Žiadne názvy tabuliek, žiadne HTTP kódy — čo sa zmenilo a čo mu to dá.
 *
 * STANDING RULE (Rastio, 7.8.2026): každý dokončený blok práce = nový
 * záznam TU, nie len v registri. Zapísané aj v `CLAUDE.md` §7, aby to
 * nezáviselo od toho, či si na to niekto spomenie.
 */
export type ChangelogEntry = {
  /** Verzia appky, ktorej sa záznam týka. */
  version: string;
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Ulica sa našepkáva z úradného registra',
    items: [
      'Pri zadávaní inzerátu ti appka po dvoch písmenách sama ponúkne ulicu — zoznam je z Registra adries Ministerstva vnútra, teda ten istý, čo používa štát.',
      'Ponuka sa riadi obcou, ktorú si vybral: v Petržalke ti neponúkne ulice z Košíc.',
      'Ak vyberieš „Bratislava" alebo „Košice" ako celok, ponúknu sa ulice zo všetkých mestských častí naraz.',
      'Ulica ostáva nepovinná a stále sa dá napísať ručne — register nemusí poznať novú ulicu a v mnohých obciach sa ulice nepomenúvajú vôbec.',
      'Doplnené obce, ktoré v appke dosiaľ chýbali a nedal sa v nich založiť inzerát: Bojnice, Dudince, Sklené Teplice, Mužla a Veľké Kapušany.',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Počet fotiek a triedenie „Čoskoro končí"',
    items: [
      'Na karte v katalógu vidíš, koľko má inzerát fotiek — napríklad „1/3". Pri jedinej fotke sa nezobrazuje.',
      'V detaile ti pri listovaní galériou číslo hovorí, koľkú fotku práve pozeráš.',
      'Katalóg sa dá prepnúť na „Čoskoro končí" — hore idú inzeráty, ktorým sa najskôr uzatvárajú ponuky. Tie bez časovača sú na konci.',
      'Keď do konca ponúk ostávajú menej než 3 dni, štítok na fotke sčervenie.',
      'Predvolene je katalóg naďalej zoradený od najnovšieho.',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Oprava pádu pri prepínaní tabov',
    items: [
      'Opravené: appka padala pri ťuknutí na spodné taby. Zvonček si na každej obrazovke otváral vlastné spojenie a druhé v poradí to zhodilo — teraz je jedno na celú appku.',
      'Vedľajší efekt: zvonček zhasne všade naraz, keď si oznámenia prečítaš, a appka si menej pýta dáta zo servera.',
      'Keby sa appka predsa niekedy pokazila, namiesto bielej plochy uvidíš, čo sa stalo — dá sa to odfotiť a poslať.',
      'Opravené: chybové hlášky sú po slovensky a zrozumiteľné. Predtým sa pri niektorých chybách zobrazilo nezmyselné „[object Object]".',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Mapa, podmienky prenájmu a opravená klávesnica',
    items: [
      'Nehnuteľnosti sa dajú prezerať na MAPE — prepínač Zoznam/Mapa je hore vpravo. Na pine je rovno cena.',
      'Mapa má prepínač Mapa/Satelit. Poloha je poloha obce, nie presnej adresy — tá ostáva skrytá.',
      'Opravené: klávesnica už neprekrýva pole, do ktorého píšeš, a dá sa zavrieť — tlačidlom „Hotovo" nad ňou alebo ťuknutím vedľa poľa. Predtým sa pri číselných poliach nedala zavrieť vôbec.',
      'Opravené: pri šípke späť sa už nezobrazuje „(tabs)". Je tam len šípka, ako inde v iOS.',
      'Opravené: hlavička s logom sa už neprelína s ostrovčekom hore na obrazovke.',
      'Inzeráty na prenájom majú nové polia: zábezpeka, dostupné od, minimálna doba nájmu, zariadenie, energie v nájme a či sú povolené zvieratá.',
      'K adrese pribudol kraj (dopĺňa sa sám podľa obce) a nepovinná ulica.',
      'Dopyt už hovorí rečou toho, kto hľadá — „Kúpim" a „Hľadám prenájom" namiesto „Predaj" a „Prenájom", a pri kúpe sa pýta „Ponúkam do".',
      'Karty a riadky v celej appke sú klikateľné celé, nie len text v nich.',
      'Dopyty majú vlastné vyhľadávanie a filtre — rovnaké ovládanie ako pri nehnuteľnostiach, len so slovami hľadajúceho („Kúpim", „Hľadám prenájom").',
      'Dopyt, ktorý berie akýkoľvek typ nehnuteľnosti, sa filtrom nestratí — objaví sa aj keď hľadáš konkrétne byty.',
      'Katalóg vyzerá inak: fotka zaberá väčšinu karty a cena je terakotová, väčšia a v inom písme — nájdeš ju bez čítania.',
      'Keď na inzerát niekto ponúkol, hlavné číslo je NAJVYŠŠIA PONUKA. Orientačná cena predávajúceho je vedľa, menšia.',
      'Detail inzerátu má galériu cez celú šírku s bodkami, parametre v prehľadnej mriežke a tlačidlo Podať ponuku prilepené dole — nezmizne po scrollovaní.',
      'Ponuky sú karty s iniciálou, najvyššia má terakotový rámik a odznak.',
      'Ako majiteľ ťukneš na ponuku a otvorí sa spodný panel so všetkým, čo o nej vieš, aj s Prijať a Odmietnuť.',
      'Podržanie prsta na karte v katalógu ukáže náhľad a rýchle akcie — obľúbené, zdieľanie, nahlásenie. Telefón pri tom jemne zavibruje.',
    ],
  },
  {
    version: '1.1.0',
    date: '7. augusta 2026',
    title: 'Nový vzhľad a vysvetlenie, ako to funguje',
    items: [
      'Offerra dostala teplejší vzhľad — papierové pozadie a terakotové ceny namiesto studenej modro-bielej.',
      'Ceny sú teraz vo vlastnom písme a väčšie, aby si ich našiel na prvý pohľad.',
      'Logo je hore na každej hlavnej obrazovke.',
      'Nová karta „Ako funguje Offerra" na hlavnej obrazovke aj v Nastaveniach — vysvetľuje otvorené ponuky, prezývky aj odkrytie kontaktu.',
      'Tmavý režim dostal teplé uhlie namiesto modrej noci.',
    ],
  },
  {
    version: '1.1.0',
    date: '7. augusta 2026',
    title: 'Zvonček, živé obnovenie a časová os',
    items: [
      'Opravené: obrazovka „Ako ťa máme volať?" už nenaskakuje pri každom otvorení appky.',
      'Zvonček v Nehnuteľnostiach ukazuje, čo je nové — ponuka na tvoj inzerát, prijatie tvojej ponuky, dopyt, ktorý sedí na to, čo ponúkaš.',
      'Keď príde ponuka, zvonček sa rozsvieti sám, bez ťahania dole.',
      'V Profile je časová os — inzeráty, ponuky a dopyty pekne za sebou, ako sa diali.',
      'Vypnutý druh upozornenia sa naozaj nezaloží; nie je len skrytý.',
      'Offerra stále neposiela upozornenia na zamknutú obrazovku — nájdeš ich v appke pod zvončekom.',
      'Táto verzia je nový build: má správnu ikonu a splash.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Nastavenia upozornení',
    items: [
      'V Nastaveniach si vyberáš, o čom chceš vedieť — každý druh upozornenia zvlášť.',
      'Systémové a bezpečnostné upozornenia sa vypnúť nedajú; musia doraziť vždy.',
      'Denný a týždenný súhrn sú zatiaľ označené „čoskoro" — potrebujú serverovú časť, ktorú ešte nemáme.',
      'Offerra zatiaľ žiadne upozornenia neposiela. Toto je predvoľba na potom, a hovorí to o sebe nahlas.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Obľúbené, kalkulačka, zdieľanie a hlbší vzhľad',
    items: [
      'Srdiečko na karte aj v detaile — obľúbené nájdeš v Profile. Vidíš ich len ty.',
      'Pri predaji je v detaile odhad mesačnej splátky. Vieš si pohrať s vlastnými zdrojmi, sadzbou aj dobou splácania.',
      'Inzerát sa dá zdieľať cez systémové zdieľanie, vrátane odkazu priamo naň.',
      'Kým sa načítavajú inzeráty, vidíš ich obrysy namiesto točiaceho sa krúžku.',
      'Tlačidlá sa pri stlačení jemne zatlačia a pri práci ukazujú spinner priamo v sebe.',
      'Karty a panely dostali tieň — appka už nepôsobí plocho.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Nahlasovanie, moderovanie a správa',
    items: [
      'Nevhodný inzerát, ponuku alebo používateľa môžeš nahlásiť priamo tam, kde ich vidíš.',
      'Nahlásenie nikoho automaticky nezmaže — pozrie si ho človek.',
      'Správca vie inzerát skryť z katalógu alebo zmazať, a používateľa zablokovať.',
      'Skrytý inzerát zmizne z ponuky, ale majiteľ ho vidí aj s dôvodom.',
      'Zablokovaný používateľ sa nevie prihlásiť ani nič pridať; jeho doterajšie dáta ostávajú.',
      'Správca dostane upozornenie, keď to isté nahlásia traja rôzni ľudia — alebo hneď, keď niekto nahlási podvod.',
      'V Profile je dole verzný riadok. Podľa neho spoznáš, či ti dorazila najnovšia aktualizácia.',
      'Táto obrazovka — „Čo je nové" — vznikla a je doplnená spätne za všetky fázy.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Vyhľadávanie vetou a čísla na kartách',
    items: [
      'Nad zoznamom je hľadanie, kam sa dá napísať bežná veta: „3-izbový byt v Petržalke do 250 tisíc".',
      'Appka ti ukáže, čomu z vety rozumela — a dá sa to opraviť.',
      'Rýchle filtre: predaj/prenájom a typ nehnuteľnosti.',
      'Na karte je teraz najvyššia ponuka, dokedy sa ponuky prijímajú a počet zobrazení.',
      'Po prijatí ponuky sa okrem mena a telefónu odkryje aj e-mail.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Ponuky, dopyty, profil',
    items: [
      'Ponuky sú verejné — sumu aj prezývku vidí každý, aj neprihlásený.',
      'Kto za prezývkou stojí, sa dozvie až ten, koho ponuku predávajúci prijme. Vtedy sa kontakt odkryje obom stranám.',
      'Pri prenájme vypĺňaš krátky dotazník o sebe. Ten vidí LEN majiteľ, nie verejnosť.',
      'Majiteľ má vlastný pohľad na ponuky s tlačidlami Prijať a Odmietnuť.',
      'Nový tab Dopyty: ľudia, ktorí niečo hľadajú. Môžeš ich osloviť svojím inzerátom.',
      'Profil dostal skutočnú podobu — prezývka, fotka, moje inzeráty, ponuky a dopyty.',
      'Nastavenia sú samostatne, vrátane odhlásenia a zmazania účtu.',
      'Po prvom prihlásení si vyberáš prezývku. Bez nej sa nedá inzerovať ani ponúkať.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Inzeráty a vizuálna identita',
    items: [
      'Offerra dostala vlastnú tvár — kreslené logo a paletu Navy & Azure.',
      'Pridávanie nehnuteľností: fotky, popis, výmera, izby a voliteľná orientačná cena.',
      'Cenu nemusíš uviesť vôbec — vtedy čakáš, čo ti ľudia ponúknu.',
      'Voliteľná uzávierka príjmu ponúk.',
      'Výber obce z 2 925 slovenských obcí vrátane okresov.',
      'Katalóg nehnuteľností s kartami a detail s galériou.',
    ],
  },
  {
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Prvé spustenie',
    items: [
      'Offerra beží a je v TestFlighte.',
      'Prihlásenie cez Apple alebo Google — aby za inzerátom stál overený človek.',
      'Základná kostra: Nehnuteľnosti, Dopyty, Pridať, Profil.',
    ],
  },
];
