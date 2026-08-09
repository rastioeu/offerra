/**
 * Správa ponúk — pohľad MAJITEĽA. `id` je id nehnuteľnosti.
 *
 * Oproti verejnému zoznamu má navyše dve veci, ktoré verejné nie sú:
 *  - dotazník nájomcu pri prenájme (DB ho cudziemu ani nevydá),
 *  - po prijatí ponuky skutočný kontakt na záujemcu.
 *
 * Kontakt sa NEČÍTA z tabuľky `profile` — rola `authenticated` na
 * `full_name`/`phone` nemá SELECT vôbec. Ide cez `offerra.offer_contact()`,
 * ktorá ho vydá len stranám prijatej ponuky.
 *
 * REDIZAJN (mockup „Dôveryhodne teplá", obrazovka 4, schválené 8.8.2026):
 * zoznam sú KARTY ako všade inde a podrobnosti + rozhodnutie sa otvárajú
 * v SPODNOM PANELI. Predtým bola každá ponuka rozbalená karta s dotazníkom
 * aj tlačidlami — pri piatich ponukách sa v tom nedalo zorientovať a
 * porovnať sumy na jednej obrazovke bolo nemožné.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfferList } from '@/components/offer-list';
import { OfferTimeline } from '@/components/offer-timeline';
import { Button, Card, ErrorNote, Eyebrow, ParamCell } from '@/components/ui';
import { useOffers, useTenantProfiles } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { closeDeal } from '@/lib/rating';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchOfferContact,
  formatAmount,
  OFFER_STATUS_LABEL,
  type Offer,
  type OfferContact,
  type TenantProfile,
} from '@/lib/offers';
import { closedLabel, db, formatDate } from '@/lib/property';
import { Money as MoneyType, Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

export default function ManageOffersScreen() {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, reload: reloadProperty } = useProperty(id);
  const { offers, error, reload } = useOffers(id);
  const tenants = useTenantProfiles((offers ?? []).map((o) => o.id));

  const [contacts, setContacts] = useState<Record<string, OfferContact | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useRefreshOnFocus(reload);

  // Otvorenie tejto obrazovky ZNAMENÁ, že majiteľ ponuky videl — presne to
  // sa záujemcovi zobrazí. Razítko zapisuje `mark_offers_viewed()`, lebo
  // priamy UPDATE na ten stĺpec nemá povolený nikto (viď register 7.15).
  useEffect(() => {
    if (!id) return;
    void db()
      .rpc('mark_offers_viewed', { p_property_id: id })
      .then(({ data, error: e }) => {
        if (e) {
          console.log(`[PONUKY] Označenie za videné zlyhalo: ${e.message}`);
          return;
        }
        // Prekresliť treba len keď sa naozaj niečo zmenilo.
        if (typeof data === 'number' && data > 0) void reload();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Panel číta ZO ZOZNAMU, nie z vlastnej kópie — po prijatí ponuky sa tak
  // prekreslí sám a nezobrazuje zastaraný stav.
  const selected: Offer | undefined = (offers ?? []).find((o) => o.id === openId);

  /**
   * Uzavretie obchodu. Všetko robí JEDNA funkcia v databáze — stav
   * inzerátu, víťazná ponuka, konečná suma aj uzavretie ostatných
   * čakajúcich ponúk. Keby to appka robila po jednom, pád medzi krokmi
   * by nechal obchod v polovici.
   */
  async function finish(offerId: string) {
    if (!id) return;
    setBusy(offerId);
    try {
      await closeDeal(id, offerId, null);
      await reload();
      await reloadProperty();
      setOpenId(null);
      Alert.alert(
        'Obchod uzavretý',
        'Inzerát zmizol z katalógu. V jeho detaile teraz môžete jeden druhého ohodnotiť.'
      );
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Uzavretie zlyhalo: ${m}`);
      Alert.alert('Uzavretie zlyhalo', m);
    } finally {
      setBusy(null);
    }
  }

  async function decide(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
    setBusy(offerId);
    try {
      const { error: e } = await db().from('property_offer').update({ status }).eq('id', offerId);
      if (e) throw e;
      await reload();
      if (status === 'ACCEPTED') {
        const c = await fetchOfferContact(offerId);
        setContacts((prev) => ({ ...prev, [offerId]: c }));
        Alert.alert(
          'Ponuka prijatá',
          c?.full_name || c?.phone || c?.email
            ? `Kontakt na záujemcu je teraz odkrytý: ${[c.full_name, c.phone, c.email].filter(Boolean).join('\n')}`
            : 'Záujemca si zatiaľ nevyplnil meno ani telefón. Odkryje sa ti, hneď ako to spraví.'
        );
      } else {
        setOpenId(null);
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Rozhodnutie zlyhalo: ${m}`);
      Alert.alert('Nepodarilo sa uložiť', m);
    } finally {
      setBusy(null);
    }
  }

  async function revealContact(offerId: string) {
    try {
      const c = await fetchOfferContact(offerId);
      setContacts((prev) => ({ ...prev, [offerId]: c }));
      if (!c) Alert.alert('Kontakt nie je dostupný', 'Odkryje sa až po prijatí ponuky.');
    } catch (e: unknown) {
      const m = errorText(e);
      Alert.alert('Načítanie kontaktu zlyhalo', m);
    }
  }

  const isRent = item?.transaction_type === 'RENT';
  const tenant: TenantProfile | undefined = selected ? tenants[selected.id] : undefined;
  const contact = selected ? contacts[selected.id] : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ponuky na inzerát',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
          // Z profilu sa ťuknutím ide sem, nie do úpravy — inzerát sa
          // preto musí dať upraviť odtiaľto, inak by k nemu po zverejnení
          // neviedla žiadna cesta.
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/inzerat/[id]', params: { id: String(id) } })}
              accessibilityRole="button"
              hitSlop={12}>
              <Text style={[styles.headerAction, { color: palette.primary }]}>Upraviť</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />

        {offers === undefined || !item ? (
          <ActivityIndicator color={palette.primary} style={styles.spinner} />
        ) : null}

        {item ? <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text> : null}
        {item ? (
          <Text style={[styles.lead, { color: palette.textMuted }]}>
            Ťukni na ponuku a uvidíš všetko, čo o nej vieš — aj tlačidlá Prijať
            a Odmietnuť.
          </Text>
        ) : null}

        {item && offers ? (
          <OfferList
            offers={offers}
            transaction={item.transaction_type}
            onPressOffer={(o) => setOpenId(o.id)}
          />
        ) : null}
      </ScrollView>

      {/* ── spodný panel ── */}
      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setOpenId(null)}>
        <View style={styles.sheetWrap}>
          {/* Ťuknutie nad panel ho zavrie — bežné správanie spodných panelov. */}
          <Pressable
            style={[styles.scrim, { backgroundColor: palette.scrim }]}
            onPress={() => setOpenId(null)}
            accessibilityLabel="Zavrieť"
          />

          {selected && item ? (
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
                      {selected.bidder?.nickname ?? 'neznámy'}
                    </Text>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>
                      {formatDate(selected.created_at)} · {OFFER_STATUS_LABEL[selected.status].toLowerCase()}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: palette.accent }]}>
                    {formatAmount(selected.amount, item.transaction_type)}
                  </Text>
                </View>

                {selected.message ? (
                  <Text style={[styles.message, { color: palette.textSecondary }]}>„{selected.message}"</Text>
                ) : null}

                <View style={styles.section}>
                  <Eyebrow>Priebeh</Eyebrow>
                  <OfferTimeline offer={selected} />
                </View>

                {isRent ? (
                  tenant ? (
                    <View style={styles.section}>
                      <Eyebrow>O nájomcovi</Eyebrow>
                      <View style={styles.grid}>
                        <ParamCell value={tenant.num_people != null ? String(tenant.num_people) : '—'} label="Osôb" />
                        <ParamCell
                          value={tenant.has_pets ? tenant.pet_details || 'Áno' : 'Nemá'}
                          label="Zvieratá"
                        />
                        <ParamCell
                          value={tenant.lease_duration_months != null ? `${tenant.lease_duration_months} mes.` : '—'}
                          label="Dĺžka nájmu"
                        />
                        <ParamCell value={tenant.employment_status ?? '—'} label="Zamestnanie" />
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
                          label="Príjem orientačne"
                        />
                      </View>
                      {tenant.note ? (
                        <Text style={[styles.message, { color: palette.textSecondary }]}>{tenant.note}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={[styles.meta, { color: palette.textMuted }]}>
                      Záujemca dotazník nevyplnil.
                    </Text>
                  )
                ) : null}

                {selected.status === 'ACCEPTED' ? (
                  <Card>
                    <Eyebrow>Odkrytý kontakt</Eyebrow>
                    {contact ? (
                      <View style={styles.grid}>
                        <ParamCell value={contact.full_name ?? 'nevyplnené'} label="Meno" />
                        <ParamCell value={contact.phone ?? 'nevyplnený'} label="Telefón" />
                        <ParamCell value={contact.email ?? 'nedostupný'} label="E-mail" />
                      </View>
                    ) : (
                      <Button
                        title="Zobraziť kontakt"
                        onPress={() => revealContact(selected.id)}
                        variant="outline"
                      />
                    )}
                  </Card>
                ) : null}

                {selected.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <Button
                      title="Prijať ponuku"
                      onPress={() => decide(selected.id, 'ACCEPTED')}
                      loading={busy === selected.id}
                      disabled={busy !== null}
                    />
                    <Button
                      title="Odmietnuť"
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
                    title={`${closedLabel(item.transaction_type)} tomuto záujemcovi`}
                    variant="outline"
                    disabled={busy !== null}
                    onPress={() =>
                      Alert.alert(
                        `${closedLabel(item.transaction_type)}?`,
                        `Inzerát zmizne z katalógu, ostatné čakajúce ponuky sa uzavrú a ` +
                          `vy dvaja sa budete môcť navzájom ohodnotiť. Späť sa to vziať nedá.`,
                        [
                          { text: 'Zrušiť', style: 'cancel' },
                          { text: 'Uzavrieť obchod', onPress: () => void finish(selected.id) },
                        ]
                      )
                    }
                  />
                ) : null}

                <Button title="Zavrieť" onPress={() => setOpenId(null)} variant="outline" />
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerAction: { ...Type.bodyLg, fontWeight: Weight.semibold },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  spinner: { marginTop: Spacing.xxl },
  title: { ...Type.title, fontWeight: Weight.bold },
  lead: { ...Type.bodyMd, marginTop: -Spacing.sm },

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
