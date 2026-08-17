/**
 * JEDINÝ povolený spôsob, ako si v Offerre otvoriť Supabase Realtime kanál.
 *
 * Pravidlo je v `CLAUDE.md` §11. Dôvod, koreňová príčina a čo presne to
 * vylučuje, je zapísané v `src/lib/realtime.ts` — sem sa to needuplikuje,
 * aby si dva texty nemohli začať protirečiť.
 *
 * Volajúci NEDOSTANE do ruky ani `.on()`, ani `.subscribe()`, ani samotný
 * kanál. Odbery odovzdá ako dáta a hook mu garantuje:
 *   - správne poradie (`.on()` … `.on()` → `.subscribe()`),
 *   - jeden kanál zdieľaný medzi všetkými obrazovkami s tým istým topicom,
 *   - zatvorenie kanála až keď odíde POSLEDNÁ z nich.
 */
import { useEffect, useRef } from 'react';

import {
  bindingsKey,
  createRealtimeRegistry,
  type PgBinding,
  type PgPayload,
  type RealtimeStatus,
} from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

/**
 * Register je JEDEN na celú appku (modulová premenná) — inak by každá
 * obrazovka mala vlastné počítadlo a zdieľanie kanálov by nefungovalo.
 */
export const realtimeRegistry = createRealtimeRegistry({
  channel: (topic) => supabase.channel(topic) as never,
  removeChannel: (ch) => supabase.removeChannel(ch as never),
});

export type UseRealtimeChannelOptions = {
  /**
   * Logický názov kanála, napr. `property-<id>`. Dve obrazovky s rovnakým
   * topicom a rovnakými odbermi zdieľajú jeden kanál — to je zámer.
   * `null`/`undefined` = nič sa neotvára (kým sa napr. nenačíta `id`).
   */
  topic: string | null | undefined;
  bindings: PgBinding[];
  onChange: (payload: PgPayload) => void;
  onStatus?: (status: RealtimeStatus) => void;
  /** Predpona do logu, napr. `[DETAIL]`. */
  label?: string;
  /** `false` odber vôbec neotvorí (napr. používateľ nie je admin). */
  enabled?: boolean;
};

export function useRealtimeChannel({
  topic,
  bindings,
  onChange,
  onStatus,
  label,
  enabled = true,
}: UseRealtimeChannelOptions) {
  // Callbacky cez ref: keď volajúci odovzdá novú funkciu pri každom rendere
  // (bežné), kanál sa NESMIE zatvárať a otvárať dokola. Odber závisí len od
  // topicu a odberov, nie od identity funkcií.
  const onChangeRef = useRef(onChange);
  const onStatusRef = useRef(onStatus);
  onChangeRef.current = onChange;
  onStatusRef.current = onStatus;

  // To isté pre odbery — porovnávame ich OBSAHOM, nie referenciou, inak by
  // `bindings={[…]}` napísané priamo v tele komponentu resubscribovalo pri
  // každom rendere.
  const key = bindings.length ? bindingsKey(bindings) : '';
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled || !topic || !bindingsRef.current.length) return;
    return realtimeRegistry.subscribe({
      topic,
      bindings: bindingsRef.current,
      label,
      onChange: (payload) => onChangeRef.current(payload),
      onStatus: (status) => onStatusRef.current?.(status),
    });
  }, [topic, key, enabled, label]);
}
