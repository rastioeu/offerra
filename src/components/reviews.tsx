/**
 * Verejné hodnotenia človeka — hviezdičky aj text.
 *
 * Zobrazuje sa pri inzeráte, teda presne tam, kde sa niekto rozhoduje, či
 * s tým človekom obchodovať. V profile, kam nikto cudzí nechodí, by to
 * nikomu nepomohlo.
 *
 * Text je verejný (rozhodnutie Rastia 9.8.2026): zmyslom hodnotení je
 * dôvera pre budúcich záujemcov a tým priemer sám nestačí. Proti
 * osočovaniu stojí nahlasovanie, nie skrývanie.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { errorText, isNotDeployedYet } from '@/lib/errors';
import { formatDate } from '@/lib/property';
import { fetchReviews, ratingLabel, type Review, type RatingSummary } from '@/lib/rating';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Avatar } from './avatar';
import { Card, Eyebrow } from './ui';

export function Reviews({
  userId,
  nickname,
  summary,
}: {
  userId: string;
  nickname: string;
  summary: RatingSummary | undefined;
}) {
  const palette = useTheme();
  const [items, setItems] = useState<Review[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchReviews(userId)
      .then((r) => {
        if (!cancelled) setItems(r);
      })
      .catch((e: unknown) => {
        // Tabuľka ešte nemusí byť nasadená — sekcia sa vtedy nezobrazí
        // vôbec, namiesto chybovej hlášky pri inzeráte.
        if (isNotDeployedYet(e)) return;
        console.log(`[HODNOTENIA] Načítanie zlyhalo: ${errorText(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const label = ratingLabel(summary);
  // Bez hodnotení nemá karta čo povedať — prázdna sekcia „zatiaľ nič"
  // pri každom novom človeku by len zaberala miesto.
  if (!label && (items === null || items.length === 0)) return null;

  return (
    <Card>
      <Eyebrow>{`Hodnotenia — ${nickname}`}</Eyebrow>
      {label ? (
        <Text style={[styles.avg, { color: palette.accentDeep }]}>{label}</Text>
      ) : null}
      <Text style={[styles.note, { color: palette.textMuted }]}>
        Hodnotiť môžu len tí, s ktorými obchod naozaj uzavrel.
      </Text>

      {(items ?? []).map((r) => (
        <View key={r.id} style={[styles.item, { borderTopColor: palette.border }]}>
          <View style={styles.head}>
            <Avatar name={r.rater?.nickname ?? '?'} uri={r.rater?.avatar_url} size={28} />
            <Text style={[styles.nick, { color: palette.textPrimary }]}>
              {r.rater?.nickname ?? 'neznámy'}
            </Text>
            <Text style={[styles.stars, { color: palette.accentDeep }]}>{'★'.repeat(r.stars)}</Text>
          </View>
          {r.comment ? (
            <Text style={[styles.comment, { color: palette.textSecondary }]}>„{r.comment}"</Text>
          ) : null}
          <Text style={[styles.note, { color: palette.textMuted }]}>{formatDate(r.created_at)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  avg: { ...Type.subtitle, fontWeight: Weight.bold },
  note: { ...Type.caption },
  item: { paddingTop: Spacing.sm, marginTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nick: { flex: 1, ...Type.bodyMd, fontWeight: Weight.semibold },
  stars: { ...Type.bodyMd },
  comment: { ...Type.bodyMd, fontStyle: 'italic' },
});
