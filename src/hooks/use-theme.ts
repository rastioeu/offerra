import { Colors, type Palette } from '@/theme/tokens';

import { useColorScheme } from './use-color-scheme';

/**
 * Rovnaký vzor ako MUTARK `src/hooks/use-theme.ts`, zatiaľ bez
 * high-contrast boostu (MUTARK ho pridal až v K106/K107 na základe
 * spätnej väzby) — dopĺňa sa, keď bude Offerra mať reálne obrazovky.
 *
 * Offerra je LIGHT-FIRST: pri nešpecifikovanej systémovej téme padáme na
 * `light` (MUTARK padá na `dark`).
 */
export function useTheme(): Palette {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
