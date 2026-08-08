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
  /**
   * Len obľúbené. Zámerne `true | null`, nie `boolean` — `isFilterEmpty()`
   * pozná prázdno ako `null` a `false` by znamenalo, že filter nie je nikdy
   * prázdny a lišta „zrušiť filter" by svietila stále.
   */
  favoritesOnly: true | null;
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
  favoritesOnly: null,
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

/**
 * SKLOŇOVANIE — „v Bratislave" musí nájsť „Bratislava".
 *
 * Appka NEHĽADÁ vo voľnom texte, ale v uzavretom zozname 2 925 obcí, ktoré
 * sú v číselníku v prvom páde. To celú úlohu mení: netreba morfologickú
 * analýzu slovenčiny, stačí nájsť obec, s ktorou má zadané slovo dosť dlhý
 * SPOLOČNÝ ZÁKLAD. „bratislave" a „bratislava" sa rozchádzajú až na
 * desiatom písmene.
 *
 * Prefix zadaného slova preto NESTAČÍ hľadať priamo — `like 'bratislave%'`
 * nenájde nič, lebo v databáze je kratší tvar. Skracuje sa teda ZADANÉ
 * slovo, nie hľadané.
 */

/** Najkratší základ, ktorý ešte pošleme do databázy. */
export function cityStem(candidate: string): string {
  const s = normalizeText(candidate.trim());
  // Štyri písmená sú najdlhšia slovenská pádová koncovka, ktorú takto
  // potrebujeme zahodiť („Košic-iach").
  //
  // Spodná hranica sú TRI písmená, nie štyri — „Šali" by inak ostalo celé
  // a nenašlo „Šaľa" (zmerané). Široký záber tu nevadí, lebo vyberá až
  // `pickCity()` a ten žiada, aby bol názov obce takmer celý spotrebovaný.
  return s.slice(0, Math.max(3, s.length - 4));
}

/**
 * Z obcí, ktoré prefix vrátil, vyberie tú správnu.
 *
 * `dbSlack` = koľko z názvu obce ostalo nevyužité. Musí byť malé — inak by
 * „nitre" chytilo „Nitrianske Pravno". `inputSlack` = koľko ostalo zo
 * zadaného slova, čiže pádová koncovka; tá smie byť dlhšia.
 */
const VOWELS = 'aeiouy';

/**
 * Pohyblivé „-e-" — jediná alternácia, ktorú prefix sám nezvládne.
 * „Senec → v Senci", „Hlohovec → v Hlohovci": pri skloňovaní vypadne
 * samohláska UPROSTRED, takže spoločný základ končí už na „sen".
 *
 * Vracia tvar so vsunutým „e" späť („senci" → „senec"), aby sa dal
 * porovnať priamo. Nie je to morfologická analýza — je to jedno pravidlo
 * na jeden vzor, ktorý má medzi slovenskými mestami dosť zástupcov na to,
 * aby sa oplatil (Senec, Hlohovec, Vrbovec…).
 */
function restoreDroppedE(c: string): string | null {
  if (c.length < 4 || !VOWELS.includes(c[c.length - 1])) return null;
  const root = c.slice(0, -1);
  const a = root[root.length - 2];
  const b = root[root.length - 1];
  if (VOWELS.includes(a) || VOWELS.includes(b)) return null;   // treba dve spoluhlásky
  return `${root.slice(0, -1)}e${b}`;
}

export function pickCity<T extends { name_norm: string; population?: number | null }>(
  candidate: string,
  rows: T[]
): T | null {
  const c = normalizeText(candidate.trim());
  const cAlt = restoreDroppedE(c);
  let best: T | null = null;
  let bestScore = -Infinity;

  const common = (a: string, b: string) => {
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return k;
  };

  for (const r of rows) {
    const n = r.name_norm;
    // Skúsi sa zadaný tvar aj tvar s vrátenou samohláskou — vyhrá ten,
    // ktorý má s názvom obce dlhší spoločný základ.
    const iAlt = cAlt ? common(n, cAlt) : 0;
    const useAlt = iAlt > common(n, c);
    const c2 = useAlt ? (cAlt as string) : c;
    const i = useAlt ? iAlt : common(n, c);

    const dbSlack = n.length - i;
    const inputSlack = c2.length - i;

    // Názov obce musí byť takmer celý spotrebovaný. Jedno písmeno smie
    // ostať — to je práve tá pádová koncovka („Bratislav|a"). Dve už nie:
    // „so záhradou" by inak našlo obec **Záhradné** (zmerané, bola to
    // falošná zhoda).
    if (dbSlack > 1) continue;
    // Zo zadaného slova smie ostať celá koncovka („Košic|iach").
    if (inputSlack > 4) continue;
    // Pri krátkych názvoch nemožno žiadať štyri spoločné písmená —
    // „Šali" a „Šaľa" majú spoločné len tri.
    if (i < 3) continue;
    // Tri spoločné písmená stačia LEN vtedy, keď obom stranám ostáva
    // nanajvýš jedno. Bez tejto poistky „Senci" našlo obec **Seňa**
    // (zmerané) — sebavedomá nesprávna odpoveď je horšia než žiadna.
    if (i < 4 && dbSlack + inputSlack > 2) continue;
    // Dlhá koncovka („Košic|iach") je dôveryhodná len pri dlhom základe.
    // Inak „tehlový" našlo obec **Tehla** (zmerané).
    if (inputSlack >= 3 && i < 5) continue;

    // Dlhší spoločný základ vyhráva; pri zhode rozhodne väčšia obec —
    // „Selce" existujú v troch okresoch a človek myslí najčastejšie tú väčšiu.
    const score = i * 1000 - (dbSlack + inputSlack) * 100 + Math.min(r.population ?? 0, 99_999) / 1e5;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
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
  if (f.favoritesOnly) out.push('Obľúbené');
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
