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
  const { propertyId } = target;

  // Systémové oznámenie sa nikdy neviaže na konkrétnu nehnuteľnosť —
  // patrí do zvončeka, kde je celý text.
  if (type === 'SYSTEMOVE') return { pathname: '/oznamenia' };

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
    case 'NOVA_ZHODA':
    case 'NOVY_DOPYT_ZODPOVEDA_INZERATU':
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
  if (!type && !propertyId) return null;
  return notificationRoute(type, { propertyId, offerId });
}
