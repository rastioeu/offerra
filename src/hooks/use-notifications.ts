/**
 * Oznámenia v appke (zvonček) + ŽIVÉ obnovenie cez Supabase Realtime.
 *
 * Oznámenia zakladá DATABÁZA cez triggery, nie klient — klient na to nemá
 * ani `INSERT` grant. Vďaka tomu sa nedajú podvrhnúť a vzniknú aj vtedy,
 * keď appka odosielateľa medzitým spadne.
 *
 * Realtime je ten „živý pocit": keď na môj inzerát príde ponuka, zvonček
 * sa rozsvieti bez toho, aby som čokoľvek ťahal dole. Ak by sa kanál
 * nepodarilo otvoriť, appka funguje ďalej — len sa obnovuje pri návrate
 * na obrazovku. Tichý výpadok sa preto **loguje**, nie ignoruje.
 */
import { useCallback, useEffect, useState } from 'react';

import type { NotificationType } from '@/lib/notifications';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  property_id: string | null;
  offer_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    try {
      const { data, error: e } = await db()
        .from('notification')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (e) throw e;
      setItems((data ?? []) as AppNotification[]);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[ZVONČEK] Načítanie zlyhalo: ${m}`);
      setError(m);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ── živé obnovenie
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'offerra', table: 'notification', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[ZVONČEK] Nové oznámenie cez Realtime');
          setItems((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log(`[ZVONČEK] Realtime kanál sa neotvoril: ${status} — appka funguje ďalej bez neho`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    try {
      const { error: e } = await db().rpc('mark_notifications_read');
      if (e) throw e;
    } catch (e: unknown) {
      console.log(`[ZVONČEK] Označenie zlyhalo: ${String(e)}`);
      await reload();
    }
  }, [unread, reload]);

  return { items, unread, error, reload, markAllRead };
}
