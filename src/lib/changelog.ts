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
    version: '1.0.0',
    date: '7. augusta 2026',
    title: 'Nahlasovanie a verzný riadok',
    items: [
      'Nevhodný inzerát, používateľa alebo ponuku môžeš nahlásiť — tlačidlom priamo tam, kde ich vidíš.',
      'Nahlásenie appka nikoho automaticky nezmaže; ide na posúdenie.',
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
