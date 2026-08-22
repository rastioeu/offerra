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
import type { TFunc } from '@/i18n';

import type { PropertyType, TransactionType } from './property';

/**
 * OD LOKALIZÁCIE (19.8.2026): štítky žijú v locale JSON (domain `labels`).
 * Statické `Record` sa nahradili funkciami, lebo tento súbor je ČISTÝ
 * (žiadny import appky) a testuje sa v Node (`scripts/check-filters.ts`) —
 * ten test si `t()` musí podať sám, presne ako appka.
 */
export function getTransactionLabel(t: TFunc): Record<TransactionType, string> {
  return { SALE: t('labels.transactionSale'), RENT: t('labels.transactionRent') };
}

/**
 * Tá istá dvojica typov obchodu, ale z pohľadu HĽADAJÚCEHO. Dopyt je opačný
 * smer než inzerát — „Predaj" pri dopyte znie, akoby človek predával
 * (Rastio, 8.8.2026).
 */
export function getDemandLabel(t: TFunc): Record<TransactionType, string> {
  return { SALE: t('labels.demandSale'), RENT: t('labels.demandRent') };
}

export function getPropertyLabel(t: TFunc): Record<PropertyType, string> {
  return {
    APARTMENT: t('labels.propertyApartment'),
    HOUSE: t('labels.propertyHouse'),
    LAND: t('labels.propertyLand'),
    COMMERCIAL: t('labels.propertyCommercial'),
    OTHER: t('labels.propertyOther'),
  };
}
