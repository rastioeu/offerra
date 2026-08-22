/**
 * Náhľad a rýchle akcie po PODRŽANÍ PRSTU (zadanie Rastio, bod 12; mockup
 * „Dôveryhodne teplá", obrazovka 5).
 *
 * Ťuknutie otvorí detail, podržanie ukáže náhľad karty a tri akcie. Celá
 * karta je cieľ — žiadne malé hotspoty, ktoré treba trafiť.
 *
 * ČO TO POTREBUJE A ČO NIE (overené pred implementáciou, ako si žiadal):
 *
 * | Časť | Modul | Stav |
 * |---|---|---|
 * | menu samotné | žiadny — `Modal` + `Animated` z RN | ide OTA |
 * | haptika | `expo-haptics` | je v builde #3 |
 * | ikony | `expo-symbols` | je v builde #3 |
 * | rozmazané pozadie | `expo-blur` | **pribudlo do buildu #4** |
 *
 * `expo-blur` sa načítava cez `require()` v try/catch: na staršom builde
 * modul chýba a pozadie sa len STMAVÍ namiesto rozmazania. Rozmazanie je
 * kozmetika — nesmie kvôli nej spadnúť obrazovka. Rovnaký vzor má MUTARK.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

import { Icon, type IconName } from './icon';

export type LongPressAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Červená položka (nahlásenie, mazanie). */
  destructive?: boolean;
};

/** Jemný impulz pri aktivovaní. Keď modul chýba, ticho sa preskočí. */
export function tapFeedback() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptika je príjemnosť, nie funkcia — jej absencia sa nehlási.
  }
}

export function LongPressMenu({
  open,
  onClose,
  preview,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  /** Náhľad podržanej veci — tá istá karta, len bez tieňa okolia. */
  preview: ReactNode;
  actions: LongPressAction[];
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [open, anim]);

  // Rozmazanie je nepovinné — bez modulu ostane samotné stmavenie.
  let Blur: React.ComponentType<Record<string, unknown>> | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Blur = require('expo-blur').BlurView;
  } catch {
    Blur = null;
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      {/* Ťuknutie kamkoľvek mimo menu ho zavrie — vrátane rozmazanej plochy. */}
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={t('ui.closePreview')}>
        {Blur ? (
          <Blur intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} />

        <Animated.View
          style={[
            styles.stack,
            {
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            },
          ]}>
          {/* `pointerEvents="none"` — náhľad je obrázok, nie ovládač.
              Bez toho by ťuknutie na kartu v náhľade otvorilo detail. */}
          <View style={styles.preview} pointerEvents="none">
            {preview}
          </View>

          <View style={[styles.menu, Shadow.card, { backgroundColor: palette.surface }]}>
            {actions.map((a, i) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.item,
                  i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border } : null,
                  { backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                ]}>
                <Text
                  style={[
                    styles.itemText,
                    { color: a.destructive ? palette.danger : palette.textPrimary },
                  ]}>
                  {a.label}
                </Text>
                <Icon
                  name={a.icon}
                  size={20}
                  color={a.destructive ? palette.danger : palette.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  stack: { width: '88%', gap: Spacing.md },
  preview: { borderRadius: Radius.lg, overflow: 'hidden' },
  menu: { borderRadius: Radius.md, overflow: 'hidden' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  itemText: { ...Type.bodyLg, fontWeight: Weight.semibold },
});
