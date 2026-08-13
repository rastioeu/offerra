/**
 * Právne texty — JEDEN zdroj pravdy pre appku aj pre web.
 *
 * App Store Connect vyžaduje **verejnú URL** na ochranu osobných údajov,
 * appka zároveň potrebuje ten istý text offline. Keby to boli dva
 * dokumenty, o mesiac by si odporovali — preto sú tu ako dáta a HTML pre
 * GitHub Pages sa z nich GENERUJE (`scripts/build-legal-html.mjs`).
 *
 * Text opisuje, čo appka SKUTOČNE robí. Overené proti schéme `offerra`
 * a proti kódu, nie opísané zo šablóny:
 *  - prezývka je verejná, meno a telefón nie a odkryjú sa len stranám
 *    prijatej ponuky (stĺpcové granty + `offer_contact()`),
 *  - dotazník nájomcu vidí len majiteľ inzerátu,
 *  - appka nemá reklamu ani analytiku; push posiela LEN po povolení.
 */

/** Zmena kontaktu = zmena na JEDNOM mieste, aj pre web aj pre appku. */
export const LEGAL_CONTACT_EMAIL = 'rastioeu@protonmail.com';
export const LEGAL_OPERATOR = 'Rastislav Janek';
export const LEGAL_UPDATED = '9. augusta 2026';

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = {
  slug: 'privacy' | 'terms';
  title: string;
  lead: string;
  sections: LegalSection[];
};

