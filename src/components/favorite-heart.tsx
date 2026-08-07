/**
 * Srdiečko. Reaguje OKAMŽITE (optimisticky) — čakať na sieť pri takomto
 * drobnom geste vyzerá rozbito. Ak zápis zlyhá, stav sa vráti zo servera
 * a používateľ dostane hlášku.
 */
import { useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet } from 'react-native';

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

  async function press() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
    ]).start();

    const result = await onToggle();
    if (result === null) {
      Alert.alert('Nepodarilo sa uložiť', 'Skús to prosím znova.');
    }
  }

  return (
    <Pressable
      onPress={press}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}
      accessibilityState={{ selected: active }}>
      <Animated.View style={[styles.heart, { transform: [{ scale }] }]}>
        <Icon
          name={active ? 'heart.fill' : 'heart'}
          size={size}
          color={active ? palette.danger : palette.surface}
          weight="semibold"
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Biele srdce na fotke potrebuje obrys, inak zanikne.
  heart: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
  },
});
