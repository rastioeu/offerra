/**
 * „Ako funguje Offerra" — vysvetlenie princípu appky.
 *
 * STANDING RULE (Rastio 7.8.2026, zapísané aj v CLAUDE.md §8): keď sa
 * zmení AKÁKOĽVEK mechanika appky, tento text sa musí upraviť v TOM
 * ISTOM kroku, nie dodatočne. Text, ktorý klame o tom, ako appka
 * funguje, je horší než žiadny.
 *
 * DVE ÚROVNE (Rastio 9.8.2026):
 *  - `HOW_LEAD` + `HOW_STEPS` — krátka karta na hlavnej obrazovke,
 *  - `HOW_SECTIONS` — PLNÁ verzia na obrazovke „Ako funguje Offerra".
 *
 * Plná verzia je zámerne podrobná: testuje to rodina a nemá objavovať
 * pravidlá pokusom. Skrátiť sa dá neskôr, keď bude jasné, čo je zbytočné.
 */
export type HowStep = { icon: string; title: string; body: string };
export type HowSection = { icon: string; title: string; paragraphs: string[] };

export const HOW_LEAD =
  'Offerra je obrátený trh s nehnuteľnosťami. Predávajúci nemusí povedať cenu — ' +
  'záujemcovia predkladajú vlastné ponuky a všetci vidia, ako to ide.';

/**
 * Plná verzia. Poradie sleduje cestu človeka appkou: čo to je, ako sa
 * ponúka, ako sa stretnete, ako sa to uzavrie, a nakoniec pravidlá.
 */
