import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { signInWithEmail } from '@/lib/auth';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

/**
 * FÁZA 0 — prihlásenie e-mailom a heslom.
 *
 * Účel: overiť v TestFlight builde, že session zo zdieľaného Supabase Auth
 * projektu (spoločného s MUTARKom) dorazí do Offerry. Apple/Google login
 * pribudne vo Fáze 1, keď sa v Auth projekte nastavia redirecty pre schému
 * `offerra` — viď komentár v `src/lib/auth.ts`.
 */
export default function LoginScreen() {
  const palette = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await signInWithEmail(email, password);

    if (!result.ok) {
      // CLAUDE.md §2 — chyba sa MUSÍ dostať k používateľovi.
      setError(result.message);
      setBusy(false);
      return;
    }

    // Presmerovanie robí brána v `_layout.tsx` na základe session —
    // netreba tu navigovať ručne. `busy` zostáva true, kým obrazovka zmizne.
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.wordmark, { color: palette.primary }]}>OFFERRA</Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Nehnuteľnosti a dopyty na jednom mieste
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tvoj@email.sk"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              editable={!busy}
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
              ]}
            />

            <Text style={[styles.label, { color: palette.textSecondary }]}>Heslo</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              secureTextEntry
              editable={!busy}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
              ]}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: palette.surface, borderColor: palette.danger }]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: palette.primary,
                  opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}>
              {busy ? (
                <ActivityIndicator color={palette.onPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: palette.onPrimary }]}>Prihlásiť sa</Text>
              )}
            </Pressable>

            <Text style={[styles.note, { color: palette.textMuted }]}>
              Fáza 0 — prihlásenie cez Apple a Google pribudne neskôr.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xxl },
  wordmark: { ...Type.hero, fontWeight: Weight.bold, letterSpacing: 4 },
  subtitle: { ...Type.bodyMd, textAlign: 'center' },
  form: { gap: Spacing.sm },
  label: { ...Type.caption, fontWeight: Weight.semibold, marginTop: Spacing.sm },
  input: {
    ...Type.button,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  errorText: { ...Type.small },
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    minHeight: 50,
  },
  buttonText: { ...Type.button, fontWeight: Weight.semibold },
  note: { ...Type.caption, textAlign: 'center', marginTop: Spacing.md },
});
