/**
 * „Ako funguje Offerra" — vysvetlenie princípu appky.
 *
 * STANDING RULE (Rastio 7.8.2026, zapísané aj v CLAUDE.md §8): keď sa
 * zmení AKÁKOĽVEK mechanika appky, tento text sa musí upraviť v TOM
 * ISTOM kroku, nie dodatočne. Text, ktorý klame o tom, ako appka
 * funguje, je horší než žiadny.
 *
 * Aktuálne zohľadňuje: otvorené pseudonymné ponuky (nie slepé),
 * povinnú prezývku, dopyty ako druhú stranu trhu, uzávierku ponúk,
 * moderovanie správcom, presnosť polohy na mape (obec, nie adresa)
 * a — od 8.8.2026 — OBHLIADKY vrátane toho, že kontakt sa odkrýva
 * v DVOCH chvíľach, nie v jednej: pri potvrdení obhliadky a pri
 * prijatí ponuky.
 */
export type HowStep = { icon: string; title: string; body: string };

export const HOW_LEAD =
  'Offerra je obrátený trh s nehnuteľnosťami. Predávajúci nemusí povedať cenu — ' +
  'záujemcovia predkladajú vlastné ponuky a všetci vidia, ako to ide.';

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
      'Sumu, prezývku aj dátum každej ponuky vidí ktokoľvek, aj neprihlásený. ' +
      'Kto za prezývkou stojí, sa nedozvie nikto — dovtedy.',
  },
  {
    icon: 'calendar',
    title: 'Obhliadka kedykoľvek — pred ponukou aj po nej',
    body:
      'Na inzeráte si vieš vyžiadať obhliadku. Nemusíš pred ňou nič ponúkať a nič ' +
      'ťa nezaväzuje. Navrhneš termín, majiteľ ho potvrdí alebo navrhne iný. ' +
      'Po obhliadke si ju označíš ako absolvovanú — majiteľ tak pri rozhodovaní ' +
      'vidí, kto si byt naozaj pozrel.',
  },
  {
    icon: 'checkmark.seal',
    title: 'Kontakt až po dohode',
    body:
      'Sú dve chvíle, keď sa meno, telefón a e-mail odkryjú — vždy OBOM stranám ' +
      'naraz. Prvá: majiteľ potvrdí obhliadku (bez spojenia sa nedá dohodnúť čas ' +
      'a on púšťa cudzieho človeka domov). Druhá: prijme ponuku. Vtedy sa ' +
      'potvrdenému záujemcovi ukáže aj presná adresa. Dovtedy nemá kontakt ani ' +
      'jeden z nich — a samotná ŽIADOSŤ o obhliadku neodkryje nič.',
  },
  {
    icon: 'house',
    title: 'Na mape vidíš obec, nie adresu',
    body:
      'Inzeráty sa dajú prezerať aj na mape. Pin však stojí na obci, nie na dome — ' +
      'presná adresa je skrytá rovnako ako meno a odkryje sa až po dohode.',
  },
  {
    icon: 'envelope',
    title: 'Hľadať sa dá aj naopak',
    body:
      'V tabe Dopyty napíšeš, čo hľadáš. Majitelia ťa potom môžu osloviť sami ' +
      'svojím inzerátom.',
  },
  {
    icon: 'bell',
    title: 'Uzávierka a rozhodnutie',
    body:
      'K inzerátu sa dá nastaviť termín, dokedy sa ponuky prijímajú. Po ňom už ' +
      'nikto nepridá ani nezvýši. Rozhodnutie je vždy na predávajúcom.',
  },
  {
    icon: 'flag',
    title: 'Keď niečo nesedí',
    body:
      'Inzerát, ponuku aj používateľa sa dá nahlásiť. Nič sa nemaže automaticky — ' +
      'pozrie sa na to človek.',
  },
];
