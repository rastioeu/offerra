/**
 * OFFERRA — ponuky, dotazník nájomcu, dopyty, oslovenia.
 *
 * Rozhodnutie Rastia 7.8.2026: ponuky sú **otvorené, ale pseudonymné**.
 * Sumu, prezývku, stav a dátum vidí každý — aj neprihlásený. Reálne meno
 * a telefón sú chránené STĹPCOVÝMI grantmi v DB (rola `authenticated` na
 * ne nemá SELECT vôbec) a odkryjú sa výhradne cez `offer_contact()` po
 * akceptácii. Preto sa tu nikde nečíta `profile.full_name` priamo —
 * nešlo by to a ani by to nebolo správne.
 */
import { db } from './property';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type RequestStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CLOSED';

export type PublicBidder = { nickname: string; avatar_url: string | null };

export type Offer = {
  id: string;
  property_id: string;
  bidder_id: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  bidder?: PublicBidder | null;
};

export type TenantProfile = {
  offer_id: string;
  num_people: number | null;
  has_pets: boolean;
  pet_details: string | null;
  lease_duration_months: number | null;
  employment_status: string | null;
  monthly_income_hint: number | null;
  move_in_date: string | null;
  note: string | null;
};

export type BuyerRequest = {
  id: string;
  user_id: string;
  transaction_type: 'SALE' | 'RENT';
  property_type: string | null;
  city: string | null;
  district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  rooms_min: number | null;
  area_min: number | null;
  description: string | null;
  status: RequestStatus;
  is_seed: boolean;
  created_at: string;
  author?: PublicBidder | null;
};

export type Outreach = {
  id: string;
  request_id: string;
  property_id: string;
  from_id: string;
  message: string | null;
  created_at: string;
};

/** Protistrana odkrytá po akceptácii. `party` hovorí, koho kontakt to je. */
export type OfferContact = {
  party: 'OWNER' | 'BIDDER';
  nickname: string;
  full_name: string | null;
  phone: string | null;
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: 'Čaká na odpoveď',
  ACCEPTED: 'Prijatá',
  REJECTED: 'Odmietnutá',
  WITHDRAWN: 'Stiahnutá',
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  ACTIVE: 'Aktívny',
  FULFILLED: 'Vybavený',
  EXPIRED: 'Vypršal',
  CLOSED: 'Zatvorený',
};

export const EMPLOYMENT_OPTIONS = [
  'Trvalý pracovný pomer',
  'Živnosť',
  'Dohoda / brigáda',
  'Študent',
  'Dôchodok',
  'Iné',
];

export function formatAmount(value: number, transaction: 'SALE' | 'RENT'): string {
  const amount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
  return transaction === 'RENT' ? `${amount} / mesiac` : amount;
}

export function formatBudget(min: number | null, max: number | null): string {
  const f = (v: number) =>
    new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  if (min != null && max != null) return `${f(min)} – ${f(max)}`;
  if (max != null) return `do ${f(max)}`;
  if (min != null) return `od ${f(min)}`;
  return 'Rozpočet neuvedený';
}

/** Kontakt protistrany. Mimo stavu ACCEPTED vráti `null` — tak je to v DB. */
export async function fetchOfferContact(offerId: string): Promise<OfferContact | null> {
  const { data, error } = await db().rpc('offer_contact', { p_offer_id: offerId });
  if (error) throw error;
  const rows = (data ?? []) as OfferContact[];
  return rows[0] ?? null;
}
