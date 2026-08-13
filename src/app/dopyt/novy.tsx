/**
 * Nový dopyt — „hľadám, nie ponúkam".
 *
 * Dopyt je verejný hneď (`status='ACTIVE'`), na rozdiel od inzerátu žiadny
 * DRAFT nemá: nemá fotky ani nič, čo by sa dalo rozrobiť, a jeho jediný
 * zmysel je, aby ho videli majitelia.
 *
 * JAZYK JE Z POHĽADU HĽADAJÚCEHO (Rastio, 8.8.2026). V DB je to ten istý
 * `transaction_type` ako pri inzeráte, na obrazovke sa ale volá „Kúpim" /
 * „Hľadám prenájom" — „Predaj" pri dopyte znelo, akoby človek predával.
 * Prekladá to `DEMAND_LABEL`; hodnoty v DB sa NEMENIA, inak by sa dopyty
 * prestali párovať s inzerátmi.
 */
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/city-picker';
import { FormScreen } from '@/components/form-screen';
import { Button, ChoiceRow, ErrorNote, Field } from '@/components/ui';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { db, DEMAND_LABEL, PROPERTY_LABEL, REGIONS, type PropertyType, type TransactionType } from '@/lib/property';
import { Type } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

type AnyType = PropertyType | 'ANY';

function num(text: string): number | null {
  const c = text.replace(',', '.').trim();
  if (c === '') return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}

export default function NewRequestScreen() {
  const palette = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();
  const myId = session?.user.id;

  const [transaction, setTransaction] = useState<TransactionType>('SALE');
  const [type, setType] = useState<AnyType>('ANY');
  const [city, setCity] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [rooms, setRooms] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!myId || busy) return;
    const min = num(budgetMin);
    const max = num(budgetMax);
    if (min != null && max != null && max < min) {
      setError('Horná hranica rozpočtu nemôže byť nižšia než dolná.');
      return;
    }
    if (!description.trim()) {
      setError('Napíš aspoň krátko, čo hľadáš — inak dopytu nikto nerozumie.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await db().from('buyer_request').insert({
        user_id: myId,
        transaction_type: transaction,
        property_type: type === 'ANY' ? null : type,
        city,
        district,
        region,
        budget_min: min,
        budget_max: max,
        rooms_min: num(rooms),
        area_min: num(area),
        description: description.trim(),
        status: 'ACTIVE',
      });
      if (e) throw e;
      toast('Dopyt zverejnený');
      router.back();
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[DOPYT] Vytvorenie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nový dopyt',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />
      <FormScreen>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          Dopyt je verejný pod tvojou prezývkou. Majitelia ťa naň môžu osloviť
          svojím inzerátom.
        </Text>
        <Text style={[styles.lead, { color: palette.textMuted }]}>
          Tvoje meno ani telefón sa nikde nezobrazia — rovnako ako pri ponukách.
          Rozpočet je orientačný, nie záväzok.
        </Text>

        <ChoiceRow<TransactionType>
          label="Čo hľadám"
          options={(['SALE', 'RENT'] as TransactionType[]).map((v) => ({
            value: v,
            label: DEMAND_LABEL[v],
          }))}
          value={transaction}
          onChange={setTransaction}
        />

        <ChoiceRow<AnyType>
          label="Typ nehnuteľnosti"
          options={[
            { value: 'ANY', label: 'Akýkoľvek' },
            ...(['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'] as PropertyType[]).map((v) => ({
              value: v as AnyType,
              label: PROPERTY_LABEL[v],
            })),
          ]}
          value={type}
          onChange={setType}
        />

        <CityPicker
          city={city}
          district={district}
          onPick={(p) => {
            setCity(p.city);
            setDistrict(p.district);
            setRegion(p.region);
          }}
        />

        <ChoiceRow<string>
          label="Kraj"
          hint="Dopĺňa sa podľa obce. Dá sa vybrať aj sám, keď je jedno ktorá obec."
          options={REGIONS.map((r) => ({ value: r, label: r.replace(' kraj', '') }))}
          value={region}
          onChange={setRegion}
        />

        {/* Pri kúpe je to suma, ktorú je záujemca ochotný dať — nie
            „rozpočet" v zmysle mesačnej platby. Pri prenájme mesačný nájom. */}
        <Field
          label={transaction === 'RENT' ? 'Nájom od (€/mesiac)' : 'Ponúkam od (€)'}
          value={budgetMin}
          onChangeText={setBudgetMin}
          keyboardType="decimal-pad"
          placeholder={transaction === 'RENT' ? 'napr. 400 za mesiac' : 'napr. 120000'}
        />
        <Field
          label={transaction === 'RENT' ? 'Nájom do (€/mesiac)' : 'Ponúkam do (€)'}
          hint={
            transaction === 'RENT'
              ? 'Najviac, koľko si vieš dovoliť mesačne.'
              : 'Najviac, koľko si za takú nehnuteľnosť ochotný ponúknuť.'
          }
          value={budgetMax}
          onChangeText={setBudgetMax}
          keyboardType="decimal-pad"
          placeholder={transaction === 'RENT' ? 'napr. 650 za mesiac' : 'napr. 200000'}
        />

        <Field label="Aspoň izieb" value={rooms} onChangeText={setRooms} keyboardType="numeric" placeholder="napr. 2" />
        <Field label="Aspoň m²" value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder="napr. 55" />

        <Field
          label="Čo hľadáš"
          hint="Toto je jediné povinné pole — podľa neho sa majiteľ rozhodne, či ťa osloví."
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={
            transaction === 'RENT'
              ? 'napr. Hľadám svetlý 2-izbový byt bližšie k centru, ideálne s balkónom, nasťahovanie od septembra'
              : 'napr. Hľadám 3-izbový byt pre rodinu, ideálne s balkónom a parkovaním, do 20 minút od centra'
          }
        />

        <ErrorNote error={error} />

        <Button title={busy ? 'Ukladám…' : 'Zverejniť dopyt'} onPress={submit} disabled={busy} />
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lead: { ...Type.bodyMd },
});
