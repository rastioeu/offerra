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
 * OPRAVENÝ 2.9.2026 po nasadení):
 *
 *   - `days` — 24 hodín a viac: „ostáva 5 dní". Netreba tikať po
 *     sekundách, stačí prekresliť raz za čas (o to sa stará
 *     `useOfferCountdownTick` — sekundy tikajúce celý deň by zbytočne
 *     zaťažovali batériu bez toho, aby to niekomu pomohlo).
 *   - `hm` — menej než 24 hodín: „ostáva 4h 32m", reálne odpočítava.
 *   - `hms` — posledná hodina: tiká po sekundách a `urgent` je `true` —
 *     „ostáva 47m 12s", a pod poslednú minútu (`m === 0`) už len
 *     „ostáva 38 s" (jednotku minút netreba ukazovať, keď je nulová).
 *   - `expired` — platnosť uplynula, appka to musí ukázať OKAMŽITE (živo z
 *     `valid_until`), nie až keď to o niekoľko minút neskôr prekvapí cron.
 *
 * PREČO NIE DVOJBODKOVÝ FORMÁT (Rastio, 2.9.2026, po screenshote z appky):
 * pôvodná verzia ukazovala „14:07" — človek si to prečíta ako HODINU NA
 * HODINÁCH („o pol tretej"), nie ako zostávajúce trvanie. Jednotky (h/m/s)
 * a slovo pred číslom („ostáva…") odlíšia trvanie od hodiny na hodinách
 * hneď od prvého pohľadu — presne ako existujúci countdown uzávierky
 * inzerátu („ostáva 44 dní", `deadline.ts`), s ktorým je tento odpočet
 * teraz zjednotený. `offerValidity.countdown` je JEDEN spoločný i18n
 * kľúč pre všetky štyri stupne — mení sa len `value` (deň/hodinová
 * jednotka), obal („ostáva …" / „… left" / „noch …") je vo všetkých
 * rovnaký, takže sa nemôže rozísť medzi stupňami.
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
  /** Hotový text na zobrazenie — appka ho nesmie skladať sama. */
  text: string;
  /** Posledná hodina — appka to má zvýrazniť (napr. `palette.danger`). */
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
    return { tier: 'expired', text: t('offerValidity.expired'), urgent: false };
  }
  const totalSeconds = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  if (totalSeconds < 3_600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const value = m > 0 ? `${m}m ${s}s` : `${s} s`;
    return { tier: 'hms', text: t('offerValidity.countdown', { value }), urgent: true };
  }
  if (totalSeconds < 86_400) {
    const h = Math.floor(totalSeconds / 3_600);
    const m = Math.floor((totalSeconds % 3_600) / 60);
    return { tier: 'hm', text: t('offerValidity.countdown', { value: `${h}h ${m}m` }), urgent: false };
  }
  const days = Math.floor(totalSeconds / 86_400);
  return {
    tier: 'days',
    text: t('offerValidity.countdown', { value: offerValidityDaysLabel(t, language, days) }),
    urgent: false,
  };
}
