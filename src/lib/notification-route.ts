/**
 * KAM VEDIE OZNÁMENIE — jedno rozhodnutie na jednom mieste.
 *
 * To isté oznámenie sa dá otvoriť dvoma cestami: klikom v zvončeku
 * (`oznamenia.tsx`) alebo klikom na push notifikáciu na zamknutej
 * obrazovke (`use-push-tap.ts`). Keby si každá cesta rozhodovala sama,
 * skončili by na inej obrazovke — a človek by nevedel, ktorá je tá pravá.
 *
 * CHYBA, KVÔLI KTOREJ TO VZNIKLO (Rastio, 9.8.2026): po kliknutí na push
 * notifikáciu sa appka otvorila tam, kde bola naposledy. Nebolo to zle
 * nasmerované — nesmerovalo to NIKAM, listener neexistoval vôbec.
 *
 * Funkcia je zámerne ČISTÁ (žiadny router, žiadny stav), aby sa dala
 * otestovať bez zariadenia.
 */
import type { NotificationType } from './notifications';

export type NotificationTarget = {
  /** id nehnuteľnosti, ktorej sa oznámenie týka */
  propertyId: string | null;
  /** id ponuky, ak ide o ponuku */
  offerId?: string | null;
  /**
   * id dopytu — vyplnené LEN pri správe k dopytu (`NOVA_SPRAVA`, keď
   * predmetom nie je inzerát). Pridané 13.8.2026 spolu s chatom pri
   * dopytoch: dovtedy `notification` nepoznala nič iné než inzerát a
   * ponuku, a takéto oznámenie by `if (!propertyId) return null;`
   * zahodilo — presne tá istá trieda chyby ako push, čo „nesmeroval
   * nikam" (9.8.2026, komentár vyššie).
   */
  requestId?: string | null;
};

export type Route = { pathname: string; params?: Record<string, string> };

/**
 * Kam patrí oznámenie daného typu.
 *
 * Pravidlo: **vedie tam, kde sa s tým dá NIEČO SPRAVIŤ**, nie tam, kde sa
 * to len dá prečítať. Majiteľ, ktorému pribudla ponuka, chce na správu
 * ponúk — nie na verejný detail vlastného inzerátu, odkiaľ by musel ešte
 * klikať ďalej.
 *
 * Vracia `null`, keď oznámenie nemá kam viesť (napr. systémové bez
 * nehnuteľnosti) — volajúci vtedy neurobí nič, prípadne otvorí zvonček.
 */
export function notificationRoute(
  type: NotificationType | string,
  target: NotificationTarget
): Route | null {
  const { propertyId, requestId } = target;

  // Systémové oznámenie sa nikdy neviaže na konkrétnu nehnuteľnosť —
  // patrí do zvončeka, kde je celý text.
  if (type === 'SYSTEMOVE') return { pathname: '/oznamenia' };

  // Správa k DOPYTU — jediný typ, ktorého predmetom môže byť dopyt, nie
  // inzerát. Vlákno je priamo na detaile dopytu (`dopyt/[id].tsx`),
  // rovnako ako pri inzeráte je v podtabe „Správy".
  if (type === 'NOVA_SPRAVA' && !propertyId && requestId) {
    return { pathname: '/dopyt/[id]', params: { id: requestId } };
  }

  if (!propertyId) return null;

  switch (type) {
    // Adresátom je MAJITEĽ a ide o rozhodnutie — prijať či odmietnuť.
    // Správa ponúk je jediná obrazovka, kde to spraví.
    case 'NOVA_PONUKA':
      return { pathname: '/ponuky/[id]', params: { id: propertyId } };

    // Adresátom je ZÁUJEMCA. Po prijatí sa na detaile odkryje kontakt,
    // pri obhliadke je tam karta obhliadky. Na `/ponuky/[id]` by sa
    // nedostal — tá je len pre majiteľa.
    case 'PONUKA_AKCEPTOVANA':
    case 'PONUKA_ZAMIETNUTA':
    case 'ZIADOST_O_OBHLIADKU':
    // Nová správa vedie na detail inzerátu — vlákno je v podtabe „Správy".
    // Vlastná obrazovka pre chat neexistuje zámerne: konverzácia patrí
    // k inzerátu, o ktorom sa vedie.
    case 'NOVA_SPRAVA':
    case 'NOVA_ZHODA':
    case 'NOVY_DOPYT_ZODPOVEDA_INZERATU':
      return { pathname: '/nehnutelnost/[id]', params: { id: propertyId } };

    // Oslovenie MÔJHO dopytu vedie na INZERÁT, ktorý ma oslovil — nie na
    // môj dopyt. `propertyId` je tu zámerne cudzí inzerát: tam sa dá
    // pozrieť, čo mi ponúkajú, a požiadať o obhliadku. Na vlastnom dopyte
    // by sa nedalo spraviť nič, a presne to bola nahlásená chyba.
    case 'OSLOVENIE_DOPYTU':
      return { pathname: '/nehnutelnost/[id]', params: { id: propertyId } };

    // Neznámy typ (napr. novší server než appka) nesmie skončiť pádom
    // ani tichým nič. Detail nehnuteľnosti je bezpečná odpoveď.
    default:
      return { pathname: '/nehnutelnost/[id]', params: { id: propertyId } };
  }
}

/** Tvar `data`, ktorý posiela `offerra.send_expo_push()`. */
export type PushData = {
  type?: string;
  propertyId?: string | null;
  offerId?: string | null;
  requestId?: string | null;
};

/**
 * Preloží `data` z push notifikácie na cestu.
 *
 * `data` prichádza zo siete, takže sa **nesmie** predpokladať tvar —
 * čokoľvek iné než reťazec sa zahodí.
 */
export function routeFromPushData(data: unknown): Route | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const type = typeof d.type === 'string' ? d.type : '';
  const propertyId = typeof d.propertyId === 'string' ? d.propertyId : null;
  const offerId = typeof d.offerId === 'string' ? d.offerId : null;
  const requestId = typeof d.requestId === 'string' ? d.requestId : null;
  if (!type && !propertyId && !requestId) return null;
  return notificationRoute(type, { propertyId, offerId, requestId });
}
