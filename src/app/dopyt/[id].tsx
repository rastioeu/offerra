/**
 * Detail dopytu + tlačidlo „Osloviť".
 *
 * Oslovenie nie je DM, ale ZÁZNAM: adresát ho vidí vo svojom profile pri
 * danom dopyte. Je to vedomý medzikrok, nie nedopatrenie — appka nemá
 * súkromné správy a nechceme, aby sa ňou dalo obťažovať.
 *
 * (Do 9.8.2026 tu stálo, že notifikácie v Offerre neexistujú. Od buildu
 * 1.3.0 existujú — push aj zvonček. Komentár, ktorý klame o mechanike,
 * je horší než žiadny.)
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemandMessages } from '@/components/demand-messages';
import { ModalScreen } from '@/components/modal-screen';

import { Badge, Button, Card, ErrorNote, Field, KeyboardDoneBar } from '@/components/ui';
import { useMyOutreach, useOutreach, useRequest } from '@/hooks/use-offers';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { formatBudget } from '@/lib/offers';
import { db, formatArea, formatDate, formatPrice, formatRooms, getDemandLabel, getPropertyLabel, type PropertyType } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

export default function RequestDetailScreen() {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const myId = session?.user.id;

  const { item, error } = useRequest(id);
  const { items: myProperties } = useMyProperties(myId);
  const { items: outreach, reload: reloadOutreach } = useOutreach(id);
  // Oslovenia MÔJHO dopytu — aj s inzerátom, ktorý mi ponúkajú. Bez toho
  // sa nedalo zistiť ani ČO mi ponúkajú, nieto sa na to prekliknúť.
  const { items: mine, error: mineError, reload: reloadMine } = useMyOutreach(id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMine = Boolean(myId && item && item.user_id === myId);
  const activeProperties = (myProperties ?? []).filter((p) => p.status === 'ACTIVE');
  const alreadySent = new Set(outreach.map((o) => o.property_id));

  async function send() {
    if (!item || !myId || !chosen || busy) return;
    setBusy(true);
    try {
      const { error: e } = await db().from('request_outreach').insert({
        request_id: item.id,
        property_id: chosen,
        from_id: myId,
        message: message.trim() || null,
      });
      if (e) throw e;
      await reloadOutreach();
      await reloadMine();
      const sentWith = chosen;
      setPickerOpen(false);
      setChosen(null);
      setMessage('');
      toast(t('dopytDetail.outreachSentToast'));
      // NÁVRAT DO INZERÁTU, KTORÝM OSLOVIL (Rastio, 9.8.2026): zostať na
      // cudzom dopyte po odoslaní nedáva zmysel — spravil tam všetko, čo
      // sa dalo. Vedie to na VEREJNÝ detail, nie do editora: presne to
      // uvidí druhá strana, keď si oslovenie otvorí.
      router.replace({ pathname: '/nehnutelnost/[id]', params: { id: sentWith } });
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OSLOVENIE] Odoslanie zlyhalo: ${m}`);
      Alert.alert(
        t('dopytDetail.outreachFailedTitle'),
        /duplicate key/i.test(m) ? t('dopytDetail.outreachDuplicate') : m
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('dopytDetail.screenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />
        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}
        {item === null && !error ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>{t('dopytDetail.notFound')}</Text>
        ) : null}

        {item ? (
          <>
            <View style={styles.badges}>
              <Badge text={getDemandLabel(t)[item.transaction_type].toUpperCase()} tone="accent" />
              {item.property_type ? <Badge text={getPropertyLabel(t)[item.property_type as PropertyType]} /> : null}
            </View>

            <Text style={[styles.budget, { color: palette.primary }]}>
              {formatBudget(t, item.budget_min, item.budget_max)}
            </Text>
            <Text style={[styles.author, { color: palette.textMuted }]}>
              {t('dopytDetail.seekingBy', {
                nickname: item.author?.nickname ?? t('dopytDetail.unknownAuthor'),
                date: formatDate(language, item.created_at),
              })}
            </Text>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('dopytDetail.whatSeekingSection')}</Text>
              <Row label={t('dopytDetail.locationLabel')} value={[item.city, item.district, item.region].filter(Boolean).join(' · ') || t('dopytDetail.emptyDash')} />
              <Row label={t('dopytDetail.typeLabel')} value={item.property_type ? getPropertyLabel(t)[item.property_type as PropertyType] : t('dopytDetail.typeAny')} />
              <Row label={t('dopytDetail.roomsRowLabel')} value={item.rooms_min != null ? t('dopytDetail.roomsAtLeast', { count: item.rooms_min }) : t('dopytDetail.emptyDash')} />
              <Row label={t('dopytDetail.areaRowLabel')} value={item.area_min != null ? t('dopytDetail.areaAtLeast', { area: formatArea(item.area_min) ?? '' }) : t('dopytDetail.emptyDash')} />
            </Card>

            {item.description ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>{t('dopytDetail.descriptionSection')}</Text>
                <Text style={[styles.desc, { color: palette.textPrimary }]}>{item.description}</Text>
              </Card>
            ) : null}

            {/* SPRÁVY (Rastio, 13.8.2026: „pridaj chat aj pri dopytoch") —
                dostupné VŽDY, aj bez formálneho oslovenia. Preto je karta
                TU, nad Osloveniami: pýtať sa má byť možné skôr, než niekto
                ponúkne svoj inzerát. */}
            <DemandMessages
              requestId={item.id}
              requestOwnerId={item.user_id}
              outreach={outreach}
              myId={myId}
              isMine={isMine}
            />

            {isMine ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>
                  {t('dopytDetail.outreachSection', { count: (mine ?? []).length })}
                </Text>
                <ErrorNote error={mineError} />
                {(mine ?? []).length === 0 ? (
                  <Text style={[styles.desc, { color: palette.textMuted }]}>
                    {t('dopytDetail.outreachEmpty')}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.hint, { color: palette.textMuted }]}>
                      {t('dopytDetail.outreachHint')}
                    </Text>
                    {(mine ?? []).map((o) => {
                      // Inzerát medzičasom mohol zmiznúť alebo byť stiahnutý.
                      // Klikať na neexistujúce by skončilo prázdnou obrazovkou.
                      const openable = o.property_status === 'ACTIVE' || o.property_status === 'CLOSED';
                      const facts = [
                        o.property_city,
                        formatRooms(t, language, o.property_rooms),
                        formatArea(o.property_area),
                      ].filter(Boolean) as string[];
                      // Cena je v Offerre nepovinná — keď chýba, hovorí
                      // najvyššia živá ponuka. Keď nie je ani tá, povie sa to.
                      const price =
                        formatPrice(t, o.property_price, item.transaction_type === 'RENT' ? 'RENT' : 'SALE') ??
                        (o.property_top_offer != null
                          ? t('dopytDetail.topOfferPrice', { price: formatPrice(t, o.property_top_offer, item.transaction_type === 'RENT' ? 'RENT' : 'SALE') ?? '' })
                          : t('dopytDetail.priceNotGiven'));
                      return (
                        <Pressable
                          key={o.id}
                          disabled={!openable}
                          accessibilityRole={openable ? 'button' : 'text'}
                          onPress={() =>
                            router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } })
                          }
                          style={({ pressed }) => [
                            styles.outreach,
                            {
                              borderColor: palette.border,
                              backgroundColor: pressed ? palette.surfacePressed : 'transparent',
                              opacity: openable ? 1 : 0.6,
                            },
                          ]}>
                          <Text style={[styles.optionTitle, { color: palette.textPrimary }]}>
                            {o.property_title || t('dopytDetail.noTitle')}
                          </Text>
                          <Text style={[styles.price, { color: palette.primary }]}>{price}</Text>
                          {facts.length > 0 ? (
                            <Text style={[styles.author, { color: palette.textSecondary }]}>
                              {facts.join(' · ')}
                            </Text>
                          ) : null}
                          {o.message ? (
                            <Text style={[styles.desc, { color: palette.textPrimary }]}>{o.message}</Text>
                          ) : null}
                          <Text style={[styles.author, { color: palette.textMuted }]}>
                            {t('dopytDetail.authorMeta', { nickname: o.from_nickname ?? t('dopytDetail.unknownNickname'), date: formatDate(language, o.created_at) })}
                            {openable ? '' : t('dopytDetail.propertyGone')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                )}
              </Card>
            ) : myId ? (
              <>
                <Button
                  title={t('dopytDetail.outreachButton')}
                  onPress={() => {
                    if (activeProperties.length === 0) {
                      Alert.alert(
                        t('dopytDetail.nothingToOfferTitle'),
                        t('dopytDetail.nothingToOfferBody')
                      );
                      return;
                    }
                    setPickerOpen(true);
                  }}
                />
                {outreach.length > 0 ? (
                  <Text style={[styles.author, { color: palette.textMuted }]}>
                    {t('dopytDetail.alreadyOutreached', { count: outreach.length })}
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <ModalScreen visible={pickerOpen} onClose={() => setPickerOpen(false)} title={t('dopytDetail.pickerTitle')}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
            {activeProperties.map((p) => {
              const used = alreadySent.has(p.id);
              const active = chosen === p.id;
              return (
                <Pressable
                  key={p.id}
                  disabled={used}
                  onPress={() => setChosen(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: used }}
                  style={[
                    styles.option,
                    {
                      backgroundColor: active ? palette.surfacePressed : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                      opacity: used ? 0.5 : 1,
                    },
                  ]}>
                  <Text style={[styles.optionTitle, { color: palette.textPrimary }]}>{p.title || t('dopytDetail.noTitle')}</Text>
                  {/* CENA A IZBY (Rastio, 9.8.2026): predtým tu bol len názov,
                      mesto a m². Podľa toho sa nedalo rozhodnúť, KTORÝ inzerát
                      poslať — a pri viacerých inzerátoch v tom istom meste boli
                      riadky prakticky nerozoznateľné. */}
                  <Text style={[styles.price, { color: palette.primary }]}>
                    {formatPrice(t, p.asking_price_hint, p.transaction_type) ??
                      (p.top_offer != null
                        ? t('dopytDetail.topOfferPrice', { price: formatPrice(t, p.top_offer, p.transaction_type) ?? '' })
                        : t('dopytDetail.priceNotGiven'))}
                  </Text>
                  <Text style={[styles.author, { color: palette.textMuted }]}>
                    {used
                      ? t('dopytDetail.alreadySentWith')
                      : [p.city, formatRooms(t, language, p.rooms), formatArea(p.area_m2)]
                          .filter(Boolean)
                          .join(' · ')}
                  </Text>
                </Pressable>
              );
            })}

            <Field
              label={t('dopytDetail.messageLabel')}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder={t('dopytDetail.messagePlaceholder')}
            />

            <Button
              title={busy ? t('dopytDetail.sendingButton') : t('dopytDetail.sendButton')}
              onPress={send}
              disabled={busy || !chosen}
            />
          </ScrollView>
          <KeyboardDoneBar />
      </ModalScreen>
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
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  badges: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  budget: { ...Type.hero, fontWeight: Weight.bold },
  author: { ...Type.caption },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  desc: { ...Type.bodyLg },
  outreach: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  price: { ...Type.bodyLg, fontWeight: Weight.bold },
  hint: { ...Type.caption },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
  modal: { padding: Spacing.lg, gap: Spacing.md },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...Type.title, fontWeight: Weight.bold },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
  modalScroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  option: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 2 },
  optionTitle: { ...Type.bodyLg, fontWeight: Weight.semibold },
});
