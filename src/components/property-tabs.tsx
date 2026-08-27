/**
 * Podtaby na detaile inzerátu — Ponuky / Správy / Obhliadka / Hypotéka /
 * Hodnotenia.
 *
 * PREČO (Rastio, 12.8.2026): predtým boli ponuky, obhliadka a hodnotenia
 * poukladané pod sebou v jednom dlhom stĺpci a majiteľ musel na rozhodnutie
 * o ponuke odísť na inú obrazovku. Teraz je všetko na jednom mieste
 * a obe strany vidia TIE ISTÉ taby — líši sa obsah podľa toho, čo kto
 * smie spraviť, nie samotná stavba obrazovky.
 *
 * „SPRÁVY" PRIBUDLI 12.8.2026 a menia predošlé rozhodnutie. Dovtedy tu
 * stálo, že tab sa volá „Obhliadka" a nie „Komunikácia", lebo appka chat
 * nemá. Teraz ho má — a „Obhliadka" ostáva samostatne, lebo odkrytie
 * kontaktu je iná vec než písanie si.
 *
 * „HYPOTÉKA" sa ukazuje LEN pri predaji. Pri prenájme nemá čo počítať,
 * takže tam tab ani nie je — prázdna záložka je horšia než žiadna.
 *
 * ČO SA SEM ZÁMERNE NEPRESUNULO — formulár „Podať ponuku". Ostáva vlastnou
 * obrazovkou (`/ponuka/[id]`), lebo pri prenájme obsahuje celý dotazník
 * nájomcu a vlastnú kontrolu. Druhá kópia toho formulára by sa časom
 * rozišla s originálom. Tab vedie naň jedným ťuknutím a ukazuje stav
 * vlastnej ponuky, čo je to, čo z neho človek potrebuje vidieť.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MessagesTab } from '@/components/message-thread';
import { MortgageCalculator } from '@/components/mortgage';
import { OfferList } from '@/components/offer-list';
import { OwnerOffers } from '@/components/owner-offers';
import { PriceTimeline } from '@/components/price-timeline';
import { RatingCard } from '@/components/rating-card';
import { Reviews } from '@/components/reviews';
import { ViewingCard } from '@/components/viewing-card';
import { Button, Card, ErrorNote, Eyebrow, ParamCell } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, type TFunc } from '@/i18n';
import { errorText } from '@/lib/errors';
import {
  fetchOfferContact,
  formatAmount,
  getOfferStatusLabel,
  type Offer,
  type OfferContact,
} from '@/lib/offers';
import { db, type PropertyWithMedia } from '@/lib/property';
import { type RatingSummary } from '@/lib/rating';
import { fetchTabBadges, markRatingsViewed, markViewingViewed, type TabBadges } from '@/lib/tab-badges';
import { type Viewing } from '@/lib/viewing';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export type DetailTab = 'OFFERS' | 'MESSAGES' | 'VIEWING' | 'MORTGAGE' | 'RATINGS';

/**
 * Poradie je poradie použitia: najprv sa človek pýta (Správy), potom
 * ponúka, potom sa ide pozrieť, a hodnotí sa až na konci. Hypotéka je
 * medzi ponukou a obhliadkou — je to podklad k rozhodnutiu, nie krok.
 */
function tabsFor(t: TFunc, sale: boolean): [DetailTab, string][] {
  return [
    ['OFFERS', t('propertyTabs.offers')],
    ['MESSAGES', t('propertyTabs.messages')],
    ['VIEWING', t('viewing.eyebrow')],
    ...(sale ? ([['MORTGAGE', t('propertyTabs.mortgage')]] as [DetailTab, string][]) : []),
    ['RATINGS', t('propertyTabs.ratings')],
  ];
}

/** Hypotéka nemá čo sledovať — je to kalkulačka, nič sa v nej nedeje samo. */
function badgeFor(tab: DetailTab, badges: TabBadges): boolean {
  switch (tab) {
    case 'OFFERS':
      return badges.offers;
    case 'MESSAGES':
      return badges.messages;
    case 'VIEWING':
      return badges.viewing;
    case 'RATINGS':
      return badges.ratings;
    default:
      return false;
  }
}

