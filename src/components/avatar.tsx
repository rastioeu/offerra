/**
 * Avatar — fotka, a keď fotka nie je, VYGENEROVANÝ obrázok z prezývky.
 *
 * Prečo nie sivé koliesko s písmenom: v zozname ponúk stojí pod sebou päť
 * „P" na tom istom sivom podklade a nedajú sa od seba odlíšiť.
 *
 * Prečo GEOMETRICKÉ tvary a nie tváre: ponuky sú pseudonymné. Cudzia tvár
 * pri prezývke by predstierala konkrétneho človeka, ktorý za ňou nestojí —
 * to je horšie než žiadna fotka. Abstraktný obrazec odlíši ľudí od seba
 * a nič neklame.
 *
 * Obrázky sú PRIBALENÉ, nie ťahané za behu. Hotlink na cudzí server by pri
 * každom zobrazení avatara poslal IP adresu používateľa tretej strane
 * a pri jej výpadku by avatary zmizli.
 *
 * Zdroj: DiceBear „Shapes", **CC0 1.0** (verejná doména, bez povinnosti
 * uvádzať autora) — viď `assets/images/avatars/LICENSE.md`.
 *
 * Výber je DETERMINISTICKÝ: tá istá prezývka dá vždy ten istý obrazec, na
 * každom telefóne a bez akéhokoľvek zápisu do databázy.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadow } from '@/theme/tokens';

/** `require` musí byť statický — balík sa skladá pri builde, nie za behu,
 *  takže `require(\`…/a${i}.png\`)` by nefungovalo. */
const GENERATED = [
  require('../../assets/images/avatars/a01.png'),
  require('../../assets/images/avatars/a02.png'),
  require('../../assets/images/avatars/a03.png'),
  require('../../assets/images/avatars/a04.png'),
  require('../../assets/images/avatars/a05.png'),
  require('../../assets/images/avatars/a06.png'),
  require('../../assets/images/avatars/a07.png'),
  require('../../assets/images/avatars/a08.png'),
  require('../../assets/images/avatars/a09.png'),
  require('../../assets/images/avatars/a10.png'),
  require('../../assets/images/avatars/a11.png'),
  require('../../assets/images/avatars/a12.png'),
];

/** Stabilný jednoduchý hash. Nemusí byť kryptografický, musí byť ROVNAKÝ
 *  pri každom spustení — preto žiadny `Math.random()` ani čas. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({
  name,
  uri,
  size = 40,
  ring = false,
}: {
  /** Prezývka alebo meno — z neho sa vyberá obrazec. */
  name: string;
  /** Skutočná fotka. Keď chýba, kreslí sa vygenerovaný obrazec. */
  uri?: string | null;
  size?: number;
  /** Teplý prstenec s podsvietením — na profilovke, nie v zoznamoch. */
  ring?: boolean;
}) {
  const palette = useTheme();
  const source = uri ? { uri } : GENERATED[hash(name) % GENERATED.length];

  const inner = (
    <Image
      source={source}
      style={{
        width: size,
        height: size,
        borderRadius: Radius.full,
        backgroundColor: palette.surfacePressed,
      }}
      contentFit="cover"
      accessibilityLabel={uri ? `Fotka: ${name}` : `Avatar: ${name}`}
    />
  );

  if (!ring) return inner;
  return <View style={[styles.ring, Shadow.glow, { borderColor: palette.accent }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, borderRadius: Radius.full, padding: 3 },
});
