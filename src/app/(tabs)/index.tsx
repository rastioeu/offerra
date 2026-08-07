/**
 * Verejný katalóg. RLS pustí len `status='ACTIVE'` — DRAFT sa sem nemá ako
 * dostať ani omylom, filtrovanie nie je len v `.eq()` v dotaze.
 *
 * Filtre a mapa prídu vo Fáze 6, ponuky vo Fáze 2.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { NotificationBell } from '@/components/notification-bell';
import { SearchBar } from '@/components/search-bar';
import { ErrorNote, PropertyCardSkeleton } from '@/components/ui';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { useProperties } from '@/hooks/use-properties';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { EMPTY_FILTER, isFilterEmpty, type CatalogFilter } from '@/lib/search';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function NehnutelnostiScreen() {
  const palette = useTheme();
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY_FILTER);
  const { items, error, reload } = useProperties(filter);
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useSession();
  const { ids: favorites, toggle } = useFavoriteIds(session?.user.id);
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
          <View style={styles.headRow}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Nehnuteľnosti</Text>
            <NotificationBell />
          </View>
          {items ? (
            <Text style={[styles.count, { color: palette.textMuted }]}>
              {items.length === 0
                ? 'Zatiaľ tu nič nie je'
                : `${items.length} ${items.length === 1 ? 'inzerát' : items.length < 5 ? 'inzeráty' : 'inzerátov'}`}
            </Text>
          ) : null}
        </View>

        <SearchBar filter={filter} onChange={setFilter} />

        <ErrorNote error={error} />

        {/* Kostry namiesto krúžku — používateľ vidí, ČO sa načítava. */}
        {items === undefined ? (
          <>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </>
        ) : null}

        {items?.length === 0 && !error ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            {isFilterEmpty(filter)
              ? 'Žiadne zverejnené inzeráty. Pridaj prvý cez tab „Pridať".'
              : 'Tomuto hľadaniu nič nezodpovedá. Skús ubrať niektorý filter.'}
          </Text>
        ) : null}

        {items?.map((item) => (
          <PropertyCard
            key={item.id}
            item={item}
            favorite={favorites.has(item.id)}
            onToggleFavorite={session ? () => toggle(item.id) : undefined}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  head: { gap: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.hero, fontWeight: Weight.bold },
  count: { ...Type.bodyMd },
  spinner: { marginTop: Spacing.xxl },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
});
