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

/** Uplynula platnosť ponuky? Bez termínu nikdy. Vynucuje to aj DB (guard_offer_update). */
export function isOfferExpired(status: string, validUntil: string | null): boolean {
  return status === 'EXPIRED' || (validUntil != null && new Date(validUntil).getTime() <= Date.now());
}

/**
 * Dátum vo formáte podľa jazyka, LEN pre tento súbor — z rovnakého dôvodu
 * ako v `deadline.ts`: importovať `formatDate` z `property.ts` by znovu
 * pripojilo `./supabase` a zrušilo by to zmysel tohto súboru.
 */
function localDate(language: string, iso: string): string {
  const tag = language === 'sk' ? 'sk-SK' : language === 'de' ? 'de-DE' : 'en-GB';
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/**
 * Odpočet do konca platnosti ponuky, alebo fakt, že už uplynula.
 * `null` len keď ponuka platnosť vôbec nemá (`valid_until` je `null`) —
 * vtedy appka o platnosti nehovorí vôbec, presne ako pri uzávierke bez
 * termínu.
 */
export function offerValidityLabel(
  t: TFunc,
  language: string,
  status: string,
  iso: string | null,
  now: number = Date.now()
): string | null {
  if (!iso) return null;
  if (isOfferExpired(status, iso)) return t('offerValidity.expired');
  const ms = new Date(iso).getTime() - now;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return t('offerValidity.validUntil', { date: localDate(language, iso), days });
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return t('offerValidity.validUntilHours', { hours });
}
