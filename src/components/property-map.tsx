/**
 * Mapa inzerátov — piny s CENOU, nie len bodky.
 *
 * `react-native-maps` je NATÍVNY modul, pridaný do buildu #4. Na staršom
 * builde chýba, preto `require()` v try/catch: appka ukáže vysvetlenie
 * namiesto pádu celej obrazovky.
 *
 * Súradnice sú súradnice OBCE, nie presnej adresy — adresa je pri
 * inzerátoch zámerne skrytá (`address_hidden`) a mapa ju nesmie prezradiť.
 * Piny v tej istej obci sa preto prekrývajú; je to správne, nie chyba.
 *
 * POSKYTOVATEĽ MÁP (Rastio, 8.8.2026 — „Google Maps s prepínačom"):
 * na Androide je Google natívne. Na iOS ho `react-native-maps` zapne len
 * vtedy, keď je v `app.json` kľúč `ios.config.googleMapsApiKey` — bez kľúča
 * by `PROVIDER_GOOGLE` dal PRÁZDNU ŠEDÚ plochu. Preto sa provider odvodzuje
 * od toho, či kľúč naozaj existuje: s kľúčom Google, bez neho Apple Maps.
 * Prepínač štandardná/satelitná funguje na oboch — `mapType` je vlastnosť
 * `MapView`, nie Googlu.
 */
import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatAmount } from '@/lib/offers';
import { priceDisplay } from '@/lib/price-display';
import type { PropertyWithMedia } from '@/lib/property';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

/** Stred Slovenska — keď niet čo zobraziť. */
const SK = { latitude: 48.7, longitude: 19.7, latitudeDelta: 3.2, longitudeDelta: 4.2 };

type MapType = 'standard' | 'satellite';

/** Je na iOS nakonfigurovaný kľúč pre Google mapy? */
function hasIosGoogleKey(): boolean {
  const ios = Constants.expoConfig?.ios as { config?: { googleMapsApiKey?: string } } | undefined;
  return Boolean(ios?.config?.googleMapsApiKey);
}

export function PropertyMap({
  items,
  onPress,
}: {
  items: PropertyWithMedia[];
  onPress: (id: string) => void;
}) {
  const palette = useTheme();
  const [mapType, setMapType] = useState<MapType>('standard');

  const withCoords = useMemo(
    () => items.filter((p) => p.latitude != null && p.longitude != null),
    [items]
  );

  const region = useMemo(() => {
    if (withCoords.length === 0) return SK;
    const lats = withCoords.map((p) => p.latitude as number);
    const lons = withCoords.map((p) => p.longitude as number);
    const minLa = Math.min(...lats), maxLa = Math.max(...lats);
    const minLo = Math.min(...lons), maxLo = Math.max(...lons);
    return {
      latitude: (minLa + maxLa) / 2,
      longitude: (minLo + maxLo) / 2,
      // Rezerva, nech piny nesedia na okraji.
      latitudeDelta: Math.max(0.25, (maxLa - minLa) * 1.6),
      longitudeDelta: Math.max(0.25, (maxLo - minLo) * 1.6),
    };
  }, [withCoords]);

  let MapView: React.ComponentType<Record<string, unknown>>;
  let Marker: React.ComponentType<Record<string, unknown>>;
  let provider: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    provider = Platform.OS === 'android' || hasIosGoogleKey() ? maps.PROVIDER_GOOGLE : undefined;
  } catch {
    return (
      <View style={[styles.missing, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.missingTitle, { color: palette.textPrimary }]}>Mapa v tejto verzii nie je</Text>
        <Text style={[styles.missingBody, { color: palette.textMuted }]}>
          Potrebuje novšiu verziu appky z TestFlightu. Zoznam funguje ďalej.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <MapView style={StyleSheet.absoluteFill} provider={provider} mapType={mapType} initialRegion={region}>
        {withCoords.map((p) => {
          const pd = priceDisplay(p.asking_price_hint, p.top_offer ?? null, p.offer_count ?? 0);
          const value =
            pd.headline === 'TOP_OFFER' && pd.topOffer != null
              ? formatAmount(pd.topOffer, p.transaction_type)
              : pd.asking != null
                ? formatAmount(pd.asking, p.transaction_type)
                : 'bez ceny';
          const isOffer = pd.headline === 'TOP_OFFER';
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude as number, longitude: p.longitude as number }}
              onPress={() => onPress(p.id)}
              tracksViewChanges={false}>
              {/* Cena priamo na pine — inak by mapa nepovedala nič, čo
                  sa nedá vyčítať zo zoznamu. */}
              <View
                style={[
                  styles.pin,
                  Shadow.card,
                  {
                    backgroundColor: isOffer ? palette.accentDeep : palette.primary,
                    borderColor: palette.surface,
                  },
                ]}>
                <Text style={[styles.pinText, { color: palette.onPrimary }]} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Štandardná / satelitná — nad mapou, aby sa nemiešala s obsahom. */}
      <View style={[styles.switch, Shadow.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {(['standard', 'satellite'] as MapType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setMapType(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: mapType === t }}
            style={[styles.switchBtn, mapType === t ? { backgroundColor: palette.primary } : null]}>
            <Text
              style={[
                styles.switchText,
                { color: mapType === t ? palette.onPrimary : palette.textSecondary },
              ]}>
              {t === 'standard' ? 'Mapa' : 'Satelit'}
            </Text>
          </Pressable>
        ))}
      </View>

      {withCoords.length < items.length ? (
        <View style={[styles.badge, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.badgeText, { color: palette.textMuted }]}>
            {items.length - withCoords.length} bez polohy
          </Text>
        </View>
      ) : null}

      <View style={[styles.badge, styles.badgeRight, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.badgeText, { color: palette.textMuted }]}>Poloha je obec, nie adresa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  pin: {
    borderRadius: Radius.full,
    borderWidth: 2,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 150,
  },
  pinText: { ...Type.caption, fontWeight: Weight.bold },
  switch: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 3,
    gap: 2,
  },
  switchBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, minHeight: 32, justifyContent: 'center' },
  switchText: { ...Type.caption, fontWeight: Weight.semibold },
  badge: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  badgeRight: { left: undefined, right: Spacing.md },
  badgeText: { ...Type.caption },
  missing: {
    margin: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  missingTitle: { ...Type.subtitle, fontWeight: Weight.semibold },
  missingBody: { ...Type.bodyMd },
});
