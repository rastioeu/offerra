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
import { formFromProperty, formToCandidate, formToPatch, missingForPublish } from '@/lib/listing-form';
import { useFormDraft } from '@/hooks/use-form-draft';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal';
import { maybeOfferPush } from '@/lib/push-prompt';

export default function PropertyEditorScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const toast = useToast();
  const { item, error, reload } = useProperty(id);

  /**
   * Formulár sa zo servera naplní RAZ a ďalšie načítania sa ho už nedotknú
   * (`useFormDraft`). Bez toho pridanie fotky — ktoré volá `reload()` —
   * prepísalo všetko rozpísané hodnotami z databázy. To bola tá chyba
   * z 9.8.2026, nie picker ani remount.
   */
  const { form, set, saved } = useFormDraft(id, item, formFromProperty);
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

  async function save(extra?: Partial<Property>): Promise<boolean> {
    if (!form || !item || saving) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: e } = await db()
        .from('property')
        .update({ ...formToPatch(form), ...extra })
        .eq('id', item.id);
      if (e) throw e;
      // Až TERAZ smie rozpísaný formulár zmiznúť z pamäte — server sa mu
      // práve vyrovnal. Pred uložením by to znamenalo stratu textu.
      saved();
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
    if (!form || !item) return;
    const missing = missingForPublish(formToCandidate(item, form), item.media.length);
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
    if (!item) return;
    Alert.alert('Zmazať inzerát?', 'Zmaže sa aj so všetkými fotkami. Nedá sa vrátiť.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: e } = await db().from('property').delete().eq('id', item.id);
            if (e) throw e;
            saved(); // zmazaný inzerát nemá čo držať rozpísané
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
  const isLand = form?.property_type === 'LAND';
  // Stav inzerátu je vec SERVERA, nie formulára — mení ho „Zverejniť"
  // a „Stiahnuť", nie písanie. Preto sa číta z načítaného riadku.
  const status = item?.status;

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

        {form && locked ? (
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

        {form && !locked ? (
          <Text style={[styles.formLead, { color: palette.textMuted }]}>
            Kým je inzerát rozpracovaný, nevidí ho nikto okrem teba. Cena je
            nepovinná — ak ju necháš prázdnu, ľudia ti navrhnú vlastnú.
          </Text>
        ) : null}

        {form && status ? (
          <>
            <View style={styles.statusRow}>
              <Badge
                text={STATUS_LABEL[status]}
                tone={status === 'ACTIVE' ? 'accent' : 'warning'}
              />
              {status === 'ACTIVE' ? (
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
              value={form.transaction_type}
              onChange={(v) => set({ transaction_type: v })}
            />

            <ChoiceRow<PropertyType>
              label="Typ nehnuteľnosti"
              options={(['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'] as PropertyType[]).map((v) => ({
                value: v,
                label: PROPERTY_LABEL[v],
              }))}
              value={form.property_type}
              onChange={(v) => set({ property_type: v })}
            />

            <Field
              label="Názov inzerátu (povinné)"
              value={form.title}
              onChangeText={(v) => set({ title: v })}
              placeholder="napr. Svetlý 3-izbový byt pri Slavíne"
            />

            <Field
              label="Popis"
              value={form.description}
              onChangeText={(v) => set({ description: v })}
              placeholder="napr. Po rekonštrukcii, orientácia na juh, električka 5 minút"
              multiline
            />

            {/* KRAJ JE NAD OBCOU (Rastio, 12.8.2026) a nie je to len presun
                riadka — mení sa tým jeho úloha.

                Predtým sa kraj DOPĹŇAL podľa obce a stál pod ňou. Nad obcou
                by taká vec bola prázdny prepínač, ktorý sa sám vyplní neskôr
                — teda ovládací prvok, čo pri ťuknutí nerobí nič užitočné.

                Preto kraj po novom OBMEDZUJE ponuku obcí. Zvolil som to
                namiesto „kraj sa nedá vybrať, kým nie je obec" z dvoch
                dôvodov: je to jednoduchšie (jeden `eq` v dotaze oproti
                blokovaniu prvku a vysvetľovaniu, prečo je zamknutý) a je to
                jediná z tých dvoch možností, ktorá je používateľovi na
                niečo — obcí je 2 930 a kraj ich zúži na pár stoviek.

                Obec ostáva ZDROJ PRAVDY: keď ju človek vyberie, kraj sa
                nastaví podľa nej, aj keby mal predtým zvolený iný. Inak by
                sa dal uložiť inzerát s obcou v jednom kraji a krajom v inom.
                Kraj sa preto nedá „pokaziť" — nanajvýš sa opraví. */}
            <ChoiceRow<string>
              label="Kraj (nepovinné)"
              hint="Zúži zoznam obcí nižšie. Netreba ho vypĺňať — po výbere obce sa nastaví sám."
              options={REGIONS.map((r) => ({ value: r, label: r.replace(' kraj', '') }))}
              value={form.region}
              onChange={(v) => set({ region: v })}
            />

            <CityPicker
              required
              city={form.city}
              district={form.district}
              region={form.region}
              // Súradnice sa dopĺňajú spolu s obcou — sú v tom istom riadku
              // číselníka, takže pýtať sa na ne zvlášť by bolo prepisovanie
              // toho, čo už vieme.
              onPick={(p) =>
                set({
                  city: p.city,
                  district: p.district,
                  region: p.region,
                  latitude: p.latitude,
                  longitude: p.longitude,
                })
              }
            />

            <StreetPicker
              city={form.city}
              district={form.district}
              street={form.street}
              onChange={(v) => set({ street: v ?? '' })}
            />

            {/* POVINNÉ (Rastio, 9.8.2026). Appka to žiadala už predtým cez
                `missingForPublish`, ale pole vyzeralo ako ktorékoľvek iné —
                človek sa to dozvedel až pri pokuse zverejniť. Odteraz to
                vidno dopredu a stráži to aj databáza (trigger
                `property_publish_guard`). Pozemok izby nemá. */}
            {!isLand ? (
              <Field
                label="Počet izieb (povinné)"
                value={form.rooms}
                onChangeText={(v) => set({ rooms: v })}
                keyboardType="numeric"
                placeholder="napr. 3"
              />
            ) : null}

            <Field
              label="Výmera v m² (povinné)"
              value={form.area}
              onChangeText={(v) => set({ area: v })}
              keyboardType="decimal-pad"
              placeholder="napr. 78"
            />

            <Field
              label="Orientačná cena (nepovinné)"
              hint="Nechaj prázdne, ak chceš počuť ponuky bez toho, aby si povedal sumu. Kupujúci aj tak predkladajú vlastné ponuky — toto je len vodidlo."
              value={form.price}
              onChangeText={(v) => set({ price: v })}
              keyboardType="decimal-pad"
              placeholder={form.transaction_type === 'RENT' ? 'napr. 850 za mesiac' : 'napr. 248000'}
            />

            {/* ── o budove ──
                Len pri BYTE, ale pri predaji ROVNAKO ako pri prenájme.
                Fond opráv platí aj ten, kto byt kúpi. */}
            {form.property_type === 'APARTMENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>O BYTE A BUDOVE</Text>

                <Field
                  label="Poschodie"
                  hint="0 = prízemie. Záporné číslo = suterén."
                  value={form.floor}
                  onChangeText={(v) => set({ floor: v })}
                  keyboardType="numbers-and-punctuation"
                  placeholder="napr. 3"
                />
                <Field
                  label="Z koľkých poschodí celkovo"
                  value={form.floorsTotal}
                  onChangeText={(v) => set({ floorsTotal: v })}
                  keyboardType="numeric"
                  placeholder="napr. 5"
                />

                <ChoiceRow<'YES' | 'NO'>
                  label="Výťah"
                  options={[
                    { value: 'YES', label: 'Je' },
                    { value: 'NO', label: 'Nie je' },
                  ]}
                  value={form.hasElevator == null ? null : form.hasElevator ? 'YES' : 'NO'}
                  onChange={(v) => set({ hasElevator: v === 'YES' })}
                />

                <Field
                  label="Mesačné náklady (€)"
                  hint="Fond opráv, spoločné priestory, správa. Nie je to nájom ani zábezpeka — platia sa aj po kúpe."
                  value={form.monthlyCosts}
                  onChangeText={(v) => set({ monthlyCosts: v })}
                  keyboardType="decimal-pad"
                  placeholder="napr. 140"
                />
              </>
            ) : null}

            {/* ── podmienky prenájmu ──
                Len pri PRENÁJME. Pri predaji sú tieto polia nezmysel a
                formulár sa nimi nemá čím naťahovať. */}
            {form.transaction_type === 'RENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>PODMIENKY PRENÁJMU</Text>
                <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
                  Všetko nepovinné — ale čím viac vyplníš, tým menej otázok dostaneš.
                </Text>

                <Field
                  label="Zábezpeka (€)"
                  value={form.deposit}
                  onChangeText={(v) => set({ deposit: v })}
                  keyboardType="decimal-pad"
                  placeholder="napr. 1600"
                />
                <Field
                  label="Zábezpeka = koľko mesačných nájmov"
                  hint="Bežne 1 až 3. Slúži ako kontrola k sume vyššie."
                  value={form.depositMonths}
                  onChangeText={(v) => set({ depositMonths: v })}
                  keyboardType="decimal-pad"
                  placeholder="napr. 2"
                />

                <AvailableFromPicker
                  value={form.availableFrom}
                  onChange={(day) => set({ availableFrom: day })}
                />

                <Field
                  label="Minimálna doba nájmu (mesiace)"
                  value={form.minLease}
                  onChangeText={(v) => set({ minLease: v })}
                  keyboardType="numeric"
                  placeholder="napr. 12"
                />

                <ChoiceRow<Furnishing>
                  label="Zariadenie"
                  options={(['FURNISHED', 'PARTIAL', 'UNFURNISHED'] as Furnishing[]).map((v) => ({
                    value: v,
                    label: FURNISHING_LABEL[v],
                  }))}
                  value={form.furnishing}
                  onChange={(v) => set({ furnishing: v })}
                />

                <ChoiceRow<Utilities>
                  label="Energie zahrnuté v nájme"
                  options={(['YES', 'PARTIAL', 'NO'] as Utilities[]).map((v) => ({
                    value: v,
                    label: UTILITIES_LABEL[v],
                  }))}
                  value={form.utilities}
                  onChange={(v) => set({ utilities: v })}
                />

                {/* Internet je ZVLÁŠŤ od energií — „energie áno" nikdy
                    neznamenalo aj internet a ľudia sa naň pýtajú osobitne. */}
                <ChoiceRow<'YES' | 'NO'>
                  label="Internet v cene nájmu"
                  options={[
                    { value: 'YES', label: 'Áno' },
                    { value: 'NO', label: 'Nie' },
                  ]}
                  value={form.internet == null ? null : form.internet ? 'YES' : 'NO'}
                  onChange={(v) => set({ internet: v === 'YES' })}
                />

                <ChoiceRow<'YES' | 'NO'>
                  label="Domáce zvieratá"
                  options={[
                    { value: 'YES', label: 'Povolené' },
                    { value: 'NO', label: 'Nepovolené' },
                  ]}
                  value={form.pets == null ? null : form.pets ? 'YES' : 'NO'}
                  onChange={(v) => set({ pets: v === 'YES' })}
                />
              </>
            ) : null}

            <DeadlinePicker
              value={form.offer_deadline}
              onChange={(iso) => set({ offer_deadline: iso })}
            />

            {/* ── akcie ── */}
            <View style={styles.actions}>
              <Button title={saving ? 'Ukladám…' : 'Uložiť koncept'} onPress={() => save()} variant="outline" disabled={saving || locked} />

              {status === 'REJECTED' ? (
                <Text style={[styles.statusNote, { color: palette.danger }]}>
                  Inzerát skryl správca
                  {item.rejection_reason ? `: ${item.rejection_reason}` : ''}. Zverejniť
                  ho môže znovu len on — uprav, čo je potrebné, a ozvi sa.
                </Text>
              ) : status === 'ACTIVE' ? (
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
