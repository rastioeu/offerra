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

  /** Značková navy — kotva: nadpisy, aktívny tab, sekundárne akcie. */
  primary: string;
  /** Značková azúrová — grafika loga a app ikony. */
  secondary: string;
  /** Azúrová ako TEXT. Odlíšená od `secondary`, viď poznámka o WCAG nižšie. */
  link: string;
  /**
   * TEPLÁ AKCENTOVÁ — terakota. Len na VEĽKÉ čísla (ceny, sumy ponúk)
   * a dekoratívne výplne. Na bežný text nestačí, viď `accentDeep`.
   */
  accent: string;
  /**
   * Tmavšia terakota — CTA tlačidlá (biely text na nej) a malý teplý text.
   * Opticky tá istá farba, len prejde kontrastom.
   */
  accentDeep: string;
  /** Text NA vyplnenom `primary`/`secondary` povrchu (tlačidlo, badge). */
  onPrimary: string;

  /**
   * Svetlá plocha NAD FOTKOU (štítok typu na karte). Musí byť
   * poloprehľadná, inak by z fotky vystrihla biely obdĺžnik.
   */
  onPhotoSurface: string;
  /** Stmavenie pozadia pod kontextovým náhľadom (podržanie prstu). */
  scrim: string;

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
    // Teplý off-white, nie studená šedá — pozadie má pôsobiť ako papier,
    // nie ako tabuľka.
    background: '#FBF7F2',
    surface: '#FFFDFB',
    surfacePressed: '#F3EAE0',
    border: '#EFE6DC',
    borderStrong: '#8C8279',

    textPrimary: '#1C1815',
    textSecondary: '#5C534B',
    textMuted: '#7A7068',

    primary: '#103A6B',
    secondary: '#1B73D4',
    link: '#1B71D0',
    accent: '#C9703B',
    accentDeep: '#A85526',
    onPrimary: '#FFFFFF',
    onPhotoSurface: 'rgba(255,255,255,0.92)',
    scrim: 'rgba(28,24,21,0.55)',

    success: '#1D6B4A',
    warning: '#8A5A12',
    danger: '#A33528',
  },
  dark: {
    // Tmavá je TEPLÉ uhlie, nie modrá noc — aby sedela k terakote
    // a nepôsobila ako iná appka. Zároveň sa tým rozišla s MUTARKom,
    // ktorý má studené `#0B1020`.
    background: '#161311',
    surface: '#211D1A',
    surfacePressed: '#2C2724',
    border: '#38322D',
    borderStrong: '#7E736A',

    textPrimary: '#F7F3EF',
    textSecondary: '#C4B8AE',
    textMuted: '#A2968C',

    primary: '#7FB3F0',
    secondary: '#7FB3F0',
    link: '#7FB3F0',
    // V tmavej je terakota dosť svetlá na text aj na výplň, takže
    // rozdvojenie netreba — obe smerujú na ten istý odtieň.
    accent: '#E39A5E',
    accentDeep: '#E39A5E',
    onPrimary: '#161311',
    onPhotoSurface: 'rgba(33,29,26,0.92)',
    scrim: 'rgba(0,0,0,0.62)',

    success: '#5CC08E',
    warning: '#E0A94A',
    danger: '#EE7A6A',
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
  /**
   * Verzálkový štítok nad údajom („VÝMERA", „NAJVYŠŠIA PONUKA") z mockupu.
   * Zostáva na 13px — menšie písmo by porušilo minimum, ktoré si drží
   * celá appka; odlišuje ho prestrkanie a verzálky, nie veľkosť.
   */
  eyebrow: { fontSize: 13, lineHeight: 16, letterSpacing: 0.9 },
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

/**
 * Peniaze majú VLASTNÝ rez — pätkový, aby oko našlo číslo bez čítania.
 * Georgia je na iOS vždy prítomná, takže netreba nič baliť do appky.
 * (Apple „New York" je krajšie, ale jeho dostupnosť v React Native treba
 * najprv overiť na zariadení — dovtedy istota.)
 */
export const Money = {
  fontFamily: 'Georgia',
  hero: { fontSize: 27, lineHeight: 30 },
  large: { fontSize: 22, lineHeight: 25 },
  medium: { fontSize: 18, lineHeight: 21 },
  small: { fontSize: 15, lineHeight: 18 },
} as const;

export const Weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Shadow = {
  /** Vyplnené tlačidlo — jemné zdvihnutie, aby vyzeralo stlačiteľne. */
  button: {
    shadowColor: '#A85526',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: '#1C1815',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 2,
  },
  /**
   * Teplý svit — okolo loga a okrúhlych avatarov.
   *
   * `elevation: 0` ZÁMERNE: Android farebné tiene nevie a spravil by
   * z toho sivý obdĺžnik pod prvkom. Na iOS je to skutočné rozostrenie.
   *
   * Prevzaté z paralelnej vetvy (worktree `ulice-ra-import`) — mala to
   * ako token, ja som pri logu tie isté hodnoty písal do komponentu.
   */
  glow: {
    shadowColor: '#C9703B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 0,
  },
  /** Prilepená spodná lišta — tieň smeruje NAHOR, oddeľuje ju od obsahu. */
  bar: {
    shadowColor: '#1C1815',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
