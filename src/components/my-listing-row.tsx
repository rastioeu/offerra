/**
 * Riadok v „Moje inzeráty" (Profil).
 *
 * Doteraz tu bol holý riadok „názov · mesto · N fotiek" — teda menej, než
 * ukazuje karta cudziemu človeku v katalógu. To je naopak: vlastník má
 * o svojom inzeráte vedieť VIAC než okoloidúci.
 *
 * Riadok preto nesie to isté, čo karta v katalógu (miniatúra, cena alebo
 * najvyššia ponuka, odpočet do uzávierky) a navyše to, čo vidí len
 * vlastník — počet ponúk, počet zobrazení a ich pomer.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOfferCountdownTick } from '@/hooks/use-offer-countdown-tick';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, type TFunc } from '@/i18n';
import { offerCountdown } from '@/lib/offer-validity';
import {
  closedLabel,
  deadlineLabel,
  deadlineUrgency,
  formatPrice,
  getStatusLabel,
  type PropertyWithMedia,
} from '@/lib/property';
import { Money as MoneyType, Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { OfferCountdownPill } from './offer-countdown';
import { Badge } from './ui';

/** „3 ponuky" so správnym tvarom. Bez toho by tam bolo „3 ponuka". */
export function offersWord(t: TFunc, language: string, n: number): string {
  if (n === 0) return t('myListingRow.noOffersYet');
  if (language === 'sk') {
    const key = n === 1 ? 'offersOne' : n < 5 ? 'offersFew' : 'offersMany';
    return t(`myListingRow.${key}`, { count: n });
  }
  return t(n === 1 ? 'myListingRow.offersOne' : 'myListingRow.offersMany', { count: n });
}

/**
 * Koľko z tých, čo si inzerát pozreli, aj ponúklo. Je to jediné číslo,
 * ktoré vlastníkovi povie, či je problém v NÁVŠTEVNOSTI, alebo v CENE:
 * veľa zobrazení a žiadna ponuka znamená niečo iné než žiadne zobrazenia.
 */
export function conversionLabel(t: TFunc, views: number, offers: number): string | null {
  if (views < 5) return null; // pri troch návštevách je percento nezmysel
  return t('myListingRow.conversion', { pct: Math.round((offers / views) * 100) });
}

