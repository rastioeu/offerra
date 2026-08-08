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
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';
import { OfferTimeline } from '@/components/offer-timeline';
import { Button, Card, ChoiceRow, ErrorNote, Eyebrow, Field, ParamCell } from '@/components/ui';
import { useOffers, useTenantProfiles } from '@/hooks/use-offers';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { EMPLOYMENT_OPTIONS, fetchOfferContact, formatAmount, type OfferContact } from '@/lib/offers';
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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const myId = session?.user.id;

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
  const [people, setPeople] = useState('');
  const [pets, setPets] = useState<'NO' | 'YES'>('NO');
  const [petDetails, setPetDetails] = useState('');
  const [months, setMonths] = useState('');
  const [employment, setEmployment] = useState(EMPLOYMENT_OPTIONS[0]);
  const [income, setIncome] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mine) return;
    setAmount(String(mine.amount));
    setMessage(mine.message ?? '');
  }, [mine]);

  useEffect(() => {
    if (!myTenant) return;
    setPeople(myTenant.num_people != null ? String(myTenant.num_people) : '');
    setPets(myTenant.has_pets ? 'YES' : 'NO');
    setPetDetails(myTenant.pet_details ?? '');
    setMonths(myTenant.lease_duration_months != null ? String(myTenant.lease_duration_months) : '');
    setEmployment(myTenant.employment_status ?? EMPLOYMENT_OPTIONS[0]);
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

  const isRent = item?.transaction_type === 'RENT';
  const highest = offers?.find((o) => o.status === 'PENDING');
  // Uzávierku drží aj databáza; tu je preto, aby používateľ videl DÔVOD,
  // nie chybovú hlášku zo servera.
  const closed = isDeadlinePassed(item?.offer_deadline ?? null);

  async function submit() {
    if (!item || !myId || busy) return;
    const value = num(amount);
    if (value == null || value <= 0) {
      setError('Zadaj sumu ponuky.');
      return;
    }
    // Počet osôb bol doteraz len ZOBRAZENÝ, nie vyžadovaný — 4 z 19
    // dotazníkov ho nemali. Pri prenájme je to prvá otázka, ktorú
    // prenajímateľ položí, takže sa pýta hneď. Drží to aj DB.
    const peopleCount = num(people);
    if (isRent && (peopleCount == null || peopleCount < 1)) {
      setError('Zadaj počet osôb, ktoré sa nasťahujú — bez toho ponuku poslať nemožno.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let offerId = mine?.id;
      if (offerId) {
        const { error: e } = await db()
          .from('property_offer')
          .update({ amount: value, message: message.trim() || null })
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
      Alert.alert(
        mine ? 'Ponuka upravená' : 'Ponuka podaná',
        'Suma a tvoja prezývka sú teraz verejné. Meno a telefón sa odkryjú, až keď ju predávajúci prijme.'
      );
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
    Alert.alert('Stiahnuť ponuku?', 'Zo zoznamu zmizne ako aktívna.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Stiahnuť',
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
            Alert.alert('Stiahnutie zlyhalo', m);
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
          title: mine ? 'Upraviť ponuku' : 'Podať ponuku',
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
              {formatPrice(item.asking_price_hint, item.transaction_type)
                ? `Orientačná cena ${formatPrice(item.asking_price_hint, item.transaction_type)}`
                : 'Predávajúci cenu neuviedol.'}
            </Text>
            {highest ? (
              <Text style={[styles.sub, { color: palette.link }]}>
                Najvyššia ponuka zatiaľ: {formatAmount(highest.amount, item.transaction_type)}
              </Text>
            ) : null}

            {closed ? (
              <Text style={[styles.closed, { color: palette.warning }]}>
                Uzávierka ponúk už uplynula. Túto ponuku sa nedá podať ani zmeniť —
                stiahnuť ju však môžeš.
              </Text>
            ) : null}

            {/* Priebeh MOJEJ ponuky — kvôli tomu vzniklo razítko o pozretí.
                Bez neho tu bolo len ticho, kým majiteľ nerozhodol. */}
            {mine ? (
              <Card>
                <Eyebrow>Priebeh mojej ponuky</Eyebrow>
                <OfferTimeline offer={mine} />
              </Card>
            ) : null}

            {accepted ? (
              <Card>
                <Eyebrow>Odkrytý kontakt na predávajúceho</Eyebrow>
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  Ponuka bola prijatá, takže vidíte na seba obaja. Údaje použi
                  výhradne na dohodu o tejto nehnuteľnosti.
                </Text>
                {contact ? (
                  <View style={styles.contactGrid}>
                    <ParamCell value={contact.nickname ?? '—'} label="Prezývka" />
                    <ParamCell value={contact.full_name ?? 'nevyplnené'} label="Meno" />
                    <ParamCell value={contact.phone ?? 'nevyplnený'} label="Telefón" />
                    <ParamCell value={contact.email ?? 'nedostupný'} label="E-mail" />
                  </View>
                ) : (
                  <Text style={[styles.note, { color: palette.textMuted }]}>Načítavam kontakt…</Text>
                )}
              </Card>
            ) : null}

            {/* Po prijatí sa formulár skryje — meniť prijatú ponuku
                nemá zmysel a databáza to aj tak nepustí (guard trigger). */}
            {!accepted ? (
            <>
            <Field
              label="Moja ponuka (€)"
              hint={
                isRent
                  ? 'Suma za mesiac. Bude verejná spolu s tvojou prezývkou.'
                  : 'Celková suma. Bude verejná spolu s tvojou prezývkou.'
              }
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={isRent ? '780' : '215000'}
            />

            <Field
              label={isRent ? 'Správa pre prenajímateľa (nepovinné)' : 'Správa pre predávajúceho (nepovinné)'}
              hint="Vidí ju len druhá strana — v zozname ponúk verejne nie je."
              value={message}
              onChangeText={setMessage}
              // Príklad musí sedieť na obchod. Hypotéka pri nájme nedáva
              // zmysel a rovno hovorí, že si to nikto neprečítal.
              placeholder={
                isRent
                  ? 'napr. sťahujem sa kvôli práci, zmluvu viem podpísať do týždňa'
                  : 'napr. mám schválenú hypotéku, viem sa dohodnúť rýchlo'
              }
              multiline
            />

            {isRent ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>
                  O NÁJOMCOVI — VIDÍ LEN MAJITEĽ
                </Text>
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  Tieto údaje sa NEZOBRAZUJÚ vo verejnom zozname ponúk. Vidí ich
                  len majiteľ nehnuteľnosti a ty.
                </Text>

                <Field
                  label="Počet osôb — povinné"
                  hint="Koľko ľudí sa nasťahuje vrátane teba."
                  value={people}
                  onChangeText={setPeople}
                  keyboardType="numeric"
                  placeholder="2"
                />
                <ChoiceRow<'NO' | 'YES'>
                  label="Domáce zvieratá"
                  options={[
                    { value: 'NO', label: 'Nemám' },
                    { value: 'YES', label: 'Mám' },
                  ]}
                  value={pets}
                  onChange={setPets}
                />
                {pets === 'YES' ? (
                  <Field
                    label="Aké zviera"
                    value={petDetails}
                    onChangeText={setPetDetails}
                    placeholder="napr. malý pes, 8 kg"
                  />
                ) : null}
                <Field
                  label="Na ako dlho (mesiace)"
                  value={months}
                  onChangeText={setMonths}
                  keyboardType="numeric"
                  placeholder="24"
                />
                <ChoiceRow<string>
                  label="Zamestnanie"
                  options={EMPLOYMENT_OPTIONS.map((o) => ({ value: o, label: o }))}
                  value={employment}
                  onChange={setEmployment}
                />
                <Field
                  label="Mesačný príjem — orientačne (nepovinné)"
                  value={income}
                  onChangeText={setIncome}
                  keyboardType="decimal-pad"
                  placeholder="2000"
                />
                <Field label="Poznámka" value={note} onChangeText={setNote} multiline placeholder="Čokoľvek, čo by mal majiteľ vedieť." />
              </Card>
            ) : null}

            </>
            ) : null}

            <ErrorNote error={error} />

            <View style={styles.actions}>
              {!closed ? (
                <Button
                  title={busy ? 'Odosielam…' : mine ? 'Uložiť zmeny' : 'Podať ponuku'}
                  onPress={submit}
                  disabled={busy}
                />
              ) : null}
              {mine ? (
                <Button title="Stiahnuť ponuku" onPress={withdraw} variant="danger" disabled={busy} />
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
