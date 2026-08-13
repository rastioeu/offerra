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
    version: '1.3.0',
    date: '13. augusta 2026',
    title: 'Uzávierka späť na karte, jasnejší náznak posúvania tabov',
    items: [
      'Štítok „Ponuky do… · ostáva X dní" bol z niektorých kariet v katalógu nezámerne preč — je späť.',
      'Lišta podtabov v detaile inzerátu teraz jasne ukáže, keď sa dá posunúť ďalej — na okraji je vidieť jemné stmavnutie smerom k pokračovaniu.',
    ],
  },
  {
    version: '1.3.0',
    date: '13. augusta 2026',
    title: 'Chat aj pri dopytoch',
    items: [
      'V detaile dopytu je teraz tab „Správy" — ten istý chat, aký poznáš z inzerátov. Nemusíš najprv niekoho osloviť svojím inzerátom, aby ste si mohli napísať.',
      'Konverzácia je vždy len medzi dvoma ľuďmi, pod prezývkou, a telefón ani e-mail sa v nej poslať nedajú — presne ako pri inzeráte.',
      'Opravené aj upozornenie na novú správu: dovtedy by pri správe k dopytu ťuknutie na oznámenie neviedlo nikam. Teraz otvorí správny dopyt.',
    ],
  },
  {
    version: '1.3.0',
    date: '13. augusta 2026',
    title: 'Podtaby v detaile inzerátu sa dajú posúvať',
    items: [
      'Piatim podtabom (Ponuky, Správy, Obhliadka, Hypotéka, Hodnotenia) bolo na jednom riadku tesno a text sa orezával. Teraz sa lišta dá posunúť prstom — a hneď je vidieť, že pokračuje ďalej.',
    ],
  },
  {
    version: '1.3.0',
    date: '12. augusta 2026',
    title: 'Nahlásenia majú následok — a dozvieš sa o ňom',
    items: [
      'Keď sa nahlásenie na tvoj inzerát potvrdí, príde ti upozornenie s tým, čo sa stalo a prečo. Dovtedy sa mohol inzerát skryť bez toho, aby si vedel, kde je problém.',
      'Ak bol dôvod spam, podvod alebo falošný inzerát, inzerát sa z katalógu skryje. Nezmaže sa — v sekcii Moje ho ďalej vidíš aj s dôvodom.',
      'Kto ťa nahlásil, sa v upozornení nedozvieš. Nahlasovanie nemá byť dôvod na odplatu.',
      'Upozornenie hovorí nahlas aj to, že opakované porušenia môžu viesť k zablokovaniu účtu. Nikoho ale neblokuje appka sama — rozhoduje o tom človek.',
    ],
  },
  {
    version: '1.3.0',
    date: '12. augusta 2026',
    title: 'Správy a odhad hypotéky v detaile inzerátu',
    items: [
      'Pribudol tab „Správy". Napísať sa dá kedykoľvek — aj predtým, než podáš ponuku, keď sa chceš len niečo opýtať.',
      'Konverzácia je vždy len medzi vami dvoma. Ak má tvoj inzerát desať záujemcov, máš desať samostatných konverzácií a navzájom o sebe nevedia.',
      'Píše sa pod prezývkou. Telefón ani e-mail sa v správach poslať nedajú — appka to odmietne a povie prečo. Kontakt sa aj naďalej odkryje až prijatou ponukou alebo obhliadkou.',
      'Keď ti niekto napíše, príde ti upozornenie. Obsah správy v ňom nie je, ten je súkromný. Vypnúť sa dá v Nastaveniach ako každé iné upozornenie.',
      'Odhad hypotéky má vlastný tab a ukazuje sa len pri predaji. Keď predávajúci cenu neuviedol, vie ju dosadiť z najvyššej ponuky.',
    ],
  },
  {
    version: '1.3.0',
    date: '12. augusta 2026',
    title: 'Formulár inzerátu: kraj najprv, jasnejšie príklady',
    items: [
      'Kraj sa teraz vyberá PRED obcou a zúži hľadanie — z 2 930 obcí zrazu hľadáš v pár stovkách. Vyplniť ho nemusíš; keď vyberieš obec, kraj sa doplní sám podľa nej.',
      'Príklady v prázdnych políčkach („napr. 78") sú bledšie a začínajú slovom „napr." — dovtedy vyzerali ako už vyplnená hodnota a ľudia políčko preskočili, hoci bolo prázdne.',
      'Platí to všade, kde sa niečo vypĺňa — inzerát, ponuka aj dopyt.',
    ],
  },
  {
    version: '1.3.0',
    date: '12. augusta 2026',
    title: 'Detail inzerátu má tri podtaby',
    items: [
      'Pod popisom sú teraz tri záložky — Ponuky, Obhliadka a Hodnotenia. Netreba scrollovať cez celú obrazovku, aby si našiel to, čo ťa zaujíma.',
      'Ak inzerát patrí tebe, prijmeš aj odmietneš ponuku rovno tu. Nemusíš kvôli tomu chodiť na inú obrazovku.',
      'Odkrytý kontakt na druhú stranu je na jednom mieste — v tabe „Obhliadka" — či už sa odkryl obhliadkou, alebo prijatou ponukou.',
      'Hodnotenia ukazujú povesť predávajúceho zo VŠETKÝCH jeho obchodov, nie len z tohto inzerátu.',
      'Ak je inzerát tvoj, spodné tlačidlo ťa vezme rovno do úpravy — dovtedy sa k nej z detailu nedalo dostať.',
      'V katalógu sú filtre v poradí, v akom sa používajú: najprv čo hľadáš (predaj, prenájom, typ), až za tým triedenie. Obľúbené sú úplne na konci ako samotné srdiečko.',
    ],
  },
  {
    version: '1.3.0',
    date: '12. augusta 2026',
    title: 'Rozpísaný inzerát sa už nestratí',
    items: [
      'Keď si pri pridávaní inzerátu pridal fotku, zmizlo všetko ostatné — názov, mesto, cena, izby. Toto je opravené: formulár si drží, čo si napísal, nech robíš čokoľvek.',
      'Platí to aj pri odchode z obrazovky a späť, aj po uložení, aj keď pridáš päť fotiek za sebou.',
      'Rovnaká oprava aj v Nastaveniach: rozpísané meno a telefón ti už nezmaže zmena profilovky.',
      'Pri poliach je teraz napísané, ktoré sú povinné — názov, mesto, počet izieb, výmera a aspoň jedna fotka. Cena, kraj a ulica ostávajú dobrovoľné.',
      'Meno a priezvisko sa pri registrácii predvyplní z Apple alebo Google účtu. Prepísať sa dá normálne.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Dopyty konečne fungujú obojsmerne',
    items: [
      'Keď niekto osloví tvoj dopyt svojím inzerátom, dostaneš o tom upozornenie. Predtým sa to stalo potichu a nedozvedel si sa to.',
      'Ťuknutím na oslovenie sa otvorí inzerát, ktorý ti ponúkajú — aj s cenou, izbami a fotkami. Odtiaľ si rovno vypýtaš obhliadku.',
      'V zozname oslovení vidíš, čo ti kto ponúka, nie len holú správu a dátum.',
      'Oslovenie tvojho dopytu sa objaví aj na časovej osi v „Moje".',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Drobnosti, ktoré zdržiavali',
    items: [
      'Pri oslovení dopytu vidíš pri každom svojom inzeráte aj cenu a počet izieb — dovtedy sa nedalo rozumne vybrať, ktorý poslať.',
      'Po odoslaní oslovenia ťa appka vráti do inzerátu, ktorým si oslovil.',
      'Počet izieb je pri zverejnení povinný. Bolo to tak aj predtým, ale dozvedel si sa to až pri pokuse zverejniť — teraz to vidno dopredu.',
      'Ochranu osobných údajov a Podmienky používania si prečítaš už na prihlasovacej obrazovke, nemusíš byť kvôli tomu prihlásený.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Upozornenia si nastavíš hneď na začiatku',
    items: [
      'Pri registrácii — hneď po zadaní prezývky — sa ťa Offerra spýta, či chceš upozornenia na telefón, a najprv ti povie, načo ti to je.',
      'Rovno pod tým je zoznam typov: nová ponuka, prijatá ponuka, obhliadka a ďalšie. Všetko je zapnuté, takže stačí prejsť ďalej — ale čokoľvek si tam môžeš hneď vypnúť.',
      'Nemusíš nič — krok sa dá preskočiť a appka funguje normálne. Upozornenia nájdeš pri zvončeku.',
      'Ten istý zoznam ostáva v Nastaveniach a dá sa kedykoľvek zmeniť.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Klik na upozornenie ťa konečne niekam zoberie',
    items: [
      'Keď klikneš na upozornenie na zamknutej obrazovke, appka otvorí presne to, čoho sa týka — nie tam, kde si ju naposledy nechal.',
      'Vedie ťa tam, kde sa s tým dá niečo spraviť: pri novej ponuke rovno na správu ponúk, pri prijatej ponuke na inzerát, kde máš kontakt.',
      'Funguje to, aj keď bola appka úplne zavretá — klik ju spustí a otvorí správnu obrazovku.',
      'Upozornenie, ktoré príde, kým sa pozeráš do appky, sa už tiež ukáže. Predtým ho telefón potichu zahodil.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Upozornenia chodia aj so zavretou appkou',
    items: [
      'Offerra ti po novom vie poslať upozornenie na telefón — o novej ponuke, o jej prijatí, o záujme o obhliadku aj o inzeráte, ktorý sedí na tvoje uložené hľadanie.',
      'Pýtame si to až vtedy, keď to dáva zmysel — po tvojej prvej ponuke alebo prvom inzeráte, nie hneď pri prvom otvorení.',
      'Zapnúť či vypnúť sa to dá kedykoľvek v Nastaveniach, aj po jednotlivých typoch. Vypnutý typ neposiela nič — ani v appke, ani na telefón.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Zástupcovia správcu',
    items: [
      'V správcovskej konzole vieš urobiť správcom niekoho iného — a rovnako mu práva odobrať. Netreba na to siahať do databázy.',
      'Vlastnú rolu si zmeniť nemôžeš a posledného správcu appka odobrať nedovolí, aby neostala bez neho.',
      'Každá zmena roly sa zapisuje — kto, komu a kedy. Vidia to len správcovia a prepísať sa to nedá.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Telefón je povinný',
    items: [
      'Pri zakladaní účtu je telefón povinný. Appka stojí na tom, že sa dvaja ľudia dohodnú telefonicky — pri obhliadke aj po prijatí ponuky.',
      'Meno ostáva nepovinné a doplniť sa dá kedykoľvek v Nastaveniach.',
      'Telefón sa nikde nezobrazuje — odkryje sa výhradne druhej strane, a to až pri obhliadke alebo po prijatí ponuky.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Počet ponúk na karte a výraznejšie srdiečko',
    items: [
      'Na karte v katalógu vidíš aj počet ponúk — „Pridané 7. augusta · 14 zobrazení · 3 ponuky". Hneď je jasné, či je o inzerát záujem, bez otvárania.',
      'Keď inzerát ponuky nemá, tá časť sa vynechá — „0 ponúk" by pôsobilo sucho a pätka karty to aj tak povie.',
      'Srdiečko je po novom jasne červené a má pod sebou kruh, takže je čitateľné na akejkoľvek fotke — na tmavej aj na svetlej. Predtým na niektorých splývalo.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Vlastné inzeráty na prvý pohľad',
    items: [
      'Tvoje vlastné inzeráty a dopyty sú v zozname označené — nemusíš si pamätať, ktoré sú tvoje. Vidíš to len ty; ostatní pri tvojich veciach nič navyše nevidia.',
      'Na karte v katalógu pribudol počet zobrazení. Ukáže sa až od piatich — „1 zobrazenie" pri inzeráte, ktorý práve otváraš, nehovorí nič.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Hodnotenia sú verejné + podrobné „Ako funguje"',
    items: [
      'Hodnotenia sú teraz celé verejné — hviezdičky aj text. Kto zvažuje obchod s konkrétnym človekom, potrebuje kontext, nie len číslo.',
      'Pri inzeráte vidíš hodnotenia predávajúceho aj s tým, čo o ňom ľudia napísali.',
      '„Ako funguje Offerra" je podrobné — 13 sekcií, ktoré vysvetlia všetko od cien cez obhliadky až po pravidlá. Krátka karta na hlavnej obrazovke ostáva stručná a odkazuje na plnú verziu.',
      'Nová sekcia o nahlasovaní a moderovaní: čo sa stane, keď niečo nahlásiš, aké dôvody existujú, a prečo je appka len pre fyzické osoby.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Ponuky rovno v Moje + prehľadnejšie usporiadanie',
    items: [
      'Ponuky na tvoj inzerát sa teraz rozbalia priamo v „Moje" — aj s tlačidlami Prijať, Odmietnuť a Uzavrieť obchod. Nikam nemusíš chodiť.',
      'Tab „Profil" sa volá „Moje" — je to o tom, čo tu máš, nie o vypĺňaní údajov.',
      'Meno, telefón a e-mail sa presunuli do Nastavení. „Moje" ostáva na prezývku a tvoje veci.',
      'Ozubené koliesko je v hornej lište vedľa zvončeka, takže sa do Nastavení dostaneš z každej obrazovky.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Avatary, časová os ceny a návrat dátumu na kartu',
    items: [
      'Opravené: pri redizajne vypadol z karty dátum pridania. Je späť — „visí tu tri mesiace" hovorí o cene viac než samotná cena.',
      'Ľudia majú namiesto sivého kolieska s písmenom vygenerovaný obrazec. Pri piatich ponukách stálo pod sebou päť rovnakých „P" a nedali sa rozoznať.',
      'V detaile je časová os ceny: kedy sa menila orientačná cena a ako rástli ponuky, na jednej osi.',
      'Počet zobrazení ostáva len v Profile → Moje inzeráty. Cudziemu človeku „0 zobrazení" pri inzeráte, ktorý práve otvára, nehovorí nič.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Logo v tmavom režime, skloňovanie a Obľúbené',
    items: [
      'Opravené: v tmavom režime logo splývalo s pozadím. Má teraz vlastnú svetlú verziu — kontrast stúpol z 1,5:1 na 15:1.',
      'Okolo loga je jemný teplý svit. V tmavom režime vynikne najviac.',
      'Vyhľadávanie rozumie skloňovaniu: „Banskej" nájde Banskú Bystricu, „Košiciach" Košice, „Trnavou" Trnavu.',
      'Opravené: hľadanie viacerých slov naraz („byt Nitra") predtým nenašlo nič — hľadala sa celá fráza vcelku.',
      'Nový filter „♥ Obľúbené" v katalógu — dá sa skombinovať s ostatnými filtrami aj s hľadaním.',
      'V správcovskej konzole sú dlaždice štatistiky klikateľné a vedú rovno do vyfiltrovaného zoznamu.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Ulice ti appka našepká',
    items: [
      'Pri zadávaní inzerátu stačí napísať dve písmená ulice a appka ponúkne názvy z Registra adries Ministerstva vnútra — 31 314 ulíc v 767 obciach.',
      'Funguje aj bez diakritiky: „sanc" nájde Šancovú.',
      'V Bratislave a Košiciach sa ponúkajú ulice celého mesta, nielen mestskej časti — nemusíš vedieť, do ktorej patríš.',
      'Ulica ostáva nepovinná a napísať sa dá aj taká, ktorú register nepozná.',
      'Pri tom sa našlo, že v číselníku chýbalo päť obcí — Bojnice, Dudince, Sklené Teplice, Mužla a Veľké Kapušany. V nich sa doteraz nedal založiť inzerát vôbec. Doplnené.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Overený používateľ',
    items: [
      'Pri inzeráte môže byť odznak OVERENÝ — a vedľa neho veta, čo presne správca overil (napríklad „Doklad totožnosti a list vlastníctva").',
      'Odznak si nedá nastaviť nikto sám a nedá sa získať automaticky. Udeľuje ho len správca a bez uvedenia dôvodu ho databáza neprijme.',
      'Odznak nič neodkrýva — meno a telefón ostávajú skryté rovnako ako doteraz.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'História ceny',
    items: [
      'Ak predávajúci po zverejnení zmenil orientačnú cenu, na inzeráte to je vidieť — napríklad „Znížená z 200 000 € o 20 %".',
      'Zníženie je zelené, zvýšenie oranžové. Vidí to každý, nielen ty.',
      'Záznam robí databáza, nie appka — nedá sa podvrhnúť ani prepísať, ani vlastníkom inzerátu.',
      'Kým je inzerát rozpracovaný, ladenie ceny sa nikam nezapisuje.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Uložené vyhľadávanie',
    items: [
      'Keď si nastavíš filtre, môžeš si hľadanie uložiť jedným ťuknutím — nabudúce ho vyvoláš z lišty nad katalógom.',
      'Pri uloženom hľadaní je číslo: koľko inzerátov mu vyhovuje a pribudlo odvtedy, čo si ho naposledy otvoril.',
      'Uložené hľadanie je súkromné. To, čo hľadáš, nevidí nikto okrem teba.',
      'Zmažeš ho podržaním prsta.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Appka ti odteraz povie, čo sa stalo',
    items: [
      'Po každej akcii — podanie ponuky, srdiečko, nahlásenie, uzavretie obchodu, hodnotenie — vyskočí dole krátke potvrdenie, čo sa práve stalo. Doteraz osem akcií nedávalo po úspechu žiadnu odozvu; srdiečko napríklad len zablikalo.',
      'Potvrdenia sa už neotvárajú ako okno s tlačidlom OK. Okno ostáva len tam, kde treba naozaj potvrdiť nezvratný krok, alebo si prečítať chybu.',
      'Na miestach, kde nebolo jasné, čo sa stane, pribudol krátky vysvetľujúci text — pri zakladaní inzerátu a dopytu, v Nastaveniach a v celej správcovskej konzole.',
    ],
  },
  {
    version: '1.3.0',
    date: '9. augusta 2026',
    title: 'Moje inzeráty po novom + opravené hlavičky',
    items: [
      'Opravené: nadpis a „Zavrieť" sa v nahlasovacom okne prelínali s dynamic islandom, takže sa naň nedalo ani ťuknúť. Rovnaká chyba bola aj vo výbere obce a pri oslovení k dopytu — všetky tri majú teraz jednu spoločnú hlavičku so šípkou späť aj s „Zavrieť".',
      'Profil → Moje inzeráty ukazuje pri každom inzeráte miniatúru, najvyššiu ponuku (alebo cenu), počet ponúk, počet zobrazení, koľko percent z pozretí skončilo ponukou, a odpočet do uzávierky.',
      'Inzeráty, kde na teba čaká ponuka, sú zvýraznené — vidíš na prvý pohľad, kde treba rozhodnúť.',
      'Ťuknutie na zverejnený inzerát ide rovno k ponukám (prijať, odmietnuť, uzavrieť obchod). Upraviť sa dá tlačidlom v hlavičke.',
      'Nové tlačidlo „Nahlásiť realitku" pri prezývke — dôvod je predvyplnený, nemusíš ho hľadať v zozname.',
      'Po prijatí ponuky sa inzerát uzamkne: cena, výmera ani podmienky sa už nedajú zmeniť. Dohoda musí ostať taká, aká bola v tej chvíli. Ďalšie fotky pridať môžeš, existujúce zmazať nie.',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Uzavretie obchodu a hodnotenia',
    items: [
      'Opravené a kritické: katalóg sa prihláseným ľuďom nezobrazoval vôbec — hlásil chybu databázy. Príčina bola v novom pravidle prístupu, ktoré sa zacyklilo samo na seba.',
      'Keď obchod dopadne, v „Ponuky na inzerát" ho uzavrieš jedným tlačidlom. Inzerát zmizne z katalógu a ostatné čakajúce ponuky sa uzavrú — nikto už nečaká nadarmo.',
      'Po uzavretí sa obe strany môžu navzájom ohodnotiť 1 až 5 hviezdičkami.',
      'Hviezdičky vidno pri prezývke v zozname ponúk aj na inzeráte — podľa nich sa dá odhadnúť, s kým máš do činenia.',
      'Text, ktorý k hodnoteniu napíšeš, číta len ten, komu je určený. Verejný nie je zámerne — verejné odkazy na konkrétnych ľudí sa neustrážia.',
      'Obchod sa dá uzavrieť aj vtedy, keď ste sa dohodli mimo appky.',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Vzhľad si vyberáš ty + obrana proti realitkám',
    items: [
      'Opravené a dôležité: kto mal na telefóne zapnutý tmavý režim, dostal tmavú Offerru a nemal sa ako vrátiť. V Nastaveniach je teraz na prvom mieste voľba vzhľadu — Svetlý, Tmavý, Podľa telefónu. Predvolený je svetlý, lebo tak je Offerra navrhnutá.',
      'Opravené a vážne: pri registrácii chýbalo zaškrtávacie políčko potvrdenia veku. Bez neho sa nedalo dokončiť vytvorenie účtu vôbec — nikomu novému.',
      'Nový dôvod nahlásenia: „Realitka/sprostredkovateľ — vydáva sa za fyzickú osobu". Dá sa použiť pri inzeráte aj pri používateľovi.',
      'Pri registrácii potvrdzuješ, že konáš vo vlastnom mene ako fyzická osoba. Offerra je trh medzi ľuďmi, nie pre realitné kancelárie — je to teraz aj v Podmienkach používania.',
      'Jeden účet môže mať naraz zverejnených najviac 5 inzerátov. Ak to nejde, appka povie prečo a koľko ich máš.',
      'V Profile → Moje inzeráty vidíš pri každom inzeráte počet zobrazení a počet ponúk.',
    ],
  },
  {
    version: '1.2.0',
    date: '8. augusta 2026',
    title: 'Súkromie správ, obhliadky a polia navyše',
    items: [
      'Opravené a dôležité: správa priložená k ponuke bola verejná — čítal ju ktokoľvek, kto si otvoril inzerát. Odteraz ju vidí len predávajúci a ten, kto ju napísal. Suma a prezývka ostávajú verejné ako doteraz.',
      'Nové tlačidlo „Chcem obhliadku". Kliknutím sa kontakt odkryje obom stranám naraz a termín si dohodnete telefonicky — appka do toho nevstupuje. Čo sa stane, je napísané nad tlačidlom, nie až po ňom.',
      'Pri byte môžeš uviesť poschodie („3. z 5"), či je v dome výťah, a mesačné náklady ako fond opráv. Pri predaji aj pri prenájme.',
      'Pri prenájme pribudlo samostatné „Internet v cene nájmu" — energie a internet už nie sú jedna otázka.',
      'Na detaile inzerátu je vidieť prezývku toho, kto ho pridal.',
      'Príklad v poli „Správa pre predávajúceho" sa mení podľa toho, či ide o predaj alebo prenájom — hypotéka pri nájme nedávala zmysel.',
      'Počet osôb pri ponuke na prenájom je teraz naozaj povinný. Doteraz sa dal preskočiť.',
      'Opravené: dlhé hodnoty v mriežke (napríklad zábezpeka aj s počtom nájmov) sa už neorezávajú — zalomia sa a zaberú celý riadok.',
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
