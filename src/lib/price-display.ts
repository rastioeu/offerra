/**
 * Čo sa má o cene a ponukách napísať — JEDNO miesto pre kartu aj detail.
 *
 * CHYBA, KTORÚ TO OPRAVUJE (Rastio 7.8.2026, screenshot): inzerát bez
 * orientačnej ceny písal „čaká na ponuky" aj vtedy, keď mal dve ponuky
 * a hneď pod tým ukazoval „Najvyššia ponuka 162 600 €". Text tvrdil opak
 * toho, čo bolo o riadok nižšie.
 *
 * Príčina: text sa odvádzal LEN od toho, či je vyplnená `asking_price_hint`.
 * Sú to však dve nezávislé veci — či predávajúci povedal cenu, a či už
 * niekto ponúkol.
 *
 * Preto je to teraz čistá funkcia nad OBOMA vstupmi, testovateľná bez
 * appky. Počet ponúk sa do nej vždy podáva živý, nie uložený.
 */
import type { TFunc } from '@/i18n';

export type PriceDisplay = {
  /** Orientačná cena predávajúceho, ak ju uviedol. */
  asking: number | null;
  /** Najvyššia ŽIVÁ ponuka (PENDING alebo ACCEPTED). */
  topOffer: number | null;
  /** Počet živých ponúk. */
  offerCount: number;
  /** Čo je hlavné číslo na obrazovke. */
  headline: 'ASKING' | 'TOP_OFFER' | 'NONE';
  /** Text pod hlavným číslom. `null` = nič nepíš. */
  note: string | null;
};

export function priceDisplay(
  t: TFunc,
  asking: number | null,
  topOffer: number | null,
  offerCount: number
): PriceDisplay {
  const hasOffers = offerCount > 0 && topOffer != null;

  // 1. bez ceny, bez ponúk — jediný prípad, kde sa smie čakať
  if (asking == null && !hasOffers) {
    return { asking, topOffer, offerCount, headline: 'NONE', note: t('priceDisplay.noPriceNoOffers') };
  }

  // 2. bez ceny, ponuky UŽ sú — hlavné číslo je najvyššia ponuka
  if (asking == null && hasOffers) {
    return { asking, topOffer, offerCount, headline: 'TOP_OFFER', note: t('priceDisplay.noPriceGiven') };
  }

  // 3. cena je, ponuky ešte nie — žiadna zmienka o čakaní
  if (asking != null && !hasOffers) {
    return { asking, topOffer, offerCount, headline: 'ASKING', note: t('priceDisplay.indicative') };
  }

  // 4. cena aj ponuky — hlavné číslo je PONUKA, orientačná cena vedľa.
  //    Rozhodnutie z mockupu „Dôveryhodne teplá" (schválené 8.8.2026):
  //    skutočná ponuka je dôležitejšia než želanie predávajúceho. Predtým
  //    tu bolo `ASKING` a ponuka sa krčila v druhom riadku pod ňou.
  return { asking, topOffer, offerCount, headline: 'TOP_OFFER', note: t('priceDisplay.indicative') };
}

/**
 * „2 ponuky" so správnym tvarom. `null` keď niet čo písať.
 * Slovenské tri tvary (ponuka/ponuky/ponúk) — pozri `formatRooms` pre ten
 * istý vzor pri izbách.
 */
export function offerCountLabel(t: TFunc, language: string, n: number): string | null {
  if (n <= 0) return null;
  if (language === 'sk') {
    const key = n === 1 ? 'offerCountOne' : n < 5 ? 'offerCountFew' : 'offerCountMany';
    return t(`priceDisplay.${key}`, { count: n });
  }
  return t(n === 1 ? 'priceDisplay.offerCountOne' : 'priceDisplay.offerCountMany', { count: n });
}
