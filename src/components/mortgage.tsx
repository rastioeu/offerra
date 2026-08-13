/**
 * Odhad splátky — vlastný podtab v detaile inzerátu (Rastio, 12.8.2026).
 *
 * Predtým visel v strede obrazovky medzi parametrami a popisom, kde ho
 * pri prenájme nebolo treba a pri predaji ho nikto nehľadal. Ako tab je
 * na svojom mieste a ukazuje sa LEN pri predaji — pri prenájme nemá čo
 * počítať.
 *
 * Vedome zjednodušené: neráta poplatky, poistenie ani daň a nehovorí nič
 * o tom, či ti banka úver dá. Preto to appka nazýva ODHAD a píše to
 * priamo pod výsledok — inak by z orientačného čísla spravila sľub.
 *
 * SADZBA je pevná predvoľba, nie trhový údaj. Appka nemá odkiaľ ťahať
 * aktuálne sadzby bánk (žiadny taký zdroj v nej nie je) a tvrdiť, že
 * číslo je „aktuálne", by bola lož. Je preto označená ako orientačná
 * a dá sa prepísať.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { computeMortgage, eur } from '@/lib/mortgage';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Card, ChoiceRow, Field, Row, SectionLabel } from './ui';

/** Predvolená sadzba. Orientačná, nie trhová — dôvod je v komentári hore. */
const DEFAULT_RATE = 4.2;

function num(t: string, fallback: number): number {
  const v = Number(t.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function MortgageCalculator({
  price,
  topOffer,
}: {
  /** Orientačná cena z inzerátu. Nemusí byť — cena je v Offerre nepovinná. */
  price?: number | null;
  /** Najvyššia živá ponuka. Keď cena chýba, je to jediné reálne číslo, ktoré appka má. */
  topOffer?: number | null;
}) {
  const palette = useTheme();
  // Cena z inzerátu má prednosť: je to číslo, ktoré uviedol predávajúci.
  // Keď chýba (a v Offerre chýbať smie), nastúpi najvyššia ponuka — inak
  // by kalkulačka pri inzeráte bez ceny nemala z čoho začať.
  const initial = price ?? topOffer ?? null;
  const [amount, setAmount] = useState(initial == null ? '' : String(initial));
  const [down, setDown] = useState<'10' | '20' | '30'>('20');
  const [rate, setRate] = useState(String(DEFAULT_RATE));
  const [years, setYears] = useState<'20' | '25' | '30'>('30');

  const entered = num(amount, 0);
  const r = computeMortgage({
    price: entered,
    downPaymentPct: Number(down),
    ratePct: num(rate, DEFAULT_RATE),
    years: Number(years),
  });

  return (
    <Card>
      <SectionLabel>ODHAD MESAČNEJ SPLÁTKY</SectionLabel>

      <Field
        label="Cena (€)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="napr. 248000"
      />

      {/* Ponuku ponúkame dosadiť, nie ju dosadzujeme za chrbtom — sú to dve
          rôzne čísla a človek má vedieť, ktoré počíta. */}
      {topOffer != null && topOffer !== entered ? (
        <Pressable onPress={() => setAmount(String(topOffer))} accessibilityRole="button" hitSlop={6}>
          <Text style={[styles.suggest, { color: palette.link }]}>
            {`Najvyššia ponuka je ${eur(topOffer)} — dosadiť`}
          </Text>
        </Pressable>
      ) : null}

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
      <Field
        label="Úroková sadzba (% ročne) — orientačná"
        hint="Predvolené číslo je odhad, nie ponuka banky. Skutočnú sadzbu ti povie banka; tu si ju prepíš."
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
        placeholder="napr. 4.2"
      />

      {entered <= 0 ? (
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          Zadaj cenu a appka dopočíta odhad splátky. Predávajúci cenu uviesť nemusel —
          v Offerre je nepovinná.
        </Text>
      ) : (
        <>
          <View style={[styles.result, { borderTopColor: palette.border }]}>
            <Text style={[styles.monthlyLabel, { color: palette.textSecondary }]}>Mesačne približne</Text>
            <Text style={[styles.monthly, { color: palette.primary }]}>{eur(r.monthly)}</Text>
          </View>

          <Row label="Vlastné zdroje" value={eur(r.downPayment)} />
          <Row label="Výška úveru" value={eur(r.loan)} />
          <Row label="Preplatíte na úrokoch" value={eur(r.totalInterest)} />
        </>
      )}

      <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
        Orientačný odhad, nie ponuka banky. Neráta poplatky, poistenie ani daň z nehnuteľnosti
        a nehovorí nič o tom, či ti banka úver schváli. Offerra nie je finančný poradca —
        skutočné číslo ti dá len banka.
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
  suggest: { ...Type.caption, fontWeight: Weight.semibold },
  empty: { ...Type.caption },
  disclaimer: { ...Type.caption },
});
