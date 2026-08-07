/**
 * Zdieľané UI prvky. Žiadna vlastná farba ani `fontSize` — všetko z
 * `@/theme/tokens` (CLAUDE.md §5).
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

export function Label({ children, hint }: { children: string; hint?: string }) {
  const palette = useTheme();
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{children}</Text>
      {hint ? <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  const palette = useTheme();
  return (
    <View style={styles.group}>
      <Label hint={hint}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          {
            backgroundColor: palette.surface,
            borderColor: palette.borderStrong,
            color: palette.textPrimary,
          },
        ]}
      />
    </View>
  );
}

/** Segmentovaný prepínač — pre 2–5 možností je čitateľnejší než rozbaľovačka. */
export function ChoiceRow<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const palette = useTheme();
  return (
    <View style={styles.group}>
      <Label hint={hint}>{label}</Label>
      <View style={styles.choices}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: active ? palette.primary : palette.surface,
                  borderColor: active ? palette.primary : palette.borderStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.choiceText,
                  { color: active ? palette.onPrimary : palette.textPrimary },
                ]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Stlačenie sa má cítiť, nie len zosvetliť. `Animated` je súčasť React
 * Native — žiadny nový natívny modul. (Haptika by ho vyžadovala, viď
 * poznámka v registri.)
 */
export function Pressable3D({
  onPress,
  disabled,
  children,
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
  /** Ukáže spinner V tlačidle — nie len zmenu textu. */
  loading?: boolean;
}) {
  const palette = useTheme();
  const filled = variant === 'primary';
  const tint = variant === 'danger' ? palette.danger : palette.primary;
  const off = disabled || loading;

  return (
    <Pressable3D onPress={onPress} disabled={off} accessibilityLabel={title}>
      <View
        style={[
          styles.button,
          filled ? Shadow.button : null,
          {
            backgroundColor: filled ? tint : 'transparent',
            borderColor: tint,
            opacity: off ? 0.5 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={filled ? palette.onPrimary : tint} />
        ) : (
          <Text style={[styles.buttonText, { color: filled ? palette.onPrimary : tint }]}>{title}</Text>
        )}
      </View>
    </Pressable3D>
  );
}

/**
 * Pulzujúci placeholder namiesto holého krúžku — používateľ vidí TVAR
 * toho, čo sa načítava. Vzor prevzatý z MUTARK `src/ui/Skeleton.tsx`.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const palette = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: palette.border, borderRadius: Radius.sm, opacity }, style]} />;
}

/** Kostra karty v katalógu — má rovnaké rozmery ako skutočná karta. */
export function PropertyCardSkeleton() {
  const palette = useTheme();
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Skeleton style={{ height: 190, borderRadius: 0 }} />
      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
        <Skeleton style={{ height: 18, width: '75%' }} />
        <Skeleton style={{ height: 13, width: '50%' }} />
        <Skeleton style={{ height: 22, width: '40%', marginTop: Spacing.xs }} />
      </View>
    </View>
  );
}

/** Nadpis sekcie — bol rozkopírovaný v ôsmich súboroch, teraz je na jednom. */
export function SectionLabel({ children }: { children: string }) {
  const palette = useTheme();
  return <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>{children}</Text>;
}

/** Riadok „štítok — hodnota". Rovnaká vec bola štyrikrát skopírovaná. */
export function Row({ label, value }: { label: string; value: string }) {
  const palette = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'accent' | 'warning' }) {
  const palette = useTheme();
  const bg =
    tone === 'accent' ? palette.secondary : tone === 'warning' ? palette.warning : palette.surfacePressed;
  const fg = tone === 'neutral' ? palette.textSecondary : palette.onPrimary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

/**
 * Chybová hláška. Existuje preto, aby sa chyba dala zobraziť VŽDY —
 * CLAUDE.md §2 zakazuje tichý catch.
 */
export function ErrorNote({ error }: { error: string | null }) {
  const palette = useTheme();
  if (!error) return null;
  return (
    <View style={[styles.error, { borderColor: palette.danger, backgroundColor: palette.surface }]}>
      <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const palette = useTheme();
  // Tieň tu CHÝBAL — karta bola plochá oproti karte v katalógu, ktorá ho
  // mala. To je časť toho „plochého dizajnu bez hĺbky" (Rastio, 7.8.2026).
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  labelWrap: { gap: 2 },
  label: { ...Type.caption, fontWeight: Weight.semibold, letterSpacing: 0.4 },
  hint: { ...Type.caption },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Type.bodyLg,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  choiceText: { ...Type.bodyMd, fontWeight: Weight.medium },
  button: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonText: { ...Type.button, fontWeight: Weight.semibold },
  badge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { ...Type.caption, fontWeight: Weight.semibold, letterSpacing: 0.3 },
  error: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { ...Type.bodyMd, fontWeight: Weight.medium },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
});
