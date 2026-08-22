/**
 * Formulár inzerátu ako DÁTA — bez Reactu, bez obrazovky.
 *
 * PREČO SAMOSTATNE: chyba nahlásená Rastiom 9.8.2026 („pridám fotku a
 * všetko vyplnené zmizne") nebola v poliach ani v pickeri, ale v PRAVIDLE,
 * kedy sa formulár prepisuje zo servera. Také pravidlo sa nedá otestovať,
 * kým žije vnútri obrazovky. Odteraz je to funkcia, ktorú vie spustiť test.
 *
 * Číselné polia sú tu ZÁMERNE text, nie čísla. Keby boli čísla, zmazanie
 * posledného znaku by pole vynulovalo na 0 a používateľ by prišiel
 * o rozpísanú hodnotu. Prevod robí `num()` až pri ukladaní.
 */
import type { TFunc } from '@/i18n';

import type {
  Furnishing,
  Property,
  PropertyType,
  TransactionType,
  Utilities,
} from './property';

export type ListingForm = {
  transaction_type: TransactionType;
  property_type: PropertyType;
  title: string;
  description: string;
  city: string | null;
  district: string | null;
  region: string | null;
  street: string;
  latitude: number | null;
  longitude: number | null;
  address_hidden: boolean;
  offer_deadline: string | null;

  rooms: string;
  area: string;
  price: string;

  // byt
  floor: string;
  floorsTotal: string;
  monthlyCosts: string;
  hasElevator: boolean | null;

  // prenájom
  deposit: string;
  depositMonths: string;
  availableFrom: string | null;
  minLease: string;
  furnishing: Furnishing | null;
  utilities: Utilities | null;
  internet: boolean | null;
  pets: boolean | null;
};

/** Číslo z poľa. Prázdne → `null` (stĺpec je nullable, 0 by bola lož). */
export function num(text: string): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function text(n: number | null | undefined): string {
  return n != null ? String(n) : '';
}

/** Server → formulár. Volá sa RAZ pri otvorení, nikdy nie pri obnove dát. */
export function formFromProperty(p: Property): ListingForm {
  return {
    transaction_type: p.transaction_type,
    property_type: p.property_type,
    title: p.title ?? '',
    description: p.description ?? '',
    city: p.city,
    district: p.district,
    region: p.region,
    street: p.street ?? '',
    latitude: p.latitude,
    longitude: p.longitude,
    address_hidden: p.address_hidden,
    offer_deadline: p.offer_deadline,

    rooms: text(p.rooms),
    area: text(p.area_m2),
    price: text(p.asking_price_hint),

    floor: text(p.floor),
    floorsTotal: text(p.floors_total),
    monthlyCosts: text(p.monthly_costs),
    hasElevator: p.has_elevator,

    deposit: text(p.deposit_amount),
    depositMonths: text(p.deposit_months),
    availableFrom: p.available_from,
    minLease: text(p.min_lease_months),
    furnishing: p.furnishing,
    utilities: p.utilities_included,
    internet: p.internet_included,
    pets: p.pets_allowed,
  };
}

/** Formulár → to, čo ide do `update`. */
export function formToPatch(f: ListingForm): Partial<Property> {
  const isRent = f.transaction_type === 'RENT';
  const isFlat = f.property_type === 'APARTMENT';
  return {
    transaction_type: f.transaction_type,
    property_type: f.property_type,
    title: f.title,
    description: f.description.trim() || null,
    city: f.city,
    district: f.district,
    region: f.region,
    street: f.street.trim() || null,
    latitude: f.latitude,
    longitude: f.longitude,
    address_hidden: f.address_hidden,
    offer_deadline: f.offer_deadline,
    rooms: num(f.rooms),
    area_m2: num(f.area),
    asking_price_hint: num(f.price),
    // Pri PREDAJI sa podmienky nájmu ZAHADZUJÚ. Keby ostali, inzerát
    // prepnutý z prenájmu na predaj by si so sebou niesol zábezpeku,
    // ktorá pri predaji nedáva zmysel.
    deposit_amount: isRent ? num(f.deposit) : null,
    deposit_months: isRent ? num(f.depositMonths) : null,
    available_from: isRent ? f.availableFrom : null,
    min_lease_months: isRent ? num(f.minLease) : null,
    furnishing: isRent ? f.furnishing : null,
    utilities_included: isRent ? f.utilities : null,
    internet_included: isRent ? f.internet : null,
    pets_allowed: isRent ? f.pets : null,
    // Rovnaký dôvod ako pri nájme: prepnutie bytu na pozemok nesmie
    // nechať v inzeráte poschodie a výťah.
    floor: isFlat ? num(f.floor) : null,
    floors_total: isFlat ? num(f.floorsTotal) : null,
    has_elevator: isFlat ? f.hasElevator : null,
    monthly_costs: isFlat ? num(f.monthlyCosts) : null,
  };
}

/**
 * Formulár položený na posledný známy riadok zo servera — presne to, čo by
 * v DB vzniklo po uložení. Kontrola pred zverejnením musí posudzovať TOTO,
 * nie starý riadok: inak by hlásila chýbajúcu výmeru, ktorú má človek
 * napísanú pred sebou.
 */
export function formToCandidate(base: Property, f: ListingForm): Property {
  return { ...base, ...(formToPatch(f) as Partial<Property>) } as Property;
}

/**
 * POVINNÉ POLIA pre zverejnenie. Vracia zoznam toho, čo chýba — nie boolean:
 * používateľ musí vidieť DÔVOD, prečo sa nedá zverejniť.
 *
 * Typ obchodu a typ nehnuteľnosti v zozname nie sú zámerne — nedajú sa
 * nechať prázdne. Inzerát vzniká ako PREDAJ/BYT a prepínač vracia vždy
 * niektorú z možností, takže „chýbajúci" stav neexistuje.
 *
 * Kraj, ulica a orientačná cena sú NEPOVINNÉ, tak ako to má appka
 * navrhnuté: kraj sa dopĺňa sám z obce, presnú adresu zámerne nepýtame
 * a cenu má právo nepovedať ten, kto chce počuť ponuky.
 */
export function missingForPublish(t: TFunc, p: Property, photoCount: number): string[] {
  const missing: string[] = [];
  if (!p.title.trim()) missing.push(t('listingForm.missingTitle'));
  if (!p.city) missing.push(t('listingForm.missingCity'));
  if (p.property_type !== 'LAND' && p.rooms == null) missing.push(t('listingForm.missingRooms'));
  if (p.area_m2 == null) missing.push(t('listingForm.missingArea'));
  if (photoCount < 1) missing.push(t('listingForm.missingPhoto'));
  return missing;
}
