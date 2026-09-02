/**
 * JEDEN spoločný tikajúci `now` pre CELÚ obrazovku s odpočtami platnosti
 * ponúk (Rastio, 1.9.2026) — nie samostatný `setInterval` na každú ponuku
 * v zozname. Pri viacerých ponukách naraz by sa timery hromadili presne
 * tak, ako sa to už raz stalo pri Realtime kanáloch (CLAUDE.md §11) —
 * appka nespadne, len sa to nabaľuje a spomaľuje.
 *
 * Frekvencia je STUPŇOVITÁ podľa najbližšej platnosti spomedzi všetkých
 * poslaných `validUntil`, nie pevná:
 *   - NIEKTORÁ ponuka je pod 24 hodín (`hm` ALEBO `hms` stupeň v
 *     `offerCountdown`) → tiká po SEKUNDÁCH. Pôvodne to platilo len pre
 *     poslednú hodinu — Rastio, 2.9.2026, štvrté kolo: „pridaj tam ešte
 *     sekundy, nie len poslednú hodinu", `offerCountdown` teraz ukazuje
 *     sekundy v OBOCH stupňoch pod deň, takže bez tejto zmeny by boli
 *     sekundy v `hm` stupni zamrznuté až minútu.
 *   - inak (stupeň „X dní") → tiká raz za MINÚTU, dni sa tak často
 *     nemenia, minúta stačí.
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

const SECONDS_VISIBLE_WINDOW_MS = 86_400_000; // pod deň — `hm` aj `hms` stupeň v offerCountdown ukazujú sekundy
const SECONDS_TICK_MS = 1_000;
const NORMAL_TICK_MS = 60_000;

export function useOfferCountdownTick(validUntils: (string | null | undefined)[], enabled: boolean = true): number {
  const [now, setNow] = useState(() => Date.now());

  const anySecondsVisible = validUntils.some((iso) => {
    if (!iso) return false;
    const ms = new Date(iso).getTime() - now;
    return ms > 0 && ms <= SECONDS_VISIBLE_WINDOW_MS;
  });

  useEffect(() => {
    if (!enabled) return;
    const intervalMs = anySecondsVisible ? SECONDS_TICK_MS : NORMAL_TICK_MS;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [anySecondsVisible, enabled]);

  return now;
}
