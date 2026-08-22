/**
 * Správa ponúk — pohľad MAJITEĽA. Zoznam + spodný panel s rozhodnutím.
 *
 * Oproti verejnému zoznamu má navyše dve veci, ktoré verejné nie sú:
 *  - dotazník nájomcu pri prenájme (DB ho cudziemu ani nevydá),
 *  - po prijatí ponuky skutočný kontakt na záujemcu.
 *
 * Kontakt sa NEČÍTA z tabuľky `profile` — rola `authenticated` na
 * `full_name`/`phone` nemá SELECT vôbec. Ide cez `offerra.offer_contact()`,
 * ktorá ho vydá len stranám prijatej ponuky.
 *
 * PREČO KOMPONENTA A NIE OBRAZOVKA (12.8.2026): to isté rozhodovanie je
 * teraz na dvoch miestach — na obrazovke „Ponuky na inzerát" a v podtabe
 * „Ponuky" na detaile inzerátu. Dve kópie tej istej logiky by sa časom
 * rozišli a jedna z nich by tichšie klamala.
 *
 * Zoznam sú KARTY ako všade inde a podrobnosti + rozhodnutie sa otvárajú
 * v SPODNOM PANELI (mockup „Dôveryhodne teplá", obrazovka 4, schválené
 * 8.8.2026). Predtým bola každá ponuka rozbalená karta s dotazníkom aj
 * tlačidlami — pri piatich ponukách sa v tom nedalo zorientovať.
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfferList } from '@/components/offer-list';
import { OfferTimeline } from '@/components/offer-timeline';
import { Button, Card, Eyebrow, ParamCell } from '@/components/ui';
import { useTenantProfiles } from '@/hooks/use-offers';
import { useToast, useUndoToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import {
  fetchOfferContact,
  formatAmount,
  getOfferStatusLabel,
  type Offer,
  type OfferContact,
  type TenantProfile,
} from '@/lib/offers';
import { closedLabel, db, formatDate, type PropertyWithMedia } from '@/lib/property';
import { closeDeal } from '@/lib/rating';
import { Money as MoneyType, Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

export function OwnerOffers({
  item,
  offers,
  reload,
  reloadProperty,
}: {
  item: PropertyWithMedia;
  offers: Offer[];
  reload: () => Promise<void>;
  reloadProperty: () => Promise<void>;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const confirmWithUndo = useUndoToast();
  const tenants = useTenantProfiles(offers.map((o) => o.id));

  const [contacts, setContacts] = useState<Record<string, OfferContact | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Panel číta ZO ZOZNAMU, nie z vlastnej kópie — po prijatí ponuky sa tak
  // prekreslí sám a nezobrazuje zastaraný stav.
  const selected: Offer | undefined = offers.find((o) => o.id === openId);

  // Zobrazenie tohto zoznamu ZNAMENÁ, že majiteľ ponuky videl — presne to
  // sa záujemcovi zobrazí. Razítko zapisuje `mark_offers_viewed()`, lebo
  // priamy UPDATE na ten stĺpec nemá povolený nikto (viď register 7.15).
  //
  // Je to TU, nie na obrazovke „Ponuky na inzerát": od 12.8.2026 sa ponuky
  // dajú vybaviť aj v podtabe na detaile a razítko musí platiť rovnako pre
  // obe cesty. Inak by záujemcovi svietilo „nevidené" pri ponuke, ktorú
  // majiteľ práve odmietol.
  useEffect(() => {
    void db()
      .rpc('mark_offers_viewed', { p_property_id: item.id })
      .then(({ data, error: e }) => {
        if (e) {
          console.log(`[PONUKY] Označenie za videné zlyhalo: ${e.message}`);
          return;
        }
        // Prekresliť treba len keď sa naozaj niečo zmenilo.
        if (typeof data === 'number' && data > 0) void reload();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  /**
   * Uzavretie obchodu. Všetko robí JEDNA funkcia v databáze — stav
   * inzerátu, víťazná ponuka, konečná suma aj uzavretie ostatných
   * čakajúcich ponúk. Keby to appka robila po jednom, pád medzi krokmi
   * by nechal obchod v polovici.
   */
  async function finish(offerId: string) {
    setBusy(offerId);
    try {
      await closeDeal(item.id, offerId, null);
      await reload();
      await reloadProperty();
      setOpenId(null);
      toast(t('ownerOffers.dealClosedToast'));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Uzavretie zlyhalo: ${m}`);
      Alert.alert(t('ownerOffers.closeFailedTitle'), m);
    } finally {
      setBusy(null);
    }
  }

  /**
   * Zamietnutie je nezvratné a tlačidlo „Odmietnuť" je hneď vedľa
   * „Prijať" — undo okno (Rastio, 14.8.2026) chráni pred preklikom.
   * Panel sa zavrie hneď, server sa dotkne až po dobehnutí odpočtu.
   */
  function rejectOffer(offerId: string) {
    setOpenId(null);
    confirmWithUndo(t('ownerOffers.willBeRejected'), async () => {
      setBusy(offerId);
      try {
        const { error: e } = await db().from('property_offer').update({ status: 'REJECTED' }).eq('id', offerId);
        if (e) throw e;
        await reload();
        toast(t('ownerOffers.rejectedToast'), 'info');
      } catch (e: unknown) {
        const m = errorText(e);
        console.log(`[PONUKY] Odmietnutie zlyhalo: ${m}`);
        Alert.alert(t('ownerOffers.saveFailedTitle'), m);
      } finally {
        setBusy(null);
      }
    });
  }

  async function decide(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
    if (status === 'REJECTED') {
      rejectOffer(offerId);
      return;
    }
    setBusy(offerId);
    try {
      const { error: e } = await db().from('property_offer').update({ status }).eq('id', offerId);
      if (e) throw e;
      await reload();
      const c = await fetchOfferContact(offerId);
      setContacts((prev) => ({ ...prev, [offerId]: c }));
      Alert.alert(
        t('ownerOffers.acceptedTitle'),
        c?.full_name || c?.phone || c?.email
          ? t('ownerOffers.contactRevealed', { contact: [c.full_name, c.phone, c.email].filter(Boolean).join('\n') })
          : t('ownerOffers.contactNotFilledYet'),
      );
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Rozhodnutie zlyhalo: ${m}`);
      Alert.alert(t('ownerOffers.saveFailedTitle'), m);
    } finally {
      setBusy(null);
    }
  }

  async function revealContact(offerId: string) {
    try {
      const c = await fetchOfferContact(offerId);
      setContacts((prev) => ({ ...prev, [offerId]: c }));
      if (!c) Alert.alert(t('ownerOffers.contactUnavailableTitle'), t('ownerOffers.contactUnavailableBody'));
    } catch (e: unknown) {
      Alert.alert(t('ownerOffers.contactLoadFailedTitle'), errorText(e));
    }
  }

  const isRent = item.transaction_type === 'RENT';
  const tenant: TenantProfile | undefined = selected ? tenants[selected.id] : undefined;
  const contact = selected ? contacts[selected.id] : undefined;

  return (
    <>
      {offers.length > 0 ? (
        <Text style={[styles.lead, { color: palette.textMuted }]}>{t('ownerOffers.lead')}</Text>
      ) : null}

      <OfferList
        offers={offers}
        transaction={item.transaction_type}
        onPressOffer={(o) => setOpenId(o.id)}
      />

      {/* ── spodný panel ── */}
      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setOpenId(null)}>
        <View style={styles.sheetWrap}>
          {/* Ťuknutie nad panel ho zavrie — bežné správanie spodných panelov. */}
          <Pressable
            style={[styles.scrim, { backgroundColor: palette.scrim }]}
            onPress={() => setOpenId(null)}
            accessibilityLabel={t('common.close')}
          />

          {selected ? (
            <View
              style={[
                styles.sheet,
                Shadow.bar,
                { backgroundColor: palette.surface, paddingBottom: Spacing.lg + insets.bottom },
              ]}>
              <View style={[styles.grip, { backgroundColor: palette.border }]} />

              <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.head}>
                  <View style={[styles.avatar, { backgroundColor: palette.surfacePressed }]}>
                    <Text style={[styles.avatarText, { color: palette.accentDeep }]}>
                      {(selected.bidder?.nickname ?? '?').trim().slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.headText}>
                    <Text style={[styles.nick, { color: palette.textPrimary }]}>
                      {selected.bidder?.nickname ?? t('offerList.unknown')}
                    </Text>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>
                      {formatDate(language, selected.created_at)} · {getOfferStatusLabel(t)[selected.status].toLowerCase()}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: palette.accent }]}>
                    {formatAmount(t, selected.amount, item.transaction_type)}
                  </Text>
                </View>

                {selected.message ? (
                  <Text style={[styles.message, { color: palette.textSecondary }]}>„{selected.message}"</Text>
                ) : null}

                <View style={styles.section}>
                  <Eyebrow>{t('ownerOffers.progress')}</Eyebrow>
                  <OfferTimeline offer={selected} />
                </View>

                {isRent ? (
                  tenant ? (
                    <View style={styles.section}>
                      <Eyebrow>{t('ownerOffers.aboutTenant')}</Eyebrow>
                      <View style={styles.grid}>
                        <ParamCell value={tenant.num_people != null ? String(tenant.num_people) : '—'} label={t('ownerOffers.peopleLabel')} />
                        <ParamCell
                          value={tenant.has_pets ? tenant.pet_details || t('common.yes') : t('ownerOffers.noPets')}
                          label={t('ownerOffers.petsLabel')}
                        />
                        <ParamCell
                          value={tenant.lease_duration_months != null ? t('ownerOffers.monthsAbbrev', { count: tenant.lease_duration_months }) : '—'}
                          label={t('ownerOffers.leaseLengthLabel')}
                        />
                        <ParamCell value={tenant.employment_status ?? '—'} label={t('ownerOffers.employmentLabel')} />
                        <ParamCell
                          value={
                            tenant.monthly_income_hint != null
                              ? new Intl.NumberFormat('sk-SK', {
                                  style: 'currency',
                                  currency: 'EUR',
                                  maximumFractionDigits: 0,
                                }).format(tenant.monthly_income_hint)
                              : '—'
                          }
                          label={t('ownerOffers.incomeLabel')}
                        />
                      </View>
                      {tenant.note ? (
                        <Text style={[styles.message, { color: palette.textSecondary }]}>{tenant.note}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={[styles.meta, { color: palette.textMuted }]}>{t('ownerOffers.noTenantForm')}</Text>
                  )
                ) : null}

                {selected.status === 'ACCEPTED' ? (
                  <Card>
                    <Eyebrow>{t('ownerOffers.revealedContact')}</Eyebrow>
                    {contact ? (
                      <View style={styles.grid}>
                        <ParamCell value={contact.full_name ?? t('viewing.paramNameEmpty')} label={t('viewing.paramName')} />
                        <ParamCell value={contact.phone ?? t('viewing.paramPhoneEmpty')} label={t('viewing.paramPhone')} />
                        <ParamCell value={contact.email ?? t('viewing.paramEmailEmpty')} label={t('viewing.paramEmail')} />
                      </View>
                    ) : (
                      <Button
                        title={t('ownerOffers.showContact')}
                        onPress={() => revealContact(selected.id)}
                        variant="outline"
                      />
                    )}
                  </Card>
                ) : null}

                {selected.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <Button
                      title={t('ownerOffers.acceptOffer')}
                      onPress={() => decide(selected.id, 'ACCEPTED')}
                      loading={busy === selected.id}
                      disabled={busy !== null}
                    />
                    <Button
                      title={t('viewing.declineButton')}
                      onPress={() => decide(selected.id, 'REJECTED')}
                      variant="outline"
                      disabled={busy !== null}
                    />
                  </View>
                ) : null}

                {/* Uzavretie obchodu. Až tu, nie pri prijatí ponuky —
                    prijatá ponuka znamená „dohodnime sa", uzavretý obchod
                    znamená „hotovo". Sú to dve rôzne veci a splynúť
                    nesmú: medzi nimi ide papierovačka, ktorá padne. */}
                {item.status === 'ACTIVE' &&
                (selected.status === 'ACCEPTED' || selected.status === 'PENDING') ? (
                  <Button
                    title={t('ownerOffers.closeDealTo', { label: closedLabel(t, item.transaction_type) })}
                    variant="outline"
                    disabled={busy !== null}
                    onPress={() =>
                      Alert.alert(
                        t('ownerOffers.closeDealConfirmTitle', { label: closedLabel(t, item.transaction_type) }),
                        t('ownerOffers.closeDealConfirmBody'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('ownerOffers.closeDealConfirmYes'), onPress: () => void finish(selected.id) },
                        ]
                      )
                    }
                  />
                ) : null}

                <Button title={t('common.close')} onPress={() => setOpenId(null)} variant="outline" />
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { ...Type.bodyMd },

  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '86%', paddingTop: Spacing.sm },
  grip: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.md },

  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Type.title, fontWeight: Weight.bold },
  headText: { flex: 1, gap: 2 },
  nick: { ...Type.subtitle, fontWeight: Weight.bold },
  meta: { ...Type.caption },
  amount: { fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold, ...MoneyType.medium },
  message: { ...Type.bodyMd, fontStyle: 'italic' },
  section: { gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.sm },
});
