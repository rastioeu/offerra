/**
 * Časová os aktivity — vzor MUTARK „Moje tajomstvá".
 *
 * Rozdiel oproti plochému zoznamu: udalosti z RÔZNYCH zdrojov (inzeráty,
 * moje ponuky, prijaté ponuky, dopyty) sú **zlúčené a zoradené podľa
 * času**, takže vidno príbeh — kedy si čo pridal a čo sa na to dialo.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation, type TFunc } from '@/i18n';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export type ActivityEvent = {
  id: string;
  at: string;
  kind: 'INZERAT' | 'PONUKA_ODOSLANA' | 'PONUKA_PRIJATA' | 'DOPYT' | 'OSLOVENIE_DOPYTU';
  title: string;
  detail?: string;
  onPress?: () => void;
};

function kindLabel(t: TFunc): Record<ActivityEvent['kind'], string> {
  return {
    INZERAT: t('activityTimeline.kindListing'),
    PONUKA_ODOSLANA: t('activityTimeline.kindOfferSent'),
    PONUKA_PRIJATA: t('activityTimeline.kindOfferReceived'),
    DOPYT: t('activityTimeline.kindDemand'),
    // Jediná udalosť, ktorú nespôsobil používateľ — preto formulácia
    // v tretej osobe. Chýbala úplne (Rastio, 9.8.2026): dopytová strana
    // sa na časovej osi neprejavila vôbec.
    OSLOVENIE_DOPYTU: t('activityTimeline.kindOutreach'),
  };
}

function dayLabel(t: TFunc, language: string, iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay) return t('activityTimeline.today');
  if (d.toDateString() === yesterday.toDateString()) return t('activityTimeline.yesterday');
  const tag = language === 'de' ? 'de-DE' : language === 'en' ? 'en-GB' : 'sk-SK';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long' }).format(d);
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const KIND_LABEL = kindLabel(t);

  if (events.length === 0) {
    return (
      <Text style={[styles.empty, { color: palette.textMuted }]}>
        {t('activityTimeline.empty')}
      </Text>
    );
  }

  let lastDay = '';

  return (
    <View style={styles.wrap}>
      {events.map((e) => {
        const day = dayLabel(t, language, e.at);
        const newDay = day !== lastDay;
        lastDay = day;
        // Celý riadok je klikateľný, nie len názov (Rastio, 8.8.2026).
        // Bez `onPress` ostáva obyčajný `View` — Pressable, ktorý nič
        // nerobí, by len klamal, že sa dá ťuknúť.
        const Wrap = e.onPress ? Pressable : View;
        return (
          <View key={`${e.kind}-${e.id}`}>
            {newDay ? (
              <Text style={[styles.day, { color: palette.textMuted }]}>{day}</Text>
            ) : null}
            <Wrap
              onPress={e.onPress}
              accessibilityRole={e.onPress ? 'button' : undefined}
              style={styles.row}>
              {/* Zvislá os s bodkou — vďaka nej sa to číta ako postupnosť,
                  nie ako zoznam. */}
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: palette.secondary }]} />
                <View style={[styles.line, { backgroundColor: palette.border }]} />
              </View>
              <View style={styles.content}>
                <Text style={[styles.kind, { color: palette.link }]}>{KIND_LABEL[e.kind]}</Text>
                <Text numberOfLines={2} style={[styles.title, { color: palette.textPrimary }]}>
                  {e.title}
                </Text>
                {e.detail ? (
                  <Text style={[styles.detail, { color: palette.textMuted }]}>{e.detail}</Text>
                ) : null}
              </View>
            </Wrap>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  empty: { ...Type.bodyMd },
  day: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 0.5, marginTop: Spacing.sm, marginBottom: 4 },
  row: { flexDirection: 'row', gap: Spacing.md },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 2, flex: 1, borderRadius: Radius.full, marginVertical: 2 },
  content: { flex: 1, paddingBottom: Spacing.md, gap: 2 },
  kind: { ...Type.caption, fontWeight: Weight.semibold },
  title: { ...Type.bodyMd, fontWeight: Weight.medium },
  detail: { ...Type.caption },
});