export const PRIVACY: LegalDoc = {
  slug: 'privacy',
  title: 'Ochrana osobných údajov',
  lead:
    'Tento dokument vysvetľuje, aké údaje aplikácia Offerra spracúva, prečo, kde sú uložené ' +
    'a čo s nimi môžeš urobiť. Je písaný tak, aby sa dal prečítať — nie aby sa v ňom niečo skrylo.',
  sections: [
    {
      heading: 'Kto údaje spracúva',
      paragraphs: [
        `Prevádzkovateľom je ${LEGAL_OPERATOR}, autor aplikácie Offerra.`,
        `Kontakt vo veciach osobných údajov: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: 'Aké údaje aplikácia spracúva',
      paragraphs: [
        'E-mailová adresa. Získa sa z prihlásenia cez Apple alebo Google. Slúži na identifikáciu účtu. ' +
          'Ak pri prihlásení cez Apple zvolíš skrytie e-mailu, Offerra dostane len preposielaciu adresu Apple.',
        'Prezývka. Je VEREJNÁ — vidí ju každý pri tvojich inzerátoch a ponukách, aj neprihlásený návštevník. ' +
          'Vyberáš si ju sám a nemusí obsahovať tvoje meno.',
        'Telefónne číslo. Je POVINNÉ (od 9. augusta 2026) a NEVEREJNÉ — appka stojí na tom, ' +
          'že sa dvaja ľudia dohodnú telefonicky. Meno a priezvisko sú nepovinné a rovnako neverejné. ' +
          'Odkryjú sa v DVOCH prípadoch, ' +
          'v oboch obom stranám naraz a nikomu inému: (1) keď predávajúci prijme konkrétnu ponuku, ' +
          'a (2) keď záujemca požiada o obhliadku A vlastník ju potvrdí — do potvrdenia kontakt ' +
          'odkrytý nie je, žiadosť vidí vlastník len pod prezývkou žiadateľa. O odkrytí je používateľ ' +
          'vopred výslovne informovaný a potvrdzuje ho. Nikomu inému ich systém nevydá, ani technicky.',
        'Profilová fotka. Nepovinná, verejná.',
        'Obsah, ktorý sám pridáš. Inzeráty vrátane fotografií, obce, kraja, prípadnej ulice, výmery, počtu izieb, ' +
          'orientačnej ceny a podmienok prenájmu; ponuky vrátane sumy a správy; dopyty. Tento obsah je verejný.',
        'Hodnotenia po uzavretom obchode. Hviezdičky aj napísaný text sú VEREJNÉ a zobrazujú sa pri ' +
          'prezývke hodnoteného. Hodnotiť môžu len strany uzavretého obchodu.',
        'Dotazník nájomcu pri prenájme (počet osôb, zvieratá, dĺžka nájmu, zamestnanie, orientačný príjem). ' +
          'NIE JE verejný — sprístupní sa len majiteľovi inzerátu, ku ktorému si podal ponuku.',
        'Prevádzkové údaje. Obľúbené inzeráty, uložené vyhľadávania, predvoľby upozornení, zavreté tipy, ' +
          'počet zobrazení inzerátu a záznamy o nahlásení obsahu.',
        'Identifikátor zariadenia pre upozornenia (push token). Ukladá sa LEN ak upozornenia sám povolíš, ' +
          'a slúži výhradne na doručenie oznámení, ktoré by si aj tak dostal v aplikácii. Vypnutím ' +
          'upozornení v Nastaveniach sa zmaže.',
      ],
    },
    {
      heading: 'Čo aplikácia NEROBÍ',
      paragraphs: [
        'Nemá reklamu a neposkytuje údaje reklamným sieťam.',
        'Nemá analytické ani sledovacie nástroje tretích strán a nesleduje ťa naprieč inými aplikáciami.',
        'Nepristupuje k tvojej polohe. Poloha na mape je poloha OBCE z verejného číselníka, nie tvoja ani ' +
          'presná adresa nehnuteľnosti.',
        'Nepredáva ani neprenajíma osobné údaje nikomu.',
      ],
    },
    {
      heading: 'Právny základ',
      paragraphs: [
        'Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR) — bez účtu a prezývky sa nedá inzerovať ani ponúkať, ' +
          'je to podmienka fungovania služby.',
        'Oprávnený záujem (čl. 6 ods. 1 písm. f GDPR) — nahlasovanie a moderovanie obsahu, teda ochrana ' +
          'používateľov pred podvodmi a zneužitím.',
        'Súhlas (čl. 6 ods. 1 písm. a GDPR) — pri nepovinných údajoch, ktoré vyplníš sám: meno, telefón, fotka.',
      ],
    },
    {
      heading: 'Kde sú údaje uložené',
      paragraphs: [
        'Databáza aj fotografie sú u poskytovateľa Supabase, v regióne eu-north-1 (Štokholm, Európska únia). ' +
          'Údaje teda neopúšťajú EÚ.',
        'Prihlásenie sprostredkúva Apple alebo Google podľa toho, ktoré si zvolíš. Riadia sa vlastnými ' +
          'zásadami ochrany súkromia.',
        'Aktualizácie aplikácie doručuje služba Expo (EAS Update). Prenáša sa pri tom len obsah aplikácie, ' +
          'nie tvoje osobné údaje.',
        'Upozornenia na telefón doručuje Expo Push Service a ďalej Apple (APNs). Odovzdáva sa im nadpis, ' +
          'text oznámenia a identifikátor zariadenia — teda to isté, čo vidíš v aplikácii. Ak upozornenia ' +
          'nepovolíš, neodovzdáva sa nič.',
      ],
    },
    {
      heading: 'Ako dlho sa uchovávajú',
      paragraphs: [
        'Kým máš účet. Po jeho zmazaní sa odstráni profil, inzeráty, fotografie, ponuky a dopyty.',
        'Účet zmažeš priamo v aplikácii: Nastavenia (ozubené koliesko v hornej lište) → Zmazať účet. Nie je na to potrebná žiadna žiadosť.',
        'Záznamy o nahlásení obsahu môžu byť uchované aj po zmazaní účtu v rozsahu nevyhnutnom na ochranu ' +
          'ostatných používateľov.',
      ],
    },
    {
      heading: 'Tvoje práva',
      paragraphs: [
        'Máš právo na prístup k údajom, ich opravu, vymazanie, obmedzenie spracúvania, prenosnosť ' +
          'a právo namietať proti spracúvaniu.',
        'Väčšinu z toho spravíš priamo v aplikácii — kontaktné údaje aj zmazanie účtu nájdeš v Nastaveniach.',
        `V ostatných prípadoch napíš na ${LEGAL_CONTACT_EMAIL}.`,
        'Ak si myslíš, že sa s tvojimi údajmi nakladá nesprávne, máš právo podať sťažnosť na Úrad na ochranu ' +
          'osobných údajov Slovenskej republiky, Hraničná 12, 820 07 Bratislava.',
      ],
    },
    {
      heading: 'Deti',
      paragraphs: [
        'Offerra nie je určená osobám mladším ako 16 rokov a takéto účty vedome nevytvára.',
      ],
    },
    {
      heading: 'Zmeny',
      paragraphs: [
        'Ak sa tento dokument zmení, zmení sa aj dátum aktualizácie hore. Podstatné zmeny oznámime ' +
          'v aplikácii v sekcii „Čo je nové".',
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  slug: 'terms',
  title: 'Podmienky používania',
  lead:
    'Offerra je obrátený trh s nehnuteľnosťami: predávajúci nemusí povedať cenu a záujemcovia predkladajú ' +
    'vlastné ponuky. Tento dokument hovorí, čo od aplikácie čakať a čo aplikácia čaká od teba.',
  sections: [
    {
      heading: 'Čo Offerra je a čo nie je',
      paragraphs: [
        'Offerra je miesto, kde sa stretne ponuka a dopyt. NIE JE realitná kancelária, sprostredkovateľ ' +
          'ani účastník žiadneho obchodu.',
        'Ponuka podaná v aplikácii je prejav záujmu, NIE právne záväzná ponuka v zmysle Občianskeho zákonníka ' +
          'a nezakladá povinnosť uzavrieť zmluvu. Samotný predaj či prenájom prebieha mimo aplikácie.',
        'Offerra neoveruje vlastnícke právo k inzerovaným nehnuteľnostiam ani pravdivosť inzerátov.',
      ],
    },
    {
      heading: 'Len fyzické osoby vo vlastnom mene',
      paragraphs: [
        'Offerra je trh MEDZI ĽUĎMI. Používať ju smie výhradne fyzická osoba konajúca vo vlastnom mene — ' +
          'ako vlastník, spoluvlastník, nájomca alebo záujemca.',
        'Realitné kancelárie, sprostredkovatelia, makléri a osoby konajúce na cudzí účet alebo za odmenu ' +
          'službu používať NESMÚ, a to ani cez účet vedený na fyzickú osobu.',
        'Pri registrácii každý používateľ výslovne potvrdzuje: „Konám vo vlastnom mene ako fyzická osoba — ' +
          'nie som realitná kancelária ani sprostredkovateľ." Čas tohto potvrdenia sa uchováva.',
        'Nepravdivé potvrdenie je porušením týchto podmienok a je dôvodom na okamžité zablokovanie účtu ' +
          'a zmazanie inzerátov, bez nároku na akúkoľvek náhradu.',
        'Podozrenie na realitnú kanceláriu je možné nahlásiť priamo v aplikácii samostatným dôvodom ' +
          '„Realitka/sprostredkovateľ — vydáva sa za fyzickú osobu".',
        'Počet súčasne zverejnených inzerátov na jeden účet je obmedzený. Aktuálny limit je uvedený v aplikácii ' +
          'pri pokuse o prekročenie.',
      ],
    },
    {
      heading: 'Účet',
      paragraphs: [
        'Na inzerovanie a podávanie ponúk je potrebný účet a prezývka. Prezývka je verejná.',
        'Účet smie založiť len osoba staršia ako 18 rokov.',
        'Za obsah, ktorý pridáš, zodpovedáš ty. Musíš mať právo zverejniť fotografie, ktoré nahráš.',
        'Účet je osobný. Neprenechávaj ho niekomu inému.',
      ],
    },
    {
      heading: 'Čo je zakázané',
      paragraphs: [
        'Klamlivé, podvodné alebo neexistujúce inzeráty.',
        'Cudzie fotografie bez práva ich použiť.',
        'Obťažovanie, urážky, nenávistný prejav a zverejňovanie osobných údajov iných ľudí.',
        'Spam, reklama nesúvisiaca s nehnuteľnosťou a pokusy o obchádzanie pravidiel aplikácie.',
        'Zakladanie viacerých účtov s cieľom obísť limit zverejnených inzerátov alebo zákaz sprostredkovateľov.',
        'Automatizované sťahovanie obsahu a zásahy do fungovania služby.',
      ],
    },
    {
      heading: 'Nahlasovanie a moderovanie',
      paragraphs: [
        'Inzerát, ponuku aj používateľa je možné nahlásiť priamo v aplikácii.',
        'Nič sa nemaže automaticky. Nahlásenie posudzuje človek.',
        'Správca môže inzerát skryť z katalógu alebo zmazať a používateľa zablokovať. Skrytý inzerát ostáva ' +
          'viditeľný svojmu vlastníkovi aj s dôvodom.',
      ],
    },
    {
      heading: 'Odkrytie kontaktu',
      paragraphs: [
        'Prijatím ponuky sa meno, telefón a e-mail sprístupnia OBOM stranám tejto ponuky. Je to nevyhnutné ' +
          'na to, aby sa vedeli dohodnúť.',
        'Údaje získané týmto spôsobom sa smú použiť výhradne na dohodu o danej nehnuteľnosti — nie na ' +
          'marketing ani na čokoľvek iné.',
      ],
    },
    {
      heading: 'Poplatky',
      paragraphs: [
        'Používanie aplikácie je v súčasnosti bezplatné. Ak by sa to zmenilo, oznámime to vopred ' +
          'v aplikácii a nikdy spätne.',
      ],
    },
    {
      heading: 'Zodpovednosť',
      paragraphs: [
        'Aplikácia sa poskytuje „ako je". Nezaručujeme nepretržitú dostupnosť ani to, že obsah pridaný ' +
          'používateľmi je pravdivý.',
        'Nezodpovedáme za škodu vzniknutú z obchodov dohodnutých medzi používateľmi.',
      ],
    },
    {
      heading: 'Rozhodné právo',
      paragraphs: [
        'Vzťahy sa riadia právom Slovenskej republiky.',
        `Otázky a podnety: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDoc['slug'], LegalDoc> = {
  privacy: PRIVACY,
  terms: TERMS,
};
