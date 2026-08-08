/**
 * Typy notifikácií a ich nastavenia.
 *
 * DÔLEŽITÉ: Offerra zatiaľ **nemá čím notifikáciu poslať** — nie je tu
 * `expo-notifications` ani nič, čo by push odosielalo. Tieto preferencie
 * sú pripravené miesto, ktoré musí každý budúci odosielateľ rešpektovať
 * (`offerra.should_notify()`), nie hotová funkcia. Nastavenia to o sebe
 * píšu nahlas — prepínač, ktorý sa tvári, že niečo robí, je horší než
 * žiadny.
 */
export type NotificationType =
  | 'NOVA_PONUKA'
  | 'PONUKA_AKCEPTOVANA'
  | 'PONUKA_ZAMIETNUTA'
  | 'NOVY_DOPYT_ZODPOVEDA_INZERATU'
  | 'NOVA_ZHODA'
  | 'NOVA_OBHLIADKA'
  | 'OBHLIADKA_POTVRDENA'
  | 'OBHLIADKA_ZAMIETNUTA'
  | 'SYSTEMOVE';

export type NotificationFrequency = 'IHNED' | 'DENNY_SUHRN' | 'TYZDENNY_SUHRN';

export type NotificationPreference = {
  user_id: string;
  type: NotificationType;
  enabled: boolean;
  frequency: NotificationFrequency;
};

/** `system: true` = používateľ to vypnúť nesmie (drží to `check` v DB). */
export const NOTIFICATION_TYPES: {
  type: NotificationType;
  label: string;
  hint: string;
  system?: boolean;
}[] = [
  {
    type: 'NOVA_PONUKA',
    label: 'Nová ponuka na môj inzerát',
    hint: 'Keď niekto ponúkne sumu za tvoju nehnuteľnosť.',
  },
  {
    type: 'PONUKA_AKCEPTOVANA',
    label: 'Moja ponuka bola prijatá',
    hint: 'Vtedy sa odkryje kontakt na druhú stranu.',
  },
  {
    type: 'PONUKA_ZAMIETNUTA',
    label: 'Moja ponuka bola odmietnutá',
    hint: '',
  },
  {
    type: 'NOVY_DOPYT_ZODPOVEDA_INZERATU',
    label: 'Nový dopyt sedí na môj inzerát',
    hint: 'Niekto hľadá presne to, čo ponúkaš.',
  },
  {
    type: 'NOVA_ZHODA',
    label: 'Nová zhoda',
    hint: 'Nový inzerát zodpovedá tomu, čo hľadáš.',
  },
  {
    type: 'NOVA_OBHLIADKA',
    label: 'Žiadosť o obhliadku môjho inzerátu',
    hint: 'Keď si niekto chce prísť pozrieť tvoju nehnuteľnosť.',
  },
  {
    type: 'OBHLIADKA_POTVRDENA',
    label: 'Moja obhliadka je potvrdená',
    hint: 'Vtedy sa odkryje kontakt na druhú stranu aj presná adresa.',
  },
  {
    type: 'OBHLIADKA_ZAMIETNUTA',
    label: 'Moja obhliadka bola zamietnutá',
    hint: '',
  },
  {
    type: 'SYSTEMOVE',
    label: 'Systémové a bezpečnostné',
    hint: 'Napríklad zablokovanie účtu. Toto sa vypnúť nedá — musí doraziť vždy.',
    system: true,
  },
];

export const FREQUENCY_LABEL: Record<NotificationFrequency, string> = {
  IHNED: 'Ihneď',
  DENNY_SUHRN: 'Denný súhrn',
  TYZDENNY_SUHRN: 'Týždenný súhrn',
};
