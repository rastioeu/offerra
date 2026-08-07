/**
 * Zavreté tipy — uložené v DB, nie v lokálnom stave.
 *
 * Presne tú chybu (kontrola naviazaná na app-state namiesto reálnych dát)
 * sme mali pri onboardingu prezývky a Rastio na ňu výslovne upozornil.
 * Preto: `undefined` = ešte nevieme, až po odpovedi zo servera vieme,
 * či tip ukázať.
 */
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/lib/property';

export type HintKey = 'HOW_IT_WORKS' | 'ADD_PROPERTY' | 'MAKE_OFFER' | 'ADMIN';

export function useHints(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<HintKey> | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!userId) {
      setDismissed(undefined); // NEVIEME — nie „nič nie je zavreté"
      return;
    }
    try {
      const { data, error } = await db().from('dismissed_hint').select('hint');
      if (error) throw error;
      setDismissed(new Set(((data ?? []) as { hint: HintKey }[]).map((r) => r.hint)));
    } catch (e: unknown) {
      console.log(`[TIPY] Načítanie zlyhalo: ${String(e)}`);
      setDismissed(undefined);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dismiss = useCallback(
    async (hint: HintKey) => {
      if (!userId) return;
      setDismissed((prev) => new Set([...(prev ?? []), hint]));
      try {
        const { error } = await db().from('dismissed_hint').insert({ user_id: userId, hint });
        if (error && !/duplicate key/i.test(error.message)) throw error;
      } catch (e: unknown) {
        console.log(`[TIPY] Uloženie zlyhalo: ${String(e)}`);
        await reload();
      }
    },
    [userId, reload]
  );

  /** `false` kým nevieme — tip radšej neukážeme, než aby blikol. */
  const shouldShow = useCallback(
    (hint: HintKey) => dismissed !== undefined && !dismissed.has(hint),
    [dismissed]
  );

  return { shouldShow, dismiss };
}
