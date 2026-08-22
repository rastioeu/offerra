/**
 * Cesta ponuky — podaná → videná → rozhodnutá (bod 13B, 8.8.2026).
 *
 * Prečo vôbec: záujemca po podaní ponuky nevedel NIČ, kým ju majiteľ
 * neprijal alebo neodmietol. Pri nehnuteľnostiach to sú aj týždne ticha,
 * v ktorých človek nevie, či sa jeho ponuka vôbec dostala pred oči.
 * Razítko „predávajúci ju videl" je najlacnejšia informácia, ktorá to
 * ticho preruší — a v DB ho vie zapísať len majiteľ, takže neklame.
 *
 * Tvarom nadväzuje na `ActivityTimeline` v Profile: zvislá os s bodkami.
 * Nedokončené kroky sú sivé a prázdne, aby bolo vidieť, kde sa to zaseklo.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { offerSteps, type Offer } from '@/lib/offers';
import { formatDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export function OfferTimeline({ offer }: { offer: Offer }) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const steps = offerSteps(t, offer);

  return (
    <View style={styles.wrap}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={s.label} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: s.done ? palette.accentDeep : 'transparent',
                    borderColor: s.done ? palette.accentDeep : palette.borderStrong,
                  },
                ]}
              />
              {!last ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: steps[i + 1].done ? palette.accentDeep : palette.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  { color: s.done ? palette.textPrimary : palette.textMuted },
                ]}>
                {s.label}
              </Text>
              {s.at ? (
                <Text style={[styles.at, { color: palette.textMuted }]}>{formatDate(language, s.at)}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.md },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, marginTop: 3 },
  line: { width: 2, flex: 1, borderRadius: Radius.full, marginVertical: 2 },
  content: { flex: 1, paddingBottom: Spacing.md, gap: 1 },
  label: { ...Type.bodyMd, fontWeight: Weight.semibold },
  at: { ...Type.caption },
});