export function MyListingRow({
  item,
  onPress,
  now,
}: {
  item: PropertyWithMedia;
  onPress: () => void;
  /** Spoločný tikajúci čas z „Moje inzeráty" (Profil) — pozri `PropertyCard`. */
  now?: number;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const pending = item.pending_count ?? 0;
  const offers = item.offer_count ?? 0;
  const thumb = item.media[0]?.url;
  const urgency = deadlineUrgency(item.offer_deadline);
  const deadline = deadlineLabel(t, language, item.offer_deadline);
  const conversion = conversionLabel(t, item.view_count, offers);
  const ownTick = useOfferCountdownTick([item.nearest_offer_valid_until], now == null);
  const liveNow = now ?? ownTick;
  // Najbližšie vypršiavajúca ČAKAJÚCA ponuka — to vlastníka zaujíma
  // najviac (Rastio, 2.9.2026), nie ktorá je najvyššia. `status` napevno
  // 'PENDING' z rovnakého dôvodu ako v `PropertyCard`: sem sa dostane len
  // ponuka, ktorá pri načítaní expirovaná nebola.
  const nearestOfferCd = item.nearest_offer_valid_until
    ? offerCountdown(t, language, 'PENDING', item.nearest_offer_valid_until, liveNow)
    : null;

  // Najvyššia ponuka má prednosť pred orientačnou cenou — je to živý údaj
  // a je to to, na čo sa vlastník pozerá.
  const money =
    item.top_offer != null
      ? formatPrice(t, item.top_offer, item.transaction_type)
      : item.status === 'CLOSED' && item.final_amount != null
        ? formatPrice(t, item.final_amount, item.transaction_type)
        : formatPrice(t, item.asking_price_hint, item.transaction_type);
  const moneyIsOffer = item.top_offer != null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('myListingRow.accessibilityLabel', { title: item.title || t('myListingRow.noTitle'), offers: offersWord(t, language, offers) })}
      style={({ pressed }) => [
        styles.row,
        {
          // Čakajúce ponuky riadok ZVÝRAZNIA — je to jediná vec na tejto
          // obrazovke, ktorá si pýta akciu od vlastníka.
          borderColor: pending > 0 ? palette.accent : palette.border,
          borderWidth: pending > 0 ? 1.5 : 1,
          backgroundColor: pressed
            ? palette.surfacePressed
            : pending > 0
              ? palette.surfacePressed
              : 'transparent',
        },
      ]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={120} />
      ) : (
        <View style={[styles.thumb, styles.noThumb, { backgroundColor: palette.surfacePressed }]}>
          <Text style={[styles.noThumbText, { color: palette.textMuted }]}>{t('myListingRow.noPhoto')}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: palette.textPrimary }]}>
          {item.title.trim() || t('myListingRow.noTitle')}
        </Text>

        {money ? (
          <Text style={[styles.money, { color: moneyIsOffer ? palette.accent : palette.textSecondary }]}>
            {money}
            {moneyIsOffer ? t('myListingRow.highestOfferSuffix') : ''}
          </Text>
        ) : (
          <Text style={[styles.meta, { color: palette.textMuted }]}>{t('myListingRow.noPrice')}</Text>
        )}

        <Text
          style={[
            styles.meta,
            { color: pending > 0 ? palette.accentDeep : palette.textMuted, fontWeight: pending > 0 ? Weight.semibold : Weight.regular },
          ]}>
          {offersWord(t, language, offers)}
          {pending > 0 ? t('myListingRow.pendingSuffix', { count: pending }) : ''}
        </Text>

        {/* Platnosť najbližšie vypršiavajúcej PONUKY hneď POD riadkom
            o počte ponúk — nie pri uzávierke nižšie (Rastio, 2.9.2026,
            po druhom screenshote): tá sa netýka rovnakej sumy ako
            „Najvyššia ponuka" hore, ale ponúk vo všeobecnosti, takže
            patrí k tomuto riadku, nie k uzávierke o pár riadkov nižšie. */}
        {nearestOfferCd ? (
          // Vlastný podmet („Najbližšia ponuka…"), nie holý `nearestOfferCd.value`
          // bez neho. Posledná hodina = plain červený tučný text (rovnaká
          // zásada ako v `property-card.tsx` — poplašná farba tam má
          // zmysel, pill by ju len zoslabil). Uplynutá platnosť = tlmená
          // sivá, fakt nie odpočet. Inak — bežiaci, nie naliehavý stav —
          // VLASTNÁ vizuálna forma (pill + ikona hodín), lebo tlmená sivá
          // splývala s ostatnými riadkami („3 ponuky", „Bratislava…")
          // a odpočet zanikol úplne (Rastio, 2.9.2026, štvrté kolo).
          nearestOfferCd.urgent ? (
            <Text style={[styles.meta, { color: palette.danger, fontWeight: Weight.bold }]}>
              {t('myListingRow.nearestOfferRemaining', { value: nearestOfferCd.value })}
            </Text>
          ) : nearestOfferCd.tier === 'expired' ? (
            <Text style={[styles.meta, { color: palette.textMuted }]}>{t('myListingRow.nearestOfferExpired')}</Text>
          ) : (
            <OfferCountdownPill
              text={t('myListingRow.nearestOfferRemaining', { value: nearestOfferCd.value })}
              style={styles.nearestOfferPill}
            />
          )
        ) : null}

        <Text style={[styles.meta, { color: palette.textMuted }]}>
          {[item.city, t('propertyCard.viewCount', { count: item.view_count }), conversion].filter(Boolean).join(' · ')}
        </Text>

        {deadline ? (
          <Text
            style={[
              styles.meta,
              { color: urgency === 'SOON' ? palette.danger : urgency === 'PASSED' ? palette.textMuted : palette.textSecondary },
            ]}>
            {deadline}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Badge
          text={item.status === 'CLOSED' ? closedLabel(t, item.transaction_type) : getStatusLabel(t)[item.status]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  thumb: { width: 68, height: 68, borderRadius: Radius.sm },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  noThumbText: { ...Type.caption, textAlign: 'center' },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
  title: { ...Type.bodyLg, fontWeight: Weight.semibold },
  money: { fontFamily: MoneyType.fontFamily, ...MoneyType.small, fontWeight: Weight.bold },
  meta: { ...Type.caption },
  nearestOfferPill: { marginVertical: 1 },
});
