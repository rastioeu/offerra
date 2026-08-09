/**
 * „Ako funguje Offerra" — celá obrazovka.
 * Dostupná z hlavnej obrazovky aj z Nastavení.
 */
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { HOW_LEAD, HOW_SECTIONS } from '@/lib/how-it-works';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function AkoFungujeScreen() {
  const palette = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ako funguje Offerra',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.lead, { color: palette.textPrimary }]}>{HOW_LEAD}</Text>

        {/* PLNÁ verzia, nie krátka karta z hlavnej obrazovky. Testuje to
            rodina a nemá pravidlá objavovať pokusom (Rastio, 9.8.2026). */}
        {HOW_SECTIONS.map((s, i) => (
          <Card key={s.title}>
            <View style={styles.head}>
              <View style={[styles.badge, { backgroundColor: palette.surfacePressed }]}>
                <Icon name={s.icon as IconName} size={20} color={palette.accentDeep} />
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                {i + 1}. {s.title}
              </Text>
            </View>
            {s.paragraphs.map((para) => (
              <Text key={para.slice(0, 24)} style={[styles.body, { color: palette.textSecondary }]}>
                {para}
              </Text>
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
  lead: { ...Type.bodyLg, fontWeight: Weight.medium },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, fontWeight: Weight.semibold, flexShrink: 1 },
  body: { ...Type.bodyMd },
});
