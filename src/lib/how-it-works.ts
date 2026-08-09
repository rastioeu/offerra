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
 * druhú stranu trhu, uzávierku ponúk, moderovanie správcom a — od
 * 8.8.2026 — presnosť polohy na mape (obec, nie adresa), súkromie správy
 * pri ponuke a obhliadku ako okamžité odkrytie kontaktu.
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
      'Kto za prezývkou stojí, sa nedozvie nikto — dovtedy. Správa priložená ' +
      'k ponuke verejná NIE JE: číta ju len predávajúci a ten, kto ju napísal.',
  },
  {
    icon: 'checkmark.seal',
    title: 'Kontakt až po dohode',
    body:
      'Keď predávajúci niektorú ponuku prijme, meno, telefón a e-mail sa odkryjú ' +
      'OBOM stranám naraz. Predtým ich nemá ani jeden z nich.',
  },
  {
    icon: 'key',
    title: 'Obhliadka je jedno kliknutie',
    body:
      'Nemusíš čakať na prijatie ponuky. Tlačidlom „Chcem obhliadku" sa kontakt ' +
      'odkryje OBOM stranám okamžite a termín si dohodnete telefonicky. Appka ' +
      'termíny nenavrhuje ani nepotvrdzuje — a späť sa to vziať nedá.',
  },
  {
    icon: 'house',
    title: 'Na mape vidíš obec, nie adresu',
    body:
      'Inzeráty sa dajú prezerať aj na mape. Pin však stojí na obci, nie na dome — ' +
      'presná adresa je skrytá rovnako ako meno a odkryje sa až po dohode.',
  },
  {
    icon: 'checkmark.seal',
    title: 'Uzavretie a hodnotenie',
    body:
      'Po prijatí ponuky sa inzerát UZAMKNE — cena, výmera ani podmienky sa už ' +
      'nedajú zmeniť, aby dohoda ostala taká, aká bola v tej chvíli. ' +
      'Keď obchod dopadne, predávajúci ho uzavrie — inzerát zmizne z katalógu ' +
      'a ostatné čakajúce ponuky sa uzavrú tiež. Potom sa obe strany môžu ' +
      'navzájom ohodnotiť. Hviezdičky vidí každý ako priemer pri prezývke, ' +
      'napísaný text prečíta LEN ten, komu je určený.',
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
