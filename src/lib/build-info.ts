/**
 * Verzný riadok — „na prvý pohľad vidím, či mi OTA dorazila".
 *
 * PREČO `require()` V TRY/CATCH, NIE STATICKÝ IMPORT (vzor MUTARK):
 * `expo-updates` je natívny modul. V behu, kde nie je nainštalovaný alebo
 * inicializovaný (Expo Go, dev klient, starší build), by ho statický
 * import zhodil už pri NAČÍTANÍ obrazovky — teda skôr, než by sa vôbec
 * stihlo niečo vykresliť. To isté pravidlo ako pri `expo-image-picker`.
 *
 * ČO SME SA NAUČILI Z MUTARKU (jeho `build-info.ts` si to sám zapísal):
 * MUTARK ukazuje ručne udržiavanú konštantu `GIT_COMMIT` — a tá ostala
 * NEAKTUALIZOVANÁ naprieč desiatkami OTA publikácií. Rastio sa cez ňu
 * teda nemohol presvedčiť, či mu OTA reálne dorazila, práve keď to
 * potreboval.
 *
 * Offerra preto stavia na `Updates.updateId`, ktorý generuje
 * `expo-updates` sám a ručne sa needituje — nemá ako zostarnúť.
 * `updateId` sa porovnáva s „Update group ID" z `eas update` (prvých
 * 8 znakov). `embedded` znamená, že beží kód zabudovaný v builde,
 * teda žiadna OTA zatiaľ nedorazila.
 */
export type BuildInfo = {
  version: string;
  runtimeVersion: string;
  /** Prvých 8 znakov `updateId`, alebo `embedded`. */
  ota: string;
  /** `false` = beží OTA, `true` = kód priamo z buildu. */
  embedded: boolean;
  /** Prečo sa nepodarilo zistiť viac — nezamlčiavame to. */
  problem: string | null;
};

export function readBuildInfo(): BuildInfo {
  let version = '?';
  let runtimeVersion = '?';
  let ota = '?';
  let embedded = false;
  let problem: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    version = Constants?.expoConfig?.version ?? '?';
  } catch (e: unknown) {
    problem = `expo-constants: ${String(e)}`;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Updates = require('expo-updates');
    runtimeVersion = Updates.runtimeVersion ?? '?';
    embedded = Boolean(Updates.isEmbeddedLaunch);
    ota = embedded ? 'embedded' : (Updates.updateId?.slice(0, 8) ?? '?');
  } catch (e: unknown) {
    problem = [problem, `expo-updates: ${String(e)}`].filter(Boolean).join(' · ');
  }

  return { version, runtimeVersion, ota, embedded, problem };
}

export function buildInfoLine(b: BuildInfo): string {
  return `v${b.version} · rt${b.runtimeVersion} · ${b.ota}`;
}
