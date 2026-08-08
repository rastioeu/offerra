/**
 * Výber mesta/obce z tabuľky `offerra.city` (2 925 slovenských obcí,
 * 79 okresov + Bratislava a Košice ako celok).
 *
 * Nie je to rozbaľovačka — pri 2 925 položkách je jediné použiteľné
 * riešenie hľadanie podľa názvu. Dotaz ide do DB (`ilike`), nie cez
 * načítanie celého zoznamu do pamäte telefónu.
 *
 * Výber obce po novom vracia aj KRAJ a SÚRADNICE (8.8.2026). Bez toho by sa
 * inzerát nikdy neobjavil na mape — súradnice nemá kde inde vziať, presnú
 * adresu totiž zámerne nepýtame.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { db, type City } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { ErrorNote, Label } from './ui';

/** Čo sa o obci dozvie formulár. Súradnice môžu chýbať — obec bez nich sa
 *  proste neobjaví na mape, uložiť sa ale dá. */
export type PickedCity = {
  city: string;
  district: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
};

export function CityPicker({
  city,
  district,
  onPick,
}: {
  city: string | null;
  district: string | null;
  onPick: (picked: PickedCity) => void;
}) {
  const palette = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        let q = db().from('city').select('*');
        if (query.trim().length > 0) q = q.ilike('name', `${query.trim()}%`);
        const { data, error: e } = await q
          .order('population', { ascending: false, nullsFirst: false })
          .limit(40);
        if (e) throw e;
        if (!cancelled) setResults((data ?? []) as City[]);
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : String(e);
        console.log(`[MESTÁ] Hľadanie zlyhalo: ${m}`);
        if (!cancelled) {
          setError(m);
          setResults([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <View style={styles.group}>
      <Label hint="Podľa obce sa dopĺňa kraj aj poloha na mape. Presnú adresu nepýtame.">
        Mesto / obec
      </Label>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.select,
          { backgroundColor: palette.surface, borderColor: palette.borderStrong, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={[styles.selectText, { color: city ? palette.textPrimary : palette.textMuted }]}>
          {city ? `${city}${district ? ` · ${district}` : ''}` : 'Vyber obec…'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: palette.background }]}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Vyber obec</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" hitSlop={12}>
              <Text style={[styles.close, { color: palette.link }]}>Zavrieť</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Začni písať názov obce…"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.search,
              { backgroundColor: palette.surface, borderColor: palette.borderStrong, color: palette.textPrimary },
            ]}
          />

          <ErrorNote error={error} />

          {busy ? <ActivityIndicator style={styles.spinner} color={palette.primary} /> : null}

          {!busy && results.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textMuted }]}>
              Nič sa nenašlo. Skús inú časť názvu.
            </Text>
          ) : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {results.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  onPick({
                    city: c.name,
                    district: c.district,
                    region: c.region,
                    latitude: c.lat,
                    longitude: c.lon,
                  });
                  setOpen(false);
                  setQuery('');
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: palette.border, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                ]}>
                <Text style={[styles.rowName, { color: palette.textPrimary }]}>{c.name}</Text>
                <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
                  {c.district} · {c.region}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  select: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  selectText: { ...Type.bodyLg },
  modal: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...Type.title, fontWeight: Weight.bold },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
  search: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, ...Type.bodyLg },
  spinner: { marginTop: Spacing.md },
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.lg },
  list: { flex: 1 },
  row: { paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  rowName: { ...Type.bodyLg, fontWeight: Weight.medium },
  rowMeta: { ...Type.caption },
});
