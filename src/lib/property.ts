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
import type { TFunc } from '@/i18n';

import { supabase } from './supabase';
// Uzávierka je ČISTÁ logika bez importov, presunutá 13.8.2026 nech sa dá
// testovať v Node bez appky — dôvod je celý zapísaný v `deadline.ts`.
// Re-exportuje sa ďalej, aby sa nemuseli meniť miesta, čo ju importujú
// odtiaľto (`@/lib/property`).
import {
  deadlineLabel,
  deadlineOutcome,
  deadlineUrgency,
  EXTEND_DAYS,
  extendedDeadline,
  isDeadlinePassed,
  SOON_DAYS,
  type DeadlineAction,
  type DeadlineOutcome,
  type DeadlineUrgency,
} from './deadline';

export const db = () => supabase.schema('offerra');
export {
  deadlineLabel,
  deadlineOutcome,
  deadlineUrgency,
  EXTEND_DAYS,
  extendedDeadline,
  isDeadlinePassed,
  SOON_DAYS,
  type DeadlineAction,
  type DeadlineOutcome,
  type DeadlineUrgency,
};

export type TransactionType = 'SALE' | 'RENT';
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'OTHER';
export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED' | 'CLOSED';

/** Zariadenie bytu — bežné delenie na slovenských realitných portáloch. */
export type Furnishing = 'FURNISHED' | 'PARTIAL' | 'UNFURNISHED';
/** Energie v nájme. „Čiastočne" je reálne najčastejšia odpoveď. */
export type Utilities = 'YES' | 'NO' | 'PARTIAL';

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
  /** Kraj — jeden z ôsmich. Dopĺňa sa z číselníka obcí pri výbere mesta. */
  region: string | null;
  /** Ulica bez čísla domu — nepovinná, presná adresa ostáva skrytá. */
  street: string | null;
  address_hidden: boolean;
  latitude: number | null;
  longitude: number | null;
  area_m2: number | null;
  rooms: number | null;
  asking_price_hint: number | null;
  offer_deadline: string | null;

  // ── len pre BYT, predaj aj prenájom (8.8.2026) ────────────────────────
  // Sú to vlastnosti BUDOVY, nie obchodu — poschodie a výťah zaujímajú
  // kupca rovnako ako nájomcu, preto nie sú medzi poľami nájmu nižšie.
  /** Poschodie. Záporné = podzemné podlažie. */
  floor: number | null;
  /** Z koľkých poschodí celkovo — spolu s `floor` dá „3. z 5". */
  floors_total: number | null;
  has_elevator: boolean | null;
  /**
   * Mesačné prevádzkové náklady bytu (fond opráv, spoločné priestory…).
   * NIE je to nájom ani zábezpeka — platí ich aj vlastník po kúpe.
   */
  monthly_costs: number | null;

  // ── len pre PRENÁJOM (bod 8, 8.8.2026) ────────────────────────────────
  // Pri predaji ostávajú `null` a formulár ich vôbec neukáže.
  /** Zábezpeka v eurách. */
  deposit_amount: number | null;
  /** Koľkým mesačným nájmom zábezpeka zodpovedá (bežne 1–3). */
  deposit_months: number | null;
  /** Dostupné od — dátum `YYYY-MM-DD`, nie timestamp: deň stačí. */
  available_from: string | null;
  min_lease_months: number | null;
  furnishing: Furnishing | null;
  utilities_included: Utilities | null;
  /**
   * Internet v cene nájmu. ZÁMERNE oddelené od `utilities_included` —
   * ľudia sa naň pýtajú zvlášť a „energie áno" nikdy neznamená „aj internet".
   */
  internet_included: boolean | null;
  pets_allowed: boolean | null;

  // ── uzavretie obchodu (8.8.2026) ──────────────────────────────────
  /** Kedy vlastník obchod uzavrel. `null` = beží ďalej. */
  closed_at: string | null;
  /** Víťazná ponuka. `null` znamená obchod uzavretý mimo Offerry. */
  closed_offer_id: string | null;
  /** Suma, za ktorú sa to naozaj stalo — nemusí sedieť s ponukou. */
  final_amount: number | null;

  view_count: number;
  is_seed: boolean;
  /** Vyplnené, len keď inzerát skryl správca — vlastník to musí vidieť. */
  rejection_reason?: string | null;
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

