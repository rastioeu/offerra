/**
 * Verejný zoznam ponúk — redizajn podľa mockupu „Dôveryhodne teplá"
 * (obrazovka 3, schválené 8.8.2026).
 *
 * **Ponuky sú karty, nie riadky.** Najvyššia má terakotový obrys a odznak,
 * aby sa dražobná dynamika dala prečítať na prvý pohľad. Iniciála v krúžku
 * nahrádza profilovku, ktorú väčšina ľudí nemá — a zároveň nič neprezrádza
 * o skutočnej identite, tá ostáva skrytá do prijatia ponuky.
 *
 * Celá karta je klikateľná tam, kde ťuknutie kam viesť MÁ (majiteľ
 * v „Ponuky na inzerát" → spodný panel). Vo verejnom detaile cieľ nemá,
 * tam ostáva nekliknuteľná — tlačidlo, po ktorom sa nič nestane, je horšie
 * než žiadne (CLAUDE.md §2).
 *
 * Dotazník nájomcu sa sem ZÁMERNE nedostane — je neverejný a v DB ho cudzí
 * ani nedostane.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatAmount, OFFER_STATUS_LABEL, type Offer } from '@/lib/offers';
import { formatDate } from '@/lib/property';
import { Money as MoneyType, Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { ratingLabel } from '@/lib/rating';
import { useRatings } from '@/hooks/use-ratings';

import { ReportButton } from './report-button';

/** Iniciála prezývky do krúžku. Prázdna prezývka by inak dala prázdny krúžok. */
function initial(nickname: string | undefined): string {
  const t = (nickname ?? '?').trim();
  return (t[0] ?? '?').toUpperCase();
}

export function OfferList({
  offers,
  transaction,
  highlightBidderId,
  allowReport,
  onPressOffer,
}: {
  offers: Offer[];
  transaction: 'SALE' | 'RENT';
  highlightBidderId?: string;
  /** Nahlásiť sa dá len cudzia ponuka, nie vlastná. */
  allowReport?: boolean;
  /** Keď je dané, celá karta je klikateľná (pohľad majiteľa). */
  onPressOffer?: (offer: Offer) => void;
}) {
  const palette = useTheme();
  const ratings = useRatings(offers.map((o) => o.bidder_id));

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
        const Wrap = onPressOffer ? Pressable : View;

        return (
          <Wrap
            key={o.id}
            onPress={onPressOffer ? () => onPressOffer(o) : undefined}
            accessibilityRole={onPressOffer ? 'button' : undefined}
            style={[
              styles.card,
              best ? Shadow.card : null,
              {
                backgroundColor: mine ? palette.surfacePressed : palette.surface,
                borderColor: best ? palette.accent : palette.border,
                borderWidth: best ? 1.5 : 1,
              },
            ]}>
            <View style={[styles.avatar, { backgroundColor: palette.surfacePressed }]}>
              <Text style={[styles.avatarText, { color: palette.accentDeep }]}>
                {initial(o.bidder?.nickname)}
              </Text>
            </View>

            <View style={styles.body}>
              <Text style={[styles.nick, { color: palette.textPrimary }]}>
                {o.bidder?.nickname ?? 'neznámy'}
                {mine ? ' · ty' : ''}
              </Text>
              {/* Hviezdičky pri prezývke sú celý zmysel hodnotení — v profile,
                  kam nikto nechodí, by nikomu nepomohli. */}
              {ratingLabel(ratings[o.bidder_id]) ? (
                <Text style={[styles.date, { color: palette.accentDeep }]}>
                  {ratingLabel(ratings[o.bidder_id])}
                </Text>
              ) : null}
              <Text style={[styles.date, { color: palette.textMuted }]}>{formatDate(o.created_at)}</Text>
              {/* Správa je tu, LEN ak na ňu volajúci má nárok — `message` je
                  `null` pre všetkých ostatných a rozhodla o tom databáza,
                  nie táto podmienka. Do 8.8.2026 ju videl ktokoľvek. */}
              {o.message ? (
                <Text style={[styles.message, { color: palette.textSecondary }]}>„{o.message}"</Text>
              ) : null}
              {allowReport && !mine ? (
                <View style={styles.reports}>
                  <ReportButton targetType="OFFER" targetId={o.id} label="Nahlásiť ponuku" compact />
                  <ReportButton targetType="USER" targetId={o.bidder_id} label="Nahlásiť používateľa" compact />
                  {/* Vlastné tlačidlo, nie položka v zozname dôvodov. Kto ho
                      stlačí, dôvod už povedal — hľadať ho ešte raz je krok
                      navyše presne tam, kde na ňom záleží. */}
                  <ReportButton
                    targetType="USER"
                    targetId={o.bidder_id}
                    label="Nahlásiť realitku"
                    presetReason="REALITKA"
                    compact
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.right}>
              <Text
                style={[
                  styles.amount,
                  best ? MoneyType.medium : MoneyType.small,
                  { color: best ? palette.accent : palette.textPrimary },
                ]}>
                {formatAmount(o.amount, transaction)}
              </Text>
              {o.status === 'ACCEPTED' ? (
                <Pill text="PRIJATÁ" tone="success" />
              ) : o.status !== 'PENDING' ? (
                <Pill text={OFFER_STATUS_LABEL[o.status].toUpperCase()} tone="neutral" />
              ) : best ? (
                <Pill text="NAJVYŠŠIA" tone="accent" />
              ) : null}
            </View>
          </Wrap>
        );
      })}
    </View>
  );
}

/** Drobný odznak pod sumou. Mockup ich má tri, každý inej povahy. */
function Pill({ text, tone }: { text: string; tone: 'accent' | 'success' | 'neutral' }) {
  const palette = useTheme();
  const fg = tone === 'accent' ? palette.accentDeep : tone === 'success' ? palette.success : palette.textMuted;
  // Obrys, nie vyplnene pozadie: rovnaky text na `surfacePressed` mal
  // v svetlej teme len 4,42:1 a 13px tucne pismo sa za velky text
  // nepocita (prah je 18,66px). Na `surface` prejde s rezervou.
  return (
    <View style={[styles.pill, { backgroundColor: palette.surface, borderColor: fg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  empty: { ...Type.bodyMd },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  avatar: { width: 38, height: 38, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  // 20px tucne = velky text podla WCAG (prah 3:1). Pri 18px by
  // iniciala na `surfacePressed` neprelezla (4,42:1 pri prahu 4,5).
  avatarText: { ...Type.title, fontWeight: Weight.bold },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  nick: { ...Type.bodyLg, fontWeight: Weight.semibold },
  date: { ...Type.caption },
  message: { ...Type.caption, fontStyle: 'italic', marginTop: 2 },
  amount: { fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold },
  reports: { flexDirection: 'row', gap: Spacing.md, marginTop: 4, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  pillText: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 0.5 },
});
