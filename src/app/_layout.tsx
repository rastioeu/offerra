import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout — rovnaká kostra ako MUTARK (`GestureHandlerRootView` okolo
 * celej appky kvôli natívnym gestám navigácie + `ThemeProvider`), zatiaľ
 * bez i18n, error boundary a auth redirectu. Tie prídu v ďalších fázach,
 * až budú existovať obrazovky, ktoré majú čo chrániť.
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = Colors[isDark ? 'dark' : 'light'];

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
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
