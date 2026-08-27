/**
 * Platnosť ponuky pri jej podaní — VOLITEĽNÁ, rovnaký vzor ako
 * `DeadlinePicker` (uzávierka ponúk na inzeráte), vrátane dôvodu, prečo tu
 * `daysFromNow` žije LOKÁLNE a nie v `offer-validity.ts` — je to len
 * počítadlo pre voľby v tomto pickeri, nie logika, ktorú by potreboval
 * regresný test bez appky (tá je v `offer-validity.ts`).
 *
 * ZÁMERNE bez vlastného dátumu, z rovnakého dôvodu ako `DeadlinePicker`:
 * natívny date picker je nový natívny modul → nový EAS build. Rýchle
 * voľby („o týždeň / o dva / o mesiac") pokrývajú bežné prípady a appka
 * pri tejto funkcii ostáva čisto OTA.
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

function matches(value: string | null, days: number | null): boolean {
  if (days === null) return value === null;
  if (!value) return false;
  return new Date(value).toDateString() === new Date(daysFromNow(days)).toDateString();
}

export function OfferValidityPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const CHOICES: { days: number | null; label: string }[] = [
    { days: null, label: t('offerValidity.pickerNone') },
    { days: 7, label: t('offerValidity.pickerDays', { count: 7 }) },
    { days: 14, label: t('offerValidity.pickerDays', { count: 14 }) },
    { days: 30, label: t('offerValidity.pickerDays', { count: 30 }) },
  ];

  return (
    <View style={styles.group}>
      <Label hint={t('offerValidity.pickerHint')}>{t('offerValidity.pickerLabel')}</Label>

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
              <Text style={[styles.choiceText, { color: active ? palette.onPrimary : palette.textPrimary }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value ? (
        <Text style={[styles.current, { color: palette.link }]}>
          {t('offerValidity.pickerValidUntil', { date: formatDate(language, value) })}
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
