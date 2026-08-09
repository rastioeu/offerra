import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ToastProvider } from '@/components/toast';
import { NotificationsProvider } from '@/hooks/use-notifications';
import { ThemeProvider as AppThemeProvider, useThemeMode } from '@/hooks/use-theme';
import { ProfileProvider, useProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { decideRoute } from '@/lib/gate';
import { Colors } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

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
  //
  // `SafeAreaProvider` je tu ZÁMERNE na najvyššom mieste. Doteraz ho dodávala
  // len navigácia svojim obrazovkám; `useSafeAreaInsets` v hlavičke (bezpečná
  // zóna pod dynamic islandom) ho ale potrebuje vždy a všade.
  // `ErrorBoundary` je NAJVYŠŠIE: bez neho React pri chybe odmontuje celý
  // strom a ostane biela obrazovka bez slova — presne to „nestane sa nič",
  // ktoré CLAUDE.md §2 zakazuje. Takto je na obrazovke celá surová chyba.
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {/* Vzhľad je NAJVYŠŠIE hneď po bezpečnej zóne: appka sa doteraz
            riadila výhradne systémovou témou a kto mal tmavý telefón,
            nemal sa ako vrátiť na schválenú svetlú (Rastio, 8.8.2026). */}
        <AppThemeProvider>
        {/* Spätná väzba po akcii je JEDNA na celú appku — inak by mala
            každá obrazovka vlastný štýl a niektoré žiadny (Rastio, 9.8.2026). */}
        <ToastProvider>
        <ProfileProvider userId={session?.user.id}>
          {/* JEDEN kanál Realtime na celú appku. `AppHeader` je na štyroch
              taboch naraz a `supabase.channel()` vracia pri rovnakom názve
              TEN ISTÝ kanál — druhá inštancia preto volala `.on()` na už
              pripojený kanál a appka padla (Rastio, 8.8.2026). */}
          <NotificationsProvider userId={session?.user.id}>
            <RootLayoutInner />
          </NotificationsProvider>
        </ProfileProvider>
        </ToastProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function RootLayoutInner() {
  // ZÁMERNE nie `useColorScheme()` — voľba používateľa má prednosť pred
  // nastavením telefónu.
  const { effective } = useThemeMode();
  const isDark = effective === 'dark';
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
      console.log(`[APP] Skrytie splash screenu zlyhalo: ${errorText(e)}`);
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
        <Stack
          screenOptions={{
            headerShown: false,
            // CHYBA (Rastio, 8.8.2026): pri šípke späť sa vypisovalo doslova
            // „(tabs)". iOS tam dáva TITULOK PREDOŠLEJ obrazovky a predošlá
            // je smerovacia skupina `(tabs)`, ktorá titulok nemá — tak sa
            // vypísal názov priečinka.
            //
            // `minimal` = len šípka, bez textu. To je bežný iOS vzor a jediný,
            // ktorý nemôže ukázať nič nesprávne. `headerBackTitle` je poistka
            // pre prípad, že by systém text napriek tomu vykreslil.
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: 'Späť',
          }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="prezyvka" />
          {/* Titulok skupiny — druhá poistka toho istého: aj keby sa niekde
              text pri šípke predsa vykreslil, je po slovensky. */}
          <Stack.Screen name="(tabs)" options={{ title: 'Offerra' }} />
          <Stack.Screen name="nehnutelnost/[id]" />
          <Stack.Screen name="inzerat/[id]" />
          <Stack.Screen name="ponuka/[id]" />
          <Stack.Screen name="ponuky/[id]" />
          <Stack.Screen name="dopyt/novy" />
          <Stack.Screen name="dopyt/[id]" />
          <Stack.Screen name="nastavenia" />
          <Stack.Screen name="ako-funguje" />
          <Stack.Screen name="novinky" />
          <Stack.Screen name="oznamenia" />
          <Stack.Screen name="legal/[doc]" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
