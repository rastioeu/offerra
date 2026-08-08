/** Notifikačné preferencie — vlastné, súkromné, per typ. */
import { useCallback, useEffect, useState } from 'react';

import type { NotificationFrequency, NotificationPreference, NotificationType } from '@/lib/notifications';
import { db } from '@/lib/property';
import { errorText } from '@/lib/errors';

export function useNotificationPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<Record<string, NotificationPreference>>({});
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error: e } = await db().from('notification_preference').select('*');
      if (e) throw e;
      const next: Record<string, NotificationPreference> = {};
      for (const p of (data ?? []) as NotificationPreference[]) next[p.type] = p;
      setPrefs(next);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[NOTIFIKÁCIE] Načítanie zlyhalo: ${m}`);
      setError(m);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (type: NotificationType, patch: { enabled?: boolean; frequency?: NotificationFrequency }) => {
      if (!userId) return;
      const current = prefs[type];
      const next: NotificationPreference = {
        user_id: userId,
        type,
        enabled: patch.enabled ?? current?.enabled ?? true,
        frequency: patch.frequency ?? current?.frequency ?? 'IHNED',
      };
      setPrefs((p) => ({ ...p, [type]: next })); // okamžitá odozva
      try {
        const { error: e } = await db()
          .from('notification_preference')
          .upsert(next, { onConflict: 'user_id,type' });
        if (e) throw e;
      } catch (e: unknown) {
        const m = errorText(e);
        console.log(`[NOTIFIKÁCIE] Uloženie zlyhalo: ${m}`);
        setError(m);
        await reload(); // späť k pravde zo servera
      }
    },
    [prefs, userId, reload]
  );

  return { prefs, error, save };
}
