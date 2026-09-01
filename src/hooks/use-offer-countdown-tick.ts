/**
 * JEDEN spoločný tikajúci `now` pre CELÚ obrazovku s odpočtami platnosti
 * ponúk (Rastio, 1.9.2026) — nie samostatný `setInterval` na každú ponuku
 * v zozname. Pri viacerých ponukách naraz by sa timery hromadili presne
 * tak, ako sa to už raz stalo pri Realtime kanáloch (CLAUDE.md §11) —
 * appka nespadne, len sa to nabaľuje a spomaľuje.
 *
 * Frekvencia je STUPŇOVITÁ podľa najbližšej platnosti spomedzi všetkých
 * poslaných `validUntil`, nie pevná:
 *   - NIEKTORÁ ponuka je v poslednej hodine → tiká po SEKUNDÁCH (musí, aby
 *     `HH:MM:SS` v `offerCountdown` reálne odpočítaval).
 *   - inak → tiká raz za MINÚTU (pre `HH:MM` aj pre „X dní" to stačí;
 *     sekundy tikajúce celý deň by len zaťažovali batériu bez úžitku).
 *
 * Cleanup pri unmounte aj pri KAŽDEJ zmene frekvencie (inak by starý
 * interval bežal ďalej popri novom).
 *
 * `enabled = false` (napr. `OfferList` vnorený v `OwnerOffers`, ktorý už
 * tiká sám a posiela svoje `now` ako prop) nezaloží ŽIADEN interval — bez
 * tohto by na jednej obrazovke bežali dva timery namiesto jedného, presne
 * to, čomu sa má táto komponenta vyhnúť. Hook sa aj tak volá VŽDY (pravidlo
 * hookov), len jeho efekt nič nespustí.
 */
import { useEffect, useState } from 'react';

const URGENT_WINDOW_MS = 3_600_000; // posledná hodina — viď offerCountdown
const URGENT_TICK_MS = 1_000;
const NORMAL_TICK_MS = 60_000;

export function useOfferCountdownTick(validUntils: (string | null | undefined)[], enabled: boolean = true): number {
  const [now, setNow] = useState(() => Date.now());

  const anyUrgent = validUntils.some((iso) => {
    if (!iso) return false;
    const ms = new Date(iso).getTime() - now;
    return ms > 0 && ms <= URGENT_WINDOW_MS;
  });

  useEffect(() => {
    if (!enabled) return;
    const intervalMs = anyUrgent ? URGENT_TICK_MS : NORMAL_TICK_MS;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [anyUrgent, enabled]);

  return now;
}
