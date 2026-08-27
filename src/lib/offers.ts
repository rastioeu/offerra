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
import type { TFunc } from '@/i18n';

import { db } from './property';
import { supabase } from './supabase';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
export type RequestStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CLOSED';

export type PublicBidder = { nickname: string; avatar_url: string | null };

export type Offer = {
  id: string;
  property_id: string;
  bidder_id: string;
  amount: number;
  /**
   * Správa pre predávajúceho. **Nie je verejná** — 8.8.2026 sa zistilo, že
   * ju cez `select *` videl ktokoľvek, kto otvoril inzerát. Odvtedy na ňu
   * `anon` ani `authenticated` nemajú stĺpcový grant a napĺňa sa výhradne
   * cez `offer_messages()` (vlastník inzerátu = všetky, záujemca = len tá
   * svoja). Kde sa nedotiahne, je `null` — to je správny stav, nie chyba.
   */
  message: string | null;
  status: OfferStatus;
  /**
   * Dokedy ponuka platí. `null` = bez obmedzenia. Rovnaký vzor ako
   * `property.offer_deadline` — appka počíta uplynutie ŽIVO
   * (`isOfferExpired`, `src/lib/offer-validity.ts`), nespolieha sa len na
   * `status === 'EXPIRED'` (ten nastaví cron `offerra.expire_offers()` až
   * s oneskorením do 5 minút).
   */
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Kedy si ponuku otvoril majiteľ inzerátu. `null` = ešte nie.
   *
   * Zapísať ho vie VÝHRADNE `offerra.mark_offers_viewed()` — záujemca naň
   * nemá ani stĺpcový grant. Keby si ho vedel nastaviť sám, bola by tá
   * informácia bezcenná.
   */
  viewed_by_owner_at: string | null;
  bidder?: PublicBidder | null;
};

/** Stav ponuky ako CESTA, nie ako jedno slovo (bod 13B). */
export type OfferStep = { label: string; at: string | null; done: boolean };

export function offerSteps(t: TFunc, o: Offer): OfferStep[] {
  const decided = o.status === 'ACCEPTED' || o.status === 'REJECTED';
  // EXPIRED patrí sem rovnako ako WITHDRAWN — je to KONIEC cesty ponuky,
  // len ho nespôsobil majiteľ ani záujemca, ale uplynutá platnosť.
  const terminal = decided || o.status === 'WITHDRAWN' || o.status === 'EXPIRED';
  return [
    { label: t('offers.stepSubmitted'), at: o.created_at, done: true },
    {
      label: o.viewed_by_owner_at ? t('offers.stepSeenByOwner') : t('offers.stepAwaitingOwner'),
      at: o.viewed_by_owner_at,
      done: Boolean(o.viewed_by_owner_at) || terminal,
    },
    {
      label:
        o.status === 'ACCEPTED' ? t('offers.statusAccepted')
          : o.status === 'REJECTED' ? t('offers.statusRejected')
          : o.status === 'WITHDRAWN' ? t('offers.statusWithdrawn')
          : o.status === 'EXPIRED' ? t('offers.statusExpired')
          : t('offers.stepDecision'),
      // `updated_at` je pri rozhodnutej/uzavretej ponuke čas rozhodnutia; pri
      // čakajúcej by to bol čas poslednej úpravy sumy, čo by klamalo.
      at: terminal ? o.updated_at : null,
      done: terminal,
    },
  ];
}

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
  region: string | null;
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

/**
 * Oslovenie MÔJHO dopytu aj s inzerátom, ktorý mi ponúkajú.
 *
 * CHYBA, KVÔLI KTOREJ VZNIKLO (Rastio, 9.8.2026): zoznam „OSLOVENIA (3)"
 * ukazoval len správu a dátum. Nedalo sa zistiť ANI ČO mi ponúkajú, nieto
 * sa na to prekliknúť. Celá dopytová strana bola jednosmerný zoznam.
 *
 * Chodí z `offerra.my_request_outreach()` — SECURITY DEFINER, ktorá hneď
 * v `where` obmedzí výber na dopyty volajúceho.
 */
