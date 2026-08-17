/**
 * Rozhodovanie gest fullscreen galérie — ČISTÁ logika, bez React Native.
 *
 * Prečo samostatný súbor: pri prvom pokuse (17.8.2026) gestá NEFUNGOVALI a
 * nedalo sa to overiť inak než na telefóne — celá logika bola pomiešaná s
 * animáciami vo worklete. Tu je oddelené to, čo sa DÁ overiť v Node
 * (`scripts/check-gallery.ts`): kedy sa listuje, kam, kedy sa zatvára, ako
 * sa obmedzuje posun priblíženej fotky.
 *
 * Rovnaký vzor ako `src/lib/deadline.ts` a `src/lib/realtime.ts` — logika
 * mimo obrazovky, aby existoval dôkaz podľa §1, nie „malo by fungovať".
 *
 * ⚠️ Tieto funkcie sa volajú z JS vlákna (`runOnJS` v `onEnd`), NIE z
 * workletu. Zámerne: cross-file worklety by pribalili ďalšie riziko, ktoré
 * sa v Node overiť nedá, a rozhodnutie na konci gesta o jeden frame nikto
 * nevidí. Vo workletoch ostáva len aritmetika posunu.
 */

/** Koľko šírky obrazovky treba prejsť, aby sa listovalo aj bez rýchlosti. */
export const PAGE_TRIGGER_RATIO = 0.25;
/** Rýchly šmyk (px/s) listuje aj keď je posun krátky. */
export const SWIPE_VELOCITY = 420;
/** Ako ďaleko dole treba potiahnuť, aby sa prehliadač zavrel. */
export const CLOSE_DRAG = 110;
/** Rýchle stiahnutie dole (px/s) zavrie aj pri kratšom posune. */
export const CLOSE_VELOCITY = 900;
/** Kým prst neprejde toľko px, os ťahu sa nerozhoduje (vodorovne/zvislo). */
export const AXIS_LOCK = 8;
/**
 * Koľko smie prst prejsť, a ešte to je ťap. MUSÍ byť nastavené (`maxDistance`
 * na `Gesture.Tap`) — gesture-handler má vlastné meze ako NAN a dvojťap by
 * na pohyb prsta nezlyhal, takže dva rýchle šmyky by príblížili fotku.
 */
export const TAP_SLOP = 16;
/** Na koľko priblíži dvojťap. */
export const DOUBLE_TAP_SCALE = 2.5;
export const MAX_SCALE = 5;
/** Odpor za krajnou fotkou — ťah ide, ale spomalený, aby bolo vidieť koniec. */
export const RUBBER_BAND = 0.35;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type Axis = 'x' | 'y' | null;

/**
 * Os ťahu. `null` = prst sa ešte nepohol dosť, aby sa dalo rozhodnúť —
 * vtedy sa NEROBÍ nič. Bez tohto zámku by každý ťah trhol aj do strán aj
 * dole a ani jedno gesto by sa nedalo spraviť naschvál.
 */
export function axisOf(translationX: number, translationY: number): Axis {
  if (Math.abs(translationX) < AXIS_LOCK && Math.abs(translationY) < AXIS_LOCK) return null;
  return Math.abs(translationX) >= Math.abs(translationY) ? 'x' : 'y';
}

/**
 * Kam sa odlistuje po pustení prsta. Vracia NOVÝ index (rovnaký = ostáva).
 *
 * Rýchlosť má prednosť pred posunom: kto ťahol vľavo a na konci švihol
 * vpravo, chce sa vrátiť, nie ísť ďalej.
 */
export function nextIndex({
  index,
  count,
  width,
  translationX,
  velocityX,
}: {
  index: number;
  count: number;
  width: number;
  translationX: number;
  velocityX: number;
}): number {
  const fast = Math.abs(velocityX) > SWIPE_VELOCITY;
  const far = Math.abs(translationX) > width * PAGE_TRIGGER_RATIO;
  if (!fast && !far) return index;
  const dir = fast ? (velocityX < 0 ? 1 : -1) : translationX < 0 ? 1 : -1;
  return clamp(index + dir, 0, Math.max(count - 1, 0));
}

/** Zatvoriť potiahnutím dole? Iba dole — ťah nahor prehliadač nezatvára. */
export function shouldClose({
  translationY,
  velocityY,
}: {
  translationY: number;
  velocityY: number;
}): boolean {
  if (translationY <= 0) return false;
  return translationY > CLOSE_DRAG || velocityY > CLOSE_VELOCITY;
}

/**
 * Pozícia pásu fotiek počas vodorovného ťahu, vrátane odporu za krajmi.
 * `count` fotiek leží v rade, nultá na 0, každá ďalšia o `width` vľavo.
 */
export function stripOffset({
  index,
  count,
  width,
  translationX,
}: {
  index: number;
  count: number;
  width: number;
  translationX: number;
}): number {
  const raw = -index * width + translationX;
  const min = -(Math.max(count - 1, 0)) * width;
  if (raw > 0) return raw * RUBBER_BAND;
  if (raw < min) return min + (raw - min) * RUBBER_BAND;
  return raw;
}

/**
 * Meze posunu priblíženej fotky. Počíta sa z RÁMCA stránky, nie zo
 * skutočných rozmerov fotky — `contentFit="contain"` necháva po stranách
 * čierne pruhy, takže pri niektorých fotkách sa dá posunúť o kúsok viac,
 * než by bolo treba. To je vedomý ústupok: rozmery vykreslenej fotky
 * appka bez dopočítania pomeru strán nepozná a nikto nechce, aby sa fotka
 * pri priblížení „zasekla" o neviditeľnú hranicu.
 */
export function panLimit(scale: number, size: number): number {
  return Math.max(0, (size * scale - size) / 2);
}

/** Kam sa posunie priblížená fotka — vrátane obmedzenia na meze. */
export function zoomOffset({
  scale,
  saved,
  translation,
  size,
}: {
  scale: number;
  saved: number;
  translation: number;
  size: number;
}): number {
  const limit = panLimit(scale, size);
  return clamp(saved + translation, -limit, limit);
}
