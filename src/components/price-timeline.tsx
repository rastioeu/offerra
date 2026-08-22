/**
 * Ako sa cena inzerátu vyvíjala — zmeny orientačnej ceny + rast najvyššej
 * ponuky na jednej osi.
 *
 * Prečo to má hodnotu: „byt visí tri mesiace a cena šla dvakrát dole" je
 * pri rozhodovaní podstatnejšie než aktuálne číslo. Na obrátenom trhu to
 * platí dvojnásobne — ukazuje, kde sa dražba reálne zastavila.
 *
 * Rekordné ponuky sa POČÍTAJÚ z ponúk, ktoré appka aj tak načítala; druhá
 * tabuľka s tými istými číslami by sa raz rozišla s pravdou.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { errorText, isNotDeployedYet } from '@/lib/errors';
import type { Offer } from '@/lib/offers';
import { buildTimeline, fetchPriceHistory, type PricePoint } from '@/lib/price-history';
import { formatDate, formatPrice, type TransactionType } from '@/lib/property';
import { Money as MoneyType, Spacing, Type, Weight } from '@/theme/tokens';

import { Card, Eyebrow } from './ui';

export function PriceTimeline({
  propertyId,
  offers,
  transaction,
}: {
  propertyId: string;
  offers: Offer[];
  transaction: TransactionType;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const [points, setPoints] = useState<PricePoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const changes = await fetchPriceHistory(propertyId);
        if (!cancelled) setPoints(buildTimeline(changes, offers));
      } catch (e: unknown) {
        // Tabuľka histórie ešte nemusela byť nasadená — os sa vtedy
        // nezobrazí vôbec, namiesto červeného rámčeka na detaile.
        if (isNotDeployedYet(e)) {
          console.log('[HISTÓRIA CIEN] Tabuľka ešte nie je nasadená — os sa skryje.');
          if (!cancelled) setPoints([]);
          return;
        }
        console.log(`[HISTÓRIA CIEN] Načítanie zlyhalo: ${errorText(e)}`);
        if (!cancelled) setPoints([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `offers` je pole — porovnávame podľa dĺžky a poslednej ponuky, inak
    // by sa efekt spúšťal pri každom prekreslení.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, offers.length]);

  // Jeden bod nie je vývoj — os má zmysel až keď je čo porovnať.
  if (!points || points.length < 2) return null;

  return (
    <Card>
      <Eyebrow>{t('priceTimeline.title')}</Eyebrow>
      {points.map((p, i) => {
        const isOffer = p.kind === 'OFFER';
        const cheaper = !isOffer && p.from != null && p.value != null && p.value < p.from;
        return (
          <View key={`${p.at}-${i}`} style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isOffer ? palette.accent : palette.primary },
              ]}
            />
            <View style={styles.body}>
              <Text style={[styles.value, { color: isOffer ? palette.accent : palette.textPrimary }]}>
                {formatPrice(t, p.value, transaction) ?? '—'}
              </Text>
              <Text style={[styles.label, { color: palette.textMuted }]}>
                {isOffer ? t('priceTimeline.newHighest') : cheaper ? t('priceTimeline.priceLowered') : t('priceTimeline.priceAdjusted')}
                {' · '}
                {formatDate(language, p.at)}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  body: { flex: 1, gap: 1 },
  value: { ...MoneyType.small, fontFamily: MoneyType.fontFamily, fontWeight: Weight.bold },
  label: { ...Type.caption },
});
