/**
 * Srdiečko. Reaguje OKAMŽITE (optimisticky) — čakať na sieť pri takomto
 * drobnom geste vyzerá rozbito. Ak zápis zlyhá, stav sa vráti zo servera
 * a používateľ dostane hlášku.
 */
import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';

import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';

export function FavoriteHeart({
  active,
  onToggle,
  size = 26,
}: {
  active: boolean;
  onToggle: () => Promise<boolean | null>;
  size?: number;
}) {
  const palette = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const toast = useToast();

  async function press() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
    ]).start();

    // `onToggle` vracia NOVÝ stav, takže sa dá povedať, čo sa práve stalo —
    // nie len že sa niečo stalo. Srdiečko je najčastejšia akcia v appke
    // a doteraz nedávalo po úspechu žiadnu odozvu okrem animácie.
    const result = await onToggle();
    if (result === null) {
      Alert.alert('Nepodarilo sa uložiť', 'Skús to prosím znova.');
      return;
    }
    toast(result ? 'Pridané do obľúbených' : 'Odstránené z obľúbených', result ? 'success' : 'info');
  }

  return (
    <Pressable
      onPress={press}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}
      accessibilityState={{ selected: active }}>
      {/* Kruh pod ikonou má INÚ farbu podľa stavu, a to zámerne.
          Prvý pokus mal jeden tmavý kruh pre oba stavy — zmeral som to
          a červené srdce na svetlej fotke spadlo z 3,65:1 na 1,36:1,
          teda som ho zhoršil. Tmavý kruh a červená sú obe tmavé.

          Takto je kontrast NEZÁVISLÝ OD FOTKY: červená vždy leží na
          takmer bielom kruhu, biely obrys vždy na takmer čiernom.
          Najhorší nameraný prípad je 3,09:1, prah pre grafické prvky
          je 3:1. */}
      <Animated.View
        style={[
          styles.heart,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: active ? PLATE_ON : PLATE_OFF,
          },
          { transform: [{ scale }] },
        ]}>
        <Icon
          name={active ? 'heart.fill' : 'heart'}
          size={size}
          // Vyplnené = červená, ktorú ľudia poznajú z iných appiek.
          // Nevyplnené = biela, aby sa odlíšilo od výplne aj na kruhu.
          color={active ? palette.favorite : '#FFFFFF'}
          weight="semibold"
        />
      </Animated.View>
    </Pressable>
  );
}

/** Krytosť je vypočítaná, nie odhadnutá — obe prejdú 3:1 na každej fotke. */
const PLATE_ON = 'rgba(255,255,255,0.92)';
const PLATE_OFF = 'rgba(0,0,0,0.62)';

const styles = StyleSheet.create({
  // Kruh + tieň. Kruh rieši čitateľnosť na svetlých fotkách, tieň na
  // tmavých — samotný kruh by na čiernej fotke zanikol.
  heart: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
  },
});