export const HOW_SECTIONS: HowSection[] = [
  {
    icon: 'house',
    title: 'Obrátený trh — cena je nepovinná',
    paragraphs: [
      'Na bežnom portáli predávajúci určí cenu a kupujúci ju buď prijme, alebo odíde. ' +
        'V Offerre to ide naopak: cenu uvádzať NEMUSÍŠ. Napíšeš, čo ponúkaš, a ľudia ti ' +
        'povedia, koľko sú ochotní dať.',
      'Ak orientačnú cenu uvedieš, je to len vodidlo — ponuky môžu byť vyššie aj nižšie. ' +
        'Keď ju po zverejnení zmeníš, na inzeráte je vidieť o koľko. Cena sa nedá upraviť ticho.',
      'Pri prenájme sú všetky sumy MESAČNÉ, pri predaji celkové.',
      'Zverejniť inzerát sa dá až s názvom, obcou, počtom izieb, výmerou a aspoň jednou ' +
        'fotkou — bez toho sa nikto nevie rozhodnúť, či ho to zaujíma. Cena, kraj a ulica ' +
        'sú dobrovoľné. Pozemok počet izieb pochopiteľne nepotrebuje.',
      'Kraj sa dá vybrať aj skôr než obec — vtedy sa obec hľadá len v ňom. Keď obec vyberieš, ' +
        'kraj sa nastaví podľa nej; obec je vždy tá, ktorá rozhoduje.',
    ],
  },
  {
    icon: 'person.circle',
    title: 'Ponuky sú verejné, ľudia nie',
    paragraphs: [
      'Sumu, prezývku, dátum a stav každej ponuky vidí ktokoľvek — aj neprihlásený. ' +
        'Vďaka tomu vieš, či ideš do dražby, alebo si jediný záujemca.',
      'Kto za prezývkou stojí, sa nedozvie nikto. Meno a telefón sú chránené priamo ' +
        'v databáze — nevydá ich ani technicky, kým nenastane dôvod.',
      'Správa, ktorú k ponuke priložíš, verejná NIE JE. Prečíta ju len predávajúci a ty.',
      'Na jeden inzerát máš jednu živú ponuku. Zvýšenie je úprava tej istej, nie nová — ' +
        'inak by sa zoznam dal zaplaviť.',
      'Pri prenájme sa k ponuke pridáva krátky dotazník (počet osôb, zvieratá, dĺžka nájmu, ' +
        'zamestnanie). Vidí ho LEN majiteľ inzerátu. Počet osôb je povinný.',
    ],
  },
  {
    icon: 'checkmark.seal',
    title: 'Kedy sa odkryje skutočná identita',
    paragraphs: [
      'Keď predávajúci ponuku PRIJME, meno, telefón a e-mail sa odkryjú OBOM stranám naraz. ' +
        'Predtým ich nemá ani jeden z nich.',
      'Odkryje sa len dvojica, ktorej sa to týka. Ostatní záujemcovia sa nedozvedia nič.',
      'Preto sa oplatí meno a telefón vyplniť v Nastaveniach — bez nich sa ti druhá strana ' +
        'po prijatí ponuky nemá ako ozvať.',
    ],
  },
  {
    icon: 'bubble.left.and.bubble.right',
    title: 'Správy — pýtať sa môžeš hneď',
    paragraphs: [
      'V detaile inzerátu je tab „Správy". Napísať sa dá kedykoľvek, aj predtým než podáš ' +
        'ponuku — presne na to je: opýtať sa, čo z inzerátu nevyčítaš.',
      'Rovnaký chat je aj priamo v DETAILE DOPYTU — netreba naň najprv niekoho osloviť svojím ' +
        'inzerátom. Zíde sa, keď si pred oslovením chceš overiť, či presne to, čo ponúkaš, ' +
        'sedí na to, čo niekto hľadá.',
      'Konverzácia je VŽDY len medzi dvoma ľuďmi. Ak má inzerát desať záujemcov, predávajúci ' +
        'má desať samostatných konverzácií a záujemcovia o sebe navzájom nevedia. Nikto tretí ' +
        'cudziu konverzáciu neuvidí — ani technicky. Rovnako to platí aj pri dopyte.',
      'Píše sa POD PREZÝVKOU. Správy samy identitu neodkrývajú; meno a telefón sa odkryjú tak ' +
        'ako doteraz — prijatou ponukou alebo obhliadkou.',
      'Preto sa v správach NEDAJÚ posielať telefónne čísla ani e-maily. Appka to odmietne ' +
        'a povie prečo. Bez toho by sa dalo celé odkrývanie kontaktu obísť jednou správou.',
      'Keď ti niekto napíše, príde ti upozornenie. Obsah správy v ňom nie je — ten je súkromný.',
    ],
  },
  {
    icon: 'key',
    title: 'Obhliadka — vlastník ju potvrdí',
    paragraphs: [
      'Nemusíš čakať na prijatie ponuky. Tlačidlom „Chcem obhliadku" pošleš žiadosť — ' +
        'vlastník ju vidí pod tvojou prezývkou, kontakt ešte NIE JE odkrytý.',
      'Vlastník žiadosť v tabe Obhliadka POTVRDÍ alebo ODMIETNE. Až potvrdením sa meno, ' +
        'telefón a e-mail odkryjú OBOM stranám naraz — rovnaký mechanizmus ako pri prijatí ' +
        'ponuky.',
      'Zrušená alebo odmietnutá žiadosť nie je koniec — tlačidlo sa objaví znova a môžeš ' +
        'požiadať znova. Aby to niekto nezneužil na spamovanie, znova sa dá požiadať až po ' +
        'chvíli čakania.',
      'Appka termíny NENAVRHUJE ani nepotvrdzuje. Kedy a kde sa stretnete, si po odkrytí ' +
        'kontaktu dohodnete telefonicky.',
      'Čo sa stane potvrdením, je napísané NAD tlačidlom, nie až po ňom. A späť sa to vziať ' +
        'nedá — kontakt, ktorý druhá strana videla, sa nezmaže.',
      'Po stretnutí to označ ako „Bol som na obhliadke".',
    ],
  },
  {
    icon: 'clock',
    title: 'Uzávierka ponúk — a čo po nej',
    paragraphs: [
      'Uzávierka je nepovinná. Keď ju k inzerátu zadáš, na karte aj v detaile beží odpočet ' +
        '(„Ponuky do… · ostáva X dní") a po termíne už nikto ponuku nepodá — drží to aj ' +
        'databáza, nie len tlačidlo v appke.',
      'Po uzávierke sa inzerát NEZMAŽE a nezmizne. Dostaneš na ňom otázku, čo s ním: vybrať ' +
        'z ponúk, ktoré prišli, predĺžiť uzávierku o 7 dní, alebo inzerát archivovať. Kým sa ' +
        'nerozhodneš, ostáva v katalógu so štítkom „Príjem ponúk ukončený" — aby ľudia videli, ' +
        'že sa naň už neponúka.',
      'Archivovaný inzerát zmizne z katalógu a nikto naň už neponúkne. Ponuky, ktoré prišli, ' +
        'ostávajú v tvojom prehľade.',
      'Upozornenie na prešlú uzávierku ti appka NEPOŠLE — otázku uvidíš, keď si inzerát ' +
        'otvoríš. Radšej to napíšeme priamo, než by si čakal na oznámenie, ktoré nepríde.',
    ],
  },
  {
    icon: 'checkmark.seal',
    title: 'Uzavretie obchodu',
    paragraphs: [
      'Prijatie ponuky a uzavretie obchodu sú DVE rôzne veci. Prijatie znamená „dohodnime sa", ' +
        'uzavretie znamená „hotovo" — medzi nimi býva papierovačka, ktorá občas padne.',
      'Po prijatí ponuky sa inzerát UZAMKNE: cena, výmera ani podmienky sa už nedajú zmeniť. ' +
        'To, na čom ste sa dohodli, musí ostať také, aké bolo v tej chvíli. Ďalšie fotky ' +
        'pridať môžeš, existujúce zmazať nie — sú dôkazom o stave veci.',
      'Keď obchod uzavrieš, inzerát zmizne z katalógu a všetky ostatné čakajúce ponuky sa ' +
        'uzavrú. Ich autori dostanú oznámenie, že inzerát už má kupca — bez mena a bez sumy ' +
        'víťaza.',
      'Obchod sa dá uzavrieť aj vtedy, keď ste sa dohodli mimo appky.',
    ],
  },
  {
    icon: 'checkmark.seal',
    title: 'Hodnotenia sú verejné',
    paragraphs: [
      'Po uzavretí obchodu sa obe strany môžu navzájom ohodnotiť jednou až piatimi ' +
        'hviezdičkami a pár vetami.',
      'Hodnotenie je CELÉ VEREJNÉ — hviezdičky aj text. Vidno ho pri prezývke a pri inzeráte.',
      'Je to tak zámerne: kto zvažuje obchod s konkrétnym človekom, potrebuje kontext, nie ' +
        'len číslo. „4,6 hviezdičky" nepovie, či druhá strana chodila načas.',
      'Hodnotiť môžu LEN tí dvaja, ktorých sa obchod týkal, a len raz. Neúspešný záujemca ' +
        'hodnotiť nemôže — inak by sa dalo pomstiť za odmietnutie.',
      'Zmeniť svoje hodnotenie sa dá kedykoľvek.',
    ],
  },
  {
    icon: 'envelope',
    title: 'Dopyty — hľadanie naopak',
    paragraphs: [
      'V tabe Dopyty napíšeš, čo hľadáš. Majitelia ťa potom môžu osloviť svojím inzerátom.',
      'Dopyt hovorí rečou HĽADAJÚCEHO: „Kúpim" a „Hľadám prenájom" namiesto „Predaj" ' +
        'a „Prenájom", ktoré sú na inzerátoch. Je to tá istá dvojica, len z druhej strany.',
      'Keď ťa niekto osloví, dostaneš upozornenie a oslovenie nájdeš v detaile svojho dopytu. ' +
        'Ťuknutím sa otvorí inzerát, ktorý ti ponúka — s fotkami, cenou aj počtom izieb, ' +
        'presne ako v katalógu. Odtiaľ si môžeš vypýtať obhliadku úplne rovnako ako pri ' +
        'inzeráte, ktorý si našiel sám.',
      'Oslovenie nie je správa. Je to záznam pri tvojom dopyte a osloviť ťa vie len ten, kto ' +
        'má vlastný zverejnený inzerát. Písať si viete aj SKÔR — priamo v detaile dopytu je ' +
        'ten istý chat ako pri inzeráte, pod prezývkou.',
      'Rozpočet je orientačný, nie záväzok. Tvoje meno ani telefón sa v dopyte nezobrazia — ' +
        'rovnako ako pri ponukách.',
    ],
  },
  {
    icon: 'flag',
    title: 'Nahlasovanie, moderovanie a blokovanie',
    paragraphs: [
      'Nahlásiť sa dá inzerát, ponuka aj používateľ. Dôvody sú: falošný inzerát ' +
        '(nehnuteľnosť neexistuje), podvod (pýta zálohu, nechce obhliadku), spam alebo ' +
        'reklama, nevhodný obsah, podozrenie na realitku, a Iné.',
      'NIČ sa nemaže automaticky. Každé nahlásenie si pozrie človek a rozhodne. Automat by ' +
        'zmazal aj to, čo zmazať nemal.',
      'Ak sa pravidlá porušili, správca môže inzerát skryť z katalógu alebo zmazať. Skrytý ' +
        'inzerát vlastník ďalej vidí, aj s dôvodom.',
      'A DOZVIE SA TO. Keď sa nahlásenie potvrdí, príde ti upozornenie s tým, čo sa stalo ' +
        'a prečo — vrátane dôvodu. Kto ťa nahlásil, sa v ňom nedozvieš; inak by z ' +
        'nahlasovania bol dôvod na odplatu. Upozornenie zároveň hovorí nahlas, že opakované ' +
        'porušenia môžu viesť k zablokovaniu účtu.',
      'Používateľa možno zablokovať. Zablokovaný účet sa nevie prihlásiť ani nič pridať; ' +
        'doterajšie dáta mu ostanú a odblokovaním sa všetko vráti. Nie je to zmazanie.',
      'Offerra je trh MEDZI ĽUĎMI a je určená LEN pre fyzické osoby konajúce vo vlastnom ' +
        'mene — vlastníka, spoluvlastníka, nájomcu alebo záujemcu. Realitné kancelárie, ' +
        'sprostredkovatelia a makléri ju používať NESMÚ, a to ani cez účet vedený na fyzickú ' +
        'osobu. Pri registrácii to každý výslovne potvrdzuje a čas potvrdenia sa uchováva.',
      'Nepravdivé potvrdenie je porušením podmienok a dôvodom na okamžité zablokovanie účtu ' +
        'a zmazanie inzerátov. Ak máš podozrenie, je na to vlastné tlačidlo „Nahlásiť ' +
        'realitku" priamo pri prezývke.',
    ],
  },
  {
    icon: 'house',
    title: 'Limit inzerátov na jeden účet',
    paragraphs: [
      'Jeden účet môže mať naraz zverejnených najviac päť inzerátov.',
      'Je to obrana pred zaplavením katalógu. Kto inzeruje desiatky nehnuteľností, nie je ' +
        'sused, ktorý predáva byt — a presne pre suseda je Offerra postavená.',
      'Rozpracované inzeráty sa do limitu nepočítajú a archivovaním alebo uzavretím obchodu ' +
        'sa miesto uvoľní. Ak limit narazíš, appka ti povie prečo a koľko ich máš.',
    ],
  },
  {
    icon: 'magnifyingglass',
    title: 'Uložené vyhľadávanie a upozornenia na zhodu',
    paragraphs: [
      'Nastavené filtre si uložíš jedným ťuknutím a nabudúce ich vyvoláš z lišty nad katalógom.',
      'Pri každom uloženom hľadaní vidíš číslo — koľko inzerátov mu vyhovuje a pribudlo ' +
        'odvtedy, čo si ho naposledy otvoril. Keď ho otvoríš, číslo sa vynuluje.',
      'Keď pribudne inzerát, ktorý hľadaniu zodpovedá, dostaneš oznámenie.',
      'Uložené hľadanie je SÚKROMNÉ. To, čo hľadáš, nevidí nikto okrem teba. Zmažeš ho ' +
        'podržaním prsta.',
      'Vyhľadávanie rozumie slovenčine bez diakritiky aj skloňovaniu — „Banskej" nájde ' +
        'Banskú Bystricu, „Košiciach" Košice.',
    ],
  },
  {
    icon: 'bell',
    title: 'Upozornenia si nastavuješ ty',
    paragraphs: [
      'Hneď pri registrácii — po zadaní prezývky — sa ťa Offerra spýta, či chceš upozornenia ' +
        'na telefón, a rovno ti ukáže zoznam typov. Nastavíš si to na začiatku, nie tak, že ' +
        'sa ti to jedného dňa začne ozývať a ty budeš hľadať, kde sa to vypína.',
      'Pri každom type si zvolíš, či ho chceš: nová ponuka na tvoj inzerát, prijatie či ' +
        'odmietnutie tvojej ponuky, nový dopyt, ktorý sedí na tvoj inzerát, zhoda ' +
        's uloženým hľadaním, záujem o obhliadku.',
      'Vypnutý typ neposiela nič — ani v appke, ani na telefón.',
      'Systémové a bezpečnostné oznámenia (napríklad zablokovanie účtu) sa vypnúť nedajú. ' +
        'Musia doraziť vždy.',
      'Ten istý zoznam nájdeš kedykoľvek v Nastaveniach a môžeš ho zmeniť. Ak si povolenie ' +
        'na začiatku nedal, appka ťa ním znovu neotravuje — pripomenie sa raz, po tvojej ' +
        'prvej ponuke alebo prvom inzeráte, keď už vieš, načo ti je.',
    ],
  },
  {
    icon: 'checkmark.seal',
    title: 'Overený používateľ',
    paragraphs: [
      'Pri niektorých ľuďoch je odznak OVERENÝ a vedľa neho veta, ČO presne správca overil — ' +
        'napríklad doklad totožnosti a list vlastníctva.',
      'Odznak sa NEDÁ získať automaticky ani si ho nastaviť sám. Udeľuje ho výhradne správca ' +
        'a bez uvedenia dôvodu ho systém neprijme. Odznak, ktorý nevie povedať, na základe ' +
        'čoho vznikol, by bol len ozdoba.',
      'Odznak nič neodkrýva — meno a telefón ostávajú skryté rovnako ako u ostatných.',
    ],
  },
  {
    icon: 'house',
    title: 'Adresa, mapa a súkromie',
    paragraphs: [
      'Inzeráty sa dajú prezerať aj na mape. Pin však stojí na OBCI, nie na dome.',
      'Ulicu môže predávajúci uviesť a appka mu ju našepká z Registra adries Ministerstva ' +
        'vnútra, ale bez čísla domu. Presná adresa sa dohaduje až osobne.',
      'Appka nepristupuje k tvojej polohe. Poloha na mape je poloha obce z verejného číselníka.',
    ],
  },
];

