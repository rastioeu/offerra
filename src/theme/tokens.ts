/**
 * OFFERRA — jediný zdroj pravdy pre farby/typografiu/spacing/radius/tiene.
 *
 * Štruktúra je zámerne rovnaká ako MUTARK `src/theme/tokens.ts` (Palette /
 * Colors / Spacing / Radius / Type / Weight / Shadow), aby sa vzory medzi
 * projektmi dali prenášať bez prekladu. **Paleta je však vlastná** —
 * schválená Rastiom 7.8.2026, variant „B — Navy & Azure": profesionálna,
 * dôveryhodná, LIGHT-FIRST (realitná appka = svetlé plochy, fotky
 * nehnuteľností v popredí). Žiadny mutarkovský dark/neon.
 *
 * Pravidlo (rovnaké ako MUTARK): žiadna obrazovka/komponent nesmie mať
 * vlastnú hardcodovanú farbu/`fontSize`/tieň — len tokeny odtiaľto.
 */

export type Palette = {
  background: string;
  surface: string;
  surfacePressed: string;
  /** Vlasová deliaca čiara (dekoratívna) — kontrast sa pri nej nemeria. */
  border: string;
  /** Obrys ovládacieho prvku (pole formulára) — musí mať ≥ 3:1 (WCAG 1.4.11). */
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  /** Značková navy — hlavná akcia, nadpisy, aktívny tab. */
  primary: string;
  /** Značková azúrová — VÝPLNE a grafika (ikona, akcentová linka). */
  secondary: string;
  /** Azúrová ako TEXT. Odlíšená od `secondary`, viď poznámka o WCAG nižšie. */
  link: string;
  /** Text NA vyplnenom `primary`/`secondary` povrchu (tlačidlo, badge). */
  onPrimary: string;

  success: string;
  warning: string;
  danger: string;
};

/**
 * FÁZA 0 (7.8.2026) — paleta „B — Navy & Azure" schválená pred zápisom.
 * FÁZA 1 (7.8.2026) — Rastio vybral identitu **A — Navy & Azure**, ktorá na
 * tejto palete stavia; paleta sa teda nemenila, len DOKONČILA.
 *
 * ── Premeranie WCAG (Fáza 1, sľúbené v registri) ────────────────────────
 * Každý token bol zmeraný voči `background` aj `surface`. Tri v light téme
 * neprešli AA 4.5:1 pre bežný text a boli opravené:
 *
 *   success  #1F8A5F → #1D8058   (bolo 4.03:1)
 *   warning  #B7791F → #99651A   (bolo 3.39:1 — najhoršie)
 *   azúrová  #1B73D4 → viď nižšie
 *
 * Značková azúrová `secondary` #1B73D4 má na `background` len 4.40:1.
 * ZÁMERNE sa NEMENÍ — je to farba loga a app ikony a v identite musí ostať
 * presne tá. Namiesto toho pribudol token `link` #1B71D0 (opticky tá istá
 * farba, 4.53:1), ktorý sa používa všade, kde je azúrová TEXT.
 * Pravidlo: `secondary` = výplň/grafika, `link` = text.
 *
 * Biely text na výplni `secondary` má 4.72:1 — vyhovuje, tlačidlá sú v poriadku.
 * Dark téma prešla celá bez zásahu (najnižšia hodnota 5.16:1).
 */
export const Colors: { light: Palette; dark: Palette } = {
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfacePressed: '#E8EDF4',
    border: '#DCE3EC',
    borderStrong: '#888E98',

    textPrimary: '#101828',
    textSecondary: '#445068',
    textMuted: '#5A6780',

    primary: '#103A6B',
    secondary: '#1B73D4',
    link: '#1B71D0',
    onPrimary: '#FFFFFF',

    success: '#1D8058',
    warning: '#99651A',
    danger: '#B4342A',
  },
  dark: {
    // POZOR (vedomé rozhodnutie, 7.8.2026): MUTARK má dark pozadie
    // `#0B1020`, Offerra `#0D1520` — sú si blízko. Offerra je light-first,
    // takže dark je doplnková téma, nie hlavná tvár appky; ak sa neskôr
    // ukáže, že sa appky vizuálne mýlia, mení sa TENTO token, nie MUTARK.
    background: '#0D1520',
    surface: '#16202E',
    surfacePressed: '#1F2B3C',
    border: '#2A3749',
    borderStrong: '#6B7A93',

    textPrimary: '#FFFFFF',
    textSecondary: '#A8B6CA',
    textMuted: '#90A0B8',

    primary: '#5AA0EE',
    secondary: '#4E9AF0',
    link: '#4E9AF0',
    onPrimary: '#0D1520',

    success: '#3BB07E',
    warning: '#D9A441',
    danger: '#E8695D',
  },
};

export type ThemeColor = keyof Palette;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** Typografická škála — prevzatá z MUTARKu (osvedčená), vrátane minima 13px. */
export const Type = {
  caption: { fontSize: 13, lineHeight: 17 },
  small: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 13, lineHeight: 18 },
  bodyMd: { fontSize: 14, lineHeight: 19 },
  bodyLg: { fontSize: 15, lineHeight: 21 },
  button: { fontSize: 16, lineHeight: 21 },
  subtitle: { fontSize: 18, lineHeight: 24 },
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 22, lineHeight: 28 },
  hero: { fontSize: 24, lineHeight: 30 },
} as const;

export const Weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;
