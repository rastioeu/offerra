/**
 * Spoločný obal formulárových obrazoviek.
 *
 * Vznikol z chyby nahlásenej Rastiom 8.8.2026: klávesnica prekryla pole, do
 * ktorého sa práve písalo, a nedala sa zavrieť. Pri numerickej klávesnici to
 * bola slepá ulička — nemá klávesu Enter.
 *
 * Preto TRI nezávislé cesty von; jedna nestačí, lebo každá zlyháva inde:
 *
 *   1. `automaticallyAdjustKeyboardInsets` — iOS sám podloží obsah o výšku
 *      klávesnice a doskroluje na zaostrené pole. Nahrádza doterajší
 *      `KeyboardAvoidingView`, ktorý obsah len posunul, ale nedoskroloval —
 *      preto pole ostalo pod klávesnicou.
 *   2. Ťuknutie kdekoľvek mimo poľa (`Pressable` cez celý obsah). Vnorené
 *      tlačidlá si stlačenie zoberú samy, takže sa navzájom nerušia.
 *   3. Potiahnutie prstom po obsahu (`keyboardDismissMode="interactive"`).
 *
 * Štvrtú — lištu „Hotovo" nad klávesnicou — pridáva `KeyboardDoneBar`, ktorá
 * sa renderuje tu, aby na ňu nemohla žiadna obrazovka zabudnúť.
 */
import type { ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { KeyboardDoneBar } from '@/components/ui';
import { Spacing } from '@/theme/tokens';

export function FormScreen({
  children,
  style,
}: {
  children: ReactNode;
  /** Doplnkové odsadenie obsahu, keď obrazovka potrebuje iné než bežné. */
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          // Nie je to tlačidlo, len záchytná plocha — VoiceOver ju musí
          // preskočiť, inak by čítal celý formulár ako jeden ovládač.
          accessible={false}
          style={[styles.body, style]}>
          {children}
        </Pressable>
      </ScrollView>
      <KeyboardDoneBar />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  body: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
});
