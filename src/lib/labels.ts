/**
 * Slová pre typ obchodu a typ nehnuteľnosti — ČISTÝ modul bez importov.
 *
 * Prečo je to samostatný súbor a nie súčasť `property.ts`: `property.ts`
 * importuje `./supabase`, takže sa nedá načítať v Node bez appky. Poradie a
 * názvy filtrov sa ale overujú testom (`scripts/check-filters.ts`) — presne
 * ten istý dôvod, z ktorého sa 13.8.2026 vyčlenil `deadline.ts`.
 *
 * `property.ts` tieto mapy **re-exportuje**, takže miesta, ktoré ich
 * importujú odtiaľ, sa nemenia.
 */
import type { PropertyType, TransactionType } from './property';

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  SALE: 'Predaj',
  RENT: 'Prenájom',
};

/**
 * Tá istá dvojica typov obchodu, ale z pohľadu HĽADAJÚCEHO. Dopyt je opačný
 * smer než inzerát — „Predaj" pri dopyte znie, akoby človek predával
 * (Rastio, 8.8.2026).
 */
export const DEMAND_LABEL: Record<TransactionType, string> = {
  SALE: 'Kúpim',
  RENT: 'Hľadám prenájom',
};

export const PROPERTY_LABEL: Record<PropertyType, string> = {
  APARTMENT: 'Byt',
  HOUSE: 'Dom',
  LAND: 'Pozemok',
  COMMERCIAL: 'Komerčný priestor',
  OTHER: 'Iné',
};
