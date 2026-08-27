import type { TFunc } from '@/i18n';

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
 *
 * LABEL/HINT (19.8.2026, lokalizácia): text žije v locale JSON (domain
 * `notificationTypes`), preto je `NOTIFICATION_TYPES` odteraz funkcia
 * `getNotificationTypes(t)`, nie statické pole. Skutočný OBSAH doručenej
 * push notifikácie (`n.title`/`n.body`) appka generuje na strane DB
 * (`offerra.push_notification()`) a zostáva zatiaľ len po slovensky —
 * to je mimo rozsahu tejto fázy (lokalizácia rozhrania appky, nie
 * server-side obsahu jednotlivých notifikácií).
 */
export type NotificationType =
  | 'NOVA_PONUKA'
  | 'PONUKA_AKCEPTOVANA'
  | 'PONUKA_ZAMIETNUTA'
  | 'PONUKA_EXPIROVANA'
  | 'NOVY_DOPYT_ZODPOVEDA_INZERATU'
  | 'OSLOVENIE_DOPYTU'
  | 'NOVA_ZHODA'
  | 'ZIADOST_O_OBHLIADKU'
  | 'OBHLIADKA_POTVRDENA'
  | 'OBHLIADKA_ZAMIETNUTA'
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
export function getNotificationTypes(
  t: TFunc,
): { type: NotificationType; label: string; hint: string; system?: boolean }[] {
  return [
    { type: 'NOVA_PONUKA', label: t('notificationTypes.NOVA_PONUKA_label'), hint: t('notificationTypes.NOVA_PONUKA_hint') },
    { type: 'PONUKA_AKCEPTOVANA', label: t('notificationTypes.PONUKA_AKCEPTOVANA_label'), hint: t('notificationTypes.PONUKA_AKCEPTOVANA_hint') },
    { type: 'PONUKA_ZAMIETNUTA', label: t('notificationTypes.PONUKA_ZAMIETNUTA_label'), hint: '' },
    { type: 'PONUKA_EXPIROVANA', label: t('notificationTypes.PONUKA_EXPIROVANA_label'), hint: t('notificationTypes.PONUKA_EXPIROVANA_hint') },
    {
      type: 'NOVY_DOPYT_ZODPOVEDA_INZERATU',
      label: t('notificationTypes.NOVY_DOPYT_ZODPOVEDA_INZERATU_label'),
      hint: t('notificationTypes.NOVY_DOPYT_ZODPOVEDA_INZERATU_hint'),
    },
    { type: 'OSLOVENIE_DOPYTU', label: t('notificationTypes.OSLOVENIE_DOPYTU_label'), hint: t('notificationTypes.OSLOVENIE_DOPYTU_hint') },
    { type: 'NOVA_ZHODA', label: t('notificationTypes.NOVA_ZHODA_label'), hint: t('notificationTypes.NOVA_ZHODA_hint') },
    { type: 'ZIADOST_O_OBHLIADKU', label: t('notificationTypes.ZIADOST_O_OBHLIADKU_label'), hint: t('notificationTypes.ZIADOST_O_OBHLIADKU_hint') },
    { type: 'OBHLIADKA_POTVRDENA', label: t('notificationTypes.OBHLIADKA_POTVRDENA_label'), hint: t('notificationTypes.OBHLIADKA_POTVRDENA_hint') },
    { type: 'OBHLIADKA_ZAMIETNUTA', label: t('notificationTypes.OBHLIADKA_ZAMIETNUTA_label'), hint: '' },
    { type: 'NOVA_SPRAVA', label: t('notificationTypes.NOVA_SPRAVA_label'), hint: t('notificationTypes.NOVA_SPRAVA_hint') },
    { type: 'SYSTEMOVE', label: t('notificationTypes.SYSTEMOVE_label'), hint: t('notificationTypes.SYSTEMOVE_hint'), system: true },
  ];
}

export const FREQUENCY_LABEL: Record<NotificationFrequency, string> = {
  IHNED: 'Ihneď',
  DENNY_SUHRN: 'Denný súhrn',
  TYZDENNY_SUHRN: 'Týždenný súhrn',
};
