/**
 * Ulica s našeptávaním z `offerra.street` — číselníka Registra adries MV SR
 * (31 tisíc ulíc, 763 obcí; import `scripts/import-streets.mjs`).
 *
 * PREČO NIE MODÁL AKO PRI OBCI
 * Obec je POVINNÁ a musí byť z číselníka — preto modál, ktorý nič iné
 * nepustí. Ulica je nepovinná a číselník ju nemusí poznať (nová ulica,
 * dedina bez pomenovaných ulíc, časť obce). Ostáva teda bežné pole, kam sa
 * dá napísať čokoľvek, a našeptávanie je len skratka.
 *
 * PREČO SA NEHĽADÁ CEZ NOMINATIM/OSM ZA BEHU
 * Nominatim má limit 1 dotaz/s a autocomplete priamo zakazuje. Dáta sú
 * preto raz naimportované u nás a appka pri písaní nechodí na žiadne
 * externé API.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { db } from '@/lib/property';
import { normalizeText } from '@/lib/search';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { ErrorNote, Label } from './ui';
import { errorText } from '@/lib/errors';

type Suggestion = { id: number; name: string };

export function StreetPicker({
  city,
  district,
  street,
  onChange,
}: {
  city: string | null;
  district: string | null;
  street: string | null;
  onChange: (street: string) => void;
}) {
  const palette = useTheme();
  const [cityId, setCityId] = useState<number | null>(null);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Po výbere z ponuky sa zoznam schová — inak by visel nad poľom aj vtedy,
  // keď je už vybraté a používateľ ide ďalej.
  const [picked, setPicked] = useState(false);

  // 1. obec → city_id. Inzerát drží obec ako text, číselník ju musí dohľadať.
  //    Okres rozhoduje: „Selce" existujú v troch okresoch.
  useEffect(() => {
    let cancelled = false;
    if (!city) {
      setCityId(null);
      return;
    }
    (async () => {
      try {
        let q = db().from('city').select('id').eq('name_norm', normalizeText(city)).limit(2);
        if (district) q = q.eq('district', district);
        const { data, error: e } = await q;
        if (e) throw e;
        if (!cancelled) setCityId(data?.[0]?.id ?? null);
      } catch (e: unknown) {
        const m = errorText(e);
        console.log(`[ULICE] Obec sa nepodarilo dohľadať: ${m}`);
        if (!cancelled) {
          setError(m);
          setCityId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city, district]);

  // 2. našeptávanie nad vlastnou tabuľkou
  useEffect(() => {
    const needle = normalizeText((street ?? '').trim());
    if (cityId == null || picked || needle.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        // `like` a nie `ilike` — `name_norm` je už malými písmenami
        // a prefixový index `text_pattern_ops` sa využije len takto.
        const { data, error: e } = await db()
          .from('street')
          .select('id,name')
          .eq('city_id', cityId)
          .like('name_norm', `${needle}%`)
          .order('name')
          .limit(8);
        if (e) throw e;
        if (!cancelled) setItems((data ?? []) as Suggestion[]);
      } catch (e: unknown) {
        const m = errorText(e);
        console.log(`[ULICE] Našeptávanie zlyhalo: ${m}`);
        if (!cancelled) {
          setError(m);
          setItems([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityId, street, picked]);

  const exact = items.length === 1 && normalizeText(items[0].name) === normalizeText(street ?? '');

  return (
    <View style={styles.group}>
      <Label
        hint={
          city
            ? 'Bez čísla domu — presnú adresu si dohodnete až po prijatí ponuky. Ulice ponúkame z Registra adries, napísať sa dá aj iná.'
            : 'Najprv vyber obec, potom ti ulice ponúkneme z Registra adries.'
        }>
        Ulica (nepovinné)
      </Label>

      <TextInput
        value={street ?? ''}
        onChangeText={(v) => {
          setPicked(false);
          onChange(v);
        }}
        placeholder="napr. Šancová"
        placeholderTextColor={palette.textMuted}
        returnKeyType="done"
        style={[
          styles.input,
          { backgroundColor: palette.surface, borderColor: palette.borderStrong, color: palette.textPrimary },
        ]}
      />

      <ErrorNote error={error} />

      {busy ? <ActivityIndicator style={styles.spinner} color={palette.primary} /> : null}

      {!exact && items.length > 0 ? (
        <View style={[styles.list, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {items.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                onChange(s.name);
                setPicked(true);
                setItems([]);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: palette.border, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
              ]}>
              <Text style={[styles.rowName, { color: palette.textPrimary }]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Type.bodyLg,
  },
  spinner: { marginTop: Spacing.xs },
  list: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  row: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { ...Type.bodyLg, fontWeight: Weight.medium },
});
