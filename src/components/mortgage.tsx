/**
 * Odhad splátky priamo v detaile inzerátu.
 *
 * Vedome zjednodušené: neráta poplatky, poistenie ani daň a nehovorí nič
 * o tom, či ti banka úver dá. Preto to appka nazýva ODHAD a píše to
 * priamo pod výsledok — inak by z orientačného čísla spravila sľub.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { computeMortgage, eur } from '@/lib/mortgage';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Card, ChoiceRow, Field, Row, SectionLabel } from './ui';

function num(t: string, fallback: number): number {
  const v = Number(t.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function MortgageCalculator({ price }: { price: number }) {
  const palette = useTheme();
  const [amount, setAmount] = useState(String(price));
  const [down, setDown] = useState<'10' | '20' | '30'>('20');
  const [rate, setRate] = useState('4.2');
  const [years, setYears] = useState<'20' | '25' | '30'>('30');

  const r = computeMortgage({
    price: num(amount, price),
    downPaymentPct: Number(down),
    ratePct: num(rate, 4.2),
    years: Number(years),
  });

  return (
    <Card>
      <SectionLabel>ODHAD MESAČNEJ SPLÁTKY</SectionLabel>

      <Field label="Cena (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <ChoiceRow<'10' | '20' | '30'>
        label="Vlastné zdroje"
        options={[
          { value: '10', label: '10 %' },
          { value: '20', label: '20 %' },
          { value: '30', label: '30 %' },
        ]}
        value={down}
        onChange={setDown}
      />
      <ChoiceRow<'20' | '25' | '30'>
        label="Doba splácania"
        options={[
          { value: '20', label: '20 rokov' },
          { value: '25', label: '25 rokov' },
          { value: '30', label: '30 rokov' },
        ]}
        value={years}
        onChange={setYears}
      />
      <Field label="Úroková sadzba (% ročne)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />

      <View style={[styles.result, { borderTopColor: palette.border }]}>
        <Text style={[styles.monthlyLabel, { color: palette.textSecondary }]}>Mesačne približne</Text>
        <Text style={[styles.monthly, { color: palette.primary }]}>{eur(r.monthly)}</Text>
      </View>

      <Row label="Vlastné zdroje" value={eur(r.downPayment)} />
      <Row label="Výška úveru" value={eur(r.loan)} />
      <Row label="Preplatíte na úrokoch" value={eur(r.totalInterest)} />

      <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
        Orientačný odhad. Neráta poplatky, poistenie ani daň a nehovorí nič o tom,
        či ti banka úver schváli. Skutočnú ponuku ti dá len banka.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  result: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  monthlyLabel: { ...Type.caption },
  monthly: { ...Type.hero, fontWeight: Weight.bold },
  disclaimer: { ...Type.caption },
});
