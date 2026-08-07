/**
 * Dopyty — druhá strana trhu. Nie je to zoznam nehnuteľností, ale zoznam
 * ĽUDÍ, ktorí niečo hľadajú. Majiteľ ich môže z detailu osloviť.
 *
 * RLS pustí verejne len `status='ACTIVE'`.
 */
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, ErrorNote } from '@/components/ui';
import { useRequests } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { formatBudget } from '@/lib/offers';
import { formatArea, formatDate, PROPERTY_LABEL, TRANSACTION_LABEL, type PropertyType } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function DopytyScreen() {
  const palette = useTheme();
  const { items, error, reload } = useRequests();
  const [refreshing, setRefreshing] = useState(false);
  useRefreshOnFocus(reload);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Dopyty</Text>
          <Text style={[styles.lead, { color: palette.textMuted }]}>
            Ľudia, ktorí niečo hľadajú. Ak máš, čo hľadajú, môžeš ich osloviť.
          </Text>
        </View>

        <ErrorNote error={error} />

        {items === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {items?.length === 0 && !error ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            Zatiaľ žiadne dopyty. Pridaj prvý cez tab „Pridať".
          </Text>
        ) : null}

        {items?.map((r) => (
          <Link key={r.id} href={{ pathname: '/dopyt/[id]', params: { id: r.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                  borderColor: palette.border,
                },
              ]}>
              <View style={styles.badges}>
                <Badge text={TRANSACTION_LABEL[r.transaction_type].toUpperCase()} tone="accent" />
                {r.property_type ? <Badge text={PROPERTY_LABEL[r.property_type as PropertyType]} /> : null}
                {r.is_seed ? <Badge text="UKÁŽKA" tone="warning" /> : null}
              </View>

              <Text style={[styles.budget, { color: palette.primary }]}>
                {formatBudget(r.budget_min, r.budget_max)}
              </Text>

              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {[
                  r.city,
                  r.rooms_min != null ? `od ${r.rooms_min} izieb` : null,
                  r.area_min != null ? `od ${formatArea(r.area_min)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              {r.description ? (
                <Text numberOfLines={2} style={[styles.desc, { color: palette.textSecondary }]}>
                  {r.description}
                </Text>
              ) : null}

              <Text style={[styles.foot, { color: palette.textMuted }]}>
                {r.author?.nickname ?? 'neznámy'} · {formatDate(r.created_at)}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  head: { gap: 4 },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyMd },
  spinner: { marginTop: Spacing.xxl },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  badges: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  budget: { ...Type.title, fontWeight: Weight.bold, marginTop: 2 },
  meta: { ...Type.bodyMd },
  desc: { ...Type.bodyMd },
  foot: { ...Type.caption, marginTop: 2 },
});
