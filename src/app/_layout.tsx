import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
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

  useEffect(() => {
    if (session === undefined) return; // ešte nevieme

    // Zámerne sa pýtame „sme na logine?", nie „sme v taboch?". Pri
    // skupinovej route `(tabs)` nie je zaručené, ako presne vyzerá
    // `segments[0]` pre úvodnú obrazovku — `login` je jednoznačné a
    // nemôže z toho vzniknúť cyklus presmerovaní.
    const onLogin = segments[0] === 'login';

    if (!session && !onLogin) {
      router.replace('/login');
    } else if (session && onLogin) {
      router.replace('/(tabs)');
    }
  }, [session, segments, router]);

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
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
