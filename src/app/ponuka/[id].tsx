/**
 * Podanie / úprava ponuky. `id` je id nehnuteľnosti, nie ponuky.
 *
 * Jedna ŽIVÁ ponuka na záujemcu a inzerát (v DB to drží čiastočný unikátny
 * index). Zvýšenie ponuky je teda ÚPRAVA tej istej, nie nová — inak by sa
 * verejný zoznam dal zaplaviť.
 *
 * Pri PRENÁJME pribúda dotazník nájomcu. Ten NIE JE verejný — vidí ho len
 * majiteľ a sám záujemca.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';
import { OfferTimeline } from '@/components/offer-timeline';
import { OfferValidityPicker } from '@/components/offer-validity-picker';
import { Button, Card, ChoiceRow, ErrorNote, Eyebrow, Field, ParamCell } from '@/components/ui';
import { useOffers, useTenantProfiles } from '@/hooks/use-offers';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/components/toast';
import { maybeOfferPush } from '@/lib/push-prompt';
import { useTheme } from '@/hooks/use-theme';
import { useOfferCountdownTick } from '@/hooks/use-offer-countdown-tick';
import { useTranslation } from '@/i18n';
import { OfferCountdownText } from '@/components/offer-countdown';
import { getEmploymentOptions, fetchOfferContact, formatAmount, type OfferContact } from '@/lib/offers';
import { isOfferExpired } from '@/lib/offer-validity';
import { db, formatPrice, isDeadlinePassed } from '@/lib/property';
import { Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

function num(text: string): number | null {
  const c = text.replace(',', '.').trim();
  if (c === '') return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}

export default function OfferFormScreen() {
  const palette = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const myId = session?.user.id;
  const toast = useToast();

  const { item } = useProperty(id);
  const { offers, reload: reloadOffers } = useOffers(id);
  // CHYBA, KTORÚ TO OPRAVUJE (nájdená 8.8.2026): hľadala sa len ponuka
  // v stave PENDING, takže po PRIJATÍ ponuky záujemca uvidel prázdny
  // formulár „Podať ponuku" — vlastnú prijatú ponuku ani odkrytý kontakt
  // nevidel vôbec, hoci mu ho databáza vydať vie (`offer_contact` pozná
  // obe strany).
  const mine = offers?.find(
    (o) => o.bidder_id === myId && (o.status === 'PENDING' || o.status === 'ACCEPTED')
  );
  const accepted = mine?.status === 'ACCEPTED';
  const tenants = useTenantProfiles(mine ? [mine.id] : []);
  const myTenant = mine ? tenants[mine.id] : undefined;

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [people, setPeople] = useState('');
  const [pets, setPets] = useState<'NO' | 'YES'>('NO');
  const [petDetails, setPetDetails] = useState('');
  const [months, setMonths] = useState('');
  const [employment, setEmployment] = useState(getEmploymentOptions(t)[0]);
  const [income, setIncome] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server smie tieto polia NAPLNIŤ, nikdy nie PREPÍSAŤ — to isté pravidlo
  // ako v `src/lib/form-draft.ts`. Efekt závislý na načítanom riadku by sa
  // spustil pri každom obnovení zoznamu ponúk (nový objekt = iná identita,
  // aj keď je obsah rovnaký) a zmazal by rozpísanú sumu aj správu. Presne
  // tak sa 9.8.2026 strácal rozpísaný inzerát pri pridaní fotky.
  const filledOffer = useRef<string | null>(null);
  useEffect(() => {
    if (!mine || filledOffer.current === mine.id) return;
    filledOffer.current = mine.id;
    setAmount(String(mine.amount));
    setMessage(mine.message ?? '');
    setValidUntil(mine.valid_until);
  }, [mine]);

  const filledTenant = useRef<string | null>(null);
  useEffect(() => {
    if (!myTenant || filledTenant.current === myTenant.offer_id) return;
    filledTenant.current = myTenant.offer_id;
    setPeople(myTenant.num_people != null ? String(myTenant.num_people) : '');
    setPets(myTenant.has_pets ? 'YES' : 'NO');
    setPetDetails(myTenant.pet_details ?? '');
    setMonths(myTenant.lease_duration_months != null ? String(myTenant.lease_duration_months) : '');
    setEmployment(myTenant.employment_status ?? getEmploymentOptions(t)[0]);
    setIncome(myTenant.monthly_income_hint != null ? String(myTenant.monthly_income_hint) : '');
    setNote(myTenant.note ?? '');
  }, [myTenant]);

  // Kontakt na predávajúceho — vydá ho len `offer_contact()` a len keď
  // je ponuka prijatá. Pred prijatím vráti prázdno aj samotnému
  // záujemcovi, takže sa tu nedá nič vytiahnuť skôr.
  const [contact, setContact] = useState<OfferContact | null>(null);
  useEffect(() => {
    if (!accepted || !mine) return;
    let cancelled = false;
    void fetchOfferContact(mine.id)
      .then((c) => {
        if (!cancelled) setContact(c);
      })
      .catch((e: unknown) => {
        console.log(`[PONUKA] Kontakt sa nepodarilo načítať: ${errorText(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [accepted, mine]);

  // JEDEN tikajúci `now` pre túto obrazovku — len jedna ponuka (`mine`)
  // tu má odpočet, ale rovnaký hook ako všade inde (Rastio, 1.9.2026).
  const now = useOfferCountdownTick([mine?.valid_until]);

  const isRent = item?.transaction_type === 'RENT';
  // Expirovaná ponuka (aj keď v DB ešte čaká na cron) sa do „najvyššej
  // doteraz" nesmie počítať — inak by nový záujemca súťažil so sumou,
  // ktorú už nikto nemôže prijať.
  const highest = offers?.find((o) => o.status === 'PENDING' && !isOfferExpired(o.status, o.valid_until));
  // Uzávierku drží aj databáza; tu je preto, aby používateľ videl DÔVOD,
  // nie chybovú hlášku zo servera.
  const closed = isDeadlinePassed(item?.offer_deadline ?? null);

  async function submit() {
    if (!item || !myId || busy) return;
    const value = num(amount);
    if (value == null || value <= 0) {
      setError(t('ponukaForm.amountRequired'));
      return;
    }
    // Počet osôb bol doteraz len ZOBRAZENÝ, nie vyžadovaný — 4 z 19
    // dotazníkov ho nemali. Pri prenájme je to prvá otázka, ktorú
    // prenajímateľ položí, takže sa pýta hneď. Drží to aj DB.
    const peopleCount = num(people);
    if (isRent && (peopleCount == null || peopleCount < 1)) {
      setError(t('ponukaForm.peopleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let offerId = mine?.id;
      if (offerId) {
        const { error: e } = await db()
          .from('property_offer')
          .update({ amount: value, message: message.trim() || null, valid_until: validUntil })
          .eq('id', offerId);
        if (e) throw e;
      } else {
        const { data, error: e } = await db()
          .from('property_offer')
          .insert({
            property_id: item.id,
            bidder_id: myId,
            amount: value,
            message: message.trim() || null,
            valid_until: validUntil,
            status: 'PENDING',
          })
          .select('id')
          .single();
        if (e) throw e;
        offerId = (data as { id: string }).id;
      }

      if (isRent && offerId) {
        const payload = {
          offer_id: offerId,
          num_people: peopleCount,
          has_pets: pets === 'YES',
          pet_details: pets === 'YES' ? petDetails.trim() || null : null,
          lease_duration_months: num(months),
          employment_status: employment,
          monthly_income_hint: num(income),
          note: note.trim() || null,
        };
        const { error: te } = await db().from('tenant_profile').upsert(payload, { onConflict: 'offer_id' });
        if (te) throw te;
      }

      await reloadOffers();
      toast(mine ? t('ponukaForm.updatedToast') : t('ponukaForm.sentToast'));
      // Až TERAZ má otázka o upozorneniach zmysel — človek čaká odpoveď.
      if (!mine) void maybeOfferPush(t, myId, 'OFFER');
      router.back();
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKA] Odoslanie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!mine) return;
    Alert.alert(t('ponukaForm.withdrawTitle'), t('ponukaForm.withdrawBody'), [
      { text: t('ponukaForm.cancel'), style: 'cancel' },
      {
        text: t('ponukaForm.withdraw'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: e } = await db()
              .from('property_offer')
              .update({ status: 'WITHDRAWN' })
              .eq('id', mine.id);
            if (e) throw e;
            await reloadOffers();
            router.back();
          } catch (e: unknown) {
            const m = errorText(e);
            console.log(`[PONUKA] Stiahnutie zlyhalo: ${m}`);
            Alert.alert(t('ponukaForm.withdrawFailedTitle'), m);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: mine ? t('ponukaForm.editScreenTitle') : t('ponukaForm.newScreenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />
      <FormScreen>
        {!item ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item ? (
          <>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.sub, { color: palette.textMuted }]}>
              {formatPrice(t, item.asking_price_hint, item.transaction_type)
                ? t('ponukaForm.askingPrice', { price: formatPrice(t, item.asking_price_hint, item.transaction_type) ?? '' })
                : t('ponukaForm.noPriceGiven')}
            </Text>
            {highest ? (
              <Text style={[styles.sub, { color: palette.link }]}>
                {t('ponukaForm.highestSoFar', { amount: formatAmount(t, highest.amount, item.transaction_type) })}
              </Text>
            ) : null}

            {closed ? (
              <Text style={[styles.closed, { color: palette.warning }]}>
                {t('ponukaForm.deadlinePassed')}
              </Text>
            ) : null}

            {/* Priebeh MOJEJ ponuky — kvôli tomu vzniklo razítko o pozretí.
                Bez neho tu bolo len ticho, kým majiteľ nerozhodol. */}
            {mine ? (
              <Card>
                <Eyebrow>{t('ponukaForm.myOfferProgress')}</Eyebrow>
                <OfferTimeline offer={mine} />
                {mine.valid_until ? (
                  <OfferCountdownText status={mine.status} validUntil={mine.valid_until} now={now} style={styles.note} />
                ) : null}
              </Card>
            ) : null}

            {accepted ? (
              <Card>
                <Eyebrow>{t('ponukaForm.revealedContact')}</Eyebrow>
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  {t('ponukaForm.revealedContactNote')}
                </Text>
                {contact ? (
                  <View style={styles.contactGrid}>
                    <ParamCell value={contact.nickname ?? t('ponukaForm.dash')} label={t('ponukaForm.nicknameLabel')} />
                    <ParamCell value={contact.full_name ?? t('ponukaForm.nameNotGiven')} label={t('ponukaForm.nameLabel')} />
                    <ParamCell value={contact.phone ?? t('ponukaForm.phoneNotGiven')} label={t('ponukaForm.phoneLabel')} />
                    <ParamCell value={contact.email ?? t('ponukaForm.emailNotGiven')} label={t('ponukaForm.emailLabel')} />
                  </View>
                ) : (
                  <Text style={[styles.note, { color: palette.textMuted }]}>{t('ponukaForm.loadingContact')}</Text>
                )}
              </Card>
            ) : null}

            {/* Po prijatí sa formulár skryje — meniť prijatú ponuku
                nemá zmysel a databáza to aj tak nepustí (guard trigger). */}
            {!accepted ? (
            <>
            <Field
              label={t('ponukaForm.amountLabel')}
              hint={
                isRent
                  ? t('ponukaForm.amountHintRent')
                  : t('ponukaForm.amountHintSale')
              }
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={isRent ? t('ponukaForm.amountPlaceholderRent') : t('ponukaForm.amountPlaceholderSale')}
            />

            <Field
              label={isRent ? t('ponukaForm.messageLabelRent') : t('ponukaForm.messageLabelSale')}
              hint={t('ponukaForm.messageHint')}
              value={message}
              onChangeText={setMessage}
              // Príklad musí sedieť na obchod. Hypotéka pri nájme nedáva
              // zmysel a rovno hovorí, že si to nikto neprečítal.
              placeholder={
                isRent
                  ? t('ponukaForm.messagePlaceholderRent')
                  : t('ponukaForm.messagePlaceholderSale')
              }
              multiline
            />

            <OfferValidityPicker value={validUntil} onChange={setValidUntil} />

            {isRent ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>
                  {t('ponukaForm.tenantSection')}
                </Text>
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  {t('ponukaForm.tenantNote')}
                </Text>

                <Field
                  label={t('ponukaForm.peopleLabel')}
                  hint={t('ponukaForm.peopleHint')}
                  value={people}
                  onChangeText={setPeople}
                  keyboardType="numeric"
                  placeholder={t('ponukaForm.peoplePlaceholder')}
                />
                <ChoiceRow<'NO' | 'YES'>
                  label={t('ponukaForm.petsLabel')}
                  options={[
                    { value: 'NO', label: t('ponukaForm.petsNo') },
                    { value: 'YES', label: t('ponukaForm.petsYes') },
                  ]}
                  value={pets}
                  onChange={setPets}
                />
                {pets === 'YES' ? (
                  <Field
                    label={t('ponukaForm.petDetailsLabel')}
                    value={petDetails}
                    onChangeText={setPetDetails}
                    placeholder={t('ponukaForm.petDetailsPlaceholder')}
                  />
                ) : null}
                <Field
                  label={t('ponukaForm.monthsLabel')}
                  value={months}
                  onChangeText={setMonths}
                  keyboardType="numeric"
                  placeholder={t('ponukaForm.monthsPlaceholder')}
                />
                <ChoiceRow<string>
                  label={t('ponukaForm.employmentLabel')}
                  options={getEmploymentOptions(t).map((o) => ({ value: o, label: o }))}
                  value={employment}
                  onChange={setEmployment}
                />
                <Field
                  label={t('ponukaForm.incomeLabel')}
                  value={income}
                  onChangeText={setIncome}
                  keyboardType="decimal-pad"
                  placeholder={t('ponukaForm.incomePlaceholder')}
                />
                <Field label={t('ponukaForm.noteLabel')} value={note} onChangeText={setNote} multiline placeholder={t('ponukaForm.notePlaceholder')} />
              </Card>
            ) : null}

            </>
            ) : null}

            <ErrorNote error={error} />

            <View style={styles.actions}>
              {!closed ? (
                <Button
                  title={busy ? t('ponukaForm.sendingButton') : mine ? t('ponukaForm.saveChangesButton') : t('ponukaForm.submitButton')}
                  onPress={submit}
                  disabled={busy}
                />
              ) : null}
              {mine ? (
                <Button title={t('ponukaForm.withdrawButton')} onPress={withdraw} variant="danger" disabled={busy} />
              ) : null}
            </View>
          </>
        ) : null}
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  spinner: { marginTop: Spacing.xxl },
  title: { ...Type.title, fontWeight: Weight.bold },
  sub: { ...Type.bodyMd },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  note: { ...Type.caption, marginTop: -Spacing.sm },
  actions: { gap: Spacing.sm },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  closed: { ...Type.bodyMd, fontWeight: Weight.medium },
});
