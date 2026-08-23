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
 *
 * LOKALIZÁCIA (23.8.2026, Rastio): appka má text v troch jazykoch
 * (`PRIVACY`/`TERMS` sú `Record<LanguageCode, LegalDoc>`) — text je
 * PREKLAD toho istého právneho obsahu, nie AI parafráza, sekcie a ich
 * poradie sedia 1:1 medzi jazykmi. Verejný web (`build-legal-html.mjs`,
 * URL v App Store Connect) generuje ZATIAĽ len slovenskú verziu — jedna
 * verejná URL na jazyk by vyžadovala zmenu generátora aj App Store
 * záznamu, čo je mimo tejto zmeny.
 */
import type { LanguageCode } from '@/i18n';

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

export const PRIVACY: Record<LanguageCode, LegalDoc> = {
  sk: {
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
        paragraphs: ['Offerra nie je určená osobám mladším ako 16 rokov a takéto účty vedome nevytvára.'],
      },
      {
        heading: 'Zmeny',
        paragraphs: [
          'Ak sa tento dokument zmení, zmení sa aj dátum aktualizácie hore. Podstatné zmeny oznámime ' +
            'v aplikácii v sekcii „Čo je nové".',
        ],
      },
    ],
  },
  en: {
    slug: 'privacy',
    title: 'Privacy Policy',
    lead:
      "This document explains what data the Offerra app processes, why, where it's stored, and what you " +
      "can do about it. It's written to be read — not to hide anything in it.",
    sections: [
      {
        heading: 'Who processes the data',
        paragraphs: [
          `The controller is ${LEGAL_OPERATOR}, the author of the Offerra app.`,
          `Contact for privacy matters: ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'What data the app processes',
        paragraphs: [
          "Email address. Obtained from signing in with Apple or Google. Used to identify the account. If " +
            "you choose to hide your email when signing in with Apple, Offerra only receives Apple's " +
            'forwarding address.',
          'Nickname. It is PUBLIC — everyone sees it on your listings and offers, even visitors who are not ' +
            "signed in. You choose it yourself and it doesn't have to contain your name.",
          'Phone number. It is REQUIRED (since August 9, 2026) and NOT public — the app relies on two people ' +
            'being able to agree by phone. First and last name are optional and equally not public. They are ' +
            'revealed in TWO cases, in both to both sides at once and to no one else: (1) when the seller ' +
            'accepts a specific offer, and (2) when an interested party requests a viewing AND the owner ' +
            "confirms it — before confirmation the contact is not revealed, and the owner only sees the " +
            "requester's nickname. The user is explicitly informed of the reveal in advance and confirms it. " +
            'It is never handed to anyone else, not even technically.',
          'Profile photo. Optional, public.',
          'Content you add yourself. Listings including photos, municipality, region, optional street, floor ' +
            'area, number of rooms, indicative price, and rental terms; offers including the amount and ' +
            'message; requests. This content is public.',
          'Ratings after a closed deal. Both the star rating and the written text are PUBLIC and are shown ' +
            "next to the rated person's nickname. Only the two sides of a closed deal can rate each other.",
          'Tenant questionnaire for rentals (number of occupants, pets, length of tenancy, employment, ' +
            "indicative income). It is NOT public — it's only made available to the owner of the listing you " +
            'applied to.',
          'Operational data. Favorite listings, saved searches, notification preferences, dismissed tips, ' +
            'listing view counts, and content-report records.',
          'Device identifier for notifications (push token). Stored ONLY if you enable notifications ' +
            'yourself, and used exclusively to deliver notifications you would receive in the app anyway. It ' +
            'is deleted when you turn notifications off in Settings.',
        ],
      },
      {
        heading: 'What the app does NOT do',
        paragraphs: [
          'It has no advertising and does not provide data to ad networks.',
          'It has no third-party analytics or tracking tools and does not track you across other apps.',
          'It does not access your location. The location on the map is the location of the MUNICIPALITY ' +
            "from a public register, not your or the property's exact address.",
          'It does not sell or rent out personal data to anyone.',
        ],
      },
      {
        heading: 'Legal basis',
        paragraphs: [
          'Performance of a contract (GDPR Art. 6(1)(b)) — without an account and a nickname you cannot list ' +
            "a property or make offers; it's a condition of the service working.",
          'Legitimate interest (GDPR Art. 6(1)(f)) — reporting and moderating content, i.e. protecting users ' +
            'from fraud and abuse.',
          'Consent (GDPR Art. 6(1)(a)) — for optional data you fill in yourself: name, phone, photo.',
        ],
      },
      {
        heading: 'Where the data is stored',
        paragraphs: [
          'Both the database and photos are hosted with Supabase, in the eu-north-1 region (Stockholm, ' +
            'European Union). Data therefore does not leave the EU.',
          'Sign-in is handled by Apple or Google, depending on which you choose. They are governed by their ' +
            'own privacy policies.',
          'App updates are delivered by the Expo service (EAS Update). Only app content is transmitted, not ' +
            'your personal data.',
          'Phone notifications are delivered by the Expo Push Service and then Apple (APNs). The title, ' +
            'notification text, and device identifier are passed to them — the same thing you see in the ' +
            "app. If you don't enable notifications, nothing is passed.",
        ],
      },
      {
        heading: 'How long data is kept',
        paragraphs: [
          'As long as you have an account. After it is deleted, your profile, listings, photos, offers, and ' +
            'requests are removed.',
          'You delete your account directly in the app: Settings (gear icon in the top bar) → Delete ' +
            'account. No request is needed.',
          'Content-report records may be kept even after account deletion, to the extent necessary to ' +
            'protect other users.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You have the right to access your data, correct it, delete it, restrict its processing, port it, ' +
            'and object to its processing.',
          'You can do most of this directly in the app — contact details and account deletion are both in ' +
            'Settings.',
          `For everything else, write to ${LEGAL_CONTACT_EMAIL}.`,
          'If you believe your data is being handled incorrectly, you have the right to file a complaint ' +
            'with the Slovak Data Protection Authority (Úrad na ochranu osobných údajov Slovenskej ' +
            'republiky), Hraničná 12, 820 07 Bratislava.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: ['Offerra is not intended for people under 16 and does not knowingly create such accounts.'],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'If this document changes, the update date above changes too. Material changes will be announced ' +
            'in the app under "What\'s new".',
        ],
      },
    ],
  },
  de: {
    slug: 'privacy',
    title: 'Datenschutz',
    lead:
      'Dieses Dokument erklärt, welche Daten die App Offerra verarbeitet, warum, wo sie gespeichert werden ' +
      'und was du damit tun kannst. Es ist so geschrieben, dass man es lesen kann — nicht, damit sich darin ' +
      'etwas versteckt.',
    sections: [
      {
        heading: 'Wer die Daten verarbeitet',
        paragraphs: [
          `Verantwortlicher ist ${LEGAL_OPERATOR}, der Autor der App Offerra.`,
          `Kontakt in Datenschutzfragen: ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Welche Daten die App verarbeitet',
        paragraphs: [
          'E-Mail-Adresse. Wird bei der Anmeldung über Apple oder Google übermittelt. Dient der ' +
            'Kontoidentifikation. Wenn du dich bei Apple für das Verbergen deiner E-Mail entscheidest, ' +
            'erhält Offerra nur die Weiterleitungsadresse von Apple.',
          'Spitzname. Er ist ÖFFENTLICH — jeder sieht ihn bei deinen Inseraten und Angeboten, auch nicht ' +
            'angemeldete Besucher. Du wählst ihn selbst und er muss nicht deinen Namen enthalten.',
          'Telefonnummer. Sie ist PFLICHT (seit 9. August 2026) und NICHT öffentlich — die App beruht darauf, ' +
            'dass sich zwei Menschen telefonisch einigen. Vor- und Nachname sind freiwillig und ebenfalls ' +
            'nicht öffentlich. Sie werden in ZWEI Fällen offengelegt, in beiden Fällen beiden Seiten ' +
            'gleichzeitig und sonst niemandem: (1) wenn der Verkäufer ein konkretes Angebot annimmt, und (2) ' +
            'wenn ein Interessent eine Besichtigung anfragt UND der Eigentümer sie bestätigt — vor der ' +
            'Bestätigung wird der Kontakt nicht offengelegt, der Eigentümer sieht die Anfrage nur unter dem ' +
            'Spitznamen des Anfragenden. Der Nutzer wird vorab ausdrücklich über die Offenlegung informiert ' +
            'und bestätigt sie. An niemand sonst werden die Daten weitergegeben, auch nicht technisch.',
          'Profilfoto. Freiwillig, öffentlich.',
          'Inhalte, die du selbst hinzufügst. Inserate samt Fotos, Gemeinde, Region, ggf. Straße, Fläche, ' +
            'Zimmeranzahl, Richtpreis und Mietbedingungen; Angebote samt Betrag und Nachricht; Anfragen. ' +
            'Dieser Inhalt ist öffentlich.',
          'Bewertungen nach einem abgeschlossenen Geschäft. Sowohl die Sterne als auch der geschriebene Text ' +
            'sind ÖFFENTLICH und werden beim Spitznamen der bewerteten Person angezeigt. Bewerten können nur ' +
            'die beiden Seiten eines abgeschlossenen Geschäfts.',
          'Mieterfragebogen bei Vermietung (Anzahl der Personen, Haustiere, Mietdauer, Beschäftigung, ' +
            'Richteinkommen). Er ist NICHT öffentlich — er wird nur dem Eigentümer des Inserats zugänglich ' +
            'gemacht, für das du ein Angebot abgegeben hast.',
          'Betriebsdaten. Favorisierte Inserate, gespeicherte Suchen, Benachrichtigungseinstellungen, ' +
            'geschlossene Hinweise, Aufrufzahlen von Inseraten und Meldeprotokolle.',
          'Geräte-Kennung für Benachrichtigungen (Push-Token). Wird NUR gespeichert, wenn du ' +
            'Benachrichtigungen selbst aktivierst, und dient ausschließlich der Zustellung von Mitteilungen, ' +
            'die du ohnehin in der App erhalten würdest. Beim Deaktivieren der Benachrichtigungen in den ' +
            'Einstellungen wird sie gelöscht.',
        ],
      },
      {
        heading: 'Was die App NICHT tut',
        paragraphs: [
          'Sie hat keine Werbung und gibt keine Daten an Werbenetzwerke weiter.',
          'Sie hat keine Analyse- oder Tracking-Tools von Drittanbietern und verfolgt dich nicht über andere ' +
            'Apps hinweg.',
          'Sie greift nicht auf deinen Standort zu. Der Standort auf der Karte ist der Standort der GEMEINDE ' +
            'aus einem öffentlichen Verzeichnis, nicht deine oder die genaue Adresse der Immobilie.',
          'Sie verkauft oder vermietet personenbezogene Daten an niemanden.',
        ],
      },
      {
        heading: 'Rechtsgrundlage',
        paragraphs: [
          'Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) — ohne Konto und Spitznamen kann man weder ' +
            'inserieren noch Angebote abgeben, das ist Voraussetzung für die Funktion des Dienstes.',
          'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) — Meldung und Moderation von Inhalten, also ' +
            'der Schutz der Nutzer vor Betrug und Missbrauch.',
          'Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) — bei freiwilligen Angaben, die du selbst ausfüllst: ' +
            'Name, Telefonnummer, Foto.',
        ],
      },
      {
        heading: 'Wo die Daten gespeichert werden',
        paragraphs: [
          'Datenbank und Fotos befinden sich beim Anbieter Supabase, in der Region eu-north-1 (Stockholm, ' +
            'Europäische Union). Die Daten verlassen die EU also nicht.',
          'Die Anmeldung erfolgt über Apple oder Google, je nachdem, was du wählst. Sie unterliegen ihren ' +
            'eigenen Datenschutzbestimmungen.',
          'App-Updates werden vom Dienst Expo (EAS Update) zugestellt. Dabei wird nur der App-Inhalt ' +
            'übertragen, nicht deine personenbezogenen Daten.',
          'Benachrichtigungen aufs Telefon liefert der Expo Push Service und weiter Apple (APNs). Übermittelt ' +
            'werden Titel, Text der Mitteilung und Geräte-Kennung — also dasselbe, was du in der App siehst. ' +
            'Wenn du Benachrichtigungen nicht erlaubst, wird nichts übermittelt.',
        ],
      },
      {
        heading: 'Wie lange die Daten aufbewahrt werden',
        paragraphs: [
          'Solange du ein Konto hast. Nach dessen Löschung werden Profil, Inserate, Fotos, Angebote und ' +
            'Anfragen entfernt.',
          'Du löschst dein Konto direkt in der App: Einstellungen (Zahnrad in der oberen Leiste) → Konto ' +
            'löschen. Dafür ist kein Antrag nötig.',
          'Meldeprotokolle können auch nach Löschung des Kontos aufbewahrt werden, soweit dies zum Schutz ' +
            'anderer Nutzer erforderlich ist.',
        ],
      },
      {
        heading: 'Deine Rechte',
        paragraphs: [
          'Du hast das Recht auf Auskunft über deine Daten, deren Berichtigung, Löschung, Einschränkung der ' +
            'Verarbeitung, Übertragbarkeit sowie ein Widerspruchsrecht gegen die Verarbeitung.',
          'Das meiste davon erledigst du direkt in der App — Kontaktdaten und Kontolöschung findest du in ' +
            'den Einstellungen.',
          `In allen anderen Fällen schreib an ${LEGAL_CONTACT_EMAIL}.`,
          'Wenn du meinst, dass mit deinen Daten falsch umgegangen wird, hast du das Recht, eine Beschwerde ' +
            'bei der slowakischen Datenschutzbehörde (Úrad na ochranu osobných údajov Slovenskej republiky), ' +
            'Hraničná 12, 820 07 Bratislava, einzureichen.',
        ],
      },
      {
        heading: 'Kinder',
        paragraphs: [
          'Offerra richtet sich nicht an Personen unter 16 Jahren und erstellt wissentlich keine solchen ' +
            'Konten.',
        ],
      },
      {
        heading: 'Änderungen',
        paragraphs: [
          'Wenn sich dieses Dokument ändert, ändert sich auch das oben genannte Aktualisierungsdatum. ' +
            'Wesentliche Änderungen kündigen wir in der App im Bereich „Neuigkeiten" an.',
        ],
      },
    ],
  },
};

