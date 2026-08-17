/**
 * Poradie a zloženie filtrov nad katalógom — ČISTÁ štruktúra, žiadny React.
 *
 * PREČO EXISTUJE (Rastio, 17.8.2026): filtre boli jeden zalamovaný zoznam
 * čipov, takže sa lámali podľa šírky obrazovky a nie podľa významu — v
 * prvom riadku skončilo „Predaj/Prenájom/Byt/Dom", v druhom
 * „Pozemok/Komerčný/Najnovšie", v treťom „Čoskoro končí/♥". Zmiešané.
 *
 * Odteraz sú riadky DÁTA, nie výsledok zalamovania:
 *
 *   1. TYP OBCHODU        Predaj · Prenájom      (dopyty: Kúpim · Hľadám prenájom)
 *   2. TYP NEHNUTEĽNOSTI  Byt · Dom · Pozemok · Komerčný priestor · Iné
 *   3. TRIEDENIE A OBĽÚBENÉ  Najnovšie · Čoskoro končí · ♥
 *                            (dopyty: Najnovšie — viď `DEMAND_SORTS`)
 *
 * Vďaka tomu sa poradie dá overiť v Node (`scripts/check-filters.ts`) a nie
 * len okom na telefóne — a nemôže sa rozísť medzi tabom Nehnuteľnosti a
 * tabom Dopyty, pretože oba čítajú TÚ ISTÚ funkciu.
 *
 * Prvé dva riadky ZUŽUJÚ, čo sa hľadá; tretí len mení pohľad na výsledok
 * (Rastio, 12.8.2026). Preto je tretí posledný a v UI oddelený linkou.
 */
import { DEMAND_LABEL, PROPERTY_LABEL, TRANSACTION_LABEL } from './labels';
import type { CatalogSort, PropertyType, TransactionType } from './property';
import type { FilterSide } from './search';

/** Poradie typov nehnuteľnosti v druhom riadku. „Iné" je zámerne posledné. */
export const PROPERTY_TYPE_ORDER: PropertyType[] = [
  'APARTMENT',
  'HOUSE',
  'LAND',
  'COMMERCIAL',
  'OTHER',
];

export const SORT_LABEL: Record<CatalogSort, string> = {
  NEWEST: 'Najnovšie',
  ENDING_SOON: 'Čoskoro končí',
};

/** Triedenie v katalógu — poradie čipov v treťom riadku. */
export const CATALOG_SORTS: CatalogSort[] = ['NEWEST', 'ENDING_SOON'];

/**
 * Triedenie v Dopytoch (Rastio, 17.8.2026: „pridaj Najnovšie do Dopytov").
 *
 * `ENDING_SOON` tu NIE JE a nie je to prehliadnutie: `buyer_request` nemá
 * v modeli uzávierku, takže „Čoskoro končí" by nemalo podľa čoho triediť
 * (overené v modeli 8.8.2026). Pridať by ho znamenalo najprv pridať dopytom
 * uzávierku — to je rozhodnutie o mechanike appky, nie o poradí filtrov.
 *
 * Jediná možnosť znamená, že čip je **vždy aktívny** — je to rádio s jednou
 * voľbou, teda ukazovateľ toho, ako je zoznam zoradený. Rovnako sa chová aj
 * katalóg: ťuknutie na už aktívne triedenie tam tiež nič nemení.
 */
export const DEMAND_SORTS: CatalogSort[] = ['NEWEST'];

export type FilterRowKind = 'TRANSACTION' | 'PROPERTY_TYPE' | 'VIEW';

export type FilterChipSpec =
  | { kind: 'TRANSACTION'; value: TransactionType; label: string }
  | { kind: 'PROPERTY_TYPE'; value: PropertyType; label: string }
  | { kind: 'SORT'; value: CatalogSort; label: string }
  | { kind: 'FAVORITES'; label: string; accessibilityLabel: string };

export type FilterRow = {
  kind: FilterRowKind;
  /** Názov kategórie — nevykresľuje sa, ide čítačke obrazovky. */
  title: string;
  chips: FilterChipSpec[];
};

/**
 * Tri riadky filtrov. Riadok bez jediného čipu sa NEVRACIA — prázdny riadok
 * by v UI nechal medzeru, ktorá vyzerá ako chyba (v tabe Dopyty nie je ani
 * triedenie, ani obľúbené).
 */
export function filterRows({
  side,
  sorts,
  canFavorite,
}: {
  side: FilterSide;
  /**
   * Ktoré triedenia obrazovka ponúka — `CATALOG_SORTS` alebo `DEMAND_SORTS`.
   * Prázdne pole = obrazovka triedenie nemá (vtedy o ňom nie je ani čip).
   */
  sorts: CatalogSort[];
  /** Prihlásený? Neprihlásenému sa srdiečko neponúka, nemá ho kam uložiť. */
  canFavorite: boolean;
}): FilterRow[] {
  const transaction = side === 'DEMAND' ? DEMAND_LABEL : TRANSACTION_LABEL;

  const rows: FilterRow[] = [
    {
      kind: 'TRANSACTION',
      title: 'Typ obchodu',
      chips: (['SALE', 'RENT'] as TransactionType[]).map((value) => ({
        kind: 'TRANSACTION' as const,
        value,
        label: transaction[value],
      })),
    },
    {
      kind: 'PROPERTY_TYPE',
      title: 'Typ nehnuteľnosti',
      chips: PROPERTY_TYPE_ORDER.map((value) => ({
        kind: 'PROPERTY_TYPE' as const,
        value,
        label: PROPERTY_LABEL[value],
      })),
    },
    {
      kind: 'VIEW',
      title: 'Triedenie a obľúbené',
      chips: [
        ...sorts.map((value) => ({ kind: 'SORT' as const, value, label: SORT_LABEL[value] })),
        // Obľúbené sú FILTER, nie samostatná obrazovka — inak by sa nedali
        // skombinovať s „Prenájom" ani s hľadaním, čo je presne to, na čo
        // ich človek chce. Samotné srdiečko, bez slova (Rastio, 12.8.2026).
        ...(side === 'PROPERTY' && canFavorite
          ? [{ kind: 'FAVORITES' as const, label: '♥', accessibilityLabel: 'Iba obľúbené' }]
          : []),
      ],
    },
  ];

  return rows.filter((row) => row.chips.length > 0);
}
