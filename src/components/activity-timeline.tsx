/**
 * Časová os aktivity — vzor MUTARK „Moje tajomstvá".
 *
 * Rozdiel oproti plochému zoznamu: udalosti z RÔZNYCH zdrojov (inzeráty,
 * moje ponuky, prijaté ponuky, dopyty) sú **zlúčené a zoradené podľa
 * času**, takže vidno príbeh — kedy si čo pridal a čo sa na to dialo.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export type ActivityEvent = {
  id: string;
  at: string;
  kind: 'INZERAT' | 'PONUKA_ODOSLANA' | 'PONUKA_PRIJATA' | 'DOPYT';
  title: string;
  detail?: string;
  onPress?: () => void;
};

const KIND_LABEL: Record<ActivityEvent['kind'], string> = {
  INZERAT: 'Pridal si inzerát',
  PONUKA_ODOSLANA: 'Podal si ponuku',
  PONUKA_PRIJATA: 'Dostal si ponuku',
  DOPYT: 'Pridal si dopyt',
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay) return 'Dnes';
  if (d.toDateString() === yesterday.toDateString()) return 'Včera';
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long' }).format(d);
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const palette = useTheme();

  if (events.length === 0) {
    return (
      <Text style={[styles.empty, { color: palette.textMuted }]}>
        Zatiaľ tu nič nie je. Pridaj inzerát alebo podaj ponuku.
      </Text>
    );
  }

  let lastDay = '';

  return (
    <View style={styles.wrap}>
      {events.map((e) => {
        const day = dayLabel(e.at);
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
