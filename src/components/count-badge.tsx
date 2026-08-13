/**
 * Červený krúžok s číslom nad ikonou.
 *
 * Vznikol tak, že sa vybral zo zvončeka (Rastio, 12.8.2026) — odznak na
 * tabe „Správa" má vyzerať rovnako a druhá kópia tých istých štýlov by sa
 * časom rozišla. Zvonček aj tab teraz kreslia TEN ISTÝ komponent.
 *
 * Nad 9 sa píše „9+“: presné číslo sa do krúžku pri ikone nezmestí a nie je
 * to údaj, s ktorým sa počíta — je to signál, že niečo čaká.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Type, Weight } from '@/theme/tokens';

export function CountBadge({ count }: { count: number }) {
  const palette = useTheme();
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: palette.danger, borderColor: palette.background }]}>
      <Text style={[styles.count, { color: palette.onPrimary }]}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  count: { ...Type.caption, fontSize: 11, lineHeight: 13, fontWeight: Weight.bold },
});
