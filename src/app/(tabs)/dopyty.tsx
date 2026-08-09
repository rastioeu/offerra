/**
 * Dopyty — druhá strana trhu. Nie je to zoznam nehnuteľností, ale zoznam
 * ĽUDÍ, ktorí niečo hľadajú. Majiteľ ich môže z detailu osloviť.
 *
 * RLS pustí verejne len `status='ACTIVE'`.
 *
 * FILTRE (Rastio 8.8.2026, možnosť B): tá istá lišta ako v katalógu,
 * len so slovami hľadajúceho — „Kúpim / Hľadám prenájom". Nie je to druhý
 * komponent; `SearchBar` dostane `side="DEMAND"`.
 */
import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { SearchBar } from '@/components/search-bar';
import { Badge, ErrorNote } from '@/components/ui';
import { useRequests } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { AppHeader } from '@/components/app-header';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { formatBudget } from '@/lib/offers';
import { DEMAND_LABEL, formatArea, formatDate, PROPERTY_LABEL, type PropertyType } from '@/lib/property';
import { EMPTY_FILTER, isFilterEmpty, type CatalogFilter } from '@/lib/search';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function DopytyScreen() {
  const palette = useTheme();
  const { session } = useSession();
  const myId = session?.user.id;
  const router = useRouter();
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY_FILTER);
  const { items, error, reload } = useRequests(undefined, filter);
  const [refreshing, setRefreshing] = useState(false);
  useRefreshOnFocus(reload);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Dopyty</Text>
          <Text style={[styles.lead, { color: palette.textMuted }]}>
            Ľudia, ktorí niečo hľadajú. Ak máš, čo hľadajú, môžeš ich osloviť.
          </Text>
          {items ? (
            <Text style={[styles.lead, { color: palette.textMuted }]}>
              {items.length === 0
                ? 'Zatiaľ tu nič nie je'
                : `${items.length} ${items.length === 1 ? 'dopyt' : items.length < 5 ? 'dopyty' : 'dopytov'}`}
            </Text>
          ) : null}
        </View>

        <SearchBar filter={filter} onChange={setFilter} side="DEMAND" />

        <ErrorNote error={error} />

        {items === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {items?.length === 0 && !error ? (
          isFilterEmpty(filter) ? (
            <EmptyState
              icon="envelope"
              title="Zatiaľ žiadne dopyty"
              body="Dopyt je opačný smer: napíšeš, čo hľadáš, a majitelia ťa môžu osloviť sami."
              actionTitle="Pridať dopyt"
              onAction={() => router.push('/dopyt/novy')}
            />
          ) : (
            <EmptyState
              icon="magnifyingglass"
              title="Žiadny dopyt tomu nezodpovedá"
              body="Skús ubrať niektorý filter — napríklad typ nehnuteľnosti."
              actionTitle="Zrušiť filtre"
              onAction={() => setFilter({ ...EMPTY_FILTER })}
            />
          )
        ) : null}

        {items?.map((r) => (
          <Link key={r.id} href={{ pathname: '/dopyt/[id]', params: { id: r.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                  // Vlastný dopyt má aj obrys, nie len odznak — v dlhom
                  // zozname sa odznak stratí, obrys nie.
                  borderColor: myId && r.user_id === myId ? palette.accent : palette.border,
                  borderWidth: myId && r.user_id === myId ? 1.5 : 1,
                },
              ]}>
              <View style={styles.badges}>
                <Badge text={DEMAND_LABEL[r.transaction_type].toUpperCase()} tone="accent" />
                {r.property_type ? <Badge text={PROPERTY_LABEL[r.property_type as PropertyType]} /> : null}
                {r.is_seed ? <Badge text="UKÁŽKA" tone="warning" /> : null}
                {/* „Tvoj dopyt" vidí LEN ten, kto ho pridal — porovnáva sa
                    na klientovi s vlastným id. Nič to neodkrýva: `user_id`
                    je vo verejnom výpise aj tak (overené). */}
                {myId && r.user_id === myId ? <Badge text="TVOJ DOPYT" tone="navy" /> : null}
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
