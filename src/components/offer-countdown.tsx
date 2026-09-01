/**
 * Zobrazenie odpočtu platnosti ponuky — čistý render okolo `offerCountdown`
 * (`src/lib/offer-validity.ts`). Samotné TIKANIE (interval, cleanup, jeden
 * spoločný na obrazovku) rieši `useOfferCountdownTick` u VOLAJÚCEHO — táto
 * komponenta dostáva `now` ako hotovú hodnotu a nezakladá žiadny vlastný
 * timer. Bez tohto rozdelenia by pri N ponukách v zozname vzniklo N
 * timerov namiesto jedného (Rastio, 1.9.2026).
 */
import { StyleProp, Text, TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { offerCountdown } from '@/lib/offer-validity';
import { Type, Weight } from '@/theme/tokens';

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
