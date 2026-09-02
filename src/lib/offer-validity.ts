/**
 * Platnosť ponuky — ČISTÉ funkcie, ZÁMERNE MIMO `offers.ts`, presne z toho
 * istého dôvodu ako `deadline.ts` (viď hlavička tamtoho súboru): `offers.ts`
 * na úrovni modulu importuje `./property` → `./supabase`, takže sa nedá
 * spustiť v Node bez appky. Bez tohto rozdelenia by nevznikol test, ktorý
 * pri ĎALŠOM redizajne okamžite nahlási, že countdown zmizol — presne to,
 * čo sa countdown uzávierky stalo TRIKRÁT (CLAUDE.md §10).
 *
 * TENTO SÚBOR NEMÁ ŽIADEN RUNTIME IMPORT. `import type` na `TFunc` je
 * výnimka — typové importy sa pri kompilácii vymažú, nulový runtime dopad.
 *
 * PLATNOSŤ PONUKY vs. UZÁVIERKA INZERÁTU — DVE ROZDIELNE VECI:
 *   - uzávierka (`deadline.ts`) patrí INZERÁTU, nastaví ju majiteľ, platí
 *     pre PRÍJEM nových ponúk.
 *   - platnosť (tento súbor) patrí JEDNEJ PONUKE, nastaví ju záujemca pri
 *     podaní, a hovorí, dokedy tá konkrétna ponuka ešte stojí.
 * Obe bežia nezávisle na sebe — inzerát môže mať uzávierku o 30 dní a
 * jednotlivá ponuka na ňom platnosť len 7 dní, alebo žiadnu.
 *
 * PREČO `isOfferExpired` BERIE AJ `status`, NIE LEN `valid_until`
 * (27.8.2026): DB zapisuje `status = 'EXPIRED'` výhradne cez
 * `offerra.expire_offers()`, ktorú spúšťa `pg_cron` raz za minútu — appka
 * teda nesmie čakať LEN na ten stĺpec, inak by ešte celú minútu po uplynutí
 * ukazovala ponuku ako živú. Appka preto počíta expiráciu ŽIVO z
 * `valid_until` a `status === 'EXPIRED'` berie len ako druhý, rovnocenný
 * dôvod (napr. keď medzitým platnosť predĺžili, ale cron ešte nestihol
 * status vrátiť — v appke sa to nestáva, lebo úprava platnosti ide len na
 * PENDING ponuku, ale funkcia to nerieši implicitne, rieši to explicitne).
 */
import type { TFunc } from '@/i18n';

/**
 * „{{count}} deň / dni / dní" — voľby v `OfferValidityPicker` teraz idú
 * od 1 dňa, takže na rozdiel od `deadlinePicker.days` (kde bola najmenšia
 * voľba 7, teda vždy „dní") už NEJDE vystačiť si s jedným tvarom.
 * Rovnaké skloňovanie ako `offersWord` v `deadline.ts` — a rovnaký dôvod,
 * prečo je to tu, nie natvrdo v komponente: „1 dní" je gramaticky zle
 * a bez testu (`check-offer-validity.ts`) by sa to našlo až na telefóne,
 * presne ako sa to stalo pri „Máš 1 ponuka" (13.8.2026). EN/DE majú len
 * jednotné/množné číslo, žiadny tretí tvar.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function offerValidityDaysLabel(t: TFunc, language: string, days: number): string {
  if (language === 'sk') {
    const key = days === 1 ? 'pickerDaysOne' : days >= 2 && days <= 4 ? 'pickerDaysFew' : 'pickerDaysMany';
    return t(`offerValidity.${key}`, { count: days });
  }
  return t(days === 1 ? 'offerValidity.pickerDaysOne' : 'offerValidity.pickerDaysMany', { count: days });
}

/**
 * Uplynula platnosť ponuky? Bez termínu nikdy. Vynucuje to aj DB
 * (guard_offer_update). `now` je voliteľný a defaultne `Date.now()` — live
 * countdown (`offerCountdown` nižšie) ho posiela EXPLICITNE, nech oba
 * výpočty (je expirovaná? / koľko ešte ostáva?) bežia na presne tom istom
 * čase, nie na dvoch nezávislých volaniach `Date.now()` o zlomok
 * milisekundy od seba.
 */
export function isOfferExpired(status: string, validUntil: string | null, now: number = Date.now()): boolean {
  return status === 'EXPIRED' || (validUntil != null && new Date(validUntil).getTime() <= now);
}

