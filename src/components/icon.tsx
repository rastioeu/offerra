/**
 * Ikony — SF Symbols cez `expo-symbols`.
 *
 * ZISTENIE (7.8.2026): `expo-symbols` prišlo so šablónou SDK 57 a bolo
 * v `package.json` UŽ PRED buildom #3, takže je v binárke skompilované.
 * Ikony teda idú **cez OTA, nový build netreba** — presne to si Rastio
 * pýtal overiť pred implementáciou.
 *
 * `require()` v try/catch napriek tomu: je to natívny modul a na staršom
 * builde (rt 1.0.0) chýba. Tam sa vykreslí textová náhrada namiesto pádu
 * celej obrazovky — rovnaké pravidlo ako pri image pickeri.
 *
 * Poznámka z Fázy 0 („expo-symbols by rozbilo Android/web") už neplatí:
 * balík má Material Symbols fallback pre Android aj web.
 */
import { Platform, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type IconName =
  | 'heart'
  | 'heart.fill'
  | 'square.and.arrow.up'
  | 'flag'
  | 'bell'
  | 'bell.badge'
  | 'gearshape'
  | 'house'
  | 'magnifyingglass'
  | 'envelope'
  | 'bubble.left.and.bubble.right'
  | 'plus.circle'
  | 'person.circle'
  | 'checkmark.seal'
  | 'chevron.left'
  | 'key'
  | 'arrow.up.left.and.arrow.down.right'
  | 'clock'
  | 'xmark'
  | 'questionmark.circle';

/** Textová náhrada, keď natívny modul chýba (starý build, web). */
const FALLBACK: Record<IconName, string> = {
  heart: '♡',
  'heart.fill': '♥',
  'square.and.arrow.up': '↑',
  flag: '⚑',
  bell: '🔔',
  'bell.badge': '🔔',
  gearshape: '⚙︎',
  house: '⌂',
  magnifyingglass: '⌕',
  envelope: '✉',
  'bubble.left.and.bubble.right': '💬',
  'plus.circle': '＋',
  'person.circle': '☺',
  'checkmark.seal': '✓',
  'chevron.left': '‹',
  key: '⚿',
  'arrow.up.left.and.arrow.down.right': '⤢',
  clock: '◷',
  xmark: '✕',
  'questionmark.circle': '?',
};

export function Icon({
  name,
  size = 22,
  color,
  weight = 'regular',
}: {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const palette = useTheme();
  const tint = color ?? palette.textSecondary;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SymbolView } = require('expo-symbols');
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={tint}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
        fallback={<Text style={{ fontSize: size * 0.9, color: tint }}>{FALLBACK[name]}</Text>}
      />
    );
  } catch {
    if (Platform.OS === 'ios') {
      console.log('[IKONY] expo-symbols nie je v tomto builde — textová náhrada');
    }
    return <Text style={{ fontSize: size * 0.9, color: tint }}>{FALLBACK[name]}</Text>;
  }
}
