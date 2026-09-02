/**
 * Zobrazenie odpočtu platnosti ponuky — čistý render okolo `offerCountdown`
 * (`src/lib/offer-validity.ts`). Samotné TIKANIE (interval, cleanup, jeden
 * spoločný na obrazovku) rieši `useOfferCountdownTick` u VOLAJÚCEHO — táto
 * komponenta dostáva `now` ako hotovú hodnotu a nezakladá žiadny vlastný
 * timer. Bez tohto rozdelenia by pri N ponukách v zozname vzniklo N
 * timerov namiesto jedného (Rastio, 1.9.2026).
 */
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { offerCountdown } from '@/lib/offer-validity';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export function OfferCountdownText({
  status,
  validUntil,
  now,
  style,
}: {
  status: string;
  validUntil: string | null;
  now: number;
  style?: StyleProp<TextStyle>;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const cd = offerCountdown(t, language, status, validUntil, now);
  if (!cd) return null;

  // Uplynutá platnosť = varovanie (rovnaká farba ako inde v appke pri
  // prešlých termínoch). Posledná hodina = naliehavosť, silnejšia farba —
  // presne to Rastio žiadal ako „vizuálne zvýraznenie".
  const color = cd.tier === 'expired' ? palette.warning : cd.urgent ? palette.danger : palette.textMuted;

  return (
    <Text style={[{ color }, cd.urgent ? styles.urgent : styles.normal, style]}>{cd.text}</Text>
  );
}

const styles = {
  normal: { ...Type.caption },
  urgent: { ...Type.caption, fontWeight: Weight.bold },
} as const;

/**
 * Odpočet ako VLASTNÝ pill/odznak s ikonou hodín — nie holý text (Rastio,
 * 2.9.2026, štvrté kolo): tlmená sivá splývala s ostatnými meta údajmi
 * na karte („Bratislava · 236 izieb", „Pridané…") a odpočet zanikol úplne.
 * Riešenie NIE JE ďalšia farba textu, ale VLASTNÁ VIZUÁLNA FORMA — jemné
 * teplé pozadie (`accentSoft`), rovnaká rodina ako `Badge`/`PhotoBadge`
 * (zaoblené rohy, drobný padding), len menšie a decentnejšie, plus ikona
 * hodín PRED textom (komunikuje „časový údaj" ešte pred prečítaním).
 *
 * LEN pre BEŽIACI, NIE naliehavý stav (`urgent === false`, `tier !==
 * 'expired'`) — posledná hodina ostáva plain červený text bez pill-u
 * (Rastio: „tam už má poplašná farba zmysel", pill by ju len zoslabil) a
 * `expired` je fakt, nie odpočet, takže tiež bez pill-u. O tento výber
 * sa stará VOLAJÚCI (`property-card.tsx`, `my-listing-row.tsx`), táto
 * komponenta je len samotný pill.
 */
export function OfferCountdownPill({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const palette = useTheme();
  return (
    <View style={[pillStyles.pill, { backgroundColor: palette.accentSoft }, style]}>
      <Icon name="clock" size={12} color={palette.accentDeep} />
      <Text style={[pillStyles.text, { color: palette.accentDeep }]}>{text}</Text>
    </View>
  );
}

const pillStyles = {
  pill: {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  text: { ...Type.caption, fontWeight: Weight.semibold },
} as const;
