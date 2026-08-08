/**
 * Karta inzerátu v katalógu — redizajn podľa mockupu „Dôveryhodne teplá"
 * (schválený Rastiom 8.8.2026).
 *
 * Tri veci, ktoré sa oproti pôvodnej karte zmenili, a prečo:
 *
 * 1. **Fotka je ~60 % karty.** Pri nehnuteľnosti sa človek rozhoduje očami;
 *    predtým fotka súperila so šiestimi riadkami textu pod ňou.
 * 2. **Cena je terakotová, pätkovým rezom a najväčšia na karte.** Oko ju
 *    nájde bez čítania.
 * 3. **Hlavné číslo je NAJVYŠŠIA PONUKA, keď nejaká je** — orientačná cena
 *    je vedľa, menšia a sivá. Skutočná ponuka je dôležitejšia než želanie
 *    predávajúceho (rozhoduje o tom `priceDisplay`, nie táto karta).
 *
 * Telo je zámerne krátke: názov, jeden riadok faktov, cena. Uzávierka
 * a počet zobrazení sa presunuli na fotku a do pätky, aby nerozbíjali
 * pomer 60/40.
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatAmount } from '@/lib/offers';
import { offerCountLabel, priceDisplay } from '@/lib/price-display';
import {
  deadlineLabel,
  formatArea,
  formatPrice,
  isDeadlinePassed,
  PROPERTY_LABEL,
  TRANSACTION_LABEL,
  type PropertyWithMedia,
} from '@/lib/property';
import { Money as MoneyType, Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { FavoriteHeart } from './favorite-heart';
import { Icon } from './icon';
import { LongPressMenu, tapFeedback, type LongPressAction } from './long-press-menu';
import { Badge, Eyebrow } from './ui';
import { errorText } from '@/lib/errors';

/** Zdieľanie karty — rovnaký text ako v detaile, len iné spúšťacie miesto. */
export async function shareProperty(item: PropertyWithMedia) {
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
    console.log(`[ZDIEĽANIE] Zlyhalo: ${errorText(e)}`);
  }
}

