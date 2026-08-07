import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import {
  formatArea,
  formatDate,
  formatPrice,
  PROPERTY_LABEL,
  TRANSACTION_LABEL,
  type PropertyWithMedia,
} from '@/lib/property';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { Badge } from './ui';

export function PropertyCard({ item }: { item: PropertyWithMedia }) {
  const palette = useTheme();
  const cover = item.media[0]?.url;
  const price = formatPrice(item.asking_price_hint, item.transaction_type);

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
        </View>

        <View style={styles.body}>
          <Text numberOfLines={2} style={[styles.title, { color: palette.textPrimary }]}>
            {item.title}
          </Text>
          {facts.length > 0 ? (
            <Text style={[styles.facts, { color: palette.textMuted }]}>{facts.join(' · ')}</Text>
          ) : null}

          <View style={styles.priceRow}>
            {price ? (
              <>
                <Text style={[styles.price, { color: palette.primary }]}>{price}</Text>
                <Text style={[styles.priceNote, { color: palette.textMuted }]}>orientačne</Text>
              </>
            ) : (
              <Text style={[styles.priceNote, { color: palette.textMuted }]}>Cena neuvedená — čaká na ponuky</Text>
            )}
          </View>

          <Text style={[styles.added, { color: palette.textMuted }]}>
            Pridané {formatDate(item.created_at)}
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
  badges: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, flexDirection: 'row', gap: Spacing.xs },
  body: { padding: Spacing.md, gap: Spacing.xs },
  title: { ...Type.subtitle, fontWeight: Weight.semibold },
  facts: { ...Type.bodyMd },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: Spacing.xs },
  price: { ...Type.title, fontWeight: Weight.bold },
  priceNote: { ...Type.caption },
  added: { ...Type.caption, marginTop: 2 },
});
