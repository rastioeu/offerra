/**
 * Rozumenie slovenskej otázke — „3 izbový byt v Petržalke do 250 tisíc".
 *
 * ZÁMERNE bez jazykového modelu. Dôvody, nie lenivosť:
 *  - `rastioeu/offerra` je VEREJNÝ repozitár a `EXPO_PUBLIC_*` premenné sa
 *    zapekajú do klientskeho bundlu — API kľúč by sa nedal ukryť ani v jednom.
 *    Skutočný model by potreboval serverovú medzivrstvu, ktorú Offerra nemá.
 *  - Doména je úzka a uzavretá: typ obchodu, typ nehnuteľnosti, izby, cena,
 *    výmera, obec. To sa dá rozobrať presne a bez hádania.
 *  - Funguje offline, okamžite a zadarmo.
 *
 * Čo NEVIE: preklepy v názvoch obcí a voľné formulácie („niečo pri lese").
 * Zvyšok textu preto ide do fulltextu nad názvom a popisom — nič sa nestratí.
 */
import type { PropertyType, TransactionType } from './property';

/**
 * Z ktorej strany trhu sa pozeráme. Filter je ÚPLNE ROVNAKÝ objekt —
 * mení sa len to, ako sa pomenúva a proti akým stĺpcom sa púšťa.
 *
 * `PROPERTY` = ponuka (inzeráty), `DEMAND` = dopyt (kto hľadá).
 * Rozhodnutie Rastia 8.8.2026 (možnosť B): rovnaká lišta a rovnaké
 * ovládanie, len slová podľa smeru — pri dopyte nesmie stáť „Predaj".
 */
export type FilterSide = 'PROPERTY' | 'DEMAND';

export type CatalogFilter = {
  text: string | null;
  transaction: TransactionType | null;
  propertyType: PropertyType | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
  roomsMin: number | null;
  areaMin: number | null;
};

export const EMPTY_FILTER: CatalogFilter = {
  text: null,
  transaction: null,
  propertyType: null,
  city: null,
  priceMin: null,
  priceMax: null,
  roomsMin: null,
  areaMin: null,
};

export function isFilterEmpty(f: CatalogFilter): boolean {
  return (Object.keys(EMPTY_FILTER) as (keyof CatalogFilter)[]).every((k) => f[k] == null);
}

/**
 * Diakritika preč a malé písmená — aby „banska bystrica" našlo
 * „Banská Bystrica".
 *
 * MUSÍ dávať ten istý výsledok ako `offerra.norm()` v databáze, inak by
 * sa hľadanie minulo cieľ. Overené na desiatich slovenských názvoch
 * vrátane `ľ`, `ô`, `ä` — obe strany vrátili to isté (report
 * `HLADANIE_BEZ_DIAKRITIKY.md`).
 *
 * Používa sa VŠADE, kde ide text od používateľa do dotazu — nie len
 * v rozbore vety.
 */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const TRANSACTION_WORDS: [RegExp, TransactionType][] = [
  [/\b(prenaj|najom|najm|podnaj)/, 'RENT'],
  [/\b(predaj|predam|kupa|kupit|kupim|na predaj)/, 'SALE'],
];

const TYPE_WORDS: [RegExp, PropertyType][] = [
  [/\b(byt|garsonk|garzonk|mezonet)/, 'APARTMENT'],
  [/\b(dom|chat|vil|chalup|novostavb)/, 'HOUSE'],
  [/\b(pozemok|pozemk|parcel|zahrad(a|u)\b|orn)/, 'LAND'],
  [/\b(priestor|kancelari|obchod|komerc|prevadzk|sklad)/, 'COMMERCIAL'],
];

const ROOM_WORDS: [RegExp, number][] = [
  [/\bgarsonk|garzonk/, 1],
  [/\bjednoizb/, 1],
  [/\bdvojizb/, 2],
  [/\btrojizb/, 3],
  [/\bstvorizb/, 4],
  [/\bpatizb|pätizb/, 5],
];

/** „250 tis" → 250000, „1,2 mil" → 1200000. */
function scale(value: number, suffix: string): number {
  if (/^(tis|tisic)/.test(suffix)) return value * 1000;
  if (/^(mil|milion)/.test(suffix)) return value * 1_000_000;
  return value;
}

export type Parsed = {
  filter: CatalogFilter;
  understood: string[];
  cityGuess: string | null;
  cityCandidates: string[];
};

