/**
 * Hlavička s logom — na všetkých hlavných taboch (vzor MUTARK
 * `app-header.tsx`). Logo hore je to, čo Rastio vytkol ako chýbajúce.
 *
 * Wordmark je obrázok, nie text: značka je kreslená abeceda a nesmie sa
 * meniť podľa toho, aké fonty má telefón.
 *
 * BEZPEČNÁ ZÓNA (Rastio, 8.8.2026 — hlavička sa prelínala s dynamic
 * islandom): odsadenie zhora si po novom drží hlavička SAMA, nie obrazovka
 * pod ňou. Predtým to záviselo na tom, či konkrétna obrazovka nezabudla na
 * `edges={['top']}` — a to je presne ten druh chyby, ktorá sa objaví len na
 * niektorých obrazovkách a len na niektorých telefónoch. Takto sa farba
 * hlavičky natiahne až pod ostrovček a jej obsah je vždy pod ním.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { NotificationBell } from '@/components/notification-bell';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

export function AppHeader({ title }: { title?: string }) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.surface,
          borderBottomColor: palette.border,
          // Na telefónoch bez výrezu je `insets.top` malé (stavový riadok),
          // preto ešte spodná hranica — inak by logo lepilo na horný okraj.
          paddingTop: insets.top + Spacing.sm,
        },
      ]}>
      {/* Logo si variant aj glow rieši samo — hlavička o téme nič vedieť
          nemusí. Keby to bolo tu, pri ďalšej zmene témy by sa na to
          zabudlo presne tak, ako sa zabudlo teraz. */}
      <Logo />
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
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  title: { ...Type.caption, fontWeight: Weight.semibold, letterSpacing: 0.4 },
});
