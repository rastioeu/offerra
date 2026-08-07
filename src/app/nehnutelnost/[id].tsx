/**
 * Detail inzerátu — galéria, popis, parametre.
 *
 * „Ponuky" sú zámerne placeholder: modul ponúk je Fáza 2. Radšej čestné
 * „čoskoro" než vymyslené číslo.
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, ErrorNote } from '@/components/ui';
import { useProperty } from '@/hooks/use-properties';
import { useTheme } from '@/hooks/use-theme';
import {
  deadlineLabel,
  formatArea,
  formatDate,
  formatPrice,
  PROPERTY_LABEL,
  TRANSACTION_LABEL,
} from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

const PHOTO_W = Dimensions.get('window').width - Spacing.lg * 2;

export default function PropertyDetailScreen() {
  const palette = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, error } = useProperty(id);

  const price = item ? formatPrice(item.asking_price_hint, item.transaction_type) : null;
  const deadline = item ? deadlineLabel(item.offer_deadline) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Detail',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />

        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item === null && !error ? (
          <Text style={[styles.missing, { color: palette.textMuted }]}>
            Tento inzerát neexistuje alebo už nie je zverejnený.
          </Text>
        ) : null}

        {item ? (
          <>
            {item.media.length > 0 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {item.media.map((m) => (
                  <Image
                    key={m.id}
                    source={{ uri: m.url }}
                    style={[styles.photo, { backgroundColor: palette.surfacePressed }]}
                    contentFit="cover"
                    transition={160}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.photo, styles.noPhoto, { backgroundColor: palette.surfacePressed }]}>
                <Text style={{ color: palette.textMuted }}>Bez fotky</Text>
              </View>
            )}

            {item.media.length > 1 ? (
              <Text style={[styles.galleryHint, { color: palette.textMuted }]}>
                {item.media.length} fotiek — potiahni do strany
              </Text>
            ) : null}

            <View style={styles.badges}>
              <Badge text={TRANSACTION_LABEL[item.transaction_type].toUpperCase()} tone="accent" />
              <Badge text={PROPERTY_LABEL[item.property_type]} />
              {item.is_seed ? <Badge text="UKÁŽKA" tone="warning" /> : null}
            </View>

            <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text>

            {price ? (
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: palette.primary }]}>{price}</Text>
                <Text style={[styles.priceNote, { color: palette.textMuted }]}>orientačne</Text>
              </View>
            ) : (
              <Text style={[styles.priceNote, { color: palette.textMuted }]}>
                Cena neuvedená — predávajúci čaká na ponuky.
              </Text>
            )}

            {deadline ? <Text style={[styles.deadline, { color: palette.link }]}>{deadline}</Text> : null}

            <Card>
              <Text style={[styles.cardLabel, { color: palette.textMuted }]}>PARAMETRE</Text>
              <Row label="Poloha" value={[item.city, item.district].filter(Boolean).join(' · ') || '—'} />
              <Row label="Typ" value={PROPERTY_LABEL[item.property_type]} />
              <Row label="Obchod" value={TRANSACTION_LABEL[item.transaction_type]} />
              <Row label="Izby" value={item.rooms != null ? String(item.rooms) : '—'} />
              <Row label="Výmera" value={formatArea(item.area_m2) ?? '—'} />
              <Row label="Pridané" value={formatDate(item.created_at)} />
              {item.address_hidden ? (
                <Text style={[styles.hidden, { color: palette.textMuted }]}>
                  Presná adresa je skrytá — zobrazí sa až po dohode s predávajúcim.
                </Text>
              ) : null}
            </Card>

            {item.description ? (
              <Card>
                <Text style={[styles.cardLabel, { color: palette.textMuted }]}>POPIS</Text>
                <Text style={[styles.description, { color: palette.textPrimary }]}>{item.description}</Text>
              </Card>
            ) : null}

            <Card>
              <Text style={[styles.cardLabel, { color: palette.textMuted }]}>PONUKY</Text>
              <Text style={[styles.soon, { color: palette.textMuted }]}>
                Ponuky: čoskoro — modul predkladania ponúk pripravujeme.
              </Text>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const palette = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  spinner: { marginTop: Spacing.xxl },
  missing: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  gallery: { borderRadius: Radius.lg },
  photo: { width: PHOTO_W, height: 240, borderRadius: Radius.lg },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  galleryHint: { ...Type.caption, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  title: { ...Type.hero, fontWeight: Weight.bold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  price: { ...Type.heading, fontWeight: Weight.bold },
  priceNote: { ...Type.small },
  deadline: { ...Type.bodyMd, fontWeight: Weight.medium },
  cardLabel: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
  hidden: { ...Type.caption },
  description: { ...Type.bodyLg },
  soon: { ...Type.bodyMd },
});
