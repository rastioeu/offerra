/**
 * „Ako funguje Offerra" — vysvetlenie princípu appky.
 *
 * STANDING RULE (Rastio 7.8.2026, zapísané aj v CLAUDE.md §8): keď sa
 * zmení AKÁKOĽVEK mechanika appky, tento text sa musí upraviť v TOM
 * ISTOM kroku, nie dodatočne. Text, ktorý klame o tom, ako appka
 * funguje, je horší než žiadny.
 *
 * Aktuálne zohľadňuje: otvorené pseudonymné ponuky (nie slepé),
 * povinnú prezývku, odkrytie kontaktu až po akceptácii, dopyty ako
 * druhú stranu trhu, uzávierku ponúk a moderovanie správcom.
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
    icon: 'checkmark.seal',
    title: 'Kontakt až po dohode',
    body:
      'Keď predávajúci niektorú ponuku prijme, meno, telefón a e-mail sa odkryjú ' +
      'OBOM stranám naraz. Predtým ich nemá ani jeden z nich.',
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
