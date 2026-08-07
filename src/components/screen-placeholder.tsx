import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

/**
 * FÁZA 0 — dočasná výplň prázdneho tabu. Zámerne bez akejkoľvek logiky
 * (zadanie Marco, bod 5: „zatiaľ len prázdne obrazovky s nadpisom").
 * Zmizne, keď tab dostane skutočný obsah.
 */
export function ScreenPlaceholder({ title, note }: { title: string; note?: string }) {
  const palette = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
        {note ? <Text style={[styles.note, { color: palette.textMuted }]}>{note}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  title: { ...Type.heading, fontWeight: Weight.semibold },
  note: { ...Type.body, textAlign: 'center' },
});