export type MyOutreach = {
  id: string;
  request_id: string;
  property_id: string;
  from_id: string;
  from_nickname: string | null;
  message: string | null;
  created_at: string;
  property_title: string | null;
  property_city: string | null;
  /** Orientačná suma. V Offerre je NEPOVINNÁ, takže často `null`. */
  property_price: number | null;
  /** Najvyššia živá ponuka — keď cena chýba, toto je jediné číslo. */
  property_top_offer: number | null;
  property_rooms: number | null;
  property_area: number | null;
  property_status: string | null;
  request_description: string | null;
};

/** Protistrana odkrytá po akceptácii. `party` hovorí, koho kontakt to je. */
export type OfferContact = {
  party: 'OWNER' | 'BIDDER';
  nickname: string;
  full_name: string | null;
  phone: string | null;
  /** Z `auth.users`, nie z profilu — tam je vždy aktuálny. */
  email: string | null;
};

export function getOfferStatusLabel(t: TFunc): Record<OfferStatus, string> {
  return {
    PENDING: t('offers.statusPending'),
    ACCEPTED: t('offers.statusAccepted'),
    REJECTED: t('offers.statusRejected'),
    WITHDRAWN: t('offers.statusWithdrawn'),
    EXPIRED: t('offers.statusExpired'),
  };
}

export function getRequestStatusLabel(t: TFunc): Record<RequestStatus, string> {
  return {
    ACTIVE: t('offers.requestStatusActive'),
    FULFILLED: t('offers.requestStatusFulfilled'),
    EXPIRED: t('offers.requestStatusExpired'),
    CLOSED: t('offers.requestStatusClosed'),
  };
}

export function getEmploymentOptions(t: TFunc): string[] {
  return [
    t('offers.employmentFullTime'),
    t('offers.employmentSelfEmployed'),
    t('offers.employmentContract'),
    t('offers.employmentStudent'),
    t('offers.employmentRetired'),
    t('offers.employmentOther'),
  ];
}

export function formatAmount(t: TFunc, value: number, transaction: 'SALE' | 'RENT'): string {
  const amount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
  return transaction === 'RENT' ? t('property.priceMonthly', { amount }) : amount;
}

export function formatBudget(t: TFunc, min: number | null, max: number | null): string {
  const f = (v: number) =>
    new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  if (min != null && max != null) return `${f(min)} – ${f(max)}`;
  if (max != null) return t('offers.budgetUpTo', { amount: f(max) });
  if (min != null) return t('offers.budgetFrom', { amount: f(min) });
  return t('offers.budgetNotGiven');
}

/**
 * Stĺpce ponuky, ktoré smie čítať ktokoľvek.
 *
 * ZÁMERNE tu NIE JE `message` — a zámerne sa nepoužíva `*`. Rola `anon`
 * ani `authenticated` na `message` stĺpcový grant nemá, takže `*` by celý
 * dotaz zhodilo na 42501. Je to poistka: keby v tabuľke pribudol ďalší
 * citlivý stĺpec, `*` by ho ticho zverejnilo, tento zoznam nie.
 */
export const OFFER_PUBLIC_COLS =
  'id, property_id, bidder_id, amount, status, valid_until, created_at, updated_at, viewed_by_owner_at';

/**
 * Správy k ponukám na jeden inzerát — len tie, ktoré volajúci smie vidieť.
 *
 * Vlastník inzerátu dostane správy pri všetkých ponukách naň, záujemca
 * výhradne svoju vlastnú, neprihlásený nič. Rozhoduje o tom DB, nie appka.
 */
export async function fetchOfferMessages(propertyId: string): Promise<Record<string, string>> {
  // Neprihlásený na funkciu nemá `execute` — dotaz by skončil na 401 a do
  // logu by pri každom otvorení inzerátu spadla „chyba", ktorá chybou nie
  // je. Skutočné chyby by sa v tom šume stratili.
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return {};

  const { data, error } = await db().rpc('offer_messages', { p_property: propertyId });
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { offer_id: string; message: string }[]) map[r.offer_id] = r.message;
  return map;
}

/** Kontakt protistrany. Mimo stavu ACCEPTED vráti `null` — tak je to v DB. */
export async function fetchOfferContact(offerId: string): Promise<OfferContact | null> {
  const { data, error } = await db().rpc('offer_contact', { p_offer_id: offerId });
  if (error) throw error;
  const rows = (data ?? []) as OfferContact[];
  return rows[0] ?? null;
}
