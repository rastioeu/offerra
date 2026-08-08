/**
 * Prázdne stavy s obrázkom, nie holá veta (bod 13C).
 *
 * Prázdna obrazovka je najhoršie miesto na jednoriadkovú informáciu —
 * človek nevie, či sa nič nenašlo, alebo sa niečo pokazilo. Preto tvar
 * „symbol → čo sa deje → čo s tým".
 *
 * Ilustrácia je SF Symbol v tlmenom krúžku, nie bitmapa: nepribúda tým
 * žiadny asset do balíka, škáluje sa s písmom a `Icon` má textovú náhradu
 * pre prípad, že by natívny modul chýbal.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Button } from './ui';

export function EmptyState({
  icon,
  title,
  body,
  actionTitle,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  /** Nepovinná akcia. Bez nej ostane len vysvetlenie. */
  actionTitle?: string;
  onAction?: () => void;
}) {
  const palette = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: palette.surfacePressed }]}>
        <Icon name={icon} size={34} color={palette.accentDeep} />
      </View>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>{body}</Text>
      {actionTitle && onAction ? (
        <View style={styles.action}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

/** Drobná verzia do karty (sekcie v Profile) — bez krúžku a bez akcie. */
export function EmptyNote({ children }: { children: string }) {
  const palette = useTheme();
  return <Text style={[styles.note, { color: palette.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  badge: {
    width: 74,
    height: 74,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: { ...Type.subtitle, fontWeight: Weight.bold, textAlign: 'center' },
  body: { ...Type.bodyMd, textAlign: 'center', maxWidth: 300 },
  action: { marginTop: Spacing.sm },
  note: { ...Type.bodyMd },
});