export const TERMS: Record<LanguageCode, LegalDoc> = {
  sk: {
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
        paragraphs: ['Vzťahy sa riadia právom Slovenskej republiky.', `Otázky a podnety: ${LEGAL_CONTACT_EMAIL}.`],
      },
    ],
  },
  en: {
    slug: 'terms',
    title: 'Terms of Use',
    lead:
      "Offerra is a reverse real-estate marketplace: the seller doesn't have to state a price, and " +
      'interested parties submit their own offers. This document says what to expect from the app and what ' +
      'the app expects from you.',
    sections: [
      {
        heading: "What Offerra is and isn't",
        paragraphs: [
          'Offerra is a place where supply and demand meet. It is NOT a real estate agency, an intermediary, ' +
            'or a party to any deal.',
          'An offer submitted in the app is an expression of interest, NOT a legally binding offer under the ' +
            'Slovak Civil Code, and does not create an obligation to enter into a contract. The actual sale ' +
            'or rental takes place outside the app.',
          'Offerra does not verify ownership of listed properties or the truthfulness of listings.',
        ],
      },
      {
        heading: 'Natural persons acting in their own name only',
        paragraphs: [
          'Offerra is a marketplace BETWEEN PEOPLE. It may be used exclusively by a natural person acting in ' +
            'their own name — as an owner, co-owner, tenant, or interested party.',
          "Real estate agencies, intermediaries, brokers, and people acting on someone else's behalf or for " +
            'a fee MAY NOT use the service, even through an account held by a natural person.',
          'When registering, every user explicitly confirms: "I am acting in my own name as a natural ' +
            'person — I am not a real estate agency or intermediary." The time of this confirmation is ' +
            'retained.',
          'A false confirmation is a breach of these terms and grounds for immediate account suspension and ' +
            'removal of listings, with no entitlement to any compensation.',
          'Suspected real estate agencies can be reported directly in the app using the dedicated reason ' +
            '"Agency/intermediary posing as a natural person".',
          'The number of listings published at once per account is limited. The current limit is shown in ' +
            'the app if you try to exceed it.',
        ],
      },
      {
        heading: 'Account',
        paragraphs: [
          'An account and a nickname are required to list a property or submit offers. The nickname is ' +
            'public.',
          'An account may only be created by a person over 18.',
          'You are responsible for the content you add. You must have the right to publish any photos you ' +
            'upload.',
          'The account is personal. Do not hand it over to anyone else.',
        ],
      },
      {
        heading: 'What is prohibited',
        paragraphs: [
          'Deceptive, fraudulent, or non-existent listings.',
          "Other people's photos without the right to use them.",
          "Harassment, insults, hate speech, and publishing other people's personal data.",
          "Spam, advertising unrelated to real estate, and attempts to circumvent the app's rules.",
          'Creating multiple accounts to get around the listing limit or the ban on intermediaries.',
          'Automated scraping of content and interference with the operation of the service.',
        ],
      },
      {
        heading: 'Reporting and moderation',
        paragraphs: [
          'A listing, an offer, and a user can all be reported directly in the app.',
          'Nothing is deleted automatically. A human reviews every report.',
          'An administrator may hide a listing from the catalog or delete it, and suspend a user. A hidden ' +
            'listing remains visible to its owner, along with the reason.',
        ],
      },
      {
        heading: 'Revealing contact details',
        paragraphs: [
          'Accepting an offer reveals the name, phone number, and email to BOTH sides of that offer. This is ' +
            'necessary so they can reach an agreement.',
          'Data obtained this way may only be used to negotiate about that specific property — not for ' +
            'marketing or anything else.',
        ],
      },
      {
        heading: 'Fees',
        paragraphs: [
          'Using the app is currently free. If that were to change, we would announce it in the app in ' +
            'advance, and never retroactively.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'The app is provided "as is". We do not guarantee uninterrupted availability, nor that content ' +
            'added by users is truthful.',
          'We are not liable for damage arising from deals agreed between users.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: [
          'These relationships are governed by the law of the Slovak Republic.',
          `Questions and suggestions: ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  de: {
    slug: 'terms',
    title: 'Nutzungsbedingungen',
    lead:
      'Offerra ist ein umgekehrter Immobilienmarkt: Der Verkäufer muss keinen Preis nennen, und Interessenten ' +
      'legen eigene Angebote vor. Dieses Dokument beschreibt, was du von der App erwarten kannst und was die ' +
      'App von dir erwartet.',
    sections: [
      {
        heading: 'Was Offerra ist und was nicht',
        paragraphs: [
          'Offerra ist ein Ort, an dem Angebot und Nachfrage zusammentreffen. Es ist KEIN Maklerbüro, kein ' +
            'Vermittler und keine Partei eines Geschäfts.',
          'Ein in der App abgegebenes Angebot ist eine Interessensbekundung, KEIN rechtsverbindliches Angebot ' +
            'im Sinne des slowakischen Bürgerlichen Gesetzbuchs, und begründet keine Verpflichtung zum ' +
            'Vertragsabschluss. Der eigentliche Verkauf oder die Vermietung erfolgt außerhalb der App.',
          'Offerra überprüft weder das Eigentumsrecht an inserierten Immobilien noch den Wahrheitsgehalt der ' +
            'Inserate.',
        ],
      },
      {
        heading: 'Nur natürliche Personen im eigenen Namen',
        paragraphs: [
          'Offerra ist ein Marktplatz ZWISCHEN MENSCHEN. Er darf ausschließlich von einer natürlichen Person ' +
            'genutzt werden, die im eigenen Namen handelt — als Eigentümer, Miteigentümer, Mieter oder ' +
            'Interessent.',
          'Maklerbüros, Vermittler, Makler und Personen, die auf fremde Rechnung oder gegen Entgelt handeln, ' +
            'DÜRFEN den Dienst nicht nutzen, auch nicht über ein auf eine natürliche Person laufendes Konto.',
          'Bei der Registrierung bestätigt jeder Nutzer ausdrücklich: „Ich handle im eigenen Namen als ' +
            'natürliche Person — ich bin kein Maklerbüro und kein Vermittler." Der Zeitpunkt dieser ' +
            'Bestätigung wird gespeichert.',
          'Eine falsche Bestätigung verstößt gegen diese Bedingungen und ist Grund für die sofortige Sperrung ' +
            'des Kontos und die Löschung der Inserate, ohne Anspruch auf irgendeine Entschädigung.',
          'Der Verdacht auf ein Maklerbüro kann direkt in der App über den eigenen Grund „Maklerbüro/' +
            'Vermittler — gibt sich als natürliche Person aus" gemeldet werden.',
          'Die Anzahl gleichzeitig veröffentlichter Inserate pro Konto ist begrenzt. Das aktuelle Limit wird ' +
            'in der App angezeigt, wenn du versuchst, es zu überschreiten.',
        ],
      },
      {
        heading: 'Konto',
        paragraphs: [
          'Zum Inserieren und Abgeben von Angeboten sind ein Konto und ein Spitzname erforderlich. Der ' +
            'Spitzname ist öffentlich.',
          'Ein Konto darf nur eine Person über 18 Jahren anlegen.',
          'Für die Inhalte, die du hinzufügst, bist du selbst verantwortlich. Du musst das Recht haben, die ' +
            'von dir hochgeladenen Fotos zu veröffentlichen.',
          'Das Konto ist persönlich. Gib es nicht an jemand anderen weiter.',
        ],
      },
      {
        heading: 'Was verboten ist',
        paragraphs: [
          'Irreführende, betrügerische oder nicht existierende Inserate.',
          'Fremde Fotos ohne Nutzungsrecht.',
          'Belästigung, Beleidigungen, Hassrede und die Veröffentlichung personenbezogener Daten anderer ' +
            'Menschen.',
          'Spam, Werbung ohne Bezug zu Immobilien und Versuche, die Regeln der App zu umgehen.',
          'Anlegen mehrerer Konten, um das Limit veröffentlichter Inserate oder das Vermittlerverbot zu ' +
            'umgehen.',
          'Automatisiertes Abgreifen von Inhalten und Eingriffe in den Betrieb des Dienstes.',
        ],
      },
      {
        heading: 'Meldung und Moderation',
        paragraphs: [
          'Ein Inserat, ein Angebot und ein Nutzer können direkt in der App gemeldet werden.',
          'Nichts wird automatisch gelöscht. Jede Meldung wird von einem Menschen geprüft.',
          'Ein Administrator kann ein Inserat aus dem Katalog ausblenden oder löschen und einen Nutzer ' +
            'sperren. Ein ausgeblendetes Inserat bleibt für seinen Eigentümer samt Begründung sichtbar.',
        ],
      },
      {
        heading: 'Offenlegung des Kontakts',
        paragraphs: [
          'Mit der Annahme eines Angebots werden Name, Telefonnummer und E-Mail BEIDEN Seiten dieses ' +
            'Angebots zugänglich gemacht. Das ist notwendig, damit sie sich einigen können.',
          'Auf diese Weise erhaltene Daten dürfen ausschließlich zur Einigung über die betreffende Immobilie ' +
            'verwendet werden — nicht für Marketing oder irgendetwas anderes.',
        ],
      },
      {
        heading: 'Gebühren',
        paragraphs: [
          'Die Nutzung der App ist derzeit kostenlos. Sollte sich das ändern, kündigen wir es vorher in der ' +
            'App an — nie rückwirkend.',
        ],
      },
      {
        heading: 'Haftung',
        paragraphs: [
          'Die App wird „wie sie ist" bereitgestellt. Wir garantieren weder eine ununterbrochene ' +
            'Verfügbarkeit noch, dass von Nutzern hinzugefügte Inhalte wahr sind.',
          'Wir haften nicht für Schäden aus zwischen Nutzern vereinbarten Geschäften.',
        ],
      },
      {
        heading: 'Anwendbares Recht',
        paragraphs: [
          'Die Beziehungen unterliegen dem Recht der Slowakischen Republik.',
          `Fragen und Anregungen: ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
};

export const LEGAL_DOCS: Record<LegalDoc['slug'], Record<LanguageCode, LegalDoc>> = {
  privacy: PRIVACY,
  terms: TERMS,
};

export function getLegalDoc(slug: LegalDoc['slug'], language: LanguageCode): LegalDoc {
  return LEGAL_DOCS[slug][language];
}
