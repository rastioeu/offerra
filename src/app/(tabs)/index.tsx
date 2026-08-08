/**
 * Verejný katalóg. RLS pustí len `status='ACTIVE'` — DRAFT sa sem nemá ako
 * dostať ani omylom, filtrovanie nie je len v `.eq()` v dotaze.
 *
 * Zobrazenie sa prepína medzi ZOZNAMOM a MAPOU. Filter platí pre obe —
 * mapa nie je iná obrazovka, len iný pohľad na tú istú množinu.
 */
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PropertyCard } from '@/components/property-card';
import { PropertyMap } from '@/components/property-map';
import { ReportButton } from '@/components/report-button';

import { AppHeader } from '@/components/app-header';
import { HowItWorksCard } from '@/components/how-it-works-card';
import { SearchBar } from '@/components/search-bar';
import { ErrorNote, PropertyCardSkeleton } from '@/components/ui';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useHints } from '@/hooks/use-hints';
import { useSession } from '@/hooks/use-session';
import { useProperties } from '@/hooks/use-properties';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { EMPTY_FILTER, isFilterEmpty, type CatalogFilter } from '@/lib/search';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function NehnutelnostiScreen() {
  const palette = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<CatalogFilter>(EMPTY_FILTER);
  const { items, error, reload } = useProperties(filter);
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useSession();
  const { ids: favorites, toggle } = useFavoriteIds(session?.user.id);
  const { shouldShow, dismiss } = useHints(session?.user.id);
  const [view, setView] = useState<'LIST' | 'MAP'>('LIST');
  // Nahlásenie z podržania prstu na karte. Formulár je ten istý ako inde,
  // len sa otvára odtiaľto — preto stačí držať id, nie druhý formulár.
  const [reporting, setReporting] = useState<string | null>(null);
  useRefreshOnFocus(reload);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // Hlavička je pre zoznam aj mapu tá istá — preto premenná, nie dva
  // rozkopírované bloky, ktoré by sa časom rozišli.
  const head = (
    <View style={styles.head}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Nehnuteľnosti</Text>
        <View style={[styles.toggle, { backgroundColor: palette.surfacePressed }]}>
          {(['LIST', 'MAP'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === v }}
              style={[styles.toggleBtn, view === v ? { backgroundColor: palette.surface } : null]}>
              <Text
                style={[
                  styles.toggleText,
                  { color: view === v ? palette.primary : palette.textMuted },
                ]}>
                {v === 'LIST' ? 'Zoznam' : 'Mapa'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {items ? (
        <Text style={[styles.count, { color: palette.textMuted }]}>
          {items.length === 0
            ? 'Zatiaľ tu nič nie je'
            : `${items.length} ${items.length === 1 ? 'inzerát' : items.length < 5 ? 'inzeráty' : 'inzerátov'}`}
        </Text>
      ) : null}
    </View>
  );

  // Mapa NESMIE byť v ScrollView — posúvanie mapy prstom by si so
  // scrollovaním stránky navzájom kradlo gesto. Preto je to samostatná
  // vetva, ktorá vyplní zvyšok obrazovky.
  if (view === 'MAP') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
        <AppHeader />
        <View style={styles.mapHead}>
          {head}
          <SearchBar filter={filter} onChange={setFilter} />
          <ErrorNote error={error} />
        </View>
        <PropertyMap
          items={items ?? []}
          onPress={(id) => router.push({ pathname: '/nehnutelnost/[id]', params: { id } })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}>
        {shouldShow('HOW_IT_WORKS') ? (
          <HowItWorksCard onDismiss={() => dismiss('HOW_IT_WORKS')} />
        ) : null}

        {head}

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
            // Vlastný inzerát sa nahlásiť nedá — ponuka akcie, ktorá by
            // aj tak neprešla, je horšia než jej absencia.
            onReport={
              session && item.owner_id !== session.user.id
                ? () => setReporting(item.id)
                : undefined
            }
          />
        ))}
      </ScrollView>

      {reporting ? (
        <ReportButton
          targetType="PROPERTY"
          targetId={reporting}
          label="Nahlásiť inzerát"
          hideTrigger
          openExternally
          onExternalClose={() => setReporting(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  head: { gap: 2 },
  mapHead: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: { flexDirection: 'row', borderRadius: 999, padding: 3, gap: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  toggleText: { ...Type.caption, fontWeight: Weight.semibold },
  title: { ...Type.hero, fontWeight: Weight.bold },
  count: { ...Type.bodyMd },
  spinner: { marginTop: Spacing.xxl },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
});
