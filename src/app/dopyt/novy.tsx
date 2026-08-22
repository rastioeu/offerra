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
import { useTranslation } from '@/i18n';
import { db, getDemandLabel, getPropertyLabel, REGIONS, type PropertyType, type TransactionType } from '@/lib/property';
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
  const { t } = useTranslation();
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
      setError(t('dopytNovy.budgetMaxTooLow'));
      return;
    }
    if (!description.trim()) {
      setError(t('dopytNovy.descriptionRequired'));
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
      toast(t('dopytNovy.publishedToast'));
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
          title: t('dopytNovy.screenTitle'),
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />
      <FormScreen>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          {t('dopytNovy.leadPublic')}
        </Text>
        <Text style={[styles.lead, { color: palette.textMuted }]}>
          {t('dopytNovy.leadPrivate')}
        </Text>

        <ChoiceRow<TransactionType>
          label={t('dopytNovy.whatSeekingLabel')}
          options={(['SALE', 'RENT'] as TransactionType[]).map((v) => ({
            value: v,
            label: getDemandLabel(t)[v],
          }))}
          value={transaction}
          onChange={setTransaction}
        />

        <ChoiceRow<AnyType>
          label={t('dopytNovy.propertyTypeLabel')}
          options={[
            { value: 'ANY', label: t('dopytNovy.propertyTypeAny') },
            ...(['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'] as PropertyType[]).map((v) => ({
              value: v as AnyType,
              label: getPropertyLabel(t)[v],
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
          label={t('dopytNovy.regionLabel')}
          hint={t('dopytNovy.regionHint')}
          options={REGIONS.map((r) => ({ value: r, label: r.replace(' kraj', '') }))}
          value={region}
          onChange={setRegion}
        />

        {/* Pri kúpe je to suma, ktorú je záujemca ochotný dať — nie
            „rozpočet" v zmysle mesačnej platby. Pri prenájme mesačný nájom. */}
        <Field
          label={transaction === 'RENT' ? t('dopytNovy.budgetMinRentLabel') : t('dopytNovy.budgetMinSaleLabel')}
          value={budgetMin}
          onChangeText={setBudgetMin}
          keyboardType="decimal-pad"
          placeholder={transaction === 'RENT' ? t('dopytNovy.budgetMinRentPlaceholder') : t('dopytNovy.budgetMinSalePlaceholder')}
        />
        <Field
          label={transaction === 'RENT' ? t('dopytNovy.budgetMaxRentLabel') : t('dopytNovy.budgetMaxSaleLabel')}
          hint={
            transaction === 'RENT'
              ? t('dopytNovy.budgetMaxRentHint')
              : t('dopytNovy.budgetMaxSaleHint')
          }
          value={budgetMax}
          onChangeText={setBudgetMax}
          keyboardType="decimal-pad"
          placeholder={transaction === 'RENT' ? t('dopytNovy.budgetMaxRentPlaceholder') : t('dopytNovy.budgetMaxSalePlaceholder')}
        />

        <Field label={t('dopytNovy.roomsLabel')} value={rooms} onChangeText={setRooms} keyboardType="numeric" placeholder={t('dopytNovy.roomsPlaceholder')} />
        <Field label={t('dopytNovy.areaLabel')} value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder={t('dopytNovy.areaPlaceholder')} />

        <Field
          label={t('dopytNovy.descriptionLabel')}
          hint={t('dopytNovy.descriptionHint')}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={
            transaction === 'RENT'
              ? t('dopytNovy.descriptionPlaceholderRent')
              : t('dopytNovy.descriptionPlaceholderSale')
          }
        />

        <ErrorNote error={error} />

        <Button title={busy ? t('dopytNovy.savingButton') : t('dopytNovy.publishButton')} onPress={submit} disabled={busy} />
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lead: { ...Type.bodyMd },
});
