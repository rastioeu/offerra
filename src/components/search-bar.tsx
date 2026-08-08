/**
 * Vyhľadávanie nad katalógom.
 *
 * Napíšeš vetu, appka z nej vytiahne filtre a **ukáže ti, čomu rozumela**.
 * To je celý vtip: nie magická čierna skrinka, ale odškrtnuteľné štítky,
 * ktoré sa dajú po jednom odobrať. Keď sa pomýli, vidíš kde.
 *
 * Rozbor je v `@/lib/search` a nepoužíva jazykový model — dôvody sú
 * popísané tam. Obec sa dohľadáva v `offerra.city`, takže „Petrzalka"
 * bez diakritiky nájde Petržalku.
 *
 * DVE STRANY TRHU, JEDNA LIŠTA (Rastio 8.8.2026, možnosť B). Tá istá
 * lišta slúži katalógu aj Dopytom — mení sa len `side`, teda SLOVÁ:
 * „Predaj / Prenájom" vs. „Kúpim / Hľadám prenájom". Zámerne to NIE JE
 * druhý komponent: dve kópie tej istej mechaniky sa časom rozídu a
 * používateľ by sa musel ovládanie učiť dvakrát.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { db, DEMAND_LABEL, PROPERTY_LABEL, TRANSACTION_LABEL, type PropertyType } from '@/lib/property';
import {
  describeFilter,
  EMPTY_FILTER,
  isFilterEmpty,
  parseQuery,
  type CatalogFilter,
  type FilterSide,
} from '@/lib/search';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

const TYPES: PropertyType[] = ['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL'];

/** Príklad vety musí sedieť na to, čo sa práve prehľadáva. */
const PLACEHOLDER: Record<FilterSide, string> = {
  PROPERTY: 'napr. 3-izbový byt v Petržalke do 250 tisíc',
  DEMAND: 'napr. kúpim dom v Nitre do 200 tisíc',
};

export function SearchBar({
  filter,
  onChange,
  side = 'PROPERTY',
}: {
  filter: CatalogFilter;
  onChange: (f: CatalogFilter) => void;
  /** Ktorá strana trhu — mení SLOVÁ, nie mechaniku. */
  side?: FilterSide;
}) {
  const palette = useTheme();
  const label = side === 'DEMAND' ? DEMAND_LABEL : TRANSACTION_LABEL;
  const [text, setText] = useState('');
  const [understood, setUnderstood] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);

  // Rozbor sa spustí až keď človek prestane písať.
  useEffect(() => {
    const q = text.trim();
    if (q === '') {
      setUnderstood([]);
      return;
    }
    setThinking(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { filter: parsed, understood: words, cityCandidates } = parseQuery(q);
      let next = { ...parsed };

      // Zvyšok vety skúsime nájsť ako obec. Ak sedí, je to filter na mesto;
      // ak nie, ostane fulltextom — nič sa nezahodí.
      for (const candidate of cityCandidates.slice(0, 4)) {
        try {
          const { data } = await db()
            .from('city')
            .select('name')
            .ilike('name', `${candidate}%`)
            .order('population', { ascending: false, nullsFirst: false })
            .limit(1);
          const hit = (data ?? [])[0] as { name: string } | undefined;
          if (hit) {
            // Obec vypadne z fulltextu — inak by sa hľadala aj v názve
            // a popise a zbytočne zúžila výsledok.
            const rest = (parsed.text ?? '')
              .split(' ')
              .filter((w) => w && !candidate.includes(w))
              .join(' ');
            next = { ...next, city: hit.name, text: rest || null };
            words.push(hit.name);
            break;
          }
        } catch (e: unknown) {
          console.log(`[HĽADANIE] Obec sa nepodarilo overiť: ${String(e)}`);
        }
      }

      if (cancelled) return;
      setUnderstood(words);
      setThinking(false);
      onChange(next);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function toggle<K extends keyof CatalogFilter>(key: K, value: CatalogFilter[K]) {
    onChange({ ...filter, [key]: filter[key] === value ? null : value });
  }

  function clearAll() {
    setText('');
    setUnderstood([]);
    onChange({ ...EMPTY_FILTER });
  }

  const chips = describeFilter(filter, side);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={PLACEHOLDER[side]}
        placeholderTextColor={palette.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        style={[
          styles.input,
          { backgroundColor: palette.surface, borderColor: palette.borderStrong, color: palette.textPrimary },
        ]}
      />

      {thinking ? (
        <Text style={[styles.hint, { color: palette.textMuted }]}>Rozumiem vete…</Text>
      ) : understood.length > 0 ? (
        <Text style={[styles.hint, { color: palette.link }]}>
          Rozumiem: {understood.join(' · ')}
        </Text>
      ) : null}

      <View style={styles.row}>
        {(['SALE', 'RENT'] as const).map((t) => (
          <Chip
            key={t}
            label={label[t]}
            active={filter.transaction === t}
            onPress={() => toggle('transaction', t)}
          />
        ))}
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={PROPERTY_LABEL[t]}
            active={filter.propertyType === t}
            onPress={() => toggle('propertyType', t)}
          />
        ))}
      </View>

      {!isFilterEmpty(filter) ? (
        <View style={styles.activeRow}>
          <Text style={[styles.active, { color: palette.textSecondary }]} numberOfLines={2}>
            {chips.join(' · ')}
          </Text>
          <Pressable onPress={clearAll} accessibilityRole="button" hitSlop={10}>
            <Text style={[styles.clear, { color: palette.link }]}>Zrušiť</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? palette.primary : palette.surface,
          borderColor: active ? palette.primary : palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? palette.onPrimary : palette.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Type.bodyLg,
  },
  hint: { ...Type.caption, fontWeight: Weight.medium },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipText: { ...Type.caption, fontWeight: Weight.semibold },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  active: { ...Type.caption, flexShrink: 1 },
  clear: { ...Type.caption, fontWeight: Weight.bold },
});
