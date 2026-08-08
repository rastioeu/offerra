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
export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';

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

/**
 * Tá istá dvojica typov obchodu, ale z pohľadu HĽADAJÚCEHO. Dopyt je opačný
 * smer než inzerát — „Predaj" pri dopyte znie, akoby človek predával
 * (Rastio, 8.8.2026).
 */
export const DEMAND_LABEL: Record<TransactionType, string> = {
  SALE: 'Kúpim',
  RENT: 'Hľadám prenájom',
};

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  FURNISHED: 'Zariadený',
  PARTIAL: 'Čiastočne',
  UNFURNISHED: 'Nezariadený',
};

export const UTILITIES_LABEL: Record<Utilities, string> = {
  YES: 'Áno',
  NO: 'Nie',
  PARTIAL: 'Čiastočne',
};

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  DRAFT: 'Rozpracované',
  ACTIVE: 'Zverejnené',
  REJECTED: 'Skryté správcom',
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

/**
 * Dátum bez času (`YYYY-MM-DD`). `formatDate` sa naň nedá použiť —
 * `new Date('2026-09-01')` je polnoc UTC a v našom pásme by z toho v zime
 * vyšiel predošlý deň.
 */
export function formatDay(day: string | null): string | null {
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Intl.DateTimeFormat('sk-SK', {
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
export function buildingRows(p: Property): { label: string; value: string }[] {
  if (p.property_type !== 'APARTMENT') return [];
  const rows: { label: string; value: string }[] = [];

  if (p.floor != null) {
    const where = p.floor < 0 ? 'Suterén' : p.floor === 0 ? 'Prízemie' : `${p.floor}. poschodie`;
    rows.push({
      label: 'Poschodie',
      value: p.floors_total != null ? `${where} z ${p.floors_total}` : where,
    });
  } else if (p.floors_total != null) {
    rows.push({ label: 'Počet poschodí', value: String(p.floors_total) });
  }

  if (p.has_elevator != null) rows.push({ label: 'Výťah', value: p.has_elevator ? 'Áno' : 'Nie' });
  if (p.monthly_costs != null) {
    rows.push({
      label: 'Mesačné náklady',
      // `SALE` je tu len preto, aby sa suma nevypísala ako „…/mesiac" —
      // slovo „mesačné" je už v názve riadku a dvakrát by to bolo hlúpe.
      value: formatPrice(p.monthly_costs, 'SALE') ?? '—',
    });
  }
  return rows;
}

export function rentalRows(p: Property): { label: string; value: string }[] {
  if (p.transaction_type !== 'RENT') return [];
  const rows: { label: string; value: string }[] = [];

  if (p.deposit_amount != null) {
    const eur = formatPrice(p.deposit_amount, 'SALE');
    rows.push({
      label: 'Zábezpeka',
      value:
        p.deposit_months != null
          ? `${eur} (${p.deposit_months}× mesačný nájom)`
          : (eur as string),
    });
  } else if (p.deposit_months != null) {
    rows.push({ label: 'Zábezpeka', value: `${p.deposit_months}× mesačný nájom` });
  }

  const from = formatDay(p.available_from);
  if (from) rows.push({ label: 'Dostupné od', value: from });
  if (p.min_lease_months != null) {
    rows.push({ label: 'Minimálna doba nájmu', value: `${p.min_lease_months} mesiacov` });
  }
  if (p.furnishing) rows.push({ label: 'Zariadenie', value: FURNISHING_LABEL[p.furnishing] });
  if (p.utilities_included) {
    rows.push({ label: 'Energie v nájme', value: UTILITIES_LABEL[p.utilities_included] });
  }
  if (p.internet_included != null) {
    rows.push({ label: 'Internet v nájme', value: p.internet_included ? 'Áno' : 'Nie' });
  }
  if (p.pets_allowed != null) {
    rows.push({ label: 'Domáce zvieratá', value: p.pets_allowed ? 'Povolené' : 'Nepovolené' });
  }
  return rows;
}

/**
 * Naliehavosť uzávierky — riadi FARBU štítku na karte, nie jeho text.
 *
 * `PASSED`  — už po termíne, žiadna urgencia, len fakt.
 * `SOON`    — menej než 3 dni; vtedy sa štítok sfarbí varovne.
 * `OPEN`    — beží, ale pokojne.
 * `NONE`    — inzerát časovač nemá.
 */
export type DeadlineUrgency = 'NONE' | 'OPEN' | 'SOON' | 'PASSED';

/** Hranica, od ktorej je uzávierka „naliehavá" (Rastio, 8.8.2026). */
export const SOON_DAYS = 3;

export function deadlineUrgency(iso: string | null): DeadlineUrgency {
  if (!iso) return 'NONE';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'PASSED';
  return ms < SOON_DAYS * 86_400_000 ? 'SOON' : 'OPEN';
}

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

/** Uplynula uzávierka? Bez časovača nikdy. Vynucuje to aj RLS v DB. */
export function isDeadlinePassed(iso: string | null): boolean {
  return iso != null && new Date(iso).getTime() <= Date.now();
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
