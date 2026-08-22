/**
 * Správa ponúk — pohľad MAJITEĽA. `id` je id nehnuteľnosti.
 *
 * Samotné rozhodovanie (zoznam, spodný panel, Prijať/Odmietnuť/Uzavrieť) je
 * v `OwnerOffers`, lebo od 12.8.2026 je to isté aj v podtabe „Ponuky" na
 * detaile inzerátu. Táto obrazovka ostáva, lebo na ňu vedie upozornenie
 * o novej ponuke aj ťuknutie z „Moje" — a majiteľ tu má inzerát sám pre seba,
 * bez galérie a bez verejnej časti.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OwnerOffers } from '@/components/owner-offers';
import { ErrorNote } from '@/components/ui';
import { useOffers } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function ManageOffersScreen() {
  const palette = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, reload: reloadProperty } = useProperty(id);
  const { offers, error, reload } = useOffers(id);
  useRefreshOnFocus(reload);

  // Razítko „majiteľ ponuky videl" sadí `OwnerOffers` — platí rovnako pre
  // túto obrazovku aj pre podtab na detaile inzerátu.

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('manageOffers.screenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
          // Z profilu sa ťuknutím ide sem, nie do úpravy — inzerát sa
          // preto musí dať upraviť odtiaľto, inak by k nemu po zverejnení
          // neviedla žiadna cesta.
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/inzerat/[id]', params: { id: String(id) } })}
              accessibilityRole="button"
              hitSlop={12}>
              <Text style={[styles.headerAction, { color: palette.primary }]}>{t('manageOffers.editAction')}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />

        {offers === undefined || !item ? (
          <ActivityIndicator color={palette.primary} style={styles.spinner} />
        ) : null}

        {item ? <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text> : null}

        {item && offers ? (
          <OwnerOffers item={item} offers={offers} reload={reload} reloadProperty={reloadProperty} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerAction: { ...Type.bodyLg, fontWeight: Weight.semibold },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  spinner: { marginTop: Spacing.xxl },
  title: { ...Type.title, fontWeight: Weight.bold },
});
