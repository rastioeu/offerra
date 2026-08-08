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
  asking: number | null,
  topOffer: number | null,
  offerCount: number
): PriceDisplay {
  const hasOffers = offerCount > 0 && topOffer != null;

  // 1. bez ceny, bez ponúk — jediný prípad, kde sa smie čakať
  if (asking == null && !hasOffers) {
    return { asking, topOffer, offerCount, headline: 'NONE', note: 'Cena neuvedená — čaká na prvú ponuku' };
  }

  // 2. bez ceny, ponuky UŽ sú — hlavné číslo je najvyššia ponuka
  if (asking == null && hasOffers) {
    return { asking, topOffer, offerCount, headline: 'TOP_OFFER', note: 'Cenu predávajúci neuviedol' };
  }

  // 3. cena je, ponuky ešte nie — žiadna zmienka o čakaní
  if (asking != null && !hasOffers) {
    return { asking, topOffer, offerCount, headline: 'ASKING', note: 'orientačne' };
  }

  // 4. cena aj ponuky — hlavné číslo je PONUKA, orientačná cena vedľa.
  //    Rozhodnutie z mockupu „Dôveryhodne teplá" (schválené 8.8.2026):
  //    skutočná ponuka je dôležitejšia než želanie predávajúceho. Predtým
  //    tu bolo `ASKING` a ponuka sa krčila v druhom riadku pod ňou.
  return { asking, topOffer, offerCount, headline: 'TOP_OFFER', note: 'orientačne' };
}

/** „2 ponuky" so správnym tvarom. `null` keď niet čo písať. */
export function offerCountLabel(n: number): string | null {
  if (n <= 0) return null;
  return `${n} ${n === 1 ? 'ponuka' : n < 5 ? 'ponuky' : 'ponúk'}`;
}
