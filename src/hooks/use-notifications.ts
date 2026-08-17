/**
 * Oznámenia v appke (zvonček) + ŽIVÉ obnovenie cez Supabase Realtime.
 *
 * Oznámenia zakladá DATABÁZA cez triggery, nie klient — klient na to nemá
 * ani `INSERT` grant. Vďaka tomu sa nedajú podvrhnúť a vzniknú aj vtedy,
 * keď appka odosielateľa medzitým spadne.
 *
 * ── PÁD PRI PREPÍNANÍ TABOV (Rastio, 8.8.2026) ───────────────────────────
 *
 * Hláška zo zariadenia:
 *
 *   Error: cannot add `postgres_changes` callbacks for
 *   realtime:notif-33fadff3-… after `subscribe()`
 *   … NotificationBell ← AppHeader ← PridatScreen
 *
 * KOREŇOVÁ PRÍČINA, odmeraná v `realtime-js` 2.112.2
 * (`RealtimeClient.channel()`, riadky 330–342):
 *
 *   const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
 *   if (!exists) { …vytvor nový… } else { return exists; }
 *
 * `supabase.channel(topic)` teda **NEVYTVÁRA nový kanál** — pri rovnakom
 * názve vráti ten UŽ EXISTUJÚCI. A `AppHeader` (teda aj `NotificationBell`)
 * je na štyroch taboch naraz; taby v expo-routeri po prvom otvorení
 * ostávajú namontované. Takže:
 *
 *   1. tab Nehnuteľnosti  → channel('notif-X') vytvorí kanál → .on() → .subscribe()
 *   2. tab Pridať         → channel('notif-X') vráti TEN ISTÝ, už pripojený kanál
 *                         → .on('postgres_changes', …) na pripojený kanál → PÁD
 *
 * Poradie `.on()` pred `.subscribe()` teda bolo správne od začiatku — chyba
 * bola v tom, že kanál vznikal N-krát pre N inštancií hlavičky.
 *
 * OPRAVA: **jeden kanál na celú appku.** Stav aj predplatné drží
 * `NotificationsProvider` v koreni, presne ako `ProfileProvider`. Vedľajšie
 * chyby, ktoré tým zmizli tiež:
 *   - štyri rovnaké dotazy do DB pri každom otvorení tabu,
 *   - rozchádzajúci sa stav (označenie za prečítané v jednej inštancii
 *     nezhaslo zvonček v ostatných).
 *
 * Názov kanála má navyše **jednorazovú príponu**: aj keby v appke niekedy
 * omylom vznikli dva provideri, nesiahnu na ten istý kanál a táto trieda
 * chyby sa nemá ako vrátiť.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { NotificationType } from '@/lib/notifications';
import { db } from '@/lib/property';
import { errorText } from '@/lib/errors';
import { useRealtimeChannel } from '@/hooks/use-realtime-channel';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  property_id: string | null;
  offer_id: string | null;
  /** Predmet je dopyt, nie inzerát — len pri správe k dopytu (13.8.2026). */
  request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationsState = {
  items: AppNotification[];
  unread: number;
  error: string | null;
  reload: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

/** Beží raz na appku. Zakladá sa v `src/app/_layout.tsx`. */
export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Jednorazová prípona názvu kanála — poistka proti návratu tej istej
  // chyby, keby v appke niekedy vznikli dva provideri.
  const suffix = useRef(Math.random().toString(36).slice(2, 8));

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
      setError(null);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ZVONČEK] Načítanie zlyhalo: ${m}`);
      setError(m);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ── živé obnovenie ─────────────────────────────────────────────────
  // Prevedené na zdieľaný register (17.8.2026, §CLAUDE.md 11). Jednorazová
  // prípona v názve tu ZOSTÁVA: register síce kolíziu názvov už zvláda
  // zdieľaním, ale prípona drží pôvodný zámer z 8.8.2026 — dva provideri
  // (keby omylom vznikli) majú mať aj tak vlastný kanál a vlastný stav.
  useRealtimeChannel({
    topic: userId ? `notif-${userId}-${suffix.current}` : null,
    label: '[ZVONČEK]',
    bindings: userId
      ? [{ event: 'INSERT', schema: 'offerra', table: 'notification', filter: `user_id=eq.${userId}` }]
      : [],
    onChange: (payload) => {
      console.log('[ZVONČEK] Nové oznámenie cez Realtime');
      setItems((prev) => [payload.new as AppNotification, ...prev]);
    },
    onStatus: (status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log(`[ZVONČEK] Kanál sa neotvoril: ${status} — appka funguje ďalej bez neho`);
      }
    },
  });

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    try {
      const { error: e } = await db().rpc('mark_notifications_read');
      if (e) throw e;
    } catch (e: unknown) {
      console.log(`[ZVONČEK] Označenie zlyhalo: ${errorText(e)}`);
      await reload();
    }
  }, [unread, reload]);

  const value = useMemo<NotificationsState>(
    () => ({ items, unread, error, reload, markAllRead }),
    [items, unread, error, reload, markAllRead]
  );

  return createElement(NotificationsContext.Provider, { value }, children);
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications sa dá volať len vnútri <NotificationsProvider>.');
  return ctx;
}