export type PropertyWithMedia = Property & {
  media: Media[];
  /** Kto inzerát pridal. Len prezývka a avatar — nič viac verejné nie je. */
  owner?: { nickname: string; avatar_url: string | null } | null;
  /** Najvyššia ŽIVÁ ponuka. Dopĺňa katalóg, v detaile sa počíta zo zoznamu. */
  top_offer?: number | null;
  offer_count?: number;
  /** Koľko ponúk ešte ČAKÁ na rozhodnutie. Podľa toho sa zvýrazní riadok. */
  pending_count?: number;
};

export type City = {
  id: number;
  name: string;
  district: string;
  region: string;
  population: number | null;
  /** Súradnice obce (nie presnej adresy) — zdroj mapových pinov. */
  lat: number | null;
  lon: number | null;
};

/**
 * Osem slovenských krajov. Zoznam je tu, aby sa dal ponúknuť aj vtedy, keď
 * si používateľ obec ešte nevybral — inak by sa kraj nedal zadať vôbec.
 * Rovnaké reťazce ako v stĺpci `offerra.city.region`, inak by filter
 * nesadol.
 */
export const REGIONS = [
  'Bratislavský kraj',
  'Trnavský kraj',
  'Trenčiansky kraj',
  'Nitriansky kraj',
  'Žilinský kraj',
  'Banskobystrický kraj',
  'Prešovský kraj',
  'Košický kraj',
] as const;

// Štítky typu obchodu a typu nehnuteľnosti sú v `labels.ts` — čistý modul
// bez importov, aby sa poradie a názvy filtrov dali overiť v Node
// (`scripts/check-filters.ts`). Re-export nech sa nemusia meniť miesta,
// ktoré ich importujú odtiaľto — rovnako ako pri `deadline.ts`.
export { getDemandLabel, getPropertyLabel, getTransactionLabel } from './labels';

export function getFurnishingLabel(t: TFunc): Record<Furnishing, string> {
  return {
    FURNISHED: t('property.furnishingFurnished'),
    PARTIAL: t('property.furnishingPartial'),
    UNFURNISHED: t('property.furnishingUnfurnished'),
  };
}

export function getUtilitiesLabel(t: TFunc): Record<Utilities, string> {
  return { YES: t('property.utilitiesYes'), NO: t('property.utilitiesNo'), PARTIAL: t('property.utilitiesPartial') };
}

export function getStatusLabel(t: TFunc): Record<PropertyStatus, string> {
  return {
    DRAFT: t('property.statusDraft'),
    ACTIVE: t('property.statusActive'),
    REJECTED: t('property.statusRejected'),
    ARCHIVED: t('property.statusArchived'),
    // Jeden stav pre predaj aj prenájom. Slovo vyrobí `transaction_type` —
    // dva stavy by boli dve miesta, kde sa dá zabudnúť na jedno z nich.
    CLOSED: t('property.statusClosed'),
  };
}

/** „Predané" alebo „Prenajaté" — podľa toho, o aký obchod išlo. */
export function closedLabel(t: TFunc, transaction: TransactionType): string {
  return transaction === 'RENT' ? t('property.closedRent') : t('property.closedSale');
}

/**
 * Prenájom má cenu za mesiac, predaj celkovú — nie je to ten istý údaj
 * s iným štítkom (upresnenie rozsahu, 7.8.2026).
 */
export function formatPrice(
  t: TFunc,
  value: number | null,
  transaction: TransactionType
): string | null {
  if (value == null) return null;
  const amount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
  return transaction === 'RENT' ? t('property.priceMonthly', { amount }) : amount;
}

