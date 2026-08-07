/**
 * Peniaze — vlastný pätkový rez a teplá farba, aby oko našlo číslo
 * bez čítania. Toto je najdôležitejší údaj v celej appke.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Money as MoneyType, Spacing, Type, Weight } from '@/theme/tokens';

export function Money({
  value,
  size = 'large',
  label,
  sub,
  tone = 'accent',
}: {
  value: string;
  size?: 'hero' | 'large' | 'medium' | 'small';
  /** Malý štítok nad číslom („Najvyššia ponuka"). */
  label?: string;
  /** Doplnok pod číslom („orientačne 219 000 €"). */
  sub?: string;
  tone?: 'accent' | 'navy';
}) {
  const palette = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text> : null}
      <Text
        style={[
          { fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold },
          MoneyType[size],
          { color: tone === 'accent' ? palette.accent : palette.primary },
        ]}>
        {value}
      </Text>
      {sub ? <Text style={[styles.sub, { color: palette.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  label: { ...Type.caption, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: Weight.semibold },
  sub: { ...Type.caption, marginTop: 2 },
});
