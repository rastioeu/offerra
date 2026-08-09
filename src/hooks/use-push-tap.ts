/**
 * Klik na push notifikáciu → správna obrazovka.
 *
 * Prečo je to hook v koreňovom layoute a nie v `push.ts`: potrebuje
 * `router`, a ten existuje len vnútri navigácie.
 *
 * TRI VECI, KTORÉ SA MUSIA STRÁŽIŤ, INAK TO ROBÍ NEPLECHU:
 *
 * 1. **Príliš skoro.** Pri spustení zo zabitého stavu beží zároveň brána
 *    v `_layout.tsx`, ktorá volá `router.replace()` podľa prihlásenia.
 *    Keby sme skočili na detail skôr, brána by nás z neho vzápätí
 *    odhodila. Čakáme preto, kým je jasné, kam appka patrí (`ready`).
 *
 * 2. **Dvakrát to isté.** `getLastNotificationResponseAsync()` vracia tú
 *    istú notifikáciu opakovane, kým beží proces. Bez `handledRef` by sa
 *    obrazovka otvárala znova pri každom prekreslení.
 *
 * 3. **Neprihlásený.** Detail cudzieho inzerátu bez session nedáva zmysel
 *    a brána by ho aj tak prebila. Vtedy sa neskáče nikam.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { errorText } from '@/lib/errors';
import { routeFromPushData } from '@/lib/notification-route';
import { initialPushTap, onPushTap, setupForegroundPush } from '@/lib/push';

export function usePushTap(ready: boolean): void {
  const router = useRouter();
  const handledRef = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  // Čakajúci klik, ktorý prišiel skôr, než bola appka pripravená.
  const pendingRef = useRef<unknown | null>(null);

  useEffect(() => {
    setupForegroundPush();
  }, []);

  useEffect(() => {
    function go(data: unknown) {
      const route = routeFromPushData(data);
      if (!route) {
        console.log('[PUSH] Notifikácia bez cieľa — neskáčem nikam.');
        return;
      }
      try {
        router.push(route as never);
      } catch (e: unknown) {
        console.log(`[PUSH] Otvorenie z notifikácie zlyhalo: ${errorText(e)}`);
      }
    }

    // 1) Appka beží — klik prichádza rovno.
    const off = onPushTap((data) => {
      if (!readyRef.current) {
        pendingRef.current = data;
        return;
      }
      go(data);
    });

    // 2) Appku spustil klik zo zabitého stavu.
    if (!handledRef.current) {
      void initialPushTap().then((data) => {
        if (!data || handledRef.current) return;
        handledRef.current = true;
        if (!readyRef.current) {
          pendingRef.current = data;
          return;
        }
        go(data);
      });
    }

    return off;
  }, [router]);

  // 3) Appka dobehla do pripraveného stavu — doručíme odložený klik.
  useEffect(() => {
    if (!ready || pendingRef.current === null) return;
    const data = pendingRef.current;
    pendingRef.current = null;
    const route = routeFromPushData(data);
    if (route) {
      try {
        router.push(route as never);
      } catch (e: unknown) {
        console.log(`[PUSH] Otvorenie z notifikácie zlyhalo: ${errorText(e)}`);
      }
    }
  }, [ready, router]);
}
