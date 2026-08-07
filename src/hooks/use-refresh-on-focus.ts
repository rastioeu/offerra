/**
 * Obnoví dáta pri každom návrate na obrazovku.
 *
 * CHYBA, KTORÚ TO OPRAVUJE: každá obrazovka má vlastnú inštanciu svojho
 * hooku. Keď používateľ podá ponuku vo formulári a vráti sa na detail,
 * formulár obnoví SVOJ zoznam, ale detail o zmene nevie a ukazuje starý
 * stav. To isté platí po zverejnení inzerátu (katalóg), po vytvorení dopytu
 * (tab Dopyty) a po prijatí ponuky (detail).
 *
 * Je to tá istá trieda chyby ako pri profile (7.8.2026) — tam sa riešila
 * zdieľaným kontextom, lebo profil je jeden na celú appku. Tu by kontext
 * nepomohol: zoznamov je veľa a líšia sa parametrom, takže správna odpoveď
 * je načítať ich znova, keď sa na ne používateľ pozrie.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useRefreshOnFocus(reload: () => Promise<void> | void) {
  // Prvé zobrazenie si dáta načíta samotný hook cez `useEffect`;
  // preskočíme ho, aby sa hneď po otvorení nesťahovali dvakrát.
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload])
  );
}
