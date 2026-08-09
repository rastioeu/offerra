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
  const times = history.length === 1 ? '' : ` · ${history.length}× menená`;
  return {
    direction: down ? 'DOWN' : 'UP',
    text: `${down ? 'Znížená' : 'Zvýšená'} z ${formatPrice(from, transaction)} o ${pct} %${times}`,
  };
}
