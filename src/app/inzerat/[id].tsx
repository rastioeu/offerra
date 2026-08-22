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
import { useToast, useUndoToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import {
  db,
  getFurnishingLabel,
  getPropertyLabel,
  REGIONS,
  getStatusLabel,
  getTransactionLabel,
  getUtilitiesLabel,
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
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const toast = useToast();
  const confirmWithUndo = useUndoToast();
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

  async function save(extra?: Partial<Property>, opts?: { silent?: boolean }): Promise<boolean> {
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
      if (!extra && !opts?.silent) toast(t('inzeratEdit.savedToast'));
      return true;
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[EDITOR] Uloženie zlyhalo: ${m}`);
      // Tichý autosave nesmie prekryť to, čo si používateľ práve rozpísal
      // technickou hláškou uprostred písania — ukáž ju len pri ručnom uložení.
      if (!opts?.silent) setSaveError(m);
      return false;
    } finally {
      setSaving(false);
    }
  }

  /**
   * AUTOSAVE (Rastio, 14.8.2026) — poistka nad rámec `form-draft.ts`
   * (ktorý drží text len v pamäti procesu, nie cez reštart appky).
   * 2,5 s ticha po poslednej zmene → tiché uloženie do DB, kde DRAFT
   * riadok existuje od založenia (viď hlavička `pridat.tsx`). Pri páde
   * appky / preskočení hovoru sa tak stratí najviac 2,5 s písania, nie
   * celý formulár.
   */
  useEffect(() => {
    if (!form || !item || locked) return;
    const t = setTimeout(() => {
      void save(undefined, { silent: true });
    }, 2500);
    return () => clearTimeout(t);
  }, [form, locked]);

  async function publish() {
    if (!form || !item) return;
    const missing = missingForPublish(t, formToCandidate(item, form), item.media.length);
    if (missing.length > 0) {
      Alert.alert(
        t('inzeratEdit.cannotPublishTitle'),
        t('inzeratEdit.missingPrefix', { list: missing.join(', ') })
      );
      return;
    }
    if (await save({ status: 'ACTIVE' })) {
      toast(t('inzeratEdit.publishedToast'));
      void maybeOfferPush(t, session?.user.id, 'LISTING');
    }
  }

  async function unpublish() {
    if (await save({ status: 'DRAFT' })) {
      toast(t('inzeratEdit.unpublishedToast'), 'info');
    }
  }

  function confirmDelete() {
    if (!item) return;
    Alert.alert(t('inzeratEdit.deleteTitle'), t('inzeratEdit.deleteBody'), [
      { text: t('inzeratEdit.cancel'), style: 'cancel' },
      {
        text: t('inzeratEdit.delete'),
        style: 'destructive',
        // Potvrdenie vyššie chráni pred omylom v ÚMYSLE; undo okno
        // (Rastio, 14.8.2026) chráni pred PREKLIKOM tesne predtým —
        // odíde sa hneď, server sa zmazania dotkne až po odpočte.
        onPress: () => {
          saved(); // zmazaný inzerát nemá čo držať rozpísané
          router.back();
          confirmWithUndo(t('inzeratEdit.deletePending'), async () => {
            try {
              const { error: e } = await db().from('property').delete().eq('id', item.id);
              if (e) throw e;
              toast(t('inzeratEdit.deletedToast'), 'info');
            } catch (e: unknown) {
              const m = errorText(e);
              console.log(`[EDITOR] Zmazanie zlyhalo: ${m}`);
              Alert.alert(t('inzeratEdit.deleteFailedTitle'), m);
            }
          });
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
          title: t('inzeratEdit.screenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <FormScreen>
        <ErrorNote error={error ?? saveError} />

        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item === null && !error ? (
          <Text style={[styles.missing, { color: palette.textMuted }]}>{t('inzeratEdit.notFound')}</Text>
        ) : null}

        {form && locked ? (
          <View style={[styles.lockNote, { borderColor: palette.warning, backgroundColor: palette.surface }]}>
            <Text style={[styles.lockTitle, { color: palette.warning }]}>{t('inzeratEdit.lockedTitle')}</Text>
            <Text style={[styles.lockBody, { color: palette.textSecondary }]}>
              {t('inzeratEdit.lockedBody', { email: LEGAL_CONTACT_EMAIL })}
            </Text>
          </View>
        ) : null}

        {form && !locked ? (
          <Text style={[styles.formLead, { color: palette.textMuted }]}>
            {t('inzeratEdit.formLead')}
          </Text>
        ) : null}

        {form && status ? (
          <>
            <View style={styles.statusRow}>
              <Badge
                text={getStatusLabel(t)[status]}
                tone={status === 'ACTIVE' ? 'accent' : 'warning'}
              />
              {status === 'ACTIVE' ? (
                <Text style={[styles.statusNote, { color: palette.textMuted }]}>
                  {t('inzeratEdit.visibleInCatalog')}
                </Text>
              ) : (
                <Text style={[styles.statusNote, { color: palette.textMuted }]}>
                  {t('inzeratEdit.visibleOnlyToYou')}
                </Text>
              )}
            </View>

            {/* ── fotky ── */}
            <Text style={[styles.section, { color: palette.textMuted }]}>
              {t('inzeratEdit.photosSection', { count: photos.length })}
            </Text>
            <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
              {t('inzeratEdit.photosHint')}
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
                      <Badge text={t('inzeratEdit.coverBadge')} tone="accent" />
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
                  <Text style={[styles.addPhotoText, { color: palette.link }]}>{t('inzeratEdit.addPhotoButton')}</Text>
                )}
              </Pressable>
            </ScrollView>

            {/* ── základ ── */}
            <ChoiceRow<TransactionType>
              label={t('inzeratEdit.transactionTypeLabel')}
              options={(['SALE', 'RENT'] as TransactionType[]).map((v) => ({
                value: v,
                label: getTransactionLabel(t)[v],
              }))}
              value={form.transaction_type}
              onChange={(v) => set({ transaction_type: v })}
            />

            <ChoiceRow<PropertyType>
              label={t('inzeratEdit.propertyTypeLabel')}
              options={(['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'] as PropertyType[]).map((v) => ({
                value: v,
                label: getPropertyLabel(t)[v],
              }))}
              value={form.property_type}
              onChange={(v) => set({ property_type: v })}
            />

            <Field
              label={t('inzeratEdit.titleLabel')}
              value={form.title}
              onChangeText={(v) => set({ title: v })}
              placeholder={t('inzeratEdit.titlePlaceholder')}
            />

            <Field
              label={t('inzeratEdit.descriptionLabel')}
              value={form.description}
              onChangeText={(v) => set({ description: v })}
              placeholder={t('inzeratEdit.descriptionPlaceholder')}
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
              label={t('inzeratEdit.regionLabel')}
              hint={t('inzeratEdit.regionHint')}
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
                label={t('inzeratEdit.roomsLabel')}
                value={form.rooms}
                onChangeText={(v) => set({ rooms: v })}
                keyboardType="numeric"
                placeholder={t('inzeratEdit.roomsPlaceholder')}
              />
            ) : null}

            <Field
              label={t('inzeratEdit.areaLabel')}
              value={form.area}
              onChangeText={(v) => set({ area: v })}
              keyboardType="decimal-pad"
              placeholder={t('inzeratEdit.areaPlaceholder')}
            />

            <Field
              label={t('inzeratEdit.priceLabel')}
              hint={t('inzeratEdit.priceHint')}
              value={form.price}
              onChangeText={(v) => set({ price: v })}
              keyboardType="decimal-pad"
              placeholder={form.transaction_type === 'RENT' ? t('inzeratEdit.pricePlaceholderRent') : t('inzeratEdit.pricePlaceholderSale')}
            />

            {/* ── o budove ──
                Len pri BYTE, ale pri predaji ROVNAKO ako pri prenájme.
                Fond opráv platí aj ten, kto byt kúpi. */}
            {form.property_type === 'APARTMENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>{t('inzeratEdit.buildingSection')}</Text>

                <Field
                  label={t('inzeratEdit.floorLabel')}
                  hint={t('inzeratEdit.floorHint')}
                  value={form.floor}
                  onChangeText={(v) => set({ floor: v })}
                  keyboardType="numbers-and-punctuation"
                  placeholder={t('inzeratEdit.floorPlaceholder')}
                />
                <Field
                  label={t('inzeratEdit.floorsTotalLabel')}
                  value={form.floorsTotal}
                  onChangeText={(v) => set({ floorsTotal: v })}
                  keyboardType="numeric"
                  placeholder={t('inzeratEdit.floorsTotalPlaceholder')}
                />

                <ChoiceRow<'YES' | 'NO'>
                  label={t('inzeratEdit.elevatorLabel')}
                  options={[
                    { value: 'YES', label: t('inzeratEdit.elevatorYes') },
                    { value: 'NO', label: t('inzeratEdit.elevatorNo') },
                  ]}
                  value={form.hasElevator == null ? null : form.hasElevator ? 'YES' : 'NO'}
                  onChange={(v) => set({ hasElevator: v === 'YES' })}
                />

                <Field
                  label={t('inzeratEdit.monthlyCostsLabel')}
                  hint={t('inzeratEdit.monthlyCostsHint')}
                  value={form.monthlyCosts}
                  onChangeText={(v) => set({ monthlyCosts: v })}
                  keyboardType="decimal-pad"
                  placeholder={t('inzeratEdit.monthlyCostsPlaceholder')}
                />
              </>
            ) : null}

            {/* ── podmienky prenájmu ──
                Len pri PRENÁJME. Pri predaji sú tieto polia nezmysel a
                formulár sa nimi nemá čím naťahovať. */}
            {form.transaction_type === 'RENT' ? (
              <>
                <Text style={[styles.section, { color: palette.textMuted }]}>{t('inzeratEdit.rentSection')}</Text>
                <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
                  {t('inzeratEdit.rentSectionHint')}
                </Text>

                <Field
                  label={t('inzeratEdit.depositLabel')}
                  value={form.deposit}
                  onChangeText={(v) => set({ deposit: v })}
                  keyboardType="decimal-pad"
                  placeholder={t('inzeratEdit.depositPlaceholder')}
                />
                <Field
                  label={t('inzeratEdit.depositMonthsLabel')}
                  hint={t('inzeratEdit.depositMonthsHint')}
                  value={form.depositMonths}
                  onChangeText={(v) => set({ depositMonths: v })}
                  keyboardType="decimal-pad"
                  placeholder={t('inzeratEdit.depositMonthsPlaceholder')}
                />

                <AvailableFromPicker
                  value={form.availableFrom}
                  onChange={(day) => set({ availableFrom: day })}
                />

                <Field
                  label={t('inzeratEdit.minLeaseLabel')}
                  value={form.minLease}
                  onChangeText={(v) => set({ minLease: v })}
                  keyboardType="numeric"
                  placeholder={t('inzeratEdit.minLeasePlaceholder')}
                />

                <ChoiceRow<Furnishing>
                  label={t('inzeratEdit.furnishingLabel')}
                  options={(['FURNISHED', 'PARTIAL', 'UNFURNISHED'] as Furnishing[]).map((v) => ({
                    value: v,
                    label: getFurnishingLabel(t)[v],
                  }))}
                  value={form.furnishing}
                  onChange={(v) => set({ furnishing: v })}
                />

                <ChoiceRow<Utilities>
                  label={t('inzeratEdit.utilitiesLabel')}
                  options={(['YES', 'PARTIAL', 'NO'] as Utilities[]).map((v) => ({
                    value: v,
                    label: getUtilitiesLabel(t)[v],
                  }))}
                  value={form.utilities}
                  onChange={(v) => set({ utilities: v })}
                />

                {/* Internet je ZVLÁŠŤ od energií — „energie áno" nikdy
                    neznamenalo aj internet a ľudia sa naň pýtajú osobitne. */}
                <ChoiceRow<'YES' | 'NO'>
                  label={t('inzeratEdit.internetLabel')}
                  options={[
                    { value: 'YES', label: t('inzeratEdit.internetYes') },
                    { value: 'NO', label: t('inzeratEdit.internetNo') },
                  ]}
                  value={form.internet == null ? null : form.internet ? 'YES' : 'NO'}
                  onChange={(v) => set({ internet: v === 'YES' })}
                />

                <ChoiceRow<'YES' | 'NO'>
                  label={t('inzeratEdit.petsLabel')}
                  options={[
                    { value: 'YES', label: t('inzeratEdit.petsYes') },
                    { value: 'NO', label: t('inzeratEdit.petsNo') },
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
              <Button title={saving ? t('inzeratEdit.savingButton') : t('inzeratEdit.saveDraftButton')} onPress={() => save()} variant="outline" disabled={saving || locked} />

              {status === 'REJECTED' ? (
                <Text style={[styles.statusNote, { color: palette.danger }]}>
                  {t('inzeratEdit.rejectedByAdmin')}
                  {item.rejection_reason ? t('inzeratEdit.rejectedReason', { reason: item.rejection_reason }) : ''}
                  {t('inzeratEdit.rejectedNote')}
                </Text>
              ) : status === 'ACTIVE' ? (
                <Button title={t('inzeratEdit.unpublishButton')} onPress={unpublish} variant="outline" disabled={saving || locked} />
              ) : (
                <Button title={t('inzeratEdit.publishButton')} onPress={publish} disabled={saving || locked} />
              )}

              <Button title={t('inzeratEdit.deleteButton')} onPress={confirmDelete} variant="danger" disabled={saving || locked} />
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
