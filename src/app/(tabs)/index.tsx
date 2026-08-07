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
import { ErrorNote } from '@/components/ui';
import { useProperties } from '@/hooks/use-properties';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function NehnutelnostiScreen() {
  const palette = useTheme();
  const { items, error, reload } = useProperties();
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
          <Text style={[styles.title, { color: palette.textPrimary }]}>Nehnuteľnosti</Text>
          {items ? (
            <Text style={[styles.count, { color: palette.textMuted }]}>
              {items.length === 0
                ? 'Zatiaľ tu nič nie je'
                : `${items.length} ${items.length === 1 ? 'inzerát' : items.length < 5 ? 'inzeráty' : 'inzerátov'}`}
            </Text>
          ) : null}
        </View>

        <ErrorNote error={error} />

        {items === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {items?.length === 0 && !error ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            Žiadne zverejnené inzeráty. Pridaj prvý cez tab „Pridať".
          </Text>
        ) : null}

        {items?.map((item) => (
          <PropertyCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  head: { gap: 2 },
  title: { ...Type.hero, fontWeight: Weight.bold },
  count: { ...Type.bodyMd },
  spinner: { marginTop: Spacing.xxl },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
});
