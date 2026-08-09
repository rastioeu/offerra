import { Image } from 'expo-image';
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

import { Logo } from '@/components/logo';
import { useTheme } from '@/hooks/use-theme';
import { demoEmail, isDemoConfigured, signInWithApple, signInWithDemo, signInWithEmail, signInWithGoogle, type AuthResult } from '@/lib/auth';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

/** Koľko ťuknutí na logo odomkne skrytý e-mail/heslo formulár (ako MUTARK). */
const TAPS_TO_UNLOCK = 5;

/**
 * FÁZA 0 — prihlásenie.
 *
 * Apple a Google sú tu kvôli **overeniu totožnosti**: pri nehnuteľnostiach
 * (prenájom aj predaj, z oboch strán) má za inzerátom stáť skutočný človek.
 * Preto sú to jediné dve viditeľné cesty a e-mail/heslo je skryté.
 */
export default function LoginScreen() {
  const palette = useTheme();
  const [busy, setBusy] = useState<null | 'apple' | 'google' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);

  const [taps, setTaps] = useState(0);
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleResult(result: AuthResult) {
    if (result.ok === true) {
      // Presmerovanie robí brána v `_layout.tsx` podľa session —
      // `busy` ostáva, kým obrazovka zmizne.
      return;
    }
    if (result.ok === 'canceled') {
      setBusy(null); // ticho, používateľ to prerušil sám
      return;
    }
    // CLAUDE.md §2 — chyba sa MUSÍ dostať k používateľovi.
    setError(result.message);
    setBusy(null);
  }

  async function run(kind: 'apple' | 'google', fn: () => Promise<AuthResult>) {
    if (busy) return;
    setBusy(kind);
    setError(null);
    handleResult(await fn());
  }

  /**
   * Jedno ťuknutie = recenzent je dnu. Presne ako MUTARK — bez toho by
   * sa do appky nedostal, lebo Offerra pustí len cez Apple/Google
   * a review zariadenie ani jeden účet naviazaný nemá.
   */
  async function handleDemoSubmit() {
    if (busy) return;
    setBusy('email');
    setError(null);
    handleResult(await signInWithDemo());
  }

  async function handleEmailSubmit() {
    if (busy) return;
    setBusy('email');
    setError(null);
    handleResult(await signInWithEmail(email, password));
  }

  function handleLogoTap() {
    if (emailUnlocked) return;
    const next = taps + 1;
    setTaps(next);
    if (next >= TAPS_TO_UNLOCK) {
      setEmailUnlocked(true);
      // E-mail demo účtu tajný nie je — predvyplníme ho, nech recenzent
      // prepisuje len heslo z review notes (ak by nešlo tlačidlo nižšie).
      if (!email) setEmail(demoEmail());
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      {/* Na iOS podkladá obsah `automaticallyAdjustKeyboardInsets` nižšie —
          `KeyboardAvoidingView` by to spravil DRUHÝKRÁT a obsah by vyskočil
          privysoko. Ostáva len pre Android. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          <Pressable onPress={handleLogoTap} style={styles.header} accessibilityRole="header">
            {/* Ten istý komponent ako v hlavičke — vrátane tmavého variantu
                a glow. Prihlasovacia obrazovka bola JEDINÉ miesto, kde sa
                wordmark vkladal natvrdo, a presne tam by tmavý variant
                chýbal. */}
            <Logo width={200} height={50} />
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Nehnuteľnosti na predaj aj prenájom
            </Text>
          </Pressable>

          <View style={styles.actions}>
            <Text style={[styles.why, { color: palette.textSecondary }]}>
              Prihlás sa cez Apple alebo Google — overený účet znamená, že za
              každým inzerátom stojí skutočný človek.
            </Text>

            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => run('apple', signInWithApple)}
                disabled={busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: palette.textPrimary,
                    opacity: busy !== null ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}>
                {busy === 'apple' ? (
                  <ActivityIndicator color={palette.background} />
                ) : (
                  <Text style={[styles.buttonText, { color: palette.background }]}>
                     Pokračovať cez Apple
                  </Text>
                )}
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => run('google', signInWithGoogle)}
              disabled={busy !== null}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                styles.buttonOutline,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  opacity: busy !== null ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}>
              {busy === 'google' ? (
                <ActivityIndicator color={palette.textPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: palette.textPrimary }]}>
                  Pokračovať cez Google
                </Text>
              )}
            </Pressable>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.surface, borderColor: palette.danger },
                ]}>
                <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
              </View>
            ) : null}

            {emailUnlocked ? (
              <View style={[styles.hidden, { borderTopColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.textMuted }]}>
                  Prístup pre recenziu App Store
                </Text>

                {isDemoConfigured() ? (
                  <Pressable
                    onPress={handleDemoSubmit}
                    disabled={busy !== null}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.button,
                      {
                        backgroundColor: palette.accentDeep,
                        opacity: busy !== null ? 0.5 : pressed ? 0.9 : 1,
                      },
                    ]}>
                    <Text style={[styles.buttonText, { color: palette.onPrimary }]}>
                      {busy === 'email' ? 'Prihlasujem…' : 'Prihlásiť sa ako recenzent'}
                    </Text>
                  </Pressable>
                ) : null}

                <Text style={[styles.label, { color: palette.textMuted }]}>
                  alebo ručne e-mailom
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e-mail"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={busy === null}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    },
                  ]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="heslo"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={busy === null}
                  onSubmitEditing={handleEmailSubmit}
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
                <Pressable
                  onPress={handleEmailSubmit}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonOutline,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.primary,
                      opacity: busy !== null ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}>
                  {busy === 'email' ? (
                    <ActivityIndicator color={palette.primary} />
                  ) : (
                    <Text style={[styles.buttonText, { color: palette.primary }]}>Prihlásiť sa</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
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
  wordmark: { width: 232, height: 64 },
  subtitle: { ...Type.bodyMd, textAlign: 'center' },
  actions: { gap: Spacing.sm },
  why: { ...Type.small, textAlign: 'center', marginBottom: Spacing.md },
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonOutline: { borderWidth: 1 },
  buttonText: { ...Type.button, fontWeight: Weight.semibold },
  errorBox: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  errorText: { ...Type.small },
  hidden: {
    borderTopWidth: 1,
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  label: { ...Type.caption, fontWeight: Weight.semibold },
  input: {
    ...Type.button,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