export function PropertyCard({
  item,
  favorite,
  onToggleFavorite,
  onReport,
}: {
  item: PropertyWithMedia;
  favorite?: boolean;
  onToggleFavorite?: () => Promise<boolean | null>;
  /** Nahlásenie z podržania prstu. Chýba = vlastný inzerát. */
  onReport?: () => void;
}) {
  const palette = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const cover = item.media[0]?.url;
  const deadline = deadlineLabel(item.offer_deadline);
  const closed = isDeadlinePassed(item.offer_deadline);
  // Text sa počíta zo ŽIVÉHO počtu ponúk, nie z toho, či je vyplnená cena.
  const pd = priceDisplay(item.asking_price_hint, item.top_offer ?? null, item.offer_count ?? 0);

  const facts = [
    item.city,
    item.rooms != null ? `${item.rooms} ${item.rooms === 1 ? 'izba' : item.rooms < 5 ? 'izby' : 'izieb'}` : null,
    formatArea(item.area_m2),
  ].filter(Boolean) as string[];

  // Ľavý stĺpec pätky = hlavné číslo. Pravý = to druhé, menšie a sivé.
  const isOffer = pd.headline === 'TOP_OFFER' && pd.topOffer != null;
  const headlineLabel = isOffer ? 'Najvyššia ponuka' : 'Orientačná cena';
  const headlineValue = isOffer
    ? formatAmount(pd.topOffer as number, item.transaction_type)
    : formatPrice(pd.asking, item.transaction_type);
  const asideLines = isOffer
    ? pd.asking != null
      ? ['orientačne', formatPrice(pd.asking, item.transaction_type) as string]
      : ['cenu', 'neuviedol']
    : [offerCountLabel(pd.offerCount) ?? 'zatiaľ bez', offerCountLabel(pd.offerCount) ? '' : 'ponúk'];

  const actions: LongPressAction[] = [
    ...(onToggleFavorite
      ? [
          {
            label: favorite ? 'Odobrať z obľúbených' : 'Pridať do obľúbených',
            icon: favorite ? ('heart.fill' as const) : ('heart' as const),
            onPress: () => void onToggleFavorite(),
          },
        ]
      : []),
    { label: 'Zdieľať', icon: 'square.and.arrow.up' as const, onPress: () => void shareProperty(item) },
    ...(onReport
      ? [{ label: 'Nahlásiť', icon: 'flag' as const, onPress: onReport, destructive: true }]
      : []),
  ];

  const card = (
    <View
      style={[
        styles.card,
        Shadow.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}>
      <View style={[styles.photo, { backgroundColor: palette.surfacePressed }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
        ) : (
          <Text style={[styles.noPhoto, { color: palette.textMuted }]}>Bez fotky</Text>
        )}
        <View style={styles.badges}>
          <Badge text={TRANSACTION_LABEL[item.transaction_type].toUpperCase()} tone="navy" />
          <Badge text={PROPERTY_LABEL[item.property_type]} tone="onPhoto" />
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => void shareProperty(item)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Zdieľať inzerát">
            <Icon name="square.and.arrow.up" size={22} color={palette.surface} weight="semibold" />
          </Pressable>
          {onToggleFavorite ? (
            <FavoriteHeart active={Boolean(favorite)} onToggle={onToggleFavorite} />
          ) : null}
        </View>
        {/* Uzávierka je naliehavý údaj — patrí na fotku, nie do pätky. */}
        {deadline ? (
          <View style={[styles.deadline, { backgroundColor: palette.onPhotoSurface }]}>
            <Text
              style={[styles.deadlineText, { color: closed ? palette.textMuted : palette.accentDeep }]}
              numberOfLines={1}>
              {deadline}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={[styles.title, { color: palette.textPrimary }]}>
          {item.title}
        </Text>
        {facts.length > 0 ? (
          <Text numberOfLines={1} style={[styles.facts, { color: palette.textMuted }]}>
            {facts.join(' · ')}
          </Text>
        ) : null}

        <View style={styles.foot}>
          <View style={styles.footMain}>
            {headlineValue ? (
              <>
                <Eyebrow>{headlineLabel}</Eyebrow>
                <Text
                  style={[
                    styles.money,
                    { color: isOffer ? palette.accent : palette.primary },
                  ]}>
                  {headlineValue}
                </Text>
              </>
            ) : (
              <Text style={[styles.facts, { color: palette.textMuted }]}>{pd.note}</Text>
            )}
          </View>
          {headlineValue ? (
            <View style={styles.footAside}>
              {asideLines.filter(Boolean).map((line) => (
                <Text key={line} style={[styles.aside, { color: palette.textMuted }]}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <>
      {/* Ťuknutie aj podržanie sedia na TOM ISTOM prvku — celá karta.
          Preto to nie je `Link asChild`: vnorené `Pressable` by si dlhé
          stlačenie navzájom zobrali a podržanie by sa nikdy nespustilo. */}
      <Pressable
        onPress={() => router.push({ pathname: '/nehnutelnost/[id]', params: { id: item.id } })}
        onLongPress={() => {
          tapFeedback();
          setMenuOpen(true);
        }}
        delayLongPress={330}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        {card}
      </Pressable>

      <LongPressMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        preview={card}
        actions={actions}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  // ~60 % karty. Telo pod ňou má zámerne len tri riadky.
  photo: { height: 208, justifyContent: 'center', alignItems: 'center' },
  noPhoto: { ...Type.caption },
  actions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  badges: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, flexDirection: 'row', gap: Spacing.xs },
  deadline: {
    position: 'absolute',
    left: Spacing.sm,
    bottom: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    maxWidth: '85%',
  },
  deadlineText: { ...Type.caption, fontWeight: Weight.semibold },
  body: { padding: Spacing.md, gap: 2 },
  title: { ...Type.subtitle, fontWeight: Weight.semibold },
  facts: { ...Type.bodyMd },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm, marginTop: Spacing.sm },
  footMain: { flexShrink: 1, gap: 2 },
  footAside: { alignItems: 'flex-end' },
  money: { fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold, ...MoneyType.large },
  aside: { ...Type.caption, textAlign: 'right' },
});
