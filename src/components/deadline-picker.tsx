/**
 * Uzávierka príjmu ponúk — VOLITEĽNÁ. Prázdna = inzerát beží bez časovača.
 *
 * ZÁMERNE bez natívneho date pickera. `@react-native-community/datetimepicker`
 * je natívny modul, ktorý v aktuálnom TestFlight builde NIE JE — pridať ho
 * znamená nový EAS build a nové podanie. Uzávierka je v praxi „o týždeň /
 * o dva / o mesiac", nie konkrétny čas, takže rýchle voľby sú aj lepšie UX
 * než kolotoč dátumov.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Label } from './ui';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

/**
 * Ktorá voľba zodpovedá uloženej hodnote. Porovnáva sa kalendárny DEŇ, nie
 * presný čas — pri načítaní rozrobeného inzerátu je uložené konkrétne
 * razítko a hodiny už dávno nesedia.
 */
function matches(value: string | null, days: number | null): boolean {
  if (days === null) return value === null;
  if (!value) return false;
  return new Date(value).toDateString() === new Date(daysFromNow(days)).toDateString();
}

export function DeadlinePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const CHOICES: { days: number | null; label: string }[] = [
    { days: null, label: t('deadlinePicker.none') },
    { days: 7, label: t('deadlinePicker.days', { count: 7 }) },
    { days: 14, label: t('deadlinePicker.days', { count: 14 }) },
    { days: 30, label: t('deadlinePicker.days', { count: 30 }) },
    { days: 60, label: t('deadlinePicker.days', { count: 60 }) },
  ];

  return (
    <View style={styles.group}>
      <Label hint={t('deadlinePicker.hint')}>{t('deadlinePicker.label')}</Label>

      <View style={styles.choices}>
        {CHOICES.map((c) => {
          const active = matches(value, c.days);
          return (
            <Pressable
              key={c.label}
              onPress={() => onChange(c.days === null ? null : daysFromNow(c.days))}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: active ? palette.primary : palette.surface,
                  borderColor: active ? palette.primary : palette.borderStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text
                style={[styles.choiceText, { color: active ? palette.onPrimary : palette.textPrimary }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value ? (
        <Text style={[styles.current, { color: palette.link }]}>
          {t('deadlinePicker.closesOn', { date: formatDate(language, value) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  choiceText: { ...Type.bodyMd, fontWeight: Weight.medium },
  current: { ...Type.caption, fontWeight: Weight.medium },
});