export function PropertyTabs({
  item,
  offers,
  offersError,
  reloadOffers,
  reloadProperty,
  viewings,
  reloadViewings,
  myId,
  isOwner,
  closed,
  ownerSummary,
  winnerBidderId,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  offersError: string | null;
  reloadOffers: () => Promise<void>;
  reloadProperty: () => Promise<void>;
  viewings: Viewing[] | undefined;
  reloadViewings: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  /** Uzávierka ponúk už prešla. */
  closed: boolean;
  ownerSummary: RatingSummary | undefined;
  /** Kto obchod vyhral — majiteľ podľa toho vie, koho hodnotí. */
  winnerBidderId: string | undefined;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>('OFFERS');
  const sale = item.transaction_type === 'SALE';
  const tabs = tabsFor(t, sale);

  // ── ODZNAKY NOVEJ AKTIVITY (Rastio, 13.8.2026) ──────────────────────
  const [badges, setBadges] = useState<TabBadges>({ offers: false, messages: false, viewing: false, ratings: false });
  const reloadBadges = useCallback(() => {
    if (!myId) return;
    void fetchTabBadges(item.id)
      .then(setBadges)
      .catch((e: unknown) => console.log(`[ODZNAKY] Nedostupné: ${errorText(e)}`));
  }, [item.id, myId]);

  useEffect(() => {
    reloadBadges();
  }, [reloadBadges]);

  // Otvorenie tabu OZNAČÍ jeho vlastnú aktivitu za videnú — Ponuky (OFFERS)
  // a Správy (MESSAGES) to už robia SAMÉ (`mark_offers_viewed` v
  // `OwnerOffers`/`OffersTab`, `markRead` v `Conversation` pri otvorení
  // vlákna); Obhliadka a Hodnotenia dostali tento mechanizmus TERAZ, takže
  // ho spúšťa tento efekt priamo. Krátke oneskorenie pred druhým
  // `reloadBadges()` necháva vlastný mark-as-viewed obsahu tabu dobehnúť
  // predtým, než sa odznak prekreslí.
  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    const mark =
      tab === 'VIEWING' ? markViewingViewed(item.id)
        : tab === 'RATINGS' ? markRatingsViewed(item.id)
          : Promise.resolve();
    mark
      .catch((e: unknown) => console.log(`[ODZNAKY] Označenie za videné zlyhalo: ${errorText(e)}`))
      .finally(() => {
        if (!cancelled) reloadBadges();
      });
    const t = setTimeout(() => {
      if (!cancelled) reloadBadges();
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, item.id, myId]);

  // Rozmery tab baru — z NICH sa počíta, či sa dá scrollovať ďalej, nie
  // z toho, či posledný tab náhodou vyjde odrezaný (§ komentár nižšie).
  const [scrollMeta, setScrollMeta] = useState({ viewportW: 0, contentW: 0, scrollX: 0 });
  // Optimisticky `true`, kým sa rozmery nezmerajú — pri piatich taboch je
  // scroll takmer isto potrebný a je lepšie na zlomok sekundy ukázať fade
  // navyše, než aby prvý snímok nezobrazil žiaden náznak vôbec.
  const canScrollRight =
    scrollMeta.contentW === 0 || scrollMeta.contentW - scrollMeta.viewportW - scrollMeta.scrollX > 2;

  // Najvyššia ŽIVÁ ponuka — kalkulačka z nej vie začať, keď predávajúci
  // cenu neuviedol. Stiahnuté a odmietnuté sa nerátajú: nie sú to čísla,
  // za ktoré je dnes niekto ochotný kúpiť.
  const liveOffers = (offers ?? []).filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
  const topOffer = liveOffers.length > 0 ? Math.max(...liveOffers.map((o) => o.amount)) : null;

  return (
    <View style={styles.wrap}>
      {/* Tabov je päť a na úzkom telefóne sa nezmestia — lišta sa preto
          posúva (Rastio, 13.8.2026 — pôvodná verzia mala BUG, nie len
          tesný dizajn).

          PRÍČINA PRVÉHO BUGU: `tab` mal `flex: 1` a rámik s pozadím bol na
          `contentContainerStyle`. Vnútri horizontálneho ScrollView nemá
          obsah pevnú šírku, takže yoga layout `flex: 1` vyriešil tak, že
          VŠETKÝCH päť tabov vtesnal presne do šírky obrazovky — scroll
          teda nemal čo robiť. OPRAVA: rámik je na VONKAJŠOM `View`,
          taby dostali šírku podľa textu (`flex: 1` preč).

          DRUHÉ KOLO (Rastio, 13.8.2026, so screenshotom): spoliehal som
          sa, že `overflow: hidden` na vonkajšom `View` sám od seba odreže
          posledný tab napoly a to bude náznak scrollu. **To nie je
          zaručené** — či je posledný VIDITEĽNÝ tab odrezaný napoly, alebo
          presne dolieha na okraj (0 % viditeľný piaty tab), závisí od
          náhodnej zhody medzi šírkou obrazovky a súčtom šírok tabov. Na
          Rastiovom telefóne vyšlo práve to druhé — „Hypotéka" dosadla
          presne na okraj, nič nenaznačovalo, že za ňou niečo je.

          OPRAVA, ktorá sa nespolieha na náhodu: `canScrollRight` sa počíta
          zo SKUTOČNÝCH rozmerov (`onLayout` + `onContentSizeChange` +
          `onScroll`), nie z toho, ako to vyjde. Kým sa dá scrollovať
          ďalej, na pravom okraji je poloprehľadný FADE (`ScrollFade` nižšie)
          — vrstva pásov s rastúcou nepriehľadnosťou smerom k okraju,
          v FARBE POZADIA LIŠTY, takže vyzerá, že obsah do nej dotečie.
          Skutočný `expo-linear-gradient` by vyžadoval nový natívny modul
          a teda nový build (§3/§9) len na tento detail — poschodá vrstva
          rovnakej farby v klesajúcej priehľadnosti robí to isté bez neho. */}
      <View style={[styles.barOuter, { backgroundColor: palette.surfacePressed, borderColor: palette.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => {
            const w = e.nativeEvent?.layout?.width;
            if (w != null) setScrollMeta((m) => ({ ...m, viewportW: w }));
          }}
          onContentSizeChange={(w) => setScrollMeta((m) => ({ ...m, contentW: w }))}
          onScroll={(e) => {
            // Pád „Cannot read property 'contentOffset' of null" (Rastio,
            // 19.8.2026) — `e.nativeEvent.contentOffset.x` sa čítalo bez
            // ochrany. Presnú príčinu prečo bol `nativeEvent` null sa v tomto
            // prostredí nedá reprodukovať (žiadny simulátor, §3) — namiesto
            // hádania sa pridáva ochrana na PRESNE to miesto, čo hlásenie
            // ukazuje, a log, aby bolo vidieť, ak sa to stane znova.
            const x = e.nativeEvent?.contentOffset?.x;
            if (x == null) {
              console.log('[TABY] onScroll bez contentOffset — event preskočený');
              return;
            }
            setScrollMeta((m) => ({ ...m, scrollX: x }));
          }}
          contentContainerStyle={styles.barInner}>
          {tabs.map(([value, label]) => {
            const active = tab === value;
            const hasBadge = badgeFor(value, badges);
            return (
              <Pressable
                key={value}
                onPress={() => setTab(value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={hasBadge ? t('propertyTabs.newActivity', { label }) : label}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: active ? palette.surface : 'transparent',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <View style={styles.tabRow}>
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? palette.textPrimary : palette.textMuted,
                        fontWeight: active ? Weight.bold : Weight.medium,
                      },
                    ]}>
                    {label}
                  </Text>
                  {/* Bodka, nie číslo — tab nesie viac vecí naraz (nová ponuka
                      AJ zmena stavu), presné číslo by muselo sčítať dve rôzne
                      veci a pôsobilo by presnejšie, než v skutočnosti je. */}
                  {hasBadge ? <View style={[styles.tabDot, { backgroundColor: palette.danger }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {canScrollRight ? <ScrollFade color={palette.surfacePressed} /> : null}
      </View>

      {tab === 'OFFERS' ? (
        <OffersTab
          item={item}
          offers={offers}
          offersError={offersError}
          reloadOffers={reloadOffers}
          reloadProperty={reloadProperty}
          myId={myId}
          isOwner={isOwner}
          closed={closed}
        />
      ) : null}

      {tab === 'MESSAGES' ? (
        <MessagesTab item={item} offers={offers} myId={myId} isOwner={isOwner} />
      ) : null}

      {/* Kalkulačka je čisto klientský výpočet — nič sa neukladá a nikam
          sa neposiela, takže tab nepotrebuje ani načítavanie, ani chybu. */}
      {tab === 'MORTGAGE' && sale ? (
        <View style={styles.body}>
          <MortgageCalculator price={item.asking_price_hint} topOffer={topOffer} />
        </View>
      ) : null}

      {tab === 'VIEWING' ? (
        <ViewingTab
          item={item}
          offers={offers}
          viewings={viewings}
          reloadViewings={reloadViewings}
          reloadProperty={reloadProperty}
          myId={myId}
          isOwner={isOwner}
          closed={closed}
        />
      ) : null}

      {tab === 'RATINGS' ? (
        <RatingsTab
          item={item}
          myId={myId}
          isOwner={isOwner}
          ownerSummary={ownerSummary}
          winnerBidderId={winnerBidderId}
        />
      ) : null}
    </View>
  );
}

/**
 * Náznak, že tab bar pokračuje ďalej doprava — poschodá vrstva pásov
 * ROVNAKEJ farby ako pozadie lišty, s klesajúcou nepriehľadnosťou smerom
 * dnu. Bez `expo-linear-gradient` (nový natívny modul = nový build, §3/§9)
 * je toto najbližšia napodobenina skutočného fade-out gradientu.
 *
 * `pointerEvents="none"`: leží nad posledným viditeľným tabom, nesmie mu
 * brániť v ťuknutí.
 */
function ScrollFade({ color }: { color: string }) {
  // Nepriehľadnosť rastie SMEROM VON (k okraju) — najbližšie k obsahu je
  // takmer priehľadný pás, pri okraji je plná farba pozadia lišty.
  const steps = [0.08, 0.22, 0.4, 0.62, 0.85, 1];
  return (
    <View pointerEvents="none" style={styles.fade}>
      {steps.map((opacity, i) => (
        <View key={i} style={[styles.fadeStep, { backgroundColor: color, opacity }]} />
      ))}
    </View>
  );
}

// ── PONUKY ────────────────────────────────────────────────────────────────

function OffersTab({
  item,
  offers,
  offersError,
  reloadOffers,
  reloadProperty,
  myId,
  isOwner,
  closed,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  offersError: string | null;
  reloadOffers: () => Promise<void>;
  reloadProperty: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  closed: boolean;
}) {
  const palette = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t, language } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = offers ?? [];
  const mine = myId ? list.find((o) => o.bidder_id === myId && o.status !== 'WITHDRAWN') : undefined;

  // Zobrazenie tohto tabu ZNAMENÁ, že záujemca videl rozhodnutie o svojej
  // ponuke — rovnaký princíp ako pri `OwnerOffers` (13.8.2026: `mark_offers_viewed`
  // je odteraz obojstranná, pozná aj túto stranu). Priamy UPDATE na
  // `viewed_by_bidder_at` nemá povolený nikto — musí ísť cez RPC.
  useEffect(() => {
    if (!mine || isOwner) return;
    void db()
      .rpc('mark_offers_viewed', { p_property_id: item.id })
      .then(({ error: e }) => {
        if (e) console.log(`[PONUKY] Označenie za videné (záujemca) zlyhalo: ${e.message}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, isOwner, mine?.id, mine?.status]);

  async function withdraw() {
    if (!mine || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await db()
        .from('property_offer')
        .update({ status: 'WITHDRAWN' })
        .eq('id', mine.id);
      if (e) throw e;
      await reloadOffers();
      toast(t('propertyTabs.offerWithdrawnToast'), 'info');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKA] Stiahnutie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      <ErrorNote error={offersError} />
      <ErrorNote error={error} />

      {/* MAJITEĽ — rozhoduje priamo tu, nemusí nikam odchádzať. */}
      {isOwner ? (
        <Card>
          <Eyebrow>{t('propertyTabs.offersCount', { count: list.length })}</Eyebrow>
          {offers === undefined ? (
            <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.loading')}</Text>
          ) : (
            <OwnerOffers
              item={item}
              offers={list}
              reload={reloadOffers}
              reloadProperty={reloadProperty}
            />
          )}
        </Card>
      ) : null}

      {/* ZÁUJEMCA — stav svojej ponuky a čo sa s ňou dá spraviť. */}
      {!isOwner && myId ? (
        <Card>
          <Eyebrow>{t('propertyTabs.myOffer')}</Eyebrow>
          {mine ? (
            <>
              <View style={styles.grid}>
                <ParamCell
                  value={formatAmount(t, mine.amount, item.transaction_type)}
                  label={t('propertyTabs.myAmount')}
                />
                <ParamCell value={getOfferStatusLabel(t)[mine.status]} label={t('propertyTabs.statusLabel')} />
              </View>
              {mine.status === 'ACCEPTED' ? (
                <Text style={[styles.note, { color: palette.success }]}>{t('propertyTabs.offerAcceptedNote')}</Text>
              ) : null}
              {mine.status === 'REJECTED' ? (
                <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.offerRejectedNote')}</Text>
              ) : null}
              {mine.status === 'EXPIRED' ? (
                <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.offerExpiredNote')}</Text>
              ) : null}
              {mine.status === 'PENDING' ? (
                <>
                  <Button
                    title={t('propertyTabs.editMyOffer')}
                    variant="outline"
                    onPress={() => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } })}
                  />
                  <Button
                    title={busy ? t('propertyTabs.withdrawing') : t('propertyTabs.withdrawOffer')}
                    variant="danger"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(t('propertyTabs.withdrawConfirmTitle'), t('propertyTabs.withdrawConfirmBody'), [
                        { text: t('common.back'), style: 'cancel' },
                        { text: t('propertyTabs.withdrawConfirmYes'), style: 'destructive', onPress: () => void withdraw() },
                      ])
                    }
                  />
                </>
              ) : null}
            </>
          ) : closed || item.status === 'CLOSED' ? (
            <Text style={[styles.note, { color: palette.warning }]}>{t('propertyTabs.offersClosedNote')}</Text>
          ) : (
            <>
              <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.priceIndicativeNote')}</Text>
              <Button
                title={t('propertyTabs.submitOffer')}
                onPress={() => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } })}
              />
            </>
          )}
        </Card>
      ) : null}

      {!myId ? (
        <Card>
          <Eyebrow>{t('propertyTabs.wantToOffer')}</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.mustSignInNote')}</Text>
          <Button title={t('propertyTabs.signInAndOffer')} onPress={() => router.push('/login')} />
        </Card>
      ) : null}

      {/* VEREJNÝ ZOZNAM — vidí ho ktokoľvek vrátane neprihláseného.
          Majiteľovi sa neopakuje, ten má hore ten istý zoznam s akciami. */}
      {!isOwner ? (
        <Card>
          <Eyebrow>{t('propertyTabs.allOffersCount', { count: list.length })}</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.publicOffersNote')}</Text>
          <OfferList
            offers={list}
            transaction={item.transaction_type}
            highlightBidderId={myId}
            allowReport
          />
        </Card>
      ) : null}

      <PriceTimeline propertyId={item.id} offers={list} transaction={item.transaction_type} />
    </View>
  );
}

// ── OBHLIADKA ─────────────────────────────────────────────────────────────

function ViewingTab({
  item,
  offers,
  viewings,
  reloadViewings,
  reloadProperty,
  myId,
  isOwner,
  closed,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  viewings: Viewing[] | undefined;
  reloadViewings: () => Promise<void>;
  reloadProperty: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  closed: boolean;
}) {
  const palette = useTheme();
  const { t } = useTranslation();

  if (!myId) {
    return (
      <View style={styles.body}>
        <Card>
          <Eyebrow>{t('viewing.eyebrow')}</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.viewingSignInNote')}</Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <ViewingCard
        propertyId={item.id}
        myId={myId}
        isOwner={isOwner}
        closed={closed}
        viewings={viewings}
        reload={reloadViewings}
        reloadProperty={reloadProperty}
      />

      {/* Kontakt odkrytý PRIJATOU PONUKOU. Je tu zámerne spolu s obhliadkou
          (Rastio, 12.8.2026): odkryť sa dá dvoma cestami a človek nemá čo
          hľadať, ktorou z nich to bolo. Zaujíma ho jedno — na koho zavolať. */}
      <AcceptedOfferContacts item={item} offers={offers} myId={myId} isOwner={isOwner} />
    </View>
  );
}

/**
 * Kontakt z PRIJATEJ ponuky. Majiteľ ho vidí na víťazného záujemcu, záujemca
 * na majiteľa — a rozhoduje o tom `offer_contact()` v databáze, nie tento
 * komponent. Mimo stavu ACCEPTED vráti prázdno aj samotným stranám.
 */
function AcceptedOfferContacts({
  item,
  offers,
  myId,
  isOwner,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  myId: string;
  isOwner: boolean;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Record<string, OfferContact>>({});

  const accepted = (offers ?? []).filter(
    (o) => o.status === 'ACCEPTED' && (isOwner || o.bidder_id === myId)
  );
  const key = accepted.map((o) => o.id).join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, OfferContact> = {};
      for (const id of key.split(',')) {
        try {
          const c = await fetchOfferContact(id);
          if (c) next[id] = c;
        } catch (e: unknown) {
          console.log(`[PONUKA] Kontakt nedostupný: ${errorText(e)}`);
        }
      }
      if (!cancelled) setContacts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (accepted.length === 0) return null;

  return (
    <Card>
      <Eyebrow>{t('propertyTabs.acceptedOfferContact')}</Eyebrow>
      {accepted.map((o) => {
        const c = contacts[o.id];
        return (
          <View key={o.id} style={styles.item}>
            <Text style={[styles.status, { color: palette.textPrimary }]}>
              {isOwner
                ? `${o.bidder?.nickname ?? t('propertyTabs.bidderFallback')} · ${formatAmount(t, o.amount, item.transaction_type)}`
                : t('propertyTabs.sellerMyOffer', { amount: formatAmount(t, o.amount, item.transaction_type) })}
            </Text>
            {c ? (
              <View style={styles.grid}>
                <ParamCell value={c.nickname} label={t('viewing.paramNickname')} />
                <ParamCell value={c.full_name ?? t('viewing.paramNameEmpty')} label={t('viewing.paramName')} />
                <ParamCell value={c.phone ?? t('viewing.paramPhoneEmpty')} label={t('viewing.paramPhone')} />
                <ParamCell value={c.email ?? t('viewing.paramEmailEmpty')} label={t('viewing.paramEmail')} />
              </View>
            ) : (
              <Text style={[styles.note, { color: palette.textMuted }]}>{t('viewing.loadingContact')}</Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

// ── HODNOTENIA ────────────────────────────────────────────────────────────

/**
 * ROZSAH: hodnotenia CELÉHO majiteľa, nie len z tohto inzerátu.
 *
 * Rozhodnutie (12.8.2026) a dôvod: hodnotenie je o ČLOVEKU, nie o veci.
 * Kto sa rozhoduje, či mu poslať peniaze, potrebuje vedieť, ako sa správal
 * v obchodoch celkovo. Per-inzerát by navyše skoro vždy ukázalo nula alebo
 * jedno hodnotenie — inzerát sa predá raz — takže by to bola sekcia, ktorá
 * vyzerá ako dôkaz dôveryhodnosti, ale nič nedokazuje. To je horšie než
 * žiadna. Hodnotenie sa síce ZADÁVA per obchod (a DB to tak aj drží), ale
 * ZOBRAZUJE sa zosumarizované za človeka.
 */
function RatingsTab({
  item,
  myId,
  isOwner,
  ownerSummary,
  winnerBidderId,
}: {
  item: PropertyWithMedia;
  myId: string | undefined;
  isOwner: boolean;
  ownerSummary: RatingSummary | undefined;
  winnerBidderId: string | undefined;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const nickname = item.owner?.nickname ?? t('propertyTabs.sellerFallback');

  return (
    <View style={styles.body}>
      {/* Hodnotenie sa zobrazí LEN keď to dovolí databáza (`can_rate`),
          takže sa obrazovka nemá ako opýtať na niečo, čo server odmietne. */}
      {item.status === 'CLOSED' ? (
        <RatingCard
          propertyId={item.id}
          rateeId={isOwner ? (winnerBidderId ?? null) : item.owner_id}
          rateeNickname={isOwner ? t('propertyTabs.theBidder') : nickname}
          myId={myId}
        />
      ) : null}

      <Reviews userId={item.owner_id} nickname={nickname} summary={ownerSummary} />

      <Text style={[styles.note, { color: palette.textMuted }]}>
        {isOwner ? t('propertyTabs.ratingsOwnerNote') : t('propertyTabs.ratingsBidderNote', { nickname })}
      </Text>
      {item.status !== 'CLOSED' ? (
        <Text style={[styles.note, { color: palette.textMuted }]}>{t('propertyTabs.ratingsNotYetNote')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  // Rámik je TU, na vonkajšom View — pri scrolle zostáva pripnutý
  // k viewportu (§ komentár vyššie). `overflow: hidden` je zámerné:
  // vytvára ten odrezaný posledný tab, ktorý signalizuje, že sa dá
  // posunúť ďalej.
  barOuter: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 3,
    overflow: 'hidden',
  },
  barInner: { flexDirection: 'row', gap: 3 },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    flexDirection: 'row',
  },
  fadeStep: { flex: 1 },
  tab: {
    // ŽIADNY `flex: 1` — to bol presne ten bug (komentár vyššie).
    // Šírka podľa textu, nie rovnomerné rozdelenie viewportu.
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { ...Type.bodyMd },
  tabDot: { width: 7, height: 7, borderRadius: 4 },

  body: { gap: Spacing.md },
  note: { ...Type.bodyMd },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  item: { gap: Spacing.sm, marginTop: Spacing.sm },
  status: { ...Type.bodyLg },
});
