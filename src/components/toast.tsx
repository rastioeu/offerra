/**
 * Krátka spätná väzba po akcii — jeden vzor na celú appku.
 *
 * PRAVIDLO, KTORÉ TÝM VZNIKÁ (Rastio, 9.8.2026):
 *
 *  - **Toast** = akcia PREBEHLA. Krátke, samo zmizne, nič nepýta.
 *    „Ponuka odoslaná", „Pridané do obľúbených", „Nahlásenie prijaté".
 *  - **Alert** ostáva na dve veci: POTVRDENIE pred nezvratným krokom
 *    („Zmazať účet?") a CHYBU, ktorú si musí človek prečítať celú.
 *
 * Prečo nie Alert aj na úspech: modálne okno s tlačidlom OK zastaví
 * človeka uprostred práce kvôli správe, ktorú netreba odklikávať. Pri
 * srdiečku alebo uložení filtra je to trest za používanie appky.
 *
 * Prečo provider a nie komponent na každej obrazovke: to isté rozhodnutie
 * na N miestach je presne trieda chyby, ktorá nás tu už stála zvonček
 * (7.15) aj chybové hlášky (7.18).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

export type ToastTone = 'success' | 'info' | 'warning';

type ToastState = { text: string; tone: ToastTone } | null;

const ToastCtx = createContext<((text: string, tone?: ToastTone) => void) | null>(null);

/** Ako dlho toast visí. Dosť na prečítanie štyroch slov, nie viac. */
const SHOW_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palette = useTheme();
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() =>
      setToast(null)
    );
  }, [opacity]);

  const show = useCallback(
    (text: string, tone: ToastTone = 'success') => {
      // Druhý toast NAHRADÍ prvý. Fronta by znamenala, že človek čaká na
      // správu o akcii, ktorú spravil pred piatimi sekundami.
      if (timer.current) clearTimeout(timer.current);
      setToast({ text, tone });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, SHOW_MS);
    },
    [opacity, hide]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const border =
    toast?.tone === 'warning' ? palette.warning : toast?.tone === 'info' ? palette.secondary : palette.success;

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { bottom: Spacing.lg + insets.bottom, opacity }]}>
          <Pressable
            onPress={hide}
            accessibilityRole="alert"
            accessibilityLabel={toast.text}
            style={[
              styles.toast,
              Shadow.card,
              { backgroundColor: palette.surface, borderColor: border },
            ]}>
            <Text style={[styles.text, { color: palette.textPrimary }]}>{toast.text}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

/**
 * `show('Ponuka odoslaná')`.
 *
 * Bez providera vráti funkciu, ktorá správu aspoň zaloguje — obrazovka
 * v teste tak nespadne a správa sa nestratí bez stopy.
 */
export function useToast(): (text: string, tone?: ToastTone) => void {
  const ctx = useContext(ToastCtx);
  return ctx ?? ((text: string) => console.log(`[TOAST bez providera] ${text}`));
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.md, right: Spacing.md, alignItems: 'center' },
  toast: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    maxWidth: '100%',
  },
  text: { ...Type.bodyMd, fontWeight: Weight.medium, textAlign: 'center' },
});
