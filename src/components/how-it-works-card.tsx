/**
 * Krátka karta „Ako funguje Offerra" na hlavnej obrazovke (vzor MUTARK —
 * má to na main screene, nie schované v nastaveniach).
 *
 * Zavrieť sa dá; stav sa ukladá do PROFILU, nie do lokálneho stavu.
 * Presne tú chybu — kontrola naviazaná na app-state namiesto reálnych
 * dát — sme už raz mali pri onboardingu prezývky.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { HOW_LEAD } from '@/lib/how-it-works';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { Icon } from './icon';

export function HowItWorksCard({ onDismiss }: { onDismiss?: () => void }) {
  const palette = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/ako-funguje')}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.wrap,
        Shadow.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.accent,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.head}>
        <Icon name="house" size={18} color={palette.accentDeep} />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Ako funguje Offerra</Text>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skryť">
            <Text style={[styles.close, { color: palette.textMuted }]}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.body, { color: palette.textSecondary }]}>{HOW_LEAD}</Text>
      <Text style={[styles.more, { color: palette.accentDeep }]}>Čítať ďalej →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Type.bodyLg, fontWeight: Weight.bold, flex: 1 },
  close: { ...Type.bodyLg, fontWeight: Weight.bold },
  body: { ...Type.bodyMd },
  more: { ...Type.caption, fontWeight: Weight.bold, marginTop: 2 },
});
