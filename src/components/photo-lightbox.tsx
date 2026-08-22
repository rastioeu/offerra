/**
 * Fullscreen prehliadač fotiek inzerátu.
 *
 * ══ PREČO JE TO PREPÍSANÉ (Rastio, 17.8.2026) ══
 * Prvá verzia sa otvorila, nápovedu zobrazila, ale swipe do strán nelistoval
 * a swipe dole nezatváral — fungovalo len X v rohu. Príčina je DVOJITÁ a
 * obe polovice sú vyčítateľné zo zdrojov gesture-handleru 2.32:
 *
 * 1. `Gesture.Exclusive(doubleTap, pan)` znamená v RNGH `requireToFail` —
 *    ťah SA NESMIE spustiť, kým dvojťap nezlyhá
 *    (`gestureComposition.ts:115` „Every group gets to wait for all groups
 *    before it"). A dvojťap bez `maxDistance` na pohyb prsta NEZLYHÁ:
 *    `RNTapHandler.m:57` nastavuje `maxDeltaX/maxDeltaY/maxDistSq = NAN` a
 *    `shouldFailUnderCustomCriteria` každú z nich s NAN preskočí. Dvojťap
 *    teda zlyhal až na časovačoch (~500 ms) — kým prst dovtedy zdvihneš,
 *    `pan` sa neaktivuje NIKDY. Preto swipe dole nerobil nič.
 *
 * 2. Vodorovné listovanie riešil natívny `ScrollView` s `pagingEnabled`, a
 *    vnútri neho sedelo `Gesture.Pan`. RNGH gesto pýta UIKitu súbežné
 *    rozpoznávanie so scroll view len pre natívny handler
 *    (`RNGestureHandler.mm:582` `areScrollViewRecognizersCompatible`) —
 *    inak vracia NO (`:579`). Čakajúci `pan` tak scrollovanie zablokoval,
 *    a keďže sám nesmel začať (bod 1), nepohnulo sa nič.
 *
 * Oprava neladí nastavenia — ODSTRAŇUJE oba súboje. Žiadny `ScrollView`:
 * pás fotiek posúva jedno jediné `Gesture.Pan` cez reanimated, takže o ťah
 * sa nemá kto biť. Žiadny `Exclusive`: gestá sú `Simultaneous` a dvojťap má
 * `maxDistance`, takže ťah nikoho nečaká a ťahom sa dvojťap nespustí.
 * Rovnaká skladba (`Simultaneous` z pinch + pan + dvojťap) beží v MUTARKu
 * vo `flat-world-map.tsx`, kde funguje.
 *
 * `GestureHandlerRootView` vnútri `Modal`u je ANDROIDÍ polovica opravy, nie
 * príčina toho, čo Rastio videl na iPhone: na iOSe je `GestureHandlerRootView`
 * len obyčajný `View` + kontext (`GestureHandlerRootView.tsx`) a RNGH si
 * modal ošetruje sám (`RNGestureHandlerManager.mm:285`, vetva
 * `RCTFabricModalHostViewController`). Na Androide je to však SKUTOČNÝ
 * natívny komponent a bez neho gestá v modale nefungujú — preto tu je.
 *
 * Rozhodovanie (kedy listovať, kam, kedy zavrieť, meze priblíženej fotky)
 * je v `src/lib/gallery-gesture.ts` a overuje ho `scripts/check-gallery.ts`
 * v Node. Vo workletoch tu ostáva LEN aritmetika posunu — schválne, aby
 * neexistovala logika, ktorá sa dá overiť iba prstom na telefóne.
 *
 * OTA: nový natívny modul NEPRIBUDOL. `react-native-gesture-handler` (2.32),
 * `react-native-reanimated` (4.5.1) aj `react-native-worklets` (0.10.1) sú
 * v `package.json` dávno pred buildom #5, teda skompilované v binárke.
 * `package.json` sa nedotýkam (§9).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './icon';
import { PhotoBadge } from './ui';
import { useTranslation } from '@/i18n';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import {
  AXIS_LOCK,
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  RUBBER_BAND,
  TAP_SLOP,
  clamp,
  nextIndex,
  shouldClose,
} from '@/lib/gallery-gesture';

export type LightboxPhoto = { id: string; url: string };

/** Os ťahu na strane UI vlákna: 0 = nerozhodnuté, 1 = do strán, 2 = dole. */
const AXIS_NONE = 0;
const AXIS_X = 1;
const AXIS_Y = 2;

/**
 * Jedna fotka v páse. Priblíženie sa vykresľuje len na PRÁVE pozeranej
 * fotke — ostatné držia identitu, takže odlistovaním sa zoom nededí.
 */
