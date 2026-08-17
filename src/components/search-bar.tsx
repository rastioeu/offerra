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
import { db, type CatalogSort } from '@/lib/property';
import { CATALOG_SORTS, DEMAND_SORTS, filterRows } from '@/lib/filter-rows';
import {
  describeFilter,
  EMPTY_FILTER,
  isFilterEmpty,
  parseQuery,
  type CatalogFilter,
  type FilterSide,
} from '@/lib/search';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

/** Príklad vety musí sedieť na to, čo sa práve prehľadáva. */
const PLACEHOLDER: Record<FilterSide, string> = {
  PROPERTY: 'napr. 3-izbový byt v Petržalke do 250 tisíc',
  DEMAND: 'napr. kúpim dom v Nitre do 200 tisíc',
};

export function SearchBar({
  filter,
  onChange,
  side = 'PROPERTY',
  sort,
  onSortChange,
  sorts,
  canFavorite,
}: {
  filter: CatalogFilter;
  onChange: (f: CatalogFilter) => void;
  /** Ktorá strana trhu — mení SLOVÁ, nie mechaniku. */
  side?: FilterSide;
  /**
   * Triedenie. Zobrazí sa LEN keď ho obrazovka podá. Katalóg ponúka
   * „Najnovšie" aj „Čoskoro končí"; Dopyty len „Najnovšie" (Rastio,
   * 17.8.2026) — `buyer_request` nemá v modeli uzávierku, takže „Čoskoro
   * končí" by tam nemalo podľa čoho triediť (overené v modeli 8.8.2026).
   * Ktoré možnosti sa ukážu, rieši `sorts`.
   */
  sort?: CatalogSort;
  onSortChange?: (s: CatalogSort) => void;
  /**
   * Ktoré triedenia ponúknuť. Keď to obrazovka nepodá, riadi sa to stranou
   * trhu: katalóg `CATALOG_SORTS`, Dopyty `DEMAND_SORTS`.
   */
  sorts?: CatalogSort[];
  /** Prihlásený? Neprihlásenému sa „Obľúbené" neponúka — nemá ich kam uložiť. */
  canFavorite?: boolean;
}) {
  const palette = useTheme();
  // Riadky filtrov sú DÁTA — tá istá funkcia pre katalóg aj Dopyty, aby sa
  // poradie nemohlo rozísť medzi tabmi (`src/lib/filter-rows.ts`).
  const rows = filterRows({
    side,
    sorts:
      sort && onSortChange ? (sorts ?? (side === 'DEMAND' ? DEMAND_SORTS : CATALOG_SORTS)) : [],
    canFavorite: Boolean(canFavorite),
  });
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
            // `candidate` už z rozboru vety prichádza bez diakritiky.
            .like('name_norm', `${candidate}%`)
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
          console.log(`[HĽADANIE] Obec sa nepodarilo overiť: ${errorText(e)}`);
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
        placeholderTextColor={palette.textPlaceholder}
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

      {/* TRI RIADKY PODĽA VÝZNAMU (Rastio, 17.8.2026). Predtým to bol jeden
          zalamovaný zoznam čipov, takže sa lámal podľa ŠÍRKY obrazovky, nie
          podľa významu — „Predaj/Prenájom/Byt/Dom" skončilo v jednom riadku.
          Riadky sú teraz dáta z `filterRows()`, takže poradie sa dá overiť
          testom a nemôže sa rozísť medzi tabom Nehnuteľnosti a Dopytmi.

          Poradie samo (Rastio, 12.8.2026): najprv to, ČO človek hľadá —
          typ obchodu, typ nehnuteľnosti. Až za tým triedenie a srdiečko;
          tie nezužujú, čo sa hľadá, len menia pohľad na výsledok. */}
      <View style={styles.filters}>
      {rows.map((row) => (
        <View
          key={row.kind}
          // Riadok „Triedenie a obľúbené" je oddelený linkou: je to iná
          // kategória než dva riadky nad ním (zužovanie vs. pohľad).
          style={[
            styles.row,
            row.kind === 'VIEW' ? [styles.viewRow, { borderTopColor: palette.border }] : null,
          ]}
          accessibilityLabel={row.title}>
          {row.chips.map((chip) => {
            switch (chip.kind) {
              case 'TRANSACTION':
                return (
                  <Chip
                    key={chip.value}
                    label={chip.label}
                    active={filter.transaction === chip.value}
                    onPress={() => toggle('transaction', chip.value)}
                  />
                );
              case 'PROPERTY_TYPE':
                return (
                  <Chip
                    key={chip.value}
                    label={chip.label}
                    active={filter.propertyType === chip.value}
                    onPress={() => toggle('propertyType', chip.value)}
                  />
                );
              case 'SORT':
                return (
                  <Chip
                    key={chip.value}
                    label={chip.label}
                    active={sort === chip.value}
                    onPress={() => onSortChange?.(chip.value)}
                  />
                );
              case 'FAVORITES':
                return (
                  <Chip
                    key="FAVORITES"
                    label={chip.label}
                    accessibilityLabel={chip.accessibilityLabel}
                    active={filter.onlyFavorites === true}
                    onPress={() =>
                      onChange({ ...filter, onlyFavorites: filter.onlyFavorites ? null : true })
                    }
                  />
                );
            }
          })}
        </View>
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

function Chip({
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Keď je čip len ikona, čítačka obrazovky potrebuje slovo. */
  accessibilityLabel?: string;
}) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          // Aktívny filter je TERAKOTOVÝ (mockup „Dôveryhodne teplá").
          // Navy ostáva pre nadpisy a odznaky — dva rôzne významy nesmú
          // mať tú istú farbu.
          backgroundColor: active ? palette.accentDeep : palette.surface,
          borderColor: active ? palette.accentDeep : palette.border,
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
  /**
   * Medzera MEDZI riadkami je dvojnásobok medzery medzi čipmi v riadku
   * (8 vs. 4). To je celé, čo z troch riadkov robí tri kategórie namiesto
   * jedného zalamovaného zoznamu — plus linka nad posledným riadkom.
   */
  filters: { rowGap: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  /** „Triedenie a obľúbené" — iná kategória než dva riadky nad ním. */
  viewRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
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
