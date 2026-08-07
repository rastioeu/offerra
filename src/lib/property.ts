/**
 * OFFERRA — dátový model inzerátov (schéma `offerra`).
 *
 * Stĺpce sú snake_case, tak ako v DB — žiadna mapovacia vrstva. Prekladať
 * `transaction_type` na `transactionType` by znamenalo dve mená pre tú istú
 * vec a pri každej chybe hádať, ktoré z nich je pravda.
 *
 * Schému `offerra` neuvádzame v `createClient`, ale cez `supabase.schema()` —
 * ten istý klient musí súčasne vedieť na `auth`, ktorý žije inde.
 */
import { supabase } from './supabase';

export const db = () => supabase.schema('offerra');

export type TransactionType = 'SALE' | 'RENT';
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'OTHER';
export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type Property = {
  id: string;
  owner_id: string;
  transaction_type: TransactionType;
  property_type: PropertyType;
  status: PropertyStatus;
  title: string;
  description: string | null;
  city: string | null;
  district: string | null;
  address_hidden: boolean;
  latitude: number | null;
  longitude: number | null;
  area_m2: number | null;
  rooms: number | null;
  asking_price_hint: number | null;
  offer_deadline: string | null;
  view_count: number;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
};

export type Media = {
  id: string;
  property_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

export type PropertyWithMedia = Property & { media: Media[] };

export type City = {
  id: number;
  name: string;
  district: string;
  region: string;
  population: number | null;
};

export const TRANSACTION_LABEL: Record<TransactionType, string> = {
  SALE: 'Predaj',
  RENT: 'Prenájom',
};

export const PROPERTY_LABEL: Record<PropertyType, string> = {
  APARTMENT: 'Byt',
  HOUSE: 'Dom',
  LAND: 'Pozemok',
  COMMERCIAL: 'Komerčný priestor',
  OTHER: 'Iné',
};

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  DRAFT: 'Rozpracované',
  ACTIVE: 'Zverejnené',
  ARCHIVED: 'Archivované',
};

/**
 * Prenájom má cenu za mesiac, predaj celkovú — nie je to ten istý údaj
 * s iným štítkom (upresnenie rozsahu, 7.8.2026).
 */
export function formatPrice(
  value: number | null,
  transaction: TransactionType
): string | null {
  if (value == null) return null;
  const amount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
  return transaction === 'RENT' ? `${amount} / mesiac` : amount;
}

export function formatArea(value: number | null): string | null {
  return value == null ? null : `${new Intl.NumberFormat('sk-SK').format(value)} m²`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Ostávajúci čas do uzávierky ponúk. `null` = bez časovača alebo už po ňom. */
export function deadlineLabel(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Príjem ponúk ukončený';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Ponuky do ${formatDate(iso)} · ostáva ${days} dní`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `Ponuky sa uzatvárajú o ${hours} h`;
}

/**
 * Povinné polia pre zverejnenie. Vracia zoznam toho, čo chýba — nie boolean:
 * používateľ musí vidieť DÔVOD, prečo sa nedá zverejniť.
 */
export function missingForPublish(p: Property, photoCount: number): string[] {
  const missing: string[] = [];
  if (!p.title.trim()) missing.push('názov inzerátu');
  if (!p.city) missing.push('mesto');
  if (p.property_type !== 'LAND' && p.rooms == null) missing.push('počet izieb');
  if (p.area_m2 == null) missing.push('výmera');
  if (photoCount < 1) missing.push('aspoň jedna fotka');
  return missing;
}
