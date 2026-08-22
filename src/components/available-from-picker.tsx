/**
 * „Dostupné od" pri prenájme (zadanie Rastio, bod 8, 8.8.2026).
 *
 * ZÁMERNE bez natívneho kolotoča dátumov — rovnaký dôvod ako pri
 * `DeadlinePicker`: `@react-native-community/datetimepicker` je natívny
 * modul, ktorý v appke nie je, a pridať ho znamená ďalší build.
 *
 * Rýchle voľby pokrývajú, ako sa prenájmy naozaj inzerujú („ihneď", „od
 * budúceho mesiaca"). Kto potrebuje konkrétny deň, napíše ho — a keď dátum
 * nedáva zmysel, POVIE sa mu to. Tiché prehltnutie nezmyslu je zakázané
 * (CLAUDE.md §2).
 *
 * Hodnota je `YYYY-MM-DD` (stĺpec je `date`), nie timestamp: pri sťahovaní
 * je deň presnosť, ktorá stačí, a odpadá otázka časového pásma.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { formatDay, isoDay, parseSkDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Label } from './ui';

function today(): string {
  return isoDay(new Date());
}

/** Prvý deň mesiaca o `n` mesiacov dopredu — „od budúceho mesiaca". */
function firstOfMonthIn(n: number): string {
  const d = new Date();
  return isoDay(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function AvailableFromPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (day: string | null) => void;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const CHOICES: { label: string; value: () => string | null }[] = [
    { label: t('availableFrom.notGiven'), value: () => null },
    { label: t('availableFrom.now'), value: today },
    { label: t('availableFrom.nextMonth'), value: () => firstOfMonthIn(1) },
    { label: t('availableFrom.inMonths', { count: 2 }), value: () => firstOfMonthIn(2) },
    { label: t('availableFrom.inMonths', { count: 3 }), value: () => firstOfMonthIn(3) },
  ];

  function applyManual(text: string) {
    setManual(text);
    if (text.trim() === '') {
      setManualError(null);
      return;
    }
    const parsed = parseSkDate(text);
    if (!parsed) {
      setManualError(t('availableFrom.invalidDate'));
      return;
    }
    setManualError(null);
    onChange(parsed);
  }

  return (
    <View style={styles.group}>
      <Label hint={t('availableFrom.hint')}>{t('availableFrom.label')}</Label>

      <View style={styles.choices}>
        {CHOICES.map((c) => {
          const target = c.value();
          const active = value === target;
          return (
            <Pressable
              key={c.label}
              onPress={() => {
                setManual('');
                setManualError(null);
                onChange(target);
              }}
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

      <TextInput
        value={manual}
        onChangeText={applyManual}
        placeholder={t('availableFrom.manualPlaceholder')}
        placeholderTextColor={palette.textPlaceholder}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: manualError ? palette.danger : palette.borderStrong,
            color: palette.textPrimary,
          },
        ]}
      />

      {manualError ? (
        <Text style={[styles.note, { color: palette.danger }]}>{manualError}</Text>
      ) : value ? (
        <Text style={[styles.note, { color: palette.link }]}>{t('availableFrom.moveInFrom', { date: formatDay(language, value) ?? '' })}</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Type.bodyLg,
  },
  note: { ...Type.caption, fontWeight: Weight.medium },
});
