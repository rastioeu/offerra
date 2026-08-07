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

import { CityPicker } from '@/components/city-picker';
import { DeadlinePicker } from '@/components/deadline-picker';
import { Badge, Button, ChoiceRow, ErrorNote, Field } from '@/components/ui';
import { usePhotoUpload } from '@/hooks/use-photo-upload';
import { useProperty } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
  db,
  missingForPublish,
  PROPERTY_LABEL,
  STATUS_LABEL,
  TRANSACTION_LABEL,
  type Property,
  type PropertyType,
  type TransactionType,
} from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

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
  const { item, error, reload } = useProperty(id);

  const [draft, setDraft] = useState<Property | null>(null);
  const [rooms, setRooms] = useState('');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { uploading, addPhotos, removePhoto } = usePhotoUpload(session?.user.id, id, reload);

  // Server je zdroj pravdy; lokálny stav sa napĺňa až keď dorazí.
  useEffect(() => {
    if (!item) return;
    setDraft(item);
    setRooms(item.rooms != null ? String(item.rooms) : '');
    setArea(item.area_m2 != null ? String(item.area_m2) : '');
    setPrice(item.asking_price_hint != null ? String(item.asking_price_hint) : '');
  }, [item]);

  function patch(p: Partial<Property>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function collect(): Partial<Property> {
    if (!draft) return {};
    return {
      transaction_type: draft.transaction_type,
      property_type: draft.property_type,
      title: draft.title,
      description: draft.description,
      city: draft.city,
      district: draft.district,
      address_hidden: draft.address_hidden,
      offer_deadline: draft.offer_deadline,
      rooms: num(rooms),
      area_m2: num(area),
      asking_price_hint: num(price),
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
      return true;
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
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
      Alert.alert('Zverejnené', 'Inzerát je teraz viditeľný v katalógu.');
    }
  }

  async function unpublish() {
    if (await save({ status: 'DRAFT' })) {
      Alert.alert('Stiahnuté z katalógu', 'Inzerát je opäť rozpracovaný.');
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
            const m = e instanceof Error ? e.message : String(e);
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ErrorNote error={error ?? saveError} />

        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}

        {item === null && !error ? (
          <Text style={[styles.missing, { color: palette.textMuted }]}>Inzerát sa nenašiel.</Text>
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
              Aspoň jedna je povinná. Viac fotiek = viac ponúk — prvá sa použije ako titulná.
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
                  <Pressable
                    onPress={() => removePhoto(m.id, m.url)}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={[styles.remove, { backgroundColor: palette.danger }]}>
                    <Text style={[styles.removeText, { color: palette.onPrimary }]}>×</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={() => addPhotos(photos.length)}
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
                  <Text style={[styles.addPhotoText, { color: palette.link }]}>+ Fotky</Text>
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
              onPick={(city, district) => patch({ city, district })}
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

            <DeadlinePicker
              value={draft.offer_deadline}
              onChange={(iso) => patch({ offer_deadline: iso })}
            />

            {/* ── akcie ── */}
            <View style={styles.actions}>
              <Button title={saving ? 'Ukladám…' : 'Uložiť koncept'} onPress={() => save()} variant="outline" disabled={saving} />

              {draft.status === 'ACTIVE' ? (
                <Button title="Stiahnuť z katalógu" onPress={unpublish} variant="outline" disabled={saving} />
              ) : (
                <Button title="Zverejniť" onPress={publish} disabled={saving} />
              )}

              <Button title="Zmazať inzerát" onPress={confirmDelete} variant="danger" disabled={saving} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
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
