/**
 * Počet OTVORENÝCH nahlásení pre odznak na tabe „Správa".
 *
 * ŽIVO, nie „keď to niekto otvorí" (Rastio, 12.8.2026). Nahlásenie, o ktorom
 * sa správca dozvie až tým, že si sám otvorí správu, je nahlásenie, ktoré
 * môže ležať týždeň.
 *
 * DVE POISTKY, lebo ani jedna sama nestačí:
 *   1. **Realtime** na `offerra.report` — nové nahlásenie aj jeho vybavenie
 *      prídu do sekundy. Kanál sa ale nemusí otvoriť (zlá sieť, spiaci
 *      telefón) a vtedy by číslo tichо zamrzlo.
 *   2. **Návrat do appky** (`AppState` → `active`) číslo prepočíta. Toto je
 *      ten najčastejší okamih, keď sa správca na appku pozrie.
 *
 * Číslo počíta `admin_pending_reports()` v databáze, nie `count(*)` z
 * klienta: bežný používateľ má na `report` riadkový prístup k SVOJIM
 * nahláseniam, takže by mu taký dotaz vrátil číslo, ktoré s odznakom
 * správcu nemá nič spoločné. Funkcia sa pýta na rolu a neadminovi vráti 0.
 *
 * Hook je ZÁMERNE bez providera — na rozdiel od zvončeka ho volá jediné
 * miesto (`(tabs)/_layout.tsx`), takže tá trieda chyby s dvoma inštanciami
 * jedného kanála (popísaná v `use-notifications.ts`) tu nevzniká. Prípona
 * v názve kanála je aj tak, ako poistka.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { errorText } from '@/lib/errors';
import { db } from '@/lib/property';
import { useRealtimeChannel } from '@/hooks/use-realtime-channel';

export function usePendingReports(isAdmin: boolean): number {
  const [count, setCount] = useState(0);
  const suffix = useRef(Math.random().toString(36).slice(2, 8));

  const reload = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      return;
    }
    try {
      const { data, error } = await db().rpc('admin_pending_reports');
      if (error) throw error;
      setCount(typeof data === 'number' ? data : 0);
    } catch (e: unknown) {
      // Odznak nie je dôvod na chybovú obrazovku, ale ticho zlyhať nesmie —
      // bez záznamu by sa nulový odznak nedal odlíšiť od nuly nahlásení.
      console.log(`[ODZNAK] Počet nahlásení sa nenačítal: ${errorText(e)}`);
    }
  }, [isAdmin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ── 1. živo ─────────────────────────────────────────────────────────
  // Prevedené na zdieľaný register (17.8.2026, §CLAUDE.md 11).
  //
  // INSERT = nové nahlásenie, UPDATE = vybavené alebo zamietnuté. Obe menia
  // číslo, takže sa obe len prepočítajú — dopočítavať +1/−1 z payloadu by
  // znamenalo držať druhú kópiu pravidla „čo je otvorené".
  useRealtimeChannel({
    topic: `reports-${suffix.current}`,
    enabled: isAdmin,
    label: '[ODZNAK]',
    bindings: [{ event: '*', schema: 'offerra', table: 'report' }],
    onChange: () => {
      console.log('[ODZNAK] Zmena v nahláseniach — prepočítavam');
      void reload();
    },
    onStatus: (status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log(`[ODZNAK] Kanál sa neotvoril: ${status} — ostáva obnova pri návrate do appky`);
      }
    },
  });

  // ── 2. návrat do appky ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload();
    });
    return () => sub.remove();
  }, [isAdmin, reload]);

  return count;
}
