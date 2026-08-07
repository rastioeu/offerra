/**
 * Hlavička s logom — na všetkých hlavných taboch (vzor MUTARK
 * `app-header.tsx`). Logo hore je to, čo Rastio vytkol ako chýbajúce.
 *
 * Wordmark je obrázok, nie text: značka je kreslená abeceda a nesmie sa
 * meniť podľa toho, aké fonty má telefón.
 */
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { NotificationBell } from '@/components/notification-bell';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

export function AppHeader({ title }: { title?: string }) {
  const palette = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
      <Image
        source={require('../../assets/images/wordmark.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Offerra"
      />
      <View style={styles.right}>
        {title ? <Text style={[styles.title, { color: palette.textMuted }]}>{title}</Text> : null}
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: { width: 104, height: 26 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  title: { ...Type.caption, fontWeight: Weight.semibold, letterSpacing: 0.4 },
});
