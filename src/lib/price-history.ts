/**
 * História zmien orientačnej ceny.
 *
 * PREČO JE VEREJNÁ: orientačná cena je verejná od začiatku a jej ZMENA je
 * informácia rovnakej povahy. Keby verejná nebola, dalo by sa týždeň pred
 * uzávierkou ticho zdvihnúť cenu a záujemcovia by ponúkali proti niečomu,
 * čo sa im pod rukami zmenilo.
 *
 * Zapisuje ju VÝHRADNE trigger v databáze. Nikto nemá `insert` grant,
 * takže sa nedá podvrhnúť ani prepísať — inak by to nebola história,
 * ale len ďalšie pole, ktoré si vlastník upraví.
 */
import type { TFunc } from '@/i18n';

import type { Offer } from './offers';
import { db, formatPrice, type TransactionType } from './property';

export type PriceChange = {
  id: string;
  property_id: string;
  old_price: number | null;
  new_price: number | null;
  changed_at: string;
};

export async function fetchPriceHistory(propertyId: string): Promise<PriceChange[]> {
  const { data, error } = await db()
    .from('price_history')
    .select('id, property_id, old_price, new_price, changed_at')
    .eq('property_id', propertyId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PriceChange[];
}

/**
 * Zhrnutie jednou vetou — to je to, čo človek naozaj chce vedieť.
 * Celý zoznam zmien je pre väčšinu inzerátov zbytočný detail.
 */
export function priceSummary(
  t: TFunc,
  history: PriceChange[],
  transaction: TransactionType
): { text: string; direction: 'DOWN' | 'UP' } | null {
  if (history.length === 0) return null;
  const newest = history[0];
  const oldest = history[history.length - 1];
  const from = oldest.old_price;
  const to = newest.new_price;
  if (from == null || to == null || from === to) return null;

  const down = to < from;
  const pct = Math.round((Math.abs(to - from) / from) * 100);
  const times = history.length === 1 ? '' : t('priceHistory.changedNTimes', { count: history.length });
  return {
    direction: down ? 'DOWN' : 'UP',
    text: t(down ? 'priceHistory.lowered' : 'priceHistory.raised', {
      price: formatPrice(t, from, transaction) as string,
      pct,
      times,
    }),
  };
}


/**
 * Bod na časovej osi ceny — buď zmena orientačnej ceny, alebo REKORDNÁ
 * ponuka. Prevzaté z paralelnej vetvy (worktree `ulice-ra-import`), kde to
 * bolo spravené lepšie než moje jednoriadkové zhrnutie.
 */
export type PricePoint = {
  at: string;
  kind: 'ASKING' | 'OFFER';
  value: number | null;
  /** Predošlá orientačná cena — nech sa dá povedať „zlacnené o…". */
  from?: number | null;
};

/**
 * Zmeny ceny a rast najvyššej ponuky na JEDNEJ osi.
 *
 * Rekordy sa POČÍTAJÚ z ponúk, ktoré appka aj tak načítala — druhá
 * tabuľka s tými istými číslami by sa raz rozišla s pravdou.
 */
export function buildTimeline(changes: PriceChange[], offers: Offer[]): PricePoint[] {
  const points: PricePoint[] = changes.map((c) => ({
    at: c.changed_at,
    kind: 'ASKING',
    value: c.new_price,
    from: c.old_price,
  }));

  const live = offers
    .filter((o) => o.status !== 'WITHDRAWN' && o.status !== 'REJECTED')
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  let best = -Infinity;
  for (const o of live) {
    if (o.amount > best) {
      best = o.amount;
      points.push({ at: o.created_at, kind: 'OFFER', value: o.amount });
    }
  }

  return points.sort((a, b) => (a.at < b.at ? -1 : 1));
}
