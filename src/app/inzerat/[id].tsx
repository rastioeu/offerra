/**
 * Editor inzerátu: úprava DRAFT-u → „Zverejniť" → ACTIVE.
 *
 * Prečo je „Zverejniť" samostatná akcia a nie posledný krok formulára:
 * inzerát existuje v DB od začiatku (kvôli fotkám), takže bez explicitného
 * kroku by sa nedokončený koncept objavil vo verejnom katalógu.
 *
 * Validácia hovorí, ČO chýba — nie len že sa nedá pokračovať
 * (`missingForPublish`). „Nestane sa nič" je zakázaná reakcia (CLAUDE.md §2).
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailableFromPicker } from '@/components/available-from-picker';
import { CityPicker } from '@/components/city-picker';
import { StreetPicker } from '@/components/street-picker';
import { DeadlinePicker } from '@/components/deadline-picker';
import { FormScreen } from '@/components/form-screen';
import { Badge, Button, ChoiceRow, ErrorNote, Field } from '@/components/ui';
import { usePhotoUpload } from '@/hooks/use-photo-upload';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import {
  db,
  FURNISHING_LABEL,
  missingForPublish,
  PROPERTY_LABEL,
  REGIONS,
  STATUS_LABEL,
  TRANSACTION_LABEL,
  UTILITIES_LABEL,
  type Furnishing,
  type Property,
  type PropertyType,
  type TransactionType,
  type Utilities,
} from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal';
import { maybeOfferPush } from '@/lib/push-prompt';

/** Číslo z poľa. Prázdne → `null` (stĺpec je nullable, 0 by bola lož). */
function num(text: string): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function PropertyEditorScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const toast = useToast();
  const { item, error, reload } = useProperty(id);

  const [draft, setDraft] = useState<Property | null>(null);
  const [rooms, setRooms] = useState('');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  // Číselné polia prenájmu držíme ako TEXT, nie číslo — inak by sa pri
  // mazaní znaku pole vynulovalo na 0 a používateľ by prišiel o rozpísanú
  // hodnotu. Prevod je až v `num()` pri ukladaní.
  const [deposit, setDeposit] = useState('');
  const [depositMonths, setDepositMonths] = useState('');
  const [minLease, setMinLease] = useState('');
  const [floor, setFloor] = useState('');
  const [floorsTotal, setFloorsTotal] = useState('');
  const [monthlyCosts, setMonthlyCosts] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { uploading, addPhoto, removePhoto } = usePhotoUpload(session?.user.id, id, reload);

  /**
   * Zamknutý inzerát = existuje prijatá ponuka. Pýtame sa DATABÁZY, nie
   * lokálneho zoznamu — rozhoduje o tom ona a odpoveď musí byť tá istá,
   * akú dostane pri zápise. Inak by obrazovka ponúkala niečo, čo server
   * odmietne.
   */
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void db()
      .rpc('has_accepted_offer', { p_property: id })
      .then(({ data, error: e }) => {
        if (e) {
          console.log(`[INZERÁT] Zistenie zámku zlyhalo: ${errorText(e)}`);
          return;
        }
        if (!cancelled) setLocked(data === true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, item]);
  useRefreshOnFocus(reload);

  // Server je zdroj pravdy; lokálny stav sa napĺňa až keď dorazí.
  useEffect(() => {
    if (!item) return;
    setDraft(item);
    setRooms(item.rooms != null ? String(item.rooms) : '');
    setArea(item.area_m2 != null ? String(item.area_m2) : '');
    setPrice(item.asking_price_hint != null ? String(item.asking_price_hint) : '');
    setDeposit(item.deposit_amount != null ? String(item.deposit_amount) : '');
    setDepositMonths(item.deposit_months != null ? String(item.deposit_months) : '');
    setMinLease(item.min_lease_months != null ? String(item.min_lease_months) : '');
    setFloor(item.floor != null ? String(item.floor) : '');
    setFloorsTotal(item.floors_total != null ? String(item.floors_total) : '');
    setMonthlyCosts(item.monthly_costs != null ? String(item.monthly_costs) : '');
  }, [item]);

  function patch(p: Partial<Property>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function collect(): Partial<Property> {
    if (!draft) return {};
    const isRent = draft.transaction_type === 'RENT';
    const isFlat = draft.property_type === 'APARTMENT';
    return {
      transaction_type: draft.transaction_type,
      property_type: draft.property_type,
      title: draft.title,
      description: draft.description,
      city: draft.city,
      district: draft.district,
      region: draft.region,
      street: draft.street?.trim() || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      address_hidden: draft.address_hidden,
      offer_deadline: draft.offer_deadline,
      rooms: num(rooms),
      area_m2: num(area),
      asking_price_hint: num(price),
      // Pri PREDAJI sa podmienky nájmu ZAHADZUJÚ. Keby ostali, inzerát
      // prepnutý z prenájmu na predaj by si so sebou niesol zábezpeku,
      // ktorá pri predaji nedáva zmysel.
      deposit_amount: isRent ? num(deposit) : null,
      deposit_months: isRent ? num(depositMonths) : null,
      available_from: isRent ? draft.available_from : null,
      min_lease_months: isRent ? num(minLease) : null,
      furnishing: isRent ? draft.furnishing : null,
      utilities_included: isRent ? draft.utilities_included : null,
      internet_included: isRent ? draft.internet_included : null,
      pets_allowed: isRent ? draft.pets_allowed : null,
      // Rovnaký dôvod ako pri nájme: prepnutie bytu na pozemok nesmie
      // nechať v inzeráte poschodie a výťah.
      floor: isFlat ? num(floor) : null,
      floors_total: isFlat ? num(floorsTotal) : null,
      has_elevator: isFlat ? draft.has_elevator : null,
      monthly_costs: isFlat ? num(monthlyCosts) : null,
    };
  }

  async function save(extra?: Partial<Property>): Promise<boolean> {
    if (!draft || saving) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: e } = await db()
        .from('property')
        .update({ ...collect(), ...extra })
        .eq('id', draft.id);
      if (e) throw e;
      await reload();
      // Uloženie konceptu doteraz nedalo NIJAKÚ odozvu — tlačidlo len
      // prestalo byť zaneprázdnené a človek nevedel, či sa niečo stalo.
      if (!extra) toast('Uložené');
      return true;
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[EDITOR] Uloženie zlyhalo: ${m}`);
      setSaveError(m);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!draft) return;
    const candidate: Property = {
      ...draft,
      ...(collect() as Property),
    };
    const missing = missingForPublish(candidate, item?.media.length ?? 0);
    if (missing.length > 0) {
      Alert.alert(
        'Inzerát sa ešte nedá zverejniť',
        `Chýba: ${missing.join(', ')}.`
      );
      return;
    }
    if (await save({ status: 'ACTIVE' })) {
      toast('Zverejnené — inzerát je v katalógu');
      void maybeOfferPush(session?.user.id, 'LISTING');
    }
  }

  async function unpublish() {
    if (await save({ status: 'DRAFT' })) {
      toast('Stiahnuté z katalógu', 'info');
    }
  }

  function confirmDelete() {
    if (!draft) return;
    Alert.alert('Zmazať inzerát?', 'Zmaže sa aj so všetkými fotkami. Nedá sa vrátiť.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: e } = await db().from('property').delete().eq('id', draft.id);
            if (e) throw e;
            router.back();
          } catch (e: unknown) {
            const m = errorText(e);
            console.log(`[EDITOR] Zmazanie zlyhalo: ${m}`);
            Alert.alert('Zmazanie zlyhalo', m);
          }
        },
      },
    ]);
  }

  const photos = item?.media ?? [];
  const isLand = draft?.property_type === 'LAND';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Inzerát',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <FormScreen>
        <ErrorNote error={error ?? saveError} />

        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item === null && !error ? (
          <Text style={[styles.missing, { color: palette.textMuted }]}>Inzerát sa nenašiel.</Text>
        ) : null}

        {draft && locked ? (
          <View style={[styles.lockNote, { borderColor: palette.warning, backgroundColor: palette.surface }]}>
            <Text style={[styles.lockTitle, { color: palette.warning }]}>Inzerát je uzamknutý</Text>
            <Text style={[styles.lockBody, { color: palette.textSecondary }]}>
              Prijal si ponuku, takže sa už nedá meniť názov, cena, výmera ani podmienky.
              To, na čom ste sa dohodli, musí ostať také, aké bolo v tej chvíli.
              {'\n\n'}
              Ďalšie fotky pridať môžeš — nemenia podstatu dohody. Zmazať ani prepísať
              tie existujúce už nie, sú dôkazom o stave veci.
              {'\n\n'}
              Ak naozaj potrebuješ zmenu, ozvi sa na {LEGAL_CONTACT_EMAIL}.
            </Text>
          </View>
        ) : null}

        {draft && !locked ? (
          <Text style={[styles.formLead, { color: palette.textMuted }]}>
            Kým je inzerát rozpracovaný, nevidí ho nikto okrem teba. Cena je
            nepovinná — ak ju necháš prázdnu, ľudia ti navrhnú vlastnú.
          </Text>
        ) : null}

        {draft ? (
          <>
            <View style={styles.statusRow}>
              <Badge
                text={STATUS_LABEL[draft.status]}
                tone={draft.status === 'ACTIVE' ? 'accent' : 'warning'}
              />
              {draft.status === 'ACTIVE' ? (
                <Text style={[styles.statusNote, { color: palette.textMuted }]}>
                  Viditeľné v katalógu
                </Text>
              ) : (
                <Text style={[styles.statusNote, { color: palette.textMuted }]}>
                  Vidíš len ty, kým nezverejníš
                </Text>
              )}
            </View>

            {/* ── fotky ── */}
            <Text style={[styles.section, { color: palette.textMuted }]}>
              FOTKY ({photos.length})
            </Text>
            <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
              Aspoň jedna je povinná. Pridávajú sa po jednej — prvá sa použije ako titulná.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((m, i) => (
                <View key={m.id} style={styles.thumbWrap}>
                  <Image
                    source={{ uri: m.url }}
                    style={[styles.thumb, { backgroundColor: palette.surfacePressed }]}
                    contentFit="cover"
                  />
                  {i === 0 ? (
                    <View style={styles.coverTag}>
                      <Badge text="TITULNÁ" tone="accent" />
                    </View>
                  ) : null}
                  {/* Pri zámku krížik CHÝBA zámerne: DELETE by vrátil 204 a
                      fotka by ostala (tak funguje restrictive RLS). Tlačidlo,
                      po ktorom sa nič nestane, je horšie než žiadne (§2). */}
                  {locked ? null : (
                    <Pressable
                      onPress={() => removePhoto(m.id, m.url)}
                      accessibilityRole="button"
                      hitSlop={8}
                      style={[styles.remove, { backgroundColor: palette.danger }]}>
                      <Text style={[styles.removeText, { color: palette.onPrimary }]}>×</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              <Pressable
                onPress={() => addPhoto(photos.length)}
                disabled={uploading}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.thumb,
                  styles.addPhoto,
                  { borderColor: palette.borderStrong, opacity: uploading ? 0.5 : pressed ? 0.85 : 1 },
                ]}>
                {uploading ? (
                  <ActivityIndicator color={palette.primary} />
                ) : (
                  <Text style={[styles.addPhotoText, { color: palette.link }]}>+ Fotka</Text>
                )}
              </Pressable>
            </ScrollView>

            {/* ── základ ── */}
            <ChoiceRow<TransactionType>
              label="Typ obchodu"
              options={(['SALE', 'RENT'] as TransactionType[]).map((v) => ({
                value: v,
                label: TRANSACTION_LABEL[v],
              }))}
              value={draft.transaction_type}
              onChange={(v) => patch({ transaction_type: v })}
            />

            <ChoiceRow<PropertyType>
              label="Typ nehnuteľnosti"
              options={(['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'] as PropertyType[]).map((v) => ({
                value: v,
                label: PROPERTY_LABEL[v],
              }))}
              value={draft.property_type}
              onChange={(v) => patch({ property_type: v })}
            />

            <Field
              label="Názov inzerátu"
              value={draft.title}
              onChangeText={(v) => patch({ title: v })}
              placeholder="napr. Svetlý 3-izbový byt pri Slavíne"
            />

            <Field
              label="Popis"
              value={draft.description ?? ''}
              onChangeText={(v) => patch({ description: v })}
              placeholder="Stav, orientácia, čo je v okolí…"
              multiline
            />

            <CityPicker
              city={draft.city}
              district={draft.district}
              // Kraj a súradnice sa dopĺňajú spolu s obcou — sú v tom istom
              // riadku číselníka, takže pýtať sa na ne zvlášť by bolo
              // prepisovanie toho, čo už vieme.
              onPick={(p) =>
                patch({
                  city: p.city,
                  district: p.district,
                  region: p.region,
                  latitude: p.latitude,
                  longitude: p.longitude,
                })
              }
            />

            <ChoiceRow<string>
              label="Kraj"
              hint="Dopĺňa sa podľa obce. Zmeniť sa dá, keď to nesedí."
              options={REGIONS.map((r) => ({ value: r, label: r.replace(' kraj', '') }))}
              value={draft.region}
              onChange={(v) => patch({ region: v })}
            />

            <StreetPicker
              city={draft.city}
              district={draft.district}
              street={draft.street}
              onChange={(v) => patch({ street: v })}
            />

            {!isLand ? (
              <Field label="Počet izieb" value={rooms} onChangeText={setRooms} keyboardType="numeric" placeholder="3" />
            ) : null}

            <Field
              label="Výmera (m²)"
              value={area}
              onChangeText={setArea}
              keyboardType="decimal-pad"
              placeholder="78"
            />

            <Field
              label="Orientačná cena (nepovinné)"
              hint="Nechaj prázdne, ak chceš počuť ponuky bez toho, aby si povedal sumu. Kupujúci aj tak predkladajú vlastné ponuky — toto je len vodidlo."
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder={draft.transaction_type === 'RENT' ? '850 (za mesiac)' : '248000'}
            />

            {/* ── o budove ──
                Len pri BYTE, ale pri predaji ROVNAKO ako pri prenájme.
                Fond opráv platí aj ten, kto byt kúpi. */}
            {draft.property_type === 'APARTMENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>O BYTE A BUDOVE</Text>

                <Field
                  label="Poschodie"
                  hint="0 = prízemie. Záporné číslo = suterén."
                  value={floor}
                  onChangeText={setFloor}
                  keyboardType="numbers-and-punctuation"
                  placeholder="3"
                />
                <Field
                  label="Z koľkých poschodí celkovo"
                  value={floorsTotal}
                  onChangeText={setFloorsTotal}
                  keyboardType="numeric"
                  placeholder="5"
                />

                <ChoiceRow<'YES' | 'NO'>
                  label="Výťah"
                  options={[
                    { value: 'YES', label: 'Je' },
                    { value: 'NO', label: 'Nie je' },
                  ]}
                  value={draft.has_elevator == null ? null : draft.has_elevator ? 'YES' : 'NO'}
                  onChange={(v) => patch({ has_elevator: v === 'YES' })}
                />

                <Field
                  label="Mesačné náklady (€)"
                  hint="Fond opráv, spoločné priestory, správa. Nie je to nájom ani zábezpeka — platia sa aj po kúpe."
                  value={monthlyCosts}
                  onChangeText={setMonthlyCosts}
                  keyboardType="decimal-pad"
                  placeholder="140"
                />
              </>
            ) : null}

            {/* ── podmienky prenájmu ──
                Len pri PRENÁJME. Pri predaji sú tieto polia nezmysel a
                formulár sa nimi nemá čím naťahovať. */}
            {draft.transaction_type === 'RENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>PODMIENKY PRENÁJMU</Text>
                <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
                  Všetko nepovinné — ale čím viac vyplníš, tým menej otázok dostaneš.
                </Text>

                <Field
                  label="Zábezpeka (€)"
                  value={deposit}
                  onChangeText={setDeposit}
                  keyboardType="decimal-pad"
                  placeholder="1600"
                />
                <Field
                  label="Zábezpeka = koľko mesačných nájmov"
                  hint="Bežne 1 až 3. Slúži ako kontrola k sume vyššie."
                  value={depositMonths}
                  onChangeText={setDepositMonths}
                  keyboardType="decimal-pad"
                  placeholder="2"
                />

                <AvailableFromPicker
                  value={draft.available_from}
                  onChange={(day) => patch({ available_from: day })}
                />

                <Field
                  label="Minimálna doba nájmu (mesiace)"
                  value={minLease}
                  onChangeText={setMinLease}
                  keyboardType="numeric"
                  placeholder="12"
                />

                <ChoiceRow<Furnishing>
                  label="Zariadenie"
                  options={(['FURNISHED', 'PARTIAL', 'UNFURNISHED'] as Furnishing[]).map((v) => ({
                    value: v,
                    label: FURNISHING_LABEL[v],
                  }))}
                  value={draft.furnishing}
                  onChange={(v) => patch({ furnishing: v })}
                />

                <ChoiceRow<Utilities>
                  label="Energie zahrnuté v nájme"
                  options={(['YES', 'PARTIAL', 'NO'] as Utilities[]).map((v) => ({
                    value: v,
                    label: UTILITIES_LABEL[v],
                  }))}
                  value={draft.utilities_included}
                  onChange={(v) => patch({ utilities_included: v })}
                />

                {/* Internet je ZVLÁŠŤ od energií — „energie áno" nikdy
                    neznamenalo aj internet a ľudia sa naň pýtajú osobitne. */}
                <ChoiceRow<'YES' | 'NO'>
                  label="Internet v cene nájmu"
                  options={[
                    { value: 'YES', label: 'Áno' },
                    { value: 'NO', label: 'Nie' },
                  ]}
                  value={draft.internet_included == null ? null : draft.internet_included ? 'YES' : 'NO'}
                  onChange={(v) => patch({ internet_included: v === 'YES' })}
                />

                <ChoiceRow<'YES' | 'NO'>
                  label="Domáce zvieratá"
                  options={[
                    { value: 'YES', label: 'Povolené' },
                    { value: 'NO', label: 'Nepovolené' },
                  ]}
                  value={draft.pets_allowed == null ? null : draft.pets_allowed ? 'YES' : 'NO'}
                  onChange={(v) => patch({ pets_allowed: v === 'YES' })}
                />
              </>
            ) : null}

            <DeadlinePicker
              value={draft.offer_deadline}
              onChange={(iso) => patch({ offer_deadline: iso })}
            />

            {/* ── akcie ── */}
            <View style={styles.actions}>
              <Button title={saving ? 'Ukladám…' : 'Uložiť koncept'} onPress={() => save()} variant="outline" disabled={saving || locked} />

              {draft.status === 'REJECTED' ? (
                <Text style={[styles.statusNote, { color: palette.danger }]}>
                  Inzerát skryl správca
                  {draft.rejection_reason ? `: ${draft.rejection_reason}` : ''}. Zverejniť
                  ho môže znovu len on — uprav, čo je potrebné, a ozvi sa.
                </Text>
              ) : draft.status === 'ACTIVE' ? (
                <Button title="Stiahnuť z katalógu" onPress={unpublish} variant="outline" disabled={saving || locked} />
              ) : (
                <Button title="Zverejniť" onPress={publish} disabled={saving || locked} />
              )}

              <Button title="Zmazať inzerát" onPress={confirmDelete} variant="danger" disabled={saving || locked} />
            </View>
          </>
        ) : null}
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  formLead: { ...Type.bodyMd },
  lockNote: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  lockTitle: { ...Type.bodyLg, fontWeight: Weight.bold },
  lockBody: { ...Type.bodyMd },
  spinner: { marginTop: Spacing.xxl },
  missing: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusNote: { ...Type.caption },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  sectionHint: { ...Type.caption, marginTop: -Spacing.md },
  photoRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  thumbWrap: { position: 'relative' },
  thumb: { width: 116, height: 116, borderRadius: Radius.md },
  coverTag: { position: 'absolute', left: 4, bottom: 4 },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { ...Type.button, fontWeight: Weight.bold, lineHeight: 20 },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoText: { ...Type.bodyMd, fontWeight: Weight.semibold },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
