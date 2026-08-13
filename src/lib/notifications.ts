/**
 * Typy notifikácií a ich nastavenia.
 *
 * OD BUILDU 1.3.0 (#5) to nie je len pripravené miesto: `expo-notifications`
 * je v builde, token sa ukladá do `offerra.push_token` a databáza odosiela
 * cez Expo Push API. Tieto preferencie teda naozaj RIADIA, čo príde —
 * `offerra.push_notification()` sa každý raz spýta `should_notify()`.
 *
 * (Do 9.8.2026 tu stálo, že Offerra nemá čím notifikáciu poslať. Bola to
 * pravda, kým push neexistoval; po jeho pridaní by to bol komentár, ktorý
 * klame o tom, ako appka funguje.)
 */
export type NotificationType =
  | 'NOVA_PONUKA'
  | 'PONUKA_AKCEPTOVANA'
  | 'PONUKA_ZAMIETNUTA'
  | 'NOVY_DOPYT_ZODPOVEDA_INZERATU'
  | 'OSLOVENIE_DOPYTU'
  | 'NOVA_ZHODA'
  | 'ZIADOST_O_OBHLIADKU'
  | 'NOVA_SPRAVA'
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
    type: 'OSLOVENIE_DOPYTU',
    label: 'Niekto oslovil môj dopyt',
    hint: 'Ponúka ti inzerát, ktorý zodpovedá tomu, čo hľadáš.',
  },
  {
    type: 'NOVA_ZHODA',
    label: 'Nová zhoda',
    hint: 'Nový inzerát zodpovedá tomu, čo hľadáš.',
  },
  {
    type: 'ZIADOST_O_OBHLIADKU',
    label: 'Niekto chce obhliadku',
    hint: 'Kontakt máte v tej chvíli odkrytý obaja — dohodnete sa telefonicky.',
  },
  {
    type: 'NOVA_SPRAVA',
    label: 'Nová správa',
    hint: 'Keď ti niekto napíše k inzerátu. Obsah správy v oznámení nie je — ten je súkromný.',
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
