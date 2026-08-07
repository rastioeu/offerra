import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileProvider, useProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { decideRoute } from '@/lib/gate';
import { Colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout — kostra podľa MUTARKu (`GestureHandlerRootView` okolo celej
 * appky kvôli natívnym gestám navigácie + `ThemeProvider`).
 *
 * FÁZA 0 (7.8.2026) — pribudla brána prihlásenia. Bez nej sa nedalo overiť
 * v TestFlight builde, že session zo zdieľaného Auth projektu dorazí do
 * Offerry (zadanie, bod 7).
 */
export default function RootLayout() {
  const { session } = useSession();

  // Profil musí byť JEDEN zdieľaný stav — inak sa brána nedozvie, že si
  // používateľ práve uložil prezývku (chyba nahlásená 7.8.2026).
  return (
    <ProfileProvider userId={session?.user.id}>
      <RootLayoutInner />
    </ProfileProvider>
  );
}

function RootLayoutInner() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = Colors[isDark ? 'dark' : 'light'];
  const { session } = useSession();

  const router = useRouter();
  const segments = useSegments();

  // FÁZA 2 — brána má dva stupne: session, a potom prezývka.
  // Musí byť deklarované PRED efektmi, ktoré ho čítajú.
  const { profile, error: profileError, reload: reloadProfile } = useProfile();

  // Splash sa smie skryť až keď vieme, kam patríme — inak by na okamih
  // preblikla nesprávna obrazovka.
  //
  // POZOR (chyba nájdená 7.8.2026 pred prvým buildom): `preventAutoHideAsync`
  // bez zodpovedajúceho `hideAsync` znamená, že appka **navždy ostane na
  // splash screene**. V Metro bundli sa to neprejaví — bundle sa zostaví
  // rovnako. Prejavilo by sa to až na zariadení ako „appka sa nespustí".
  useEffect(() => {
    if (session === undefined) return;
    // Pri prihlásenom čakáme aj na profil — inak by preblikla nesprávna
    // obrazovka. Ak profil zlyhal (`profileError`), splash SA MUSÍ skryť
    // tiež, inak by appka ostala visieť — tá istá trieda chyby ako 0.17.
    if (session && profile === undefined && !profileError) return;
    SplashScreen.hideAsync().catch((e: unknown) => {
      console.log(`[APP] Skrytie splash screenu zlyhalo: ${String(e)}`);
    });
  }, [session, profile, profileError]);

  // FÁZA 2 — brána má teraz dva stupne: session, a potom prezývka.
  // Bez prezývky sa nedá inzerovať ani ponúkať (v DB to drží cudzí kľúč na
  // `offerra.profile`), takže je to podmienka vstupu, nie odporúčanie.
  useEffect(() => {
    // Rozhodovanie je v `@/lib/gate` ako čistá funkcia — pokryté testom,
    // lebo práve táto logika nás už trikrát stála chybu na zariadení.
    const target = decideRoute({
      session,
      profile,
      segment: segments[0],
      profileError: Boolean(profileError),
    });
    if (target) router.replace(target);
  }, [session, profile, profileError, segments, router]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: palette.background,
      card: palette.surface,
      text: palette.textPrimary,
      border: palette.border,
      primary: palette.primary,
    },
  };

  // Profil sa nepodarilo načítať a používateľ je prihlásený — nesmie
  // skončiť na onboardingu ani na prázdnej obrazovke.
  if (session && profile === undefined && profileError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View style={{ flex: 1, backgroundColor: palette.background, padding: 24, justifyContent: 'center', gap: 12 }}>
            <Text style={{ color: palette.textPrimary, fontSize: 20, fontWeight: '700' }}>
              Nepodarilo sa načítať profil
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>{profileError}</Text>
            <Pressable
              onPress={() => void reloadProfile()}
              accessibilityRole="button"
              style={{ backgroundColor: palette.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: palette.onPrimary, fontSize: 16, fontWeight: '600' }}>Skúsiť znova</Text>
            </Pressable>
          </View>
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="prezyvka" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="nehnutelnost/[id]" />
          <Stack.Screen name="inzerat/[id]" />
          <Stack.Screen name="ponuka/[id]" />
          <Stack.Screen name="ponuky/[id]" />
          <Stack.Screen name="dopyt/novy" />
          <Stack.Screen name="dopyt/[id]" />
          <Stack.Screen name="nastavenia" />
          <Stack.Screen name="novinky" />
          <Stack.Screen name="oznamenia" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
