/**
 * Verejný zoznam ponúk — nickname + suma + dátum, zoradený podľa sumy.
 *
 * Vidí ho KAŽDÝ vrátane neprihlásených. Dotazník nájomcu sa sem
 * ZÁMERNE nedostane — je neverejný a v DB ho cudzí ani nedostane.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatAmount, OFFER_STATUS_LABEL, type Offer } from '@/lib/offers';
import { formatDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { ReportButton } from './report-button';
import { Badge } from './ui';

export function OfferList({
  offers,
  transaction,
  highlightBidderId,
  allowReport,
}: {
  offers: Offer[];
  transaction: 'SALE' | 'RENT';
  highlightBidderId?: string;
  /** Nahlásiť sa dá len cudzia ponuka, nie vlastná. */
  allowReport?: boolean;
}) {
  const palette = useTheme();

  if (offers.length === 0) {
    return (
      <Text style={[styles.empty, { color: palette.textMuted }]}>
        Zatiaľ žiadne ponuky. Buď prvý.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {offers.map((o, i) => {
        const mine = highlightBidderId && o.bidder_id === highlightBidderId;
        const best = i === 0 && o.status === 'PENDING';
        return (
          <View
            key={o.id}
            style={[
              styles.row,
              {
                backgroundColor: mine ? palette.surfacePressed : palette.surface,
                borderColor: best ? palette.secondary : palette.border,
              },
            ]}>
            <View style={styles.left}>
              <Text style={[styles.nick, { color: palette.textPrimary }]}>
                {o.bidder?.nickname ?? 'neznámy'}
                {mine ? ' · ty' : ''}
              </Text>
              <Text style={[styles.date, { color: palette.textMuted }]}>{formatDate(o.created_at)}</Text>
              {o.message ? (
                <Text style={[styles.message, { color: palette.textSecondary }]}>{o.message}</Text>
              ) : null}
              {allowReport && !mine ? (
                <View style={styles.reports}>
                  <ReportButton targetType="OFFER" targetId={o.id} label="Nahlásiť ponuku" compact />
                  <ReportButton targetType="USER" targetId={o.bidder_id} label="Nahlásiť používateľa" compact />
                </View>
              ) : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.amount, { color: palette.primary }]}>
                {formatAmount(o.amount, transaction)}
              </Text>
              {o.status !== 'PENDING' ? (
                <Badge
                  text={OFFER_STATUS_LABEL[o.status]}
                  tone={o.status === 'ACCEPTED' ? 'accent' : 'neutral'}
                />
              ) : best ? (
                <Text style={[styles.best, { color: palette.link }]}>najvyššia</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  empty: { ...Type.bodyMd },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  left: { flexShrink: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  nick: { ...Type.bodyLg, fontWeight: Weight.semibold },
  date: { ...Type.caption },
  message: { ...Type.caption, marginTop: 2 },
  amount: { ...Type.subtitle, fontWeight: Weight.bold },
  best: { ...Type.caption, fontWeight: Weight.semibold },
  reports: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
});
