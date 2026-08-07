/**
 * Zdieľané UI prvky. Žiadna vlastná farba ani `fontSize` — všetko z
 * `@/theme/tokens` (CLAUDE.md §5).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

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

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
}) {
  const palette = useTheme();
  const filled = variant === 'primary';
  const tint = variant === 'danger' ? palette.danger : palette.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? tint : 'transparent',
          borderColor: tint,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      <Text style={[styles.buttonText, { color: filled ? palette.onPrimary : tint }]}>{title}</Text>
    </Pressable>
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
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
});
