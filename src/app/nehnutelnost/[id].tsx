/**
 * Detail inzerátu — galéria, popis, parametre a VEREJNÝ zoznam ponúk.
 *
 * Zoznam ponúk sa načítava bez ohľadu na prihlásenie: suma, prezývka, stav
 * a dátum sú verejné (rozhodnutie Rastia 7.8.2026 — otvorené pseudonymné
 * ponuky). Dotazník nájomcu sa sem NEDOSTANE ani omylom — je neverejný
 * a cudziemu ho nevydá ani databáza.
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfferList } from '@/components/offer-list';
import { Badge, Button, Card, ErrorNote } from '@/components/ui';
import { useOffers } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
  db,
  deadlineLabel,
  formatArea,
  formatDate,
  formatPrice,
  isDeadlinePassed,
  PROPERTY_LABEL,
  TRANSACTION_LABEL,
} from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

const PHOTO_W = Dimensions.get('window').width - Spacing.lg * 2;

export default function PropertyDetailScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, error } = useProperty(id);
  const { offers, error: offersError, reload: reloadOffers } = useOffers(id);
  useRefreshOnFocus(reloadOffers);

  // `view_count` je v modeli od Fázy 1, ale nemal ho kto zvyšovať — UPDATE
  // na cudzom inzeráte RLS nepustí. Rieši to `bump_view()` (SECURITY
  // DEFINER), ktorá vlastné pozeranie nepočíta. Raz za otvorenie, nie pri
  // každom prekreslení.
  useEffect(() => {
    if (!id) return;
    void db()
      .rpc('bump_view', { p_property_id: id })
      .then(({ error: e }) => {
        if (e) console.log(`[DETAIL] Počítadlo zobrazení zlyhalo: ${e.message}`);
      });
  }, [id]);
  const { session } = useSession();

  const myId = session?.user.id;
  const isOwner = Boolean(myId && item && item.owner_id === myId);
  const myOffer = offers?.find((o) => o.bidder_id === myId && o.status === 'PENDING');
  const closed = isDeadlinePassed(item?.offer_deadline ?? null);

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
              <Row
                label="Zobrazení"
                value={String(item.view_count)}
              />
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
              <Text style={[styles.cardLabel, { color: palette.textMuted }]}>
                PONUKY ({offers?.length ?? 0})
              </Text>
              <Text style={[styles.soon, { color: palette.textMuted }]}>
                Ponuky sú verejné — sumu vidí každý. Kto za prezývkou stojí,
                sa dozvie až ten, koho ponuku predávajúci prijme.
              </Text>
              <ErrorNote error={offersError} />
              <OfferList
                offers={offers ?? []}
                transaction={item.transaction_type}
                highlightBidderId={myId}
              />

              {isOwner ? (
                <Button
                  title="Spravovať ponuky"
                  onPress={() => router.push({ pathname: '/ponuky/[id]', params: { id: item.id } })}
                />
              ) : closed ? (
                <Text style={[styles.soon, { color: palette.warning }]}>
                  Príjem ponúk sa uzavrel — nové ponuky už podať nemožno.
                </Text>
              ) : myId ? (
                <Button
                  title={myOffer ? 'Upraviť moju ponuku' : 'Podať ponuku'}
                  onPress={() => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } })}
                />
              ) : null}
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
