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
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { tickUndo } from '@/lib/undo-countdown';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

export type ToastTone = 'success' | 'info' | 'warning';

type ToastState = { text: string; tone: ToastTone } | null;

/**
 * UNDO OKNO (Rastio, 14.8.2026) — po nezvratnej akcii (Odmietnuť ponuku,
 * Zmazať inzerát, Zablokovať používateľa) appka NEVOLÁ server hneď.
 * Zobrazí sa odpočet s tlačidlom „Zrušiť"; server sa dotkne až keď
 * odpočet dobehne. Chráni pred preklikom na tlačidlách blízko seba.
 *
 * Rovnaký provider ako obyčajný toast (nie druhý systém na to isté) —
 * len ďalšia funkcia v tom istom kontexte, aby existoval jeden vizuálny
 * vzor spätnej väzby, nie dva vedľa seba.
 */
type UndoState = { text: string; secondsLeft: number } | null;

type ToastApi = {
  show: (text: string, tone?: ToastTone) => void;
  confirmWithUndo: (text: string, commit: () => void | Promise<void>, opts?: { seconds?: number }) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

/** Ako dlho toast visí. Dosť na prečítanie štyroch slov, nie viac. */
const SHOW_MS = 2600;

/** Predvolená dĺžka undo okna — bežný „undo" vzor (5 s, ako Gmail/Files). */
const UNDO_SECONDS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const [undo, setUndo] = useState<UndoState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoCommit = useRef<(() => void | Promise<void>) | null>(null);
  const palette = useTheme();
  const { t } = useTranslation();
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

  const finishUndo = useCallback(() => {
    if (undoTimer.current) clearInterval(undoTimer.current);
    undoTimer.current = null;
    const commit = undoCommit.current;
    undoCommit.current = null;
    Animated.timing(undoOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() =>
      setUndo(null)
    );
    return commit;
  }, [undoOpacity]);

  /** Odpočet dobehol — akcia sa naozaj vykoná. */
  const commitUndo = useCallback(() => {
    const commit = finishUndo();
    void commit?.();
  }, [finishUndo]);

  /** Ťuknutie na „Zrušiť" — akcia sa NIKDY nevykoná. */
  const cancelUndo = useCallback(() => {
    finishUndo();
  }, [finishUndo]);

  const confirmWithUndo = useCallback(
    (text: string, commit: () => void | Promise<void>, opts?: { seconds?: number }) => {
      // Druhé undo okno pred dobehnutím prvého: predošlú akciu dokonči
      // hneď — dva bežiace odpočty naraz by boli mätúce (ktoré „Zrušiť"
      // zruší ktorú akciu?).
      if (undoTimer.current) commitUndo();
      const seconds = opts?.seconds ?? UNDO_SECONDS;
      undoCommit.current = commit;
      setUndo({ text, secondsLeft: seconds });
      Animated.timing(undoOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      undoTimer.current = setInterval(() => {
        setUndo((prev) => {
          if (!prev) return prev;
          const next = tickUndo(prev.secondsLeft);
          if (next.done) {
            // Mimo `setState` updateru by druhé volanie počas tej istej
            // vlny tikov pretieklo do nekonečného cyklu — commitUndo si
            // ide radšej po `undoTimer.current` samo.
            setTimeout(commitUndo, 0);
            return prev;
          }
          return { ...prev, secondsLeft: next.secondsLeft };
        });
      }, 1000);
    },
    [commitUndo, undoOpacity]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (undoTimer.current) clearInterval(undoTimer.current);
    },
    []
  );

  const border =
    toast?.tone === 'warning' ? palette.warning : toast?.tone === 'info' ? palette.secondary : palette.success;

  const api: ToastApi = { show, confirmWithUndo };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {undo ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { bottom: Spacing.lg + insets.bottom, opacity: undoOpacity }]}>
          <View
            style={[
              styles.toast,
              styles.undoRow,
              Shadow.card,
              { backgroundColor: palette.surface, borderColor: palette.warning },
            ]}>
            <Text style={[styles.text, styles.undoText, { color: palette.textPrimary }]}>
              {undo.text}
            </Text>
            <Pressable
              onPress={cancelUndo}
              accessibilityRole="button"
              accessibilityLabel={t('toast.cancelAccessibility', { seconds: undo.secondsLeft })}
              hitSlop={8}>
              <Text style={[styles.undoAction, { color: palette.warning }]}>
                {t('toast.cancelWithSeconds', { seconds: undo.secondsLeft })}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : toast ? (
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
 * `toast('Ponuka odoslaná')`.
 *
 * Bez providera vráti funkciu, ktorá správu aspoň zaloguje — obrazovka
 * v teste tak nespadne a správa sa nestratí bez stopy.
 */
export function useToast(): (text: string, tone?: ToastTone) => void {
  const ctx = useContext(ToastCtx);
  return ctx?.show ?? ((text: string) => console.log(`[TOAST bez providera] ${text}`));
}

/**
 * `confirmWithUndo('Ponuka odmietnutá', () => skutočnaAkcia())`.
 *
 * Bez providera vykoná akciu OKAMŽITE (bez okna) — nikdy nesmie tichšie
 * zmiznúť len preto, že chýba provider (CLAUDE.md §2).
 */
export function useUndoToast(): (
  text: string,
  commit: () => void | Promise<void>,
  opts?: { seconds?: number }
) => void {
  const ctx = useContext(ToastCtx);
  return (
    ctx?.confirmWithUndo ??
    ((text: string, commit: () => void | Promise<void>) => {
      console.log(`[UNDO bez providera, vykonávam hneď] ${text}`);
      void commit();
    })
  );
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
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  undoText: { flexShrink: 1, textAlign: 'left' },
  undoAction: { ...Type.bodyMd, fontWeight: Weight.bold },
});
