/**
 * Zvonček — oznámenia v appke.
 *
 * ZÁMERNE „in-app", nie push: push potrebuje `expo-notifications`, ktoré
 * v builde nie je. Obrazovka to o sebe hovorí nahlas — sľubovať pípnutie,
 * ktoré nepríde, je horšie než nesľúbiť nič.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ErrorNote, SectionLabel } from '@/components/ui';
import { useNotifications } from '@/hooks/use-notifications';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function OznameniaScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { items, unread, error, markAllRead } = useNotifications(session?.user.id);

  // Otvorením sa považujú za prečítané — presne to otvorenie znamená.
  useEffect(() => {
    if (unread > 0) void markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Oznámenia',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />

        <Text style={[styles.lead, { color: palette.textMuted }]}>
          Offerra zatiaľ neposiela upozornenia na zamknutú obrazovku — nájdeš ich
          tu. Čo sa tu má objaviť, si nastavuješ v Nastaveniach.
        </Text>

        {items.length === 0 ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            Zatiaľ nič. Keď niekto ponúkne za tvoj inzerát alebo ti prijme ponuku,
            objaví sa to tu.
          </Text>
        ) : null}

        {items.map((n) => (
          <Pressable
            key={n.id}
            disabled={!n.property_id}
            onPress={() =>
              n.property_id
                ? router.push({ pathname: '/nehnutelnost/[id]', params: { id: n.property_id } })
                : undefined
            }
            accessibilityRole={n.property_id ? 'button' : 'text'}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                borderColor: n.read_at ? palette.border : palette.secondary,
              },
            ]}>
            <View style={styles.rowHead}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{n.title}</Text>
              {!n.read_at ? <View style={[styles.dot, { backgroundColor: palette.secondary }]} /> : null}
            </View>
            {n.body ? <Text style={[styles.body, { color: palette.textSecondary }]}>{n.body}</Text> : null}
            <Text style={[styles.date, { color: palette.textMuted }]}>{formatDate(n.created_at)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  lead: { ...Type.caption },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  row: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Type.bodyLg, fontWeight: Weight.semibold, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { ...Type.bodyMd },
  date: { ...Type.caption },
});