function GalleryPage({
  uri,
  width,
  height,
  index,
  page,
  scale,
  zx,
  zy,
}: {
  uri: string;
  width: number;
  height: number;
  index: number;
  page: SharedValue<number>;
  scale: SharedValue<number>;
  zx: SharedValue<number>;
  zy: SharedValue<number>;
}) {
  const animated = useAnimatedStyle(() => {
    const active = page.value === index;
    return {
      transform: [
        { translateX: active ? zx.value : 0 },
        { translateY: active ? zy.value : 0 },
        { scale: active ? scale.value : 1 },
      ],
    };
  });

  return (
    <Animated.View style={[{ width, height }, styles.page, animated]}>
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="contain"
        transition={140}
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

export function PhotoLightbox({
  visible,
  photos,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const count = photos.length;
  const last = Math.max(count - 1, 0);

  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  // Index potrebujú aj obsluhy gest, ktoré nesmú závisieť od prekreslenia.
  const indexRef = useRef(initialIndex);

  const stripX = useSharedValue(-initialIndex * width);
  const dragY = useSharedValue(0);
  const page = useSharedValue(initialIndex);
  const axis = useSharedValue(AXIS_NONE);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const zx = useSharedValue(0);
  const zy = useSharedValue(0);
  const savedZx = useSharedValue(0);
  const savedZy = useSharedValue(0);

  /** Zruší priblíženie okamžite, bez animácie (otvorenie, prechod na inú fotku). */
  const dropZoom = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    zx.value = 0;
    zy.value = 0;
    savedZx.value = 0;
    savedZy.value = 0;
    setZoomed(false);
  }, [savedScale, savedZx, savedZy, scale, zx, zy]);

  // Otvorenie musí začať na tej fotke, ktorú človek práve pozeral v hero
  // galérii — nie od prvej. `visible` v závislostiach preto, že komponent
  // pri zatvorení nezaniká, len sa skryje.
  useEffect(() => {
    if (!visible) return;
    const start = clamp(initialIndex, 0, last);
    setIndex(start);
    indexRef.current = start;
    page.value = start;
    stripX.value = -start * width;
    dragY.value = 0;
    dropZoom();
  }, [visible, initialIndex, width, last, dropZoom, dragY, page, stripX]);

  /** Dolistuje pás na `next` a ohlási novú fotku počítadlu. */
  const settle = useCallback(
    (next: number) => {
      const target = clamp(next, 0, last);
      if (target !== indexRef.current) {
        indexRef.current = target;
        page.value = target;
        setIndex(target);
        dropZoom();
        console.log(`[GALÉRIA] Fotka ${target + 1}/${count}`);
      }
      stripX.value = withTiming(-target * width, { duration: 200 });
    },
    [count, last, width, dropZoom, page, stripX],
  );

  const endHorizontal = useCallback(
    (translationX: number, velocityX: number) => {
      settle(nextIndex({ index: indexRef.current, count, width, translationX, velocityX }));
    },
    [count, width, settle],
  );

  const endVertical = useCallback(
    (translationY: number, velocityY: number) => {
      if (shouldClose({ translationY, velocityY })) {
        console.log('[GALÉRIA] Zatváram potiahnutím dole');
        dragY.value = 0;
        onClose();
        return;
      }
      dragY.value = withTiming(0, { duration: 180 });
    },
    [dragY, onClose],
  );

  /** Prerušené gesto nesmie nechať pás v polovici — vráti ho na miesto. */
  const snapBack = useCallback(() => {
    stripX.value = withTiming(-indexRef.current * width, { duration: 180 });
    dragY.value = withTiming(0, { duration: 180 });
  }, [dragY, stripX, width]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Priblížená fotka: ten istý ťah ju posúva, nelistuje ani nezatvára.
      if (savedScale.value > 1) {
        const limitX = Math.max(0, (width * scale.value - width) / 2);
        const limitY = Math.max(0, (height * scale.value - height) / 2);
        zx.value = Math.min(Math.max(savedZx.value + e.translationX, -limitX), limitX);
        zy.value = Math.min(Math.max(savedZy.value + e.translationY, -limitY), limitY);
        return;
      }

      // Os sa zamkne až keď je jasné, kam prst ide — inak by každý ťah
      // trhal do strán aj dole naraz.
      if (axis.value === AXIS_NONE) {
        if (Math.abs(e.translationX) < AXIS_LOCK && Math.abs(e.translationY) < AXIS_LOCK) return;
        axis.value = Math.abs(e.translationX) >= Math.abs(e.translationY) ? AXIS_X : AXIS_Y;
      }

      if (axis.value === AXIS_X) {
        const raw = -page.value * width + e.translationX;
        const min = -last * width;
        stripX.value =
          raw > 0 ? raw * RUBBER_BAND : raw < min ? min + (raw - min) * RUBBER_BAND : raw;
      } else if (e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedZx.value = zx.value;
        savedZy.value = zy.value;
        return;
      }
      const decided = axis.value;
      if (decided === AXIS_Y) runOnJS(endVertical)(e.translationY, e.velocityY);
      else if (decided === AXIS_X) runOnJS(endHorizontal)(e.translationX, e.velocityX);
    })
    .onFinalize((_e, success) => {
      // Zrušené gesto (napr. prišiel telefonát) nesmie nechať pás nakrivo.
      if (!success && axis.value !== AXIS_NONE && savedScale.value <= 1) runOnJS(snapBack)();
      axis.value = AXIS_NONE;
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withTiming(1, { duration: 140 });
        savedScale.value = 1;
        zx.value = withTiming(0, { duration: 140 });
        zy.value = withTiming(0, { duration: 140 });
        savedZx.value = 0;
        savedZy.value = 0;
        runOnJS(setZoomed)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setZoomed)(true);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    // ⛔ NEODSTRAŇOVAŤ `maxDistance`: bez neho dvojťap na pohyb prsta
    // NEZLYHÁ (`RNTapHandler.m` má maxDelta ako NAN) a dva rýchle šmyky za
    // sebou by sa vyhodnotili ako dvojťap — fotka by pri listovaní skákala
    // do priblíženia.
    .maxDistance(TAP_SLOP)
    .onEnd(() => {
      if (savedScale.value > 1) {
        scale.value = withTiming(1, { duration: 160 });
        savedScale.value = 1;
        zx.value = withTiming(0, { duration: 160 });
        zy.value = withTiming(0, { duration: 160 });
        savedZx.value = 0;
        savedZy.value = 0;
        runOnJS(setZoomed)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 180 });
        // Hneď, nie až po animácii — `pan` sa podľa toho rozhoduje.
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(setZoomed)(true);
      }
    });

  // Presne tá skladba, ktorá v MUTARKu funguje. `Simultaneous` (nie
  // `Exclusive`) zámerne: `Exclusive` nechá pan čakať, kým zlyhá dvojťap,
  // a ťah tak pôsobí neochotne.
  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stripX.value }, { translateY: dragY.value }],
    // Pri ťahaní dole fotka bledne — je vidieť, že sa zatvára, ešte pred
    // pustením prsta.
    opacity: 1 - Math.min(dragY.value / 520, 0.55),
  }));

  if (count === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      // Na Androide musí prehliadač ísť aj pod stavovú lištu, inak je fotka
      // odseknutá; `onRequestClose` obsluhuje systémové tlačidlo Späť.
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}>
      {/* ⛔ NEODSTRAŇOVAŤ: bez tohto sú VŠETKY gestá vnútri Modalu mŕtve a
          nič to nenahlási (viď hlavička súboru). */}
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <GestureDetector gesture={composed}>
            {/* `collapsable={false}`: Android inak zoskupovací View zruší a
                gesto by nemalo na čom sedieť. */}
            <View style={StyleSheet.absoluteFill} collapsable={false}>
              <Animated.View
                style={[styles.strip, { width: width * count, height }, stripStyle]}>
                {photos.map((p, i) => (
                  <GalleryPage
                    key={p.id}
                    uri={p.url}
                    width={width}
                    height={height}
                    index={i}
                    page={page}
                    scale={scale}
                    zx={zx}
                    zy={zy}
                  />
                ))}
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Zatvorenie — X vždy na tom istom mieste. Potiahnutie dole je
              druhá cesta; X je tá, na ktorú sa dá spoľahnúť. Zámerne MIMO
              `GestureDetector`, aby oň ťah nemohol prísť. */}
          <Pressable
            onPress={onClose}
            hitSlop={16}
            style={[styles.close, { top: insets.top + Spacing.sm }]}
            accessibilityRole="button"
            accessibilityLabel={t('photoLightbox.closePhoto')}>
            <Icon name="xmark" size={20} color="#FFFFFF" weight="semibold" />
          </Pressable>

          {count > 1 ? (
            <View style={[styles.counter, { bottom: insets.bottom + Spacing.xl }]}>
              <PhotoBadge text={`${index + 1}/${count}`} />
            </View>
          ) : null}

          {/* Nápoveda smie sľubovať LEN to, čo naozaj funguje (Rastio,
              17.8.2026 — appka predtým sľubovala gestá, ktoré nerobili nič). */}
          {!zoomed ? (
            <Text style={[styles.hint, { bottom: insets.bottom + Spacing.sm }]}>
              {count > 1 ? t('photoLightbox.hintSwipe') : ''}{t('photoLightbox.hintRest')}
            </Text>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Čierna je tu zámerne mimo palety: fullscreen prehliadač fotiek je
  // jediné miesto v appke, kde má byť plocha neutrálne čierna v OBOCH
  // režimoch, aby nefarbila fotku. Nie je to obchádzka §5 — je to vedomá
  // výnimka pre zobrazenie fotografie.
  backdrop: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  strip: { flexDirection: 'row' },
  page: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: { position: 'absolute', right: Spacing.md },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.62)',
    ...Type.caption,
    fontWeight: Weight.medium,
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const } : null),
  },
});
