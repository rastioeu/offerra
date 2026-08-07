import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatAmount } from '@/lib/offers';
import { offerCountLabel, priceDisplay } from '@/lib/price-display';
import {
  deadlineLabel,
  formatArea,
  formatDate,
  formatPrice,
  isDeadlinePassed,
  PROPERTY_LABEL,
  TRANSACTION_LABEL,
  type PropertyWithMedia,
} from '@/lib/property';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { FavoriteHeart } from './favorite-heart';
import { Icon } from './icon';
import { Badge } from './ui';

export function PropertyCard({
  item,
  favorite,
  onToggleFavorite,
}: {
  item: PropertyWithMedia;
  favorite?: boolean;
  onToggleFavorite?: () => Promise<boolean | null>;
}) {
  const palette = useTheme();
  const cover = item.media[0]?.url;
  const deadline = deadlineLabel(item.offer_deadline);
  // Text sa počíta zo ŽIVÉHO počtu ponúk, nie z toho, či je vyplnená cena.
  const pd = priceDisplay(item.asking_price_hint, item.top_offer ?? null, item.offer_count ?? 0);

  /** Rovnaká logika ako v detaile — len spúšťacie miesto navyše (bod 11A). */
  async function shareItem() {
    try {
      await Share.share({
        title: item.title,
        message: [
          item.title,
          [item.city, formatArea(item.area_m2)].filter(Boolean).join(' · '),
          `offerra://nehnutelnost/${item.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (e: unknown) {
      console.log(`[ZDIEĽANIE] Zlyhalo: ${String(e)}`);
    }
  }
  const price = formatPrice(pd.asking, item.transaction_type);

  const facts = [
    item.city,
    item.rooms != null ? `${item.rooms} ${item.rooms === 1 ? 'izba' : item.rooms < 5 ? 'izby' : 'izieb'}` : null,
    formatArea(item.area_m2),
  ].filter(Boolean) as string[];

  return (
    <Link href={{ pathname: '/nehnutelnost/[id]', params: { id: item.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          Shadow.card,
          { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.9 : 1 },
        ]}>
        <View style={[styles.photo, { backgroundColor: palette.surfacePressed }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
          ) : (
            <Text style={[styles.noPhoto, { color: palette.textMuted }]}>Bez fotky</Text>
          )}
          <View style={styles.badges}>
            <Badge text={TRANSACTION_LABEL[item.transaction_type].toUpperCase()} tone="accent" />
            <Badge text={PROPERTY_LABEL[item.property_type]} />
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={shareItem}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Zdieľať inzerát">
              <Icon name="square.and.arrow.up" size={22} color={palette.surface} weight="semibold" />
            </Pressable>
            {onToggleFavorite ? (
              <FavoriteHeart active={Boolean(favorite)} onToggle={onToggleFavorite} />
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <Text numberOfLines={2} style={[styles.title, { color: palette.textPrimary }]}>
            {item.title}
          </Text>
          {facts.length > 0 ? (
            <Text style={[styles.facts, { color: palette.textMuted }]}>{facts.join(' · ')}</Text>
          ) : null}

          <View style={styles.priceRow}>
            {pd.headline === 'ASKING' && price ? (
              <>
                <Text style={[styles.price, { color: palette.primary }]}>{price}</Text>
                <Text style={[styles.priceNote, { color: palette.textMuted }]}>{pd.note}</Text>
              </>
            ) : pd.headline === 'TOP_OFFER' && pd.topOffer != null ? (
              <>
                <Text style={[styles.price, { color: palette.link }]}>
                  {formatAmount(pd.topOffer, item.transaction_type)}
                </Text>
                <Text style={[styles.priceNote, { color: palette.textMuted }]}>najvyššia ponuka</Text>
              </>
            ) : (
              <Text style={[styles.priceNote, { color: palette.textMuted }]}>{pd.note}</Text>
            )}
          </View>

          {/* Najvyššiu ponuku pridávame ako druhý riadok len vtedy, keď
              hlavné číslo je orientačná cena — inak by tam bola dvakrát. */}
          {pd.headline === 'ASKING' && pd.topOffer != null ? (
            <View style={[styles.topOffer, { borderTopColor: palette.border }]}>
              <Text style={[styles.topOfferLabel, { color: palette.textSecondary }]}>
                Najvyššia ponuka
              </Text>
              <Text style={[styles.topOfferValue, { color: palette.link }]}>
                {formatAmount(pd.topOffer, item.transaction_type)}
              </Text>
            </View>
          ) : null}

          {deadline ? (
            <Text
              style={[
                styles.deadline,
                { color: isDeadlinePassed(item.offer_deadline) ? palette.textMuted : palette.warning },
              ]}>
              {deadline}
            </Text>
          ) : null}

          <Text style={[styles.added, { color: palette.textMuted }]}>
            Pridané {formatDate(item.created_at)} · {item.view_count}{' '}
            {item.view_count === 1 ? 'zobrazenie' : item.view_count < 5 ? 'zobrazenia' : 'zobrazení'}
            {offerCountLabel(pd.offerCount) ? ` · ${offerCountLabel(pd.offerCount)}` : ''}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  photo: { height: 190, justifyContent: 'center', alignItems: 'center' },
  noPhoto: { ...Type.caption },
  actions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareGlyph: {
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badges: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, flexDirection: 'row', gap: Spacing.xs },
  body: { padding: Spacing.md, gap: Spacing.xs },
  title: { ...Type.subtitle, fontWeight: Weight.semibold },
  facts: { ...Type.bodyMd },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: Spacing.xs },
  price: { ...Type.title, fontWeight: Weight.bold },
  priceNote: { ...Type.caption },
  added: { ...Type.caption, marginTop: 2 },
  topOffer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  topOfferLabel: { ...Type.caption, fontWeight: Weight.medium },
  topOfferValue: { ...Type.subtitle, fontWeight: Weight.bold },
  noOffers: { ...Type.caption, marginTop: Spacing.xs },
  deadline: { ...Type.caption, fontWeight: Weight.medium },
});
