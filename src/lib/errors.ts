/**
 * Text chyby pre používateľa — JEDNO miesto pre celú appku.
 *
 * ── CHYBA, KTORÚ TO OPRAVUJE (Rastio, 8.8.2026, screenshot) ─────────────
 *
 * Na obrazovke „Podať ponuku" sa v chybovom rámčeku zobrazilo doslova
 * **`[object Object]`**.
 *
 * Príčina: v appke bol 25× rozkopírovaný vzorec
 *
 *     const m = e instanceof Error ? e.message : String(e);
 *
 * Lenže **chyby zo Supabase nie sú inštancie `Error`** — PostgREST vracia
 * obyčajný objekt `{ message, details, hint, code }`. Vetva `instanceof`
 * teda neplatila, spadlo to do `String(e)` a z objektu vyšlo
 * `[object Object]`. Používateľ sa nedozvedel nič — presne to
 * „nestane sa nič", ktoré CLAUDE.md §2 zakazuje.
 *
 * Preto je to teraz jedna funkcia, nie vzorec na skopírovanie.
 */

/**
 * Ľudský preklad kódov, ktoré používateľ reálne stretne. Surová hláška sa
 * NEZAHADZUJE — pripája sa pod preklad, lebo §2 chce celú chybu.
 */
const FRIENDLY: Record<string, string> = {
  // cudzí kľúč — cieľ medzitým zmizol
  '23503': 'Vec, na ktorú to smeruje, už neexistuje — pravdepodobne ju medzitým zmazali. Potiahni zoznam dole a obnov ho.',
  // unikátny index
  '23505': 'Toto už existuje, druhýkrát to založiť nejde.',
  /*
   * RLS / chýbajúci grant. Kód sám nepovie PRESNÝ dôvod, tak vymenujeme
   * tie skutočné — pri ponuke to je vždy jeden z nich (overené naživo:
   * podanie ponuky na už neexistujúci inzerát vráti práve 42501, nie
   * chybu cudzieho kľúča).
   */
  '42501':
    'Toto ti server nedovolil. Najčastejšie preto, že inzerát už nie je zverejnený, ' +
    'uplynula uzávierka ponúk, alebo je inzerát tvoj vlastný. Skús obnoviť zoznam.',
  // check constraint
  '23514': 'Zadaná hodnota nie je povolená.',
  // PostgREST: `.single()` nenašlo riadok
  PGRST116: 'Nenašlo sa to — možno to už neexistuje.',
};

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Chýba tabuľka/funkcia, ktorá ešte nie je nasadená?
 *
 * Appka ide OTA rýchlejšie než migrácie DB. Nová obrazovka sa teda môže
 * dostať na telefón skôr, než tabuľka, ktorú číta, existuje. Volajúci
 * vtedy sekciu SKRYJE — nie „nespraví nič potichu" — a do logu to ide
 * vždy, takže sa to nedá prehliadnuť pri diagnostike.
 *
 * Skutočné chyby (RLS, sieť, neplatné dáta) sem nespadnú.
 */
export function isNotDeployedYet(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return (
    code === 'PGRST205' || // tabuľka nie je v schema cache
    code === 'PGRST202' || // funkcia (RPC) neexistuje
    code === '42P01' ||    // undefined_table
    code === '42883' ||    // undefined_function
    code === '42703'       // undefined_column
  );
}

export function errorText(e: unknown): string {
  if (e == null) return 'Neznáma chyba.';

  const asString = text(e);
  if (asString) return asString;

  // Skutočný `Error` (sieť, náš vlastný `throw new Error`).
  if (e instanceof Error && e.message) return e.message;

  if (typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const message = text(o.message);
    const code = text(o.code);
    const details = text(o.details);
    const hint = text(o.hint);
    const friendly = code ? FRIENDLY[code] : undefined;

    const parts = [friendly, message, details, hint].filter(Boolean) as string[];
    // Duplicity preč — PostgREST občas zopakuje to isté v `details`.
    const seen = new Set<string>();
    const unique = parts.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
    if (unique.length > 0) return unique.join('\n');

    // Posledná záchrana: radšej surový JSON než `[object Object]`.
    try {
      const json = JSON.stringify(e);
      if (json && json !== '{}' && json !== 'null') return json.slice(0, 400);
    } catch {
      // objekt sa nedá serializovať (cyklus) — spadneme nižšie
    }
  }

  const plain = String(e);
  return plain === '[object Object]' ? 'Neznáma chyba — server neposlal popis.' : plain;
}
