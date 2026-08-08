/**
 * Priemerné hodnotenia pre skupinu ľudí naraz.
 *
 * Jeden dotaz na celú obrazovku, nie jeden na každú prezývku — zoznam
 * ponúk ich potrebuje aj desať a desať dotazov by bolo desaťkrát to isté.
 */
import { useEffect, useState } from 'react';

import { errorText } from '@/lib/errors';
import { fetchRatings, type RatingSummary } from '@/lib/rating';

export function useRatings(userIds: string[]): Record<string, RatingSummary> {
  const [map, setMap] = useState<Record<string, RatingSummary>>({});
  // Pole sa pri každom rendere vyrába nanovo; kľúčom je jeho OBSAH.
  const key = [...new Set(userIds)].sort().join(',');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = key ? key.split(',') : [];
      if (ids.length === 0) {
        setMap({});
        return;
      }
      try {
        const next = await fetchRatings(ids);
        if (!cancelled) setMap(next);
      } catch (e: unknown) {
        // Chýbajúce hodnotenie nie je chyba používateľa — obrazovka
        // funguje aj bez neho. Zamlčať to ale nebudem.
        console.log(`[HODNOTENIA] Nedostupné: ${errorText(e)}`);
        if (!cancelled) setMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return map;
}
