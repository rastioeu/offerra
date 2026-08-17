/**
 * Fullscreen prehliadač fotiek inzerátu (Rastio, 17.8.2026).
 *
 * Otvára sa DVOMA spôsobmi — ikonou v rohu galérie aj ťapnutím priamo na
 * fotku. Tap je prirodzenejšie gesto, ikona je preto len viditeľná nápoveda,
 * že sa fotka dá zväčšiť; obe vedú na to isté.
 *
 * Počítadlo `n/N` sa NEPÍŠE druhý raz — používa sa `PhotoBadge` z `ui.tsx`,
 * ten istý komponent ako v hero galérii a na karte v katalógu.
 *
 * Prečo `pointerEvents` a nie `scrollEnabled` samotné: kým je fotka
 * priblížená, vodorovné listovanie musí prestať, inak si pinch a paging
 * navzájom kradnú gesto. Preto sa listovanie vypína presne vtedy, keď je
 * `scale > 1`, a zapne sa hneď po vrátení na 1.
 *
 * OTA: nový natívny modul NEPRIBUDOL. `react-native-gesture-handler` (2.32)
 * aj `react-native-reanimated` (4.5.1) sú v `package.json` dávno pred
 * buildom #5, teda skompilované v binárke — presne z toho istého dôvodu, z
 * ktorého idú OTA aj ikony (`icon.tsx`). `package.json` sa nedotýkam (§9).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './icon';
import { PhotoBadge } from './ui';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

/** Na koľko sa fotka priblíži dvojťapom. Pinch nie je ničím obmedzený zdola. */
const DOUBLE_TAP_SCALE = 2.5;
const MAX_SCALE = 5;
/** Ako ďaleko treba potiahnuť dole, aby sa prehliadač zavrel. */
const CLOSE_DRAG = 110;

export type LightboxPhoto = { id: string; url: string };

/**
 * Jedna stránka = jedna fotka s vlastným priblížením. Stav priblíženia je
 * per-fotka, takže odlistovanie na ďalšiu nezdedí zoom predošlej.
 */
function ZoomablePhoto({
  uri,
  width,
  height,
  onZoomChange,
  onRequestClose,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
  onRequestClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const report = useCallback((zoomed: boolean) => onZoomChange(zoomed), [onZoomChange]);

  function reset() {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(report)(false);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.min(Math.max(savedScale.value * e.scale, 0.6), MAX_SCALE);
      scale.value = next;
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset();
      } else {
        savedScale.value = scale.value;
        runOnJS(report)(true);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(report)(true);
      }
    });

  // Posúvanie priblíženej fotky. Pri nepriblíženej fotke slúži ten istý
  // ťah na zatvorenie potiahnutím dole — nemôžu byť aktívne oba naraz,
  // preto to rozhoduje `scale`.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else if (e.translationY > 0) {
        ty.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
        return;
      }
      if (e.translationY > CLOSE_DRAG) {
        runOnJS(onRequestClose)();
        ty.value = withTiming(0);
      } else {
        ty.value = withTiming(0);
      }
    });

  const composed = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[{ width, height }, styles.page, animated]}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="contain"
          transition={140}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </GestureDetector>
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Otvorenie musí začať na tej fotke, ktorú človek práve pozeral v hero
  // galérii — nie od prvej. `visible` v závislostiach preto, že komponent
  // pri zatvorení nezaniká.
  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    setZoomed(false);
    // Bez rámca navyše ScrollView ešte nemá rozmer a skok by sa zahodil.
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, initialIndex, width]);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  if (photos.length === 0) return null;

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
      <View style={styles.backdrop}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          // Kým je fotka priblížená, listovanie sa vypne — inak pinch a
          // paging bojujú o to isté gesto.
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}>
          {photos.map((p) => (
            <ZoomablePhoto
              key={p.id}
              uri={p.url}
              width={width}
              height={height}
              onZoomChange={setZoomed}
              onRequestClose={onClose}
            />
          ))}
        </ScrollView>

        {/* Zatvorenie — X vždy na tom istom mieste. Potiahnutie dole je
            druhá, nepovinná cesta; X je tá, na ktorú sa dá spoľahnúť. */}
        <Pressable
          onPress={onClose}
          hitSlop={16}
          style={[styles.close, { top: insets.top + Spacing.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Zavrieť fotku">
          <Icon name="xmark" size={20} color="#FFFFFF" weight="semibold" />
        </Pressable>

        {photos.length > 1 ? (
          <View style={[styles.counter, { bottom: insets.bottom + Spacing.xl }]}>
            <PhotoBadge text={`${index + 1}/${photos.length}`} />
          </View>
        ) : null}

        {!zoomed ? (
          <Text style={[styles.hint, { bottom: insets.bottom + Spacing.sm }]}>
            {photos.length > 1 ? 'Potiahni do strán · ' : ''}Dvojťap priblíži · Potiahni dole zavrie
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Čierna je tu zámerne mimo palety: fullscreen prehliadač fotiek je
  // jediné miesto v appke, kde má byť plocha neutrálne čierna v OBOCH
  // režimoch, aby nefarbila fotku. Nie je to obchádzka §5 — je to vedomá
  // výnimka pre zobrazenie fotografie.
  backdrop: { flex: 1, backgroundColor: '#000000' },
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
