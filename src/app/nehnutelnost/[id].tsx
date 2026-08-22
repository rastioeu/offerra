/**
 * Detail inzerátu — redizajn podľa mockupu „Dôveryhodne teplá"
 * (schválený Rastiom 8.8.2026).
 *
 * Čo sa zmenilo oproti pôvodnej obrazovke:
 *
 * 1. **Hero galéria cez celú šírku s bodkami.** Predtým to bola galéria
 *    v odsadení s vetou „6 fotiek — potiahni do strany". Bodky to povedia
 *    bez slov a rovno ukážu, koľkátu fotku človek pozerá.
 * 2. **Cena je karta, nie riadok.** Najvyššia ponuka je terakotová
 *    a najväčšia; orientačná cena a počet ponúk sú pod ňou drobné.
 *    Uzávierka má teplú farbu — je to naliehavý údaj.
 * 3. **Parametre sú mriežka 2×2**, nie voľné riadky „štítok — hodnota".
 * 4. **Prilepené spodné tlačidlo.** Hlavná akcia nezmizne po scrollovaní
 *    a nemá ako sa orezať — presne kvôli tomu vzniklo (Rastio nahlásil
 *    orezané „Zdieľať" 7.8.2026).
 *
 * Zoznam ponúk sa načítava bez ohľadu na prihlásenie: suma, prezývka, stav
 * a dátum sú verejné (rozhodnutie Rastia 7.8.2026 — otvorené pseudonymné
 * ponuky). Dotazník nájomcu sa sem NEDOSTANE ani omylom — je neverejný
 * a cudziemu ho nevydá ani databáza.
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FavoriteHeart } from '@/components/favorite-heart';
import { Icon } from '@/components/icon';
import { PhotoLightbox } from '@/components/photo-lightbox';
import { DeadlineDecision } from '@/components/deadline-decision';
import { PropertyTabs } from '@/components/property-tabs';
import { shareProperty } from '@/components/property-card';
import { ReportButton } from '@/components/report-button';
import { Badge, Card, ErrorNote, Eyebrow, KeyboardDoneBar, ParamCell, PhotoBadge } from '@/components/ui';
import { useViewings } from '@/hooks/use-viewings';
import { useFavoriteIds } from '@/hooks/use-favorites';
import { useOffers } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { formatAmount } from '@/lib/offers';
import { fetchVerified, ratingLabel, type Verified } from '@/lib/rating';
import { fetchPriceHistory, priceSummary, type PriceChange } from '@/lib/price-history';
import { errorText } from '@/lib/errors';
import { useRatings } from '@/hooks/use-ratings';
import { offerCountLabel, priceDisplay } from '@/lib/price-display';
import {
  db,
  deadlineLabel,
  formatArea,
  formatDate,
  formatPrice,
  isDeadlinePassed,
  getPropertyLabel,
  buildingRows,
  closedLabel,
  deadlineOutcome,
  rentalRows,
  getTransactionLabel,
} from '@/lib/property';
import { Money as MoneyType, Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

const SCREEN_W = Dimensions.get('window').width;

export default function PropertyDetailScreen() {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, error, reload: reloadProperty } = useProperty(id);
  const { offers, error: offersError, reload: reloadOffers } = useOffers(id);
  const { items: viewings, reload: reloadViewings } = useViewings(id);
  const [photo, setPhoto] = useState(0);
  useRefreshOnFocus(reloadOffers);
  // Bez tohto by táto obrazovka po admin. skrytí/uzavretí inzerátu (odkiaľ
  // sa človek vrátil, napr. z pozadia appky) ukazovala starý stav, kým sa
  // nespustí Realtime kanál v `useProperty` — druhá poistka, rovnaký
  // princíp ako pri `reloadOffers`.
  useRefreshOnFocus(reloadProperty);

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
  // Uzávierka NIE JE jediný spôsob, ako inzerát prestane brať nové akcie —
  // obchod sa dá uzavrieť aj pred uzávierkou (majiteľ prijme ponuku skôr) a
  // admin ho vie skryť kedykoľvek. Predtým sa tu čítal len dátum, takže
  // napr. bidder na uzavretom inzeráte pred uzávierkou ešte videl aktívne
  // tlačidlo „Chcem obhliadku" a klik na neho narazil na RLS chybu, nie na
  // jasnú správu (Rastio, 13.8.2026).
  const closed = isDeadlinePassed(item?.offer_deadline ?? null) || (item ? item.status !== 'ACTIVE' : false);
  // Kto obchod vyhral. Vlastník podľa toho vie, koho hodnotí; ostatní to
  // nepotrebujú — hodnotiť smú len dvaja a rozhoduje o tom DB.
  const winnerBidderId = offers?.find((o) => o.id === item?.closed_offer_id)?.bidder_id;
  const ratings = useRatings(item ? [item.owner_id] : []);
  const ownerRating = item ? ratingLabel(ratings[item.owner_id]) : null;

  // História ceny — doťahuje sa samostatne, lebo väčšina inzerátov ju
  // nemá a nemá zmysel ňou zaťažovať hlavný dotaz.
  const [priceHistory, setPriceHistory] = useState<PriceChange[]>([]);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void fetchPriceHistory(id)
      .then((h) => {
        if (!cancelled) setPriceHistory(h);
      })
      .catch((e: unknown) => console.log(`[CENA] História nedostupná: ${errorText(e)}`));
    return () => {
      cancelled = true;
    };
  }, [id]);
  const priceNote = item ? priceSummary(t, priceHistory, item.transaction_type) : null;

  const [verified, setVerified] = useState<Verified | null>(null);
  useEffect(() => {
    if (!item?.owner_id) return;
    let cancelled = false;
    void fetchVerified(item.owner_id)
      .then((v) => {
        if (!cancelled) setVerified(v);
      })
      .catch((e: unknown) => console.log(`[OVERENIE] Nedostupné: ${errorText(e)}`));
    return () => {
      cancelled = true;
    };
  }, [item?.owner_id]);
  const { ids: favorites, toggle } = useFavoriteIds(myId);

  // Živé ponuky = tie, ktoré ešte stoja. Stiahnutá ani odmietnutá ponuka
  // nie je „ponuka na inzeráte".
  const live = (offers ?? []).filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
  const topOffer = live.length > 0 ? Math.max(...live.map((o) => o.amount)) : null;
  const pd = item ? priceDisplay(t, item.asking_price_hint, topOffer, live.length) : null;
  const deadline = item ? deadlineLabel(t, language, item.offer_deadline) : null;
  const isOffer = Boolean(pd && pd.headline === 'TOP_OFFER' && pd.topOffer != null);

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    // Rovnaká ochrana ako v `property-tabs.tsx` — hlásený pád „Cannot read
    // property 'contentOffset' of null" (Rastio, 19.8.2026).
    const x = e.nativeEvent?.contentOffset?.x;
    if (x == null) {
      console.log('[GALÉRIA] onScroll bez contentOffset — event preskočený');
      return;
    }
    const i = Math.round(x / SCREEN_W);
    if (i !== photo) setPhoto(i);
  }

  /**
   * Fullscreen sa otvára na TEJ fotke, ktorú človek práve pozerá — nie od
   * prvej. `photo` drží pozíciu v hero galérii, `lightbox` je index, s
   * ktorým sa prehliadač otvoril.
   */
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Uzávierka prešla a inzerát je stále živý? Potom majiteľ musí dostať
  // otázku „a teraz čo" — dovtedy odpočet dobehol a nestalo sa nič
  // (Rastio, 17.8.2026). Texty aj akcie rozhoduje `deadlineOutcome`.
  const outcome = deadlineOutcome({
    t,
    language,
    deadline: item?.offer_deadline ?? null,
    active: item?.status === 'ACTIVE',
    offerCount: offers?.length ?? 0,
  });
  // „Vybrať z ponúk" vedie na `/ponuky/[id]` — obrazovku správy ponúk, kde
  // má majiteľ inzerát sám pre seba, bez galérie a verejnej časti. Vedie tam
  // aj upozornenie o novej ponuke, takže je to tá istá cesta, akú už pozná.
  function openLightbox(i: number) {
    console.log(`[GALÉRIA] Otváram fullscreen na fotke ${i + 1}`);
    setLightbox(i);
  }

  /** Text hlavného tlačidla + čo spraví. Jedno miesto, nie štyri vetvy v JSX. */
  function primaryAction(): { title: string; onPress: () => void } | null {
    if (!item) return null;
    if (isOwner) {
      // Ponuky sa od 12.8.2026 vybavujú v podtabe rovno tu, takže tlačidlo
      // „Spravovať ponuky" by viedlo na to isté. Úprava inzerátu naopak
      // z detailu neviedla nikam — teraz je to hlavná akcia majiteľa.
      return {
        title: t('propertyDetail.editListingAction'),
        onPress: () => router.push({ pathname: '/inzerat/[id]', params: { id: item.id } }),
      };
    }
    // Po uzávierke ani po uzavretí obchodu sa ponuka podať nedá —
    // tlačidlo, ktoré by aj tak neprešlo, radšej nie je.
    if (closed || item.status === 'CLOSED') return null;
    if (!myId) {
      return { title: t('propertyDetail.loginToOfferAction'), onPress: () => router.push('/login') };
    }
    return {
      title: myOffer ? t('propertyDetail.editMyOfferAction') : t('propertyDetail.makeOfferAction'),
      onPress: () => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } }),
    };
  }
  const cta = primaryAction();

  const params = item
    ? ([
        formatArea(item.area_m2) ? { value: formatArea(item.area_m2) as string, label: t('propertyDetail.paramArea') } : null,
        item.rooms != null ? { value: String(item.rooms), label: t('propertyDetail.paramRooms') } : null,
        { value: getPropertyLabel(t)[item.property_type], label: t('propertyDetail.paramType') },
        { value: String(item.view_count), label: t('propertyDetail.paramViews') },
      ].filter(Boolean) as { value: string; label: string }[])
    : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('propertyDetail.screenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        <ErrorNote error={error} />

        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item === null && !error ? (
          <Text style={[styles.missing, { color: palette.textMuted }]}>
            {t('propertyDetail.notFound')}
          </Text>
        ) : null}

        {item && pd ? (
          <>
            {/* ── hero galéria cez celú šírku ── */}
            <View style={[styles.hero, { backgroundColor: palette.surfacePressed }]}>
              {item.media.length > 0 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onGalleryScroll}>
                  {item.media.map((m, i) => (
                    // Tap na fotku otvára fullscreen — prirodzenejšie gesto
                    // než ikona (Rastio, 17.8.2026). `Pressable` nesmie
                    // prekryť listovanie, preto bez `onPressIn`.
                    <Pressable
                      key={m.id}
                      onPress={() => openLightbox(i)}
                      // Rozmer stránky musí byť na obálke, nie len na fotke —
                      // inak by `pagingEnabled` počítalo šírku z obsahu.
                      style={styles.heroPhoto}
                      accessibilityRole="button"
                      accessibilityLabel={t('propertyDetail.showPhotoFullscreen', { n: i + 1 })}>
                      <Image
                        source={{ uri: m.url }}
                        style={styles.heroPhoto}
                        contentFit="cover"
                        transition={160}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.heroPhoto, styles.noPhoto]}>
                  <Text style={{ color: palette.textMuted }}>{t('propertyDetail.noPhoto')}</Text>
                </View>
              )}

              <View style={styles.heroBadges}>
                <Badge text={getTransactionLabel(t)[item.transaction_type].toUpperCase()} tone="navy" />
                {/* Uzavretý obchod musí byť vidieť HNEĎ, nie až po scrollovaní —
                    inak človek podá ponuku na niečo, čo je dávno preč. */}
                {item.status === 'CLOSED' ? (
                  <Badge text={closedLabel(t, item.transaction_type).toUpperCase()} tone="warning" />
                ) : null}
                {item.is_seed ? <Badge text={t('propertyDetail.sampleBadge')} tone="warning" /> : null}
              </View>

              <View style={styles.heroActions}>
                {/* Viditeľná nápoveda, že sa fotka dá zväčšiť — tap na fotku
                    robí to isté, ale nikde by nebolo vidieť, že sa to dá. */}
                {item.media.length > 0 ? (
                  <Pressable
                    onPress={() => openLightbox(photo)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('propertyDetail.showPhotosFullscreen')}>
                    <Icon
                      name="arrow.up.left.and.arrow.down.right"
                      size={22}
                      color={palette.surface}
                      weight="semibold"
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void shareProperty(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('propertyDetail.shareListing')}>
                  <Icon name="square.and.arrow.up" size={24} color={palette.surface} weight="semibold" />
                </Pressable>
                {myId ? (
                  <FavoriteHeart active={favorites.has(item.id)} onToggle={() => toggle(item.id)} size={26} />
                ) : null}
              </View>

              {/* Počítadlo pozície — DOPLNOK k bodkám, nie náhrada:
                  bodky ukazujú, kde v poradí človek je, číslo povie presne
                  koľkú z koľkých pozerá. Vpravo dole, aby nekolidovalo
                  s bodkami v strede ani s ikonami hore. */}
              {item.media.length > 1 ? (
                <View style={styles.heroCounter}>
                  <PhotoBadge text={`${photo + 1}/${item.media.length}`} />
                </View>
              ) : null}

              {item.media.length > 1 ? (
                <View style={styles.dots}>
                  {item.media.map((m, i) => (
                    <View
                      key={m.id}
                      style={[
                        styles.dot,
                        i === photo ? styles.dotOn : null,
                        { backgroundColor: i === photo ? palette.onPrimary : palette.onPhotoSurface },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            <PhotoLightbox
              visible={lightbox !== null}
              photos={item.media.map((m) => ({ id: m.id, url: m.url }))}
              initialIndex={lightbox ?? 0}
              onClose={() => setLightbox(null)}
            />

            <View style={styles.body}>
              <View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.place, { color: palette.textMuted }]}>
                  {[item.street, item.city, item.district].filter(Boolean).join(' · ') || '—'}
                </Text>
                {/* Kto inzeruje. Doteraz to na detaile vidieť nebolo — prezývka
                    sa objavila až pri ponukách, čo je neskoro. */}
                <Text style={[styles.place, { color: palette.textMuted }]}>
                  {t('propertyDetail.addedBy', {
                    who: isOwner ? t('propertyDetail.addedByYou') : (item.owner?.nickname ?? t('propertyDetail.addedByUnknown')),
                  })}
                  {ownerRating ? ` · ${ownerRating}` : ''}
                </Text>
                {/* Odznak nikdy nestojí sám — vedľa neho je VETA, čo bolo
                    overené. Odznak, ktorý nevie povedať na základe čoho
                    vznikol, je pri nehnuteľnostiach nebezpečná ozdoba. */}
                {verified?.verified_at ? (
                  <View style={styles.verifiedRow}>
                    <Badge text={t('propertyDetail.verifiedBadge')} tone="accent" />
                    <Text style={[styles.place, { color: palette.textMuted }]}>
                      {verified.verified_note}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ── cena ── */}
              <View
                style={[
                  styles.priceCard,
                  Shadow.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Eyebrow>{isOffer ? t('propertyDetail.topOfferEyebrow') : t('propertyDetail.askingPriceEyebrow')}</Eyebrow>
                <Text style={[styles.money, { color: isOffer ? palette.accent : palette.primary }]}>
                  {isOffer
                    ? formatAmount(t, pd.topOffer as number, item.transaction_type)
                    : (formatPrice(t, pd.asking, item.transaction_type) ?? t('propertyDetail.priceNotGiven'))}
                </Text>
                <Text style={[styles.priceSub, { color: palette.textMuted }]}>
                  {[
                    isOffer && pd.asking != null
                      ? t('propertyDetail.askingApprox', { price: formatPrice(t, pd.asking, item.transaction_type) ?? '' })
                      : isOffer
                        ? t('propertyDetail.sellerNoPrice')
                        : null,
                    offerCountLabel(t, language, pd.offerCount) ?? t('propertyDetail.noOffersYet'),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {/* Zmena ceny patrí k cene, nie do samostatnej sekcie —
                    je to informácia o TEJTO sume, nie vedľajší údaj. */}
                {priceNote ? (
                  <Text
                    style={[
                      styles.priceSub,
                      { color: priceNote.direction === 'DOWN' ? palette.success : palette.warning },
                    ]}>
                    {priceNote.text}
                  </Text>
                ) : null}

                {deadline ? (
                  <Text
                    style={[
                      styles.deadline,
                      {
                        borderTopColor: palette.border,
                        color: closed ? palette.textMuted : palette.accentDeep,
                      },
                    ]}>
                    {deadline}
                  </Text>
                ) : null}
              </View>

              {/* Výzva majiteľovi po uzávierke. Neprihlásený ani záujemca ju
                  nevidí — jemu už štítok „Príjem ponúk ukončený" povedal
                  všetko, čo ho týka. */}
              {isOwner ? (
                <DeadlineDecision
                  outcome={outcome}
                  propertyId={item.id}
                  onDone={() => {
                    void reloadProperty();
                    void reloadOffers();
                  }}
                  onPickOffer={() => router.push({ pathname: '/ponuky/[id]', params: { id: item.id } })}
                />
              ) : null}

              {/* ── parametre 2×2 ── */}
              <View style={styles.grid}>
                {params.map((p) => (
                  <ParamCell key={p.label} value={p.value} label={p.label} />
                ))}
              </View>

              {item.address_hidden ? (
                <Text style={[styles.hidden, { color: palette.textMuted }]}>
                  {t('propertyDetail.addressHidden')}
                </Text>
              ) : null}

              {/* O byte a budove — pri predaji ROVNAKO ako pri prenájme. */}
              {buildingRows(t, language, item).length > 0 ? (
                <Card>
                  <Eyebrow>{t('propertyDetail.buildingEyebrow')}</Eyebrow>
                  <View style={styles.grid}>
                    {buildingRows(t, language, item).map((r) => (
                      <ParamCell key={r.label} value={r.value} label={r.label} />
                    ))}
                  </View>
                </Card>
              ) : null}

              {/* Podmienky prenájmu — pri predaji ich niet z čoho postaviť. */}
              {rentalRows(t, language, item).length > 0 ? (
                <Card>
                  <Eyebrow>{t('propertyDetail.rentalEyebrow')}</Eyebrow>
                  <View style={styles.grid}>
                    {rentalRows(t, language, item).map((r) => (
                      <ParamCell key={r.label} value={r.value} label={r.label} />
                    ))}
                  </View>
                </Card>
              ) : null}

              {/* Kalkulačka sa 12.8.2026 presunula do podtabu „Hypotéka" —
                  tu v strede obrazovky ju nikto nehľadal a pri prenájme
                  zavadzala. Tab sa ukazuje len pri predaji. */}

              {item.description ? (
                <Text style={[styles.description, { color: palette.textSecondary }]}>{item.description}</Text>
              ) : null}

              {/* ── podtaby ──
                  Všetko, čo sa dá s inzerátom ROBIŤ, je odtiaľto nižšie
                  a na jednom mieste. Nad nimi ostáva to, čo sa dá len
                  čítať — galéria, cena, parametre, popis. */}
              <PropertyTabs
                item={item}
                offers={offers}
                offersError={offersError}
                reloadOffers={reloadOffers}
                reloadProperty={reloadProperty}
                viewings={viewings}
                reloadViewings={reloadViewings}
                myId={myId}
                isOwner={isOwner}
                closed={closed}
                ownerSummary={ratings[item.owner_id]}
                winnerBidderId={winnerBidderId}
              />

              <Text style={[styles.added, { color: palette.textMuted }]}>
                {t('propertyDetail.addedOn', { date: formatDate(language, item.created_at) })}
              </Text>

              {!isOwner ? (
                <View style={styles.reportRow}>
                  <ReportButton targetType="PROPERTY" targetId={item.id} label={t('propertyDetail.reportListing')} compact />
                  <ReportButton targetType="USER" targetId={item.owner_id} label={t('propertyDetail.reportUser')} compact />
                  {/* Realitka sa pozná podľa toho, KTO inzeruje, nie podľa
                      jedného inzerátu — preto mieri na používateľa. */}
                  <ReportButton
                    targetType="USER"
                    targetId={item.owner_id}
                    label={t('propertyDetail.reportAgency')}
                    presetReason="REALITKA"
                    compact
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* ── prilepená spodná lišta ──
          Vždy v bezpečnej zóne, nezmizne po scrollovaní a nemá ako sa
          orezať. To je celý dôvod, prečo v mockupe zostala. */}
      {item && cta ? (
        <View
          style={[
            styles.sticky,
            Shadow.bar,
            {
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
              paddingBottom: Spacing.md + insets.bottom,
            },
          ]}>
          <Pressable
            onPress={cta.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              Shadow.button,
              { backgroundColor: palette.accentDeep, opacity: pressed ? 0.9 : 1 },
            ]}>
            <Text style={[styles.ctaText, { color: palette.onPrimary }]}>{cta.title}</Text>
          </Pressable>
          <Pressable
            onPress={() => void shareProperty(item)}
            accessibilityRole="button"
            accessibilityLabel={t('propertyDetail.shareListing')}
            style={({ pressed }) => [
              styles.ghost,
              { borderColor: palette.borderStrong, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Icon name="square.and.arrow.up" size={22} color={palette.primary} />
          </Pressable>
        </View>
      ) : null}
      <KeyboardDoneBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { gap: Spacing.md },
  spinner: { marginTop: Spacing.xxl },
  missing: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },

  hero: { height: 264 },
  heroPhoto: { width: SCREEN_W, height: 264 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  heroBadges: { position: 'absolute', top: Spacing.md, left: Spacing.md, flexDirection: 'row', gap: Spacing.xs },
  heroActions: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.md,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  heroCounter: { position: 'absolute', right: Spacing.md, bottom: Spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { width: 18 },

  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  title: { ...Type.heading, fontWeight: Weight.bold },
  place: { ...Type.bodyMd, marginTop: 2 },

  priceCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 2 },
  money: { fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold, ...MoneyType.hero, marginTop: 2 },
  priceSub: { ...Type.bodyMd, marginTop: 3 },
  deadline: {
    ...Type.bodyMd,
    fontWeight: Weight.semibold,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  hidden: { ...Type.caption },
  description: { ...Type.bodyLg },
  added: { ...Type.caption },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  reportRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.md },

  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    flex: 1,
    borderRadius: Radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  ctaText: { ...Type.button, fontWeight: Weight.bold },
  ghost: {
    width: 52,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
