/**
 * Uložené vyhľadávania — lišta nad katalógom.
 *
 * Prečo je to tu a nie v Profile: hľadanie sa ukladá aj používa v tom
 * istom okamihu a na tom istom mieste. Odložiť zoznam do Profilu by
 * znamenalo, že si ho nikto nikdy neotvorí.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import type { CatalogSort } from '@/lib/property';
import {
  countNewMatches,
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  suggestName,
  touchSavedSearch,
  type SavedSearch,
} from '@/lib/saved-search';
import { isFilterEmpty, type CatalogFilter } from '@/lib/search';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export function SavedSearches({
  myId,
  filter,
  sort,
  onApply,
}: {
  myId: string | undefined;
  filter: CatalogFilter;
  sort: CatalogSort;
  onApply: (f: CatalogFilter, s: CatalogSort) => void;
}) {
  const palette = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!myId) {
      setItems([]);
      return;
    }
    try {
      const rows = await listSavedSearches();
      setItems(rows);
      // Počty sa doťahujú po uložení zoznamu, aby lišta nečakala na ne.
      const next: Record<string, number> = {};
      for (const s of rows) {
        try {
          next[s.id] = await countNewMatches(s);
        } catch (e: unknown) {
          console.log(`[HĽADANIA] Počet nových zlyhal: ${errorText(e)}`);
        }
      }
      setCounts(next);
    } catch (e: unknown) {
      console.log(`[HĽADANIA] Načítanie zlyhalo: ${errorText(e)}`);
      setItems([]);
    }
  }, [myId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!myId || busy) return;
    setBusy(true);
    try {
      await saveSearch(myId, suggestName(filter), filter, sort);
      await load();
      toast('Hľadanie uložené');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[HĽADANIA] Uloženie zlyhalo: ${m}`);
      Alert.alert(
        'Uložiť sa nepodarilo',
        /duplicate key/i.test(m) ? 'Hľadanie s týmto názvom už máš uložené.' : m
      );
    } finally {
      setBusy(false);
    }
  }

  function remove(s: SavedSearch) {
    Alert.alert('Zmazať uložené hľadanie?', s.name, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedSearch(s.id);
            await load();
            toast('Hľadanie zmazané', 'info');
          } catch (e: unknown) {
            Alert.alert('Zmazanie zlyhalo', errorText(e));
          }
        },
      },
    ]);
  }

  if (!myId) return null;
  const canSave = !isFilterEmpty(filter);
  if (items.length === 0 && !canSave) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: palette.textMuted }]}>
        Uložené hľadanie si pamätá filter aj poradie. Číslo hovorí, koľko inzerátov
        pribudlo odvtedy, čo si ho naposledy otvoril. Vidíš ho len ty.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {canSave ? (
          <Pressable
            onPress={add}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.chip, { borderColor: palette.accent, backgroundColor: palette.surface }]}>
            <Text style={[styles.chipText, { color: palette.accentDeep }]}>
              {busy ? 'Ukladám…' : '+ Uložiť toto hľadanie'}
            </Text>
          </Pressable>
        ) : null}

        {items.map((s) => {
          const fresh = counts[s.id] ?? 0;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                onApply(s.filter, s.sort);
                // Otvorením sa počítadlo vynuluje — od tejto chvíle sú
                // „nové" tie, čo pribudnú neskôr.
                void touchSavedSearch(s.id)
                  .then(() => setCounts((c) => ({ ...c, [s.id]: 0 })))
                  .catch((e: unknown) =>
                    console.log(`[HĽADANIA] Označenie za videné zlyhalo: ${errorText(e)}`)
                  );
              }}
              onLongPress={() => remove(s)}
              accessibilityRole="button"
              accessibilityHint="Podržaním zmažeš"
              style={[
                styles.chip,
                {
                  borderColor: fresh > 0 ? palette.accent : palette.border,
                  backgroundColor: palette.surface,
                },
              ]}>
              <Text numberOfLines={1} style={[styles.chipText, { color: palette.textPrimary }]}>
                {s.name}
              </Text>
              {fresh > 0 ? (
                <View style={[styles.badge, { backgroundColor: palette.accentDeep }]}>
                  <Text style={[styles.badgeText, { color: palette.onPrimary }]}>{fresh}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  lead: { ...Type.caption },
  row: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    maxWidth: 220,
  },
  chipText: { ...Type.caption, fontWeight: Weight.semibold },
  badge: { minWidth: 20, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { ...Type.caption, fontWeight: Weight.bold, textAlign: 'center' },
});