export function parseQuery(raw: string): Parsed {
  const f: CatalogFilter = { ...EMPTY_FILTER };
  const understood: string[] = [];
  // Desatinnú čiarku medzi číslicami zachováme ako bodku („1,2 mil"),
  // ostatnú interpunkciu zahodíme.
  let s =
    ' ' +
    normalizeText(raw)
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/[,;]/g, ' ')
      .replace(/\.(?!\d)/g, ' ')
      .replace(/\s+/g, ' ') +
    ' ';

  const eat = (re: RegExp) => {
    s = s.replace(re, ' ');
  };

  for (const [re, v] of TRANSACTION_WORDS) {
    if (re.test(s)) {
      f.transaction = v;
      understood.push(v === 'RENT' ? 'prenájom' : 'predaj');
      eat(new RegExp(re.source + '\\w*', 'g'));
      break;
    }
  }

  for (const [re, v] of TYPE_WORDS) {
    if (re.test(s)) {
      f.propertyType = v;
      understood.push(
        v === 'APARTMENT' ? 'byt' : v === 'HOUSE' ? 'dom' : v === 'LAND' ? 'pozemok' : 'komerčný priestor'
      );
      eat(new RegExp(re.source + '\\w*', 'g'));
      break;
    }
  }

  for (const [re, n] of ROOM_WORDS) {
    if (re.test(s)) {
      f.roomsMin = n;
      understood.push(`${n} izb.`);
      eat(new RegExp(re.source + '\\w*', 'g'));
      break;
    }
  }

  // „3 izbový", „3-izb", „3 izby"
  const rooms = s.match(/\b(\d)\s*-?\s*izb\w*/);
  if (rooms && f.roomsMin == null) {
    f.roomsMin = Number(rooms[1]);
    understood.push(`${rooms[1]} izb.`);
    eat(/\b\d\s*-?\s*izb\w*/g);
  }

  // výmera — vždy s jednotkou, inak by sa pomýlila s cenou
  const area = s.match(/\b(?:od|nad|aspon|min)?\s*(\d{1,5})\s*(?:m2|m²|metrov)\b/);
  if (area) {
    f.areaMin = Number(area[1]);
    understood.push(`od ${area[1]} m²`);
    eat(/\b(?:od|nad|aspon|min)?\s*\d{1,5}\s*(?:m2|m²|metrov)\b/g);
  }

  // Číslo s medzerami po tisícoch („250 000") + voliteľná mierka.
  // POZOR: kvantifikátor MUSÍ byť hltavý — lenivý `{0,9}?` bral len prvú
  // číslicu, takže „do 600" vychádzalo ako 6 (nájdené testom 7.8.2026).
  const NUM = '(\\d+(?:\\.\\d+)?(?:\\s\\d{3})*)\\s*(tis\\w*|mil\\w*)?\\s*(?:eur|€)?';

  const upTo = s.match(new RegExp('\\b(?:do|max|maximalne|pod)\\s+' + NUM));
  if (upTo) {
    f.priceMax = scale(Number(upTo[1].replace(/\s/g, '')), upTo[2] ?? '');
    understood.push(`do ${f.priceMax.toLocaleString('sk-SK')} €`);
    eat(new RegExp('\\b(?:do|max|maximalne|pod)\\s+' + NUM, 'g'));
  }

  const from = s.match(new RegExp('\\b(?:od|nad|min|aspon)\\s+' + NUM));
  if (from) {
    f.priceMin = scale(Number(from[1].replace(/\s/g, '')), from[2] ?? '');
    understood.push(`od ${f.priceMin.toLocaleString('sk-SK')} €`);
    eat(new RegExp('\\b(?:od|nad|min|aspon)\\s+' + NUM, 'g'));
  }

  // holé veľké číslo bez predložky berieme ako hornú hranicu — tak to
  // ľudia myslia („byt Nitra 150000")
  if (f.priceMax == null && f.priceMin == null) {
    const bare = s.match(new RegExp('\\b' + NUM + '(?=\\s|$)'));
    if (bare) {
      const v = scale(Number(bare[1].replace(/\s/g, '')), bare[2] ?? '');
      if (v >= 200) {
        f.priceMax = v;
        understood.push(`do ${v.toLocaleString('sk-SK')} €`);
        eat(new RegExp('\\b' + NUM + '(?=\\s|$)', 'g'));
      }
    }
  }

  // zvyšok — predložky preč, ostane kandidát na obec + voľný text
  const STOP = new Set([
    'v', 've', 'na', 'pri', 'do', 'od', 'a', 'so', 's', 'z', 'zo', 'okres',
    'okrese', 'meste', 'obci', 'hladam', 'hlada', 'hladaju', 'chcem', 'kupim',
    'kupujem', 'najdi', 'nieco',
    'izb', 'izba', 'izby', 'izieb', 'eur', 'e',
  ]);
  const words = s.split(' ').map((w) => w.trim()).filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));

  // Kandidáti na obec: najprv celý zvyšok, potom jednotlivé slová od
  // najdlhšieho. „dom so záhradou Selce" tak nájde Selce, aj keď
  // „záhradou" ostalo v texte.
  const cityCandidates = [
    ...(words.length > 1 ? [words.join(' ')] : []),
    ...[...words].sort((a, b) => b.length - a.length),
  ];
  f.text = words.length > 0 ? words.join(' ') : null;

  return { filter: f, understood, cityGuess: cityCandidates[0] ?? null, cityCandidates };
}

/** Krátky ľudský popis filtra pre lištu nad výsledkami. */
export function describeFilter(f: CatalogFilter, side: FilterSide = 'PROPERTY'): string[] {
  const out: string[] = [];
  if (f.transaction) {
    out.push(
      side === 'DEMAND'
        ? f.transaction === 'RENT'
          ? 'Hľadám prenájom'
          : 'Kúpim'
        : f.transaction === 'RENT'
          ? 'Prenájom'
          : 'Predaj'
    );
  }
  if (f.propertyType) {
    out.push(
      f.propertyType === 'APARTMENT' ? 'Byt'
        : f.propertyType === 'HOUSE' ? 'Dom'
        : f.propertyType === 'LAND' ? 'Pozemok'
        : f.propertyType === 'COMMERCIAL' ? 'Komerčné' : 'Iné'
    );
  }
  if (f.city) out.push(f.city);
  if (f.roomsMin != null) out.push(`od ${f.roomsMin} izieb`);
  if (f.areaMin != null) out.push(`od ${f.areaMin} m²`);
  // Pri dopyte to nie je cena nehnuteľnosti, ale koľko je človek ochotný dať.
  if (f.priceMin != null) {
    out.push(`${side === 'DEMAND' ? 'ponúka od' : 'od'} ${f.priceMin.toLocaleString('sk-SK')} €`);
  }
  if (f.priceMax != null) {
    out.push(`${side === 'DEMAND' ? 'ponúka do' : 'do'} ${f.priceMax.toLocaleString('sk-SK')} €`);
  }
  if (f.text) out.push(`„${f.text}"`);
  return out;
}
