import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileProvider, useProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
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

  // Splash sa smie skryť až keď vieme, kam patríme — inak by na okamih
  // preblikla nesprávna obrazovka.
  //
  // POZOR (chyba nájdená 7.8.2026 pred prvým buildom): `preventAutoHideAsync`
  // bez zodpovedajúceho `hideAsync` znamená, že appka **navždy ostane na
  // splash screene**. V Metro bundli sa to neprejaví — bundle sa zostaví
  // rovnako. Prejavilo by sa to až na zariadení ako „appka sa nespustí".
  useEffect(() => {
    if (session === undefined) return;
    SplashScreen.hideAsync().catch((e: unknown) => {
      console.log(`[APP] Skrytie splash screenu zlyhalo: ${String(e)}`);
    });
  }, [session]);

  // FÁZA 2 — brána má teraz dva stupne: session, a potom prezývka.
  // Bez prezývky sa nedá inzerovať ani ponúkať (v DB to drží cudzí kľúč na
  // `offerra.profile`), takže je to podmienka vstupu, nie odporúčanie.
  const { profile } = useProfile();

  useEffect(() => {
    if (session === undefined) return; // ešte nevieme
    if (session && profile === undefined) return; // profil sa ešte načítava

    // Zámerne sa pýtame „sme na logine?", nie „sme v taboch?". Pri
    // skupinovej route `(tabs)` nie je zaručené, ako presne vyzerá
    // `segments[0]` pre úvodnú obrazovku — `login` je jednoznačné a
    // nemôže z toho vzniknúť cyklus presmerovaní.
    const onLogin = segments[0] === 'login';
    const onNickname = segments[0] === 'prezyvka';

    if (!session) {
      if (!onLogin) router.replace('/login');
    } else if (!profile) {
      if (!onNickname) router.replace('/prezyvka');
    } else if (onLogin || onNickname) {
      router.replace('/(tabs)');
    }
  }, [session, profile, segments, router]);

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
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
