/**
 * Formulár, ktorý sa zo servera naplní RAZ a potom si ho už drží sám.
 *
 * CHYBA, KTORÚ TO OPRAVUJE (Rastio, 9.8.2026): „vyplním inzerát, pridám
 * fotku a všetky ostatné údaje sa vymažú."
 *
 * Nameraná príčina NIE JE remount obrazovky ani picker. Editor napĺňal
 * polia v `useEffect(…, [item])`. `addPhoto` po nahratí volá `reload()`,
 * ten vloží do stavu NOVÝ objekt, efekt sa spustí znova a prepíše polia
 * hodnotami z databázy — teda tým, čo tam bolo pred písaním. To isté robil
 * návrat na obrazovku (`useRefreshOnFocus`) aj samotné uloženie.
 *
 * Pravidlo je v `fillFromServer()` a platí pre každý formulár v appke:
 * server smie formulár NAPLNIŤ, nikdy nie PREPÍSAŤ.
 *
 * Druhá poistka je `form-draft.ts` — rozpísaný text žije MIMO komponentu,
 * takže ho prežije, aj keby obrazovku niekedy naozaj odmountovalo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { fillFromServer, forgetDraft, readDraft, writeDraft, type FillState } from '@/lib/form-draft';

export function useFormDraft<S, F extends object>(
  /** Čo identifikuje záznam — id inzerátu, id používateľa. */
  key: string | undefined,
  source: S | null | undefined,
  build: (s: S) => F
): {
  form: F | null;
  /** Zmena jedného alebo viacerých polí. */
  set: (patch: Partial<F>) => void;
  /** Po úspešnom uložení — server sa formuláru vyrovnal. */
  saved: () => void;
} {
  const [state, setState] = useState<FillState<F>>(() =>
    key && readDraft<F>(key) ? { key, form: readDraft<F>(key) as F } : { key: null, form: null }
  );

  // `build` býva inline funkcia, teda pri každom renderi iná. V efekte ju
  // preto nesledujeme — rozhoduje `key` a `source`, nie identita funkcie.
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    setState((s) => fillFromServer(s, key, source, buildRef.current) ?? s);
  }, [key, source]);

  const set = useCallback(
    (patch: Partial<F>) => {
      setState((s) => {
        if (!s.form) return s;
        const form = { ...s.form, ...patch };
        writeDraft(key, form);
        return { key: s.key, form };
      });
    },
    [key]
  );

  const saved = useCallback(() => forgetDraft(key), [key]);

  return { form: state.form, set, saved };
}