/**
 * Krátka verzia na kartu. ZÁMERNE len štyri body — karta má povedať,
 * o čom appka je, nie ju vysvetliť. Zvyšok je za „Čítať ďalej".
 */
export const HOW_STEPS: HowStep[] = [
  {
    icon: 'house',
    title: 'Cena je nepovinná',
    body:
      'Kto ponúka nehnuteľnosť, môže uviesť orientačnú sumu — alebo nechať pole prázdne ' +
      'a počkať, čo mu ľudia ponúknu.',
  },
  {
    icon: 'person.circle',
    title: 'Ponuky sú verejné, ľudia nie',
    body:
      'Sumu, prezývku aj dátum každej ponuky vidí ktokoľvek. Kto za prezývkou stojí, ' +
      'sa nedozvie nikto — dovtedy.',
  },
  {
    icon: 'checkmark.seal',
    title: 'Kontakt až po dohode',
    body:
      'Keď predávajúci ponuku prijme, meno, telefón a e-mail sa odkryjú OBOM stranám naraz. ' +
      'Alebo si vypýtaj obhliadku — po potvrdení vlastníkom je to to isté.',
  },
  {
    icon: 'bubble.left.and.bubble.right',
    title: 'Písať si viete hneď',
    body:
      'Tab „Správy" v inzeráte — vždy len vy dvaja, pod prezývkou. Telefón ani e-mail ' +
      'sa v správach poslať nedajú; na to je prijatá ponuka alebo obhliadka.',
  },
  {
    icon: 'flag',
    title: 'Len medzi ľuďmi',
    body:
      'Offerra je pre fyzické osoby, nie pre realitky. Inzerát, ponuku aj používateľa ' +
      'sa dá nahlásiť a pozrie sa na to človek.',
  },
];