/**
 * Odpočet platnosti ponuky, ŽIVO a STUPŇOVITO (Rastio, 1.9.2026, formát
 * OPRAVENÝ 2.9.2026 po nasadení — päťkrát, naposledy zjednotením zápisu
 * na dvojciferné sekundy/minúty a pridaním hodín aj do stupňa „dni"):
 *
 *   - `days` — 24 hodín a viac: „Ponuka platí ešte 3 dni 4h" (hodiny sa
 *     ukážu LEN keď nie sú nulové — presne na hranici dňa teda len
 *     „Ponuka platí ešte 3 dni"). Sekundy tu zámerne CHÝBAJÚ (Rastio,
 *     2.9.2026, piate kolo: „sekundy pri viacdňovom odpočte nemajú
 *     zmysel a zbytočne by tikali") — stačí prekresliť raz za minútu
 *     (o to sa stará `useOfferCountdownTick`), lebo hodina sa nemení
 *     rýchlejšie.
 *   - `hm` — menej než 24 hodín, hodina a viac: „Ponuka platí ešte 12h
 *     35m 08s" — SEKUNDY SÚ SÚČASŤOU HODNOTY aj tu (Rastio, 2.9.2026,
 *     štvrté a piate kolo: „sekundy nech idú VŽDY, nie len v poslednej
 *     hodine" — predtým tento stupeň tikal len po minútach). Minúty aj
 *     sekundy sú dvojciferné (`pad2`) — na rozdiel od hodín, ktoré sú
 *     vždy VEDÚCA jednotka a dopĺňanie nuly by tam nemalo zmysel.
 *     `urgent` je `false` — hodiny do konca NIE SÚ skutočná naliehavosť
 *     (viď nižšie), sekundy tu menia len ŽIVOSŤ zobrazenia, nie farbu.
 *   - `hms` — posledná hodina: `urgent` JE `true` — „Ponuka platí ešte
 *     47m 12s", a pod poslednú minútu (`m === 0`) už len „Ponuka platí
 *     ešte 38 s" (BEZ dopĺňania nuly — je to teraz VEDÚCA jednotka,
 *     rovnaká zásada ako pri hodinách vyššie; jednotku minút netreba
 *     ukazovať, keď je nulová). Bez hodinovej časti, lebo pod hodinu je
 *     `h` vždy 0.
 *   - `expired` — platnosť uplynula, appka to musí ukázať OKAMŽITE (živo z
 *     `valid_until`), nie až keď to o niekoľko minút neskôr prekvapí cron.
 *
 * `tier` rozlišuje `hm`/`hms` len podľa `urgent` hranice (1 hodina) —
 * SEKUNDY sú vo formáte OBOCH, počítajú sa jedným spoločným vzorcom nižšie.
 *
 * PREČO PODMET V TEXTE (Rastio, 2.9.2026, po treťom kole spätnej väzby):
 * holé „ostáva 12h 52m" nepovie, ČOHO sa odpočet týka — inzerátu, ponuky,
 * obhliadky? Text preto VŽDY pomenúva podmet („Ponuka platí ešte…").
 * `offerValidity.countdown` skladá vetu z JEDNÉHO spoločného i18n kľúča
 * pre všetky štyri stupne (mení sa len `value`), aby sa podmet nemohol
 * rozísť medzi stupňami. Volajúci s VLASTNÝM, jednoznačnejším podmetom
 * (napr. `MyListingRow`: „Najbližšia ponuka platí ešte…") použije radšej
 * holé `value` a poskladá si vetu sám — `text` je len DEFAULT pre miesta
 * bez takého kontextu.
 *
 * PREČO `urgent` LEN V POSLEDNEJ HODINE, nie skôr (Rastio, 2.9.2026):
 * appka krátko ukazovala odpočet ČERVENÝ vždy, kým ponuka platila — pri
 * 13 hodinách do konca to bolo zbytočne dramatické a červená by si
 * odvykla znamenať niečo výnimočné. `urgent` (a s ním farba/tučné
 * písmo u volajúceho) je preto `true` LEN pre `hms`, teda skutočne
 * poslednú hodinu.
 *
 * `null` len keď ponuka platnosť vôbec nemá (`valid_until` je `null`) —
 * vtedy appka o platnosti mlčí, presne ako pri uzávierke bez termínu.
 *
 * Volajúci POSIELA `now` (z jedného spoločného tikajúceho hooku na celú
 * obrazovku, `useOfferCountdownTick`) — táto funkcia sama žiadny interval
 * nezakladá, je to čistá funkcia jedného okamihu.
 */
export type OfferCountdownTier = 'days' | 'hm' | 'hms' | 'expired';

export interface OfferCountdown {
  tier: OfferCountdownTier;
  /**
   * Holé trvanie/stav BEZ podmetu — „12h 35m 08s" / „47m 12s" / „38 s" /
   * „3 dni 4h". Pre `expired` rovnaké ako `text` (nie je čo skladať).
   * Na použitie s VLASTNÝM podmetom u volajúceho, ktorý ho už má
   * (napr. „Najbližšia ponuka" v `MyListingRow`).
   */
  value: string;
  /** Hotová veta VRÁTANE podmetu („Ponuka platí ešte…") — default pre miesta bez vlastného. */
  text: string;
  /** Skutočná naliehavosť — LEN posledná hodina (`hms`). Farba/tučné písmo majú byť zvýraznené IBA vtedy. */
  urgent: boolean;
}

export function offerCountdown(
  t: TFunc,
  language: string,
  status: string,
  iso: string | null,
  now: number = Date.now()
): OfferCountdown | null {
  if (!iso) return null;
  if (isOfferExpired(status, iso, now)) {
    const value = t('offerValidity.expired');
    return { tier: 'expired', value, text: value, urgent: false };
  }
  const totalSeconds = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  if (totalSeconds < 86_400) {
    const h = Math.floor(totalSeconds / 3_600);
    const m = Math.floor((totalSeconds % 3_600) / 60);
    const s = totalSeconds % 60;
    const value = h > 0 ? `${h}h ${pad2(m)}m ${pad2(s)}s` : m > 0 ? `${m}m ${pad2(s)}s` : `${s} s`;
    const urgent = totalSeconds < 3_600;
    return { tier: urgent ? 'hms' : 'hm', value, text: t('offerValidity.countdown', { value }), urgent };
  }
  const days = Math.floor(totalSeconds / 86_400);
  const h = Math.floor((totalSeconds % 86_400) / 3_600);
  const daysLabel = offerValidityDaysLabel(t, language, days);
  const value = h > 0 ? `${daysLabel} ${h}h` : daysLabel;
  return { tier: 'days', value, text: t('offerValidity.countdown', { value }), urgent: false };
}
