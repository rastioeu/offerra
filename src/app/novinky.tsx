/**
 * „Čo je nové" — changelog pre používateľa (vzor MUTARK `whats-new.tsx`).
 * Dostupné z Nastavení. Obsah je v `@/lib/changelog`.
 */
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { buildInfoLine, readBuildInfo } from '@/lib/build-info';
import { CHANGELOG } from '@/lib/changelog';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function NovinkyScreen() {
  const palette = useTheme();
  const build = readBuildInfo();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Čo je nové',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          Zoznam zmien, najnovšie hore. Ak niečo z posledného záznamu v appke
          nevidíš, ešte ti nedorazila aktualizácia — porovnaj riadok nižšie
          s tým, čo máš v Profile.
        </Text>
        <Text style={[styles.build, { color: palette.textMuted }]}>{buildInfoLine(build)}</Text>

        {CHANGELOG.map((entry, i) => (
          <Card key={`${entry.date}-${entry.title}`}>
            <View style={styles.head}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{entry.title}</Text>
              {i === 0 ? (
                <Text style={[styles.newest, { color: palette.link }]}>najnovšie</Text>
              ) : null}
            </View>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              v{entry.version} · {entry.date}
            </Text>
            {entry.items.map((item) => (
              <View key={item} style={styles.bullet}>
                <Text style={[styles.dot, { color: palette.secondary }]}>•</Text>
                <Text style={[styles.item, { color: palette.textPrimary }]}>{item}</Text>
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  lead: { ...Type.bodyMd },
  build: { ...Type.caption, fontFamily: 'Courier' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
  title: { ...Type.subtitle, fontWeight: Weight.bold, flexShrink: 1 },
  newest: { ...Type.caption, fontWeight: Weight.bold },
  meta: { ...Type.caption, marginTop: -Spacing.sm },
  bullet: { flexDirection: 'row', gap: Spacing.sm },
  dot: { ...Type.bodyLg, lineHeight: 20 },
  item: { ...Type.bodyMd, flexShrink: 1 },
});
