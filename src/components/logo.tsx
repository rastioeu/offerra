/**
 * Wordmark Offerra so svetlým a tmavým variantom + teplý glow.
 *
 * DVA VARIANTY, NIE JEDEN PREFARBENÝ:
 * wordmark je kreslený obrázok, nie text — `tintColor` by prefarbil aj
 * teplé podčiarknutie, ktoré je súčasťou značky a meniť sa nemá. Preto sú
 * to dva súbory z toho istého SVG zdroja, líšia sa len farbou písma.
 *
 * PREČO TO VÔBEC VZNIKLO (Rastio, 9.8.2026): navy `#103A6B` na tmavom
 * povrchu `#211D1A` má kontrast **1,47:1** — teda logo prakticky splýva.
 * Svetlý variant `#F7F3EF` na tom istom pozadí má **15,15:1**.
 *
 * GLOW je poskladaný z priehľadných vrstiev, nie z natívneho rozmazania:
 * `expo-blur` v tomto builde nie je a OTA ho nedoručí. Vrstvy vyzerajú
 * rovnako na iOS aj na Androide a nepotrebujú nič navyše.
 *
 * Sila glow je v každej téme INÁ. V tmavej vynikne pri nižšej krytosti;
 * keby mal rovnakú ako v svetlej, svietil by ako lampa. Preto sa neberie
 * jedna hodnota „glow", ale hodnota podľa témy — presne ako farby.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useThemeMode } from '@/hooks/use-theme';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/theme/tokens';

/**
 * Krytosť vrstiev glow, od najširšej po najtesnejšiu.
 *
 * Hodnoty sú ZÁMERNE nízke a je ich šesť. Prvý pokus mal tri vrstvy po
 * 0,10–0,22 — v strede sa to sčítalo na 0,42 a namiesto glow z toho bola
 * hnedá elipsa s viditeľným okrajom. Zistil som to až tým, že som si
 * kompozíciu vykreslil a POZREL, nie z kódu.
 *
 * V tmavej téme sú hodnoty vyššie: teplá farba na tmavom podklade svieti
 * menej než na svetlom papieri.
 */
const GLOW = {
  light: [0.018, 0.022, 0.026, 0.03, 0.034, 0.04],
  dark: [0.03, 0.036, 0.042, 0.05, 0.058, 0.07],
};

export function Logo({ width = 104, height = 26 }: { width?: number; height?: number }) {
  const palette = useTheme();
  const { effective } = useThemeMode();
  const isDark = effective === 'dark';
  const layers = GLOW[isDark ? 'dark' : 'light'];

  return (
    <View style={styles.wrap}>
      {/* Tri vrstvy tvoria mäkký prechod. Sú `pointerEvents="none"`, aby
          neukradli ťuknutie ničomu, čo by bolo pod nimi. */}
      {layers.map((opacity, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.glow,
            {
              backgroundColor: palette.accent,
              opacity,
              borderRadius: Radius.full,
              left: -30 + i * 5,
              right: -30 + i * 5,
              top: -18 + i * 3,
              bottom: -18 + i * 3,
              // Na iOS to rozmaže systém — vrstvy sú len podklad, ktorý
              // tieňu dá tvar. Na Androide ostávajú samotné vrstvy, preto
              // ich je šesť: bez rozostrenia robí plynulý prechod až ich
              // počet.
              shadowColor: palette.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isDark ? 0.5 : 0.35,
              shadowRadius: 16,
            },
          ]}
        />
      ))}

      <Image
        source={
          isDark
            ? require('../../assets/images/wordmark-dark.png')
            : require('../../assets/images/wordmark.png')
        }
        style={{ width, height }}
        contentFit="contain"
        accessibilityLabel="Offerra"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
});