/**
 * „3 izby" so správnym skloňovaním. Vytiahnuté z karty (9.8.2026), keď to
 * isté potreboval aj výber inzerátu pri oslovení dopytu — dve kópie
 * skloňovania by sa časom rozišli.
 *
 * OD LOKALIZÁCIE (19.8.2026): slovenčina má TRI tvary (izba/izby/izieb),
 * EN/DE len dva (jednotné/množné) — preto `language` rozhoduje, ktorý pár
 * kľúčov sa použije. `roomsFew` existuje len v `sk.json`.
 */
export function formatRooms(t: TFunc, language: string, value: number | null): string | null {
  if (value == null) return null;
  if (language === 'sk') {
    const key = value === 1 ? 'roomsOne' : value < 5 ? 'roomsFew' : 'roomsMany';
    return t(`property.${key}`, { count: value });
  }
  return t(value === 1 ? 'property.roomsOne' : 'property.roomsMany', { count: value });
}

export function formatArea(value: number | null): string | null {
  return value == null ? null : `${new Intl.NumberFormat('sk-SK').format(value)} m²`;
}

export function formatDate(language: string, iso: string): string {
  return new Intl.DateTimeFormat(localeTag(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** BCP-47 tag pre `Intl` — appka pozná len ISO 639-1 kód jazyka. */
function localeTag(language: string): string {
  return language === 'sk' ? 'sk-SK' : language === 'de' ? 'de-DE' : 'en-GB';
}

/**
 * Dátum bez času (`YYYY-MM-DD`). `formatDate` sa naň nedá použiť —
 * `new Date('2026-09-01')` je polnoc UTC a v našom pásme by z toho v zime
 * vyšiel predošlý deň.
 */
export function formatDay(language: string, day: string | null): string | null {
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Intl.DateTimeFormat(localeTag(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

/** Deň v MIESTNOM čase ako `YYYY-MM-DD`. `toISOString()` by tu klamal o pásmo. */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * `DD.MM.RRRR` → `YYYY-MM-DD`. `null`, keď to dátum nie je.
 *
 * Kontrola „nepretočenia" je podstatná: `new Date(2026, 0, 32)` je platný
 * objekt — je to 1. február. Bez nej by sa nezmysel ticho uložil ako iný
 * dátum, čo je horšie než chyba.
 */
export function parseSkDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null;
  }
  return isoDay(d);
}

/**
 * Riadky „podmienky prenájmu" do detailu. Nevyplnené polia sa vynechávajú —
 * prázdny riadok „Zábezpeka: —" nehovorí nič a len naťahuje obrazovku.
 */
/**
 * Riadky o BUDOVE — poschodie, výťah, mesačné náklady.
 *
 * Zobrazujú sa pri byte, a to pri predaji ROVNAKO ako pri prenájme.
 * Fond opráv nie je vec nájmu; kupca zaujíma presne tak isto.
 */
export function buildingRows(t: TFunc, language: string, p: Property): { label: string; value: string }[] {
  if (p.property_type !== 'APARTMENT') return [];
  const rows: { label: string; value: string }[] = [];

  if (p.floor != null) {
    const where =
      p.floor < 0 ? t('property.basement') : p.floor === 0 ? t('property.groundFloor') : t('property.floorN', { n: p.floor });
    rows.push({
      label: t('property.floorLabel'),
      value: p.floors_total != null ? t('property.floorOfTotal', { where, total: p.floors_total }) : where,
    });
  } else if (p.floors_total != null) {
    rows.push({ label: t('property.floorsTotalLabel'), value: String(p.floors_total) });
  }

  if (p.has_elevator != null) {
    rows.push({ label: t('property.elevatorLabel'), value: p.has_elevator ? t('common.yes') : t('common.no') });
  }
  if (p.monthly_costs != null) {
    rows.push({
      label: t('property.monthlyCostsLabel'),
      // `SALE` je tu len preto, aby sa suma nevypísala ako „…/mesiac" —
      // slovo „mesačné" je už v názve riadku a dvakrát by to bolo hlúpe.
      value: formatPrice(t, p.monthly_costs, 'SALE') ?? '—',
    });
  }
  return rows;
}

export function rentalRows(t: TFunc, language: string, p: Property): { label: string; value: string }[] {
  if (p.transaction_type !== 'RENT') return [];
  const rows: { label: string; value: string }[] = [];

  if (p.deposit_amount != null) {
    const eur = formatPrice(t, p.deposit_amount, 'SALE');
    rows.push({
      label: t('property.depositLabel'),
      value:
        p.deposit_months != null
          ? t('property.depositWithMonths', { amount: eur as string, months: p.deposit_months })
          : (eur as string),
    });
  } else if (p.deposit_months != null) {
    rows.push({ label: t('property.depositLabel'), value: t('property.depositMonthsOnly', { months: p.deposit_months }) });
  }

  const from = formatDay(language, p.available_from);
  if (from) rows.push({ label: t('property.availableFromLabel'), value: from });
  if (p.min_lease_months != null) {
    rows.push({ label: t('property.minLeaseLabel'), value: t('property.monthsCount', { count: p.min_lease_months }) });
  }
  if (p.furnishing) rows.push({ label: t('property.furnishingLabel'), value: getFurnishingLabel(t)[p.furnishing] });
  if (p.utilities_included) {
    rows.push({ label: t('property.utilitiesLabel'), value: getUtilitiesLabel(t)[p.utilities_included] });
  }
  if (p.internet_included != null) {
    rows.push({
      label: t('property.internetLabel'),
      value: p.internet_included ? t('common.yes') : t('common.no'),
    });
  }
  if (p.pets_allowed != null) {
    rows.push({
      label: t('property.petsLabel'),
      value: p.pets_allowed ? t('property.petsAllowed') : t('property.petsNotAllowed'),
    });
  }
  return rows;
}

// `DeadlineUrgency`, `SOON_DAYS`, `deadlineUrgency`, `isDeadlinePassed`
// a `deadlineLabel` bývali tu — presunuté 13.8.2026 do `deadline.ts`
// (importované a re-exportované hore) a odtiaľto zmazané, nie skopírované:
// dve kópie tej istej logiky by sa časom rozišli presne tak, ako sa
// rozišla appka od testu, ktorý na túto logiku nikdy nemohol existovať.

/** Podľa čoho je katalóg zoradený. */
export type CatalogSort = 'NEWEST' | 'ENDING_SOON';

/**
 * Zoradenie katalógu. Čistá funkcia — dá sa otestovať bez appky aj bez DB.
 *
 * `ENDING_SOON` má TRI skupiny, nie dve, a je to zámer:
 *
 *   1. inzeráty s BEŽIACOU uzávierkou, od najskôr končiacej,
 *   2. inzeráty, ktorým uzávierka UŽ UPLYNULA,
 *   3. inzeráty BEZ časovača.
 *
 * Samotné `order by offer_deadline asc` by dalo hore tie, ktorým termín
 * dávno vypršal — teda presný opak urgencie, ktorú má toto triedenie
 * ukazovať. Preto sa to nerobí v SQL, ale tu.
 */
export function sortProperties<T extends { created_at: string; offer_deadline: string | null }>(
  items: T[],
  sort: CatalogSort
): T[] {
  const byNewest = (a: T, b: T) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0);
  if (sort === 'NEWEST') return [...items].sort(byNewest);

  const bucket = (p: T): number => {
    const u = deadlineUrgency(p.offer_deadline);
    return u === 'NONE' ? 2 : u === 'PASSED' ? 1 : 0;
  };

  return [...items].sort((a, b) => {
    const ba = bucket(a), bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (ba === 2) return byNewest(a, b); // bez časovača — aspoň od najnovšieho
    const ta = new Date(a.offer_deadline as string).getTime();
    const tb = new Date(b.offer_deadline as string).getTime();
    // Bežiace: čo končí skôr, ide hore. Uplynuté: čo skončilo naposledy.
    return ba === 0 ? ta - tb : tb - ta;
  });
}

// `missingForPublish` sa presunulo do `listing-form.ts` (9.8.2026) — patrí
// k formuláru a hlavne sa tam dá spustiť testom bez Reactu a bez Supabase.
