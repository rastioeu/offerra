/**
 * Zoznam typov upozornení s prepínačmi — JEDEN na celú appku.
 *
 * Je na dvoch miestach naraz: v onboardingu (`upozornenia.tsx`, hneď po
 * povolení pushu) a v Nastaveniach. Zadanie (Rastio, 9.8.2026) hovorí, že
 * to má byť **to isté** — nie zjednodušená kópia v onboardingu, ktorá by
 * sa časom rozišla s tou v Nastaveniach.
 *
 * FREKVENCIA sa zatiaľ nezobrazuje a je to VEDOMÉ, nie opomenutie:
 * denný a týždenný súhrn potrebujú plánovanú úlohu na serveri, ktorú
 * Offerra nemá. Jediná fungujúca možnosť je „Ihneď", a jedna možnosť nie
 * je výber. Chip so štítkom „(čoskoro)" je presne ten druh nefunkčnej
 * výplne, ktorý Apple pri recenzii odmieta (App Review 2.1). Až budú
 * súhrny reálne fungovať, prepne sa `DIGEST_READY` na jednom mieste.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type {
  NotificationFrequency,
  NotificationPreference,
  NotificationType,
} from '@/lib/notifications';
import { getNotificationTypes } from '@/lib/notifications';
import { Spacing, Type, Weight } from '@/theme/tokens';

/** Sú denný a týždenný súhrn už funkčné? */
export const DIGEST_READY = false;

type Props = {
  prefs: Record<string, NotificationPreference>;
  onChange: (
    type: NotificationType,
    patch: { enabled?: boolean; frequency?: NotificationFrequency }
  ) => void;
};

export function NotificationTypeList({ prefs, onChange }: Props) {
  const palette = useTheme();
  const { t } = useTranslation();
  const notificationTypes = getNotificationTypes(t);

  return (
    <>
      {notificationTypes.map((nt) => {
        const pref = prefs[nt.type];
        // Bez uloženej preferencie platí ZAPNUTÉ — to je aj default v DB.
        // Systémové sa vypnúť nedá a `check` v DB to drží aj proti appke.
        const enabled = nt.system ? true : (pref?.enabled ?? true);
        return (
          <View key={nt.type} style={[styles.row, { borderTopColor: palette.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={[styles.label, { color: palette.textPrimary }]}>{nt.label}</Text>
                {nt.hint ? (
                  <Text style={[styles.hint, { color: palette.textMuted }]}>{nt.hint}</Text>
                ) : null}
              </View>
              <Switch
                value={enabled}
                disabled={nt.system}
                onValueChange={(v) => onChange(nt.type, { enabled: v })}
                trackColor={{ true: palette.secondary, false: palette.border }}
              />
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flex: 1, gap: 2 },
  label: { ...Type.bodyMd, fontWeight: Weight.medium },
  hint: { ...Type.caption },
});
