/**
 * OFFERRA — skutočné push notifikácie.
 *
 * VZOR PREVZATÝ Z MUTARKU (`src/lib/push.ts`, read-only referencia):
 * odosiela **Expo Push API**, nie appka a nie priamo APNs. Appka len
 * získa token a uloží ho; zvyšok robí databáza (`send_expo_push()` cez
 * `pg_net`). Stav teda drží server a nič nemusí bežať medzi tým.
 *
 * `require()` v try/catch, nie statický import — `expo-notifications` je
 * NATÍVNY modul. Na builde, ktorý ho nemá (dnešný build #4), by statický
 * import zhodil celú obrazovku. Takto sa len ticho vypne push a zvyšok
 * appky funguje. Rovnaké pravidlo ako pri ikonách a image pickeri.
 *
 * ROZDIEL OPROTI MUTARKU: token ide do vlastnej tabuľky `offerra.push_token`
 * s kľúčom (používateľ, token), nie ako stĺpec na profile. Kto má telefón
 * aj tablet, dostane oznámenie na oboje.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { errorText } from './errors';
import { db } from './property';
import { supabase } from './supabase';

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/**
 * Minimálny tvar toho, čo z `expo-notifications` naozaj používame.
 *
 * ZÁMERNE sa nepíše `typeof import('expo-notifications')`: modul sa do
 * `package.json` pridáva až spolu s buildom, ktorý ho vie. Keby na ňom
 * viseli typy, projekt by sa medzitým nedal ani skompilovať — a tento
 * súbor je písaný práve tak, aby bez modulu len ticho nefungoval.
 */
type PushResponse = {
  notification: { request: { content: { data?: unknown } } };
};

type NotificationsApi = {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (o: { projectId: string }) => Promise<{ data: string }>;
  addNotificationResponseReceivedListener: (cb: (r: PushResponse) => void) => { remove: () => void };
  getLastNotificationResponseAsync: () => Promise<PushResponse | null>;
  setNotificationHandler: (h: unknown) => void;
};

/** `null`, keď modul v tomto builde nie je. */
function notificationsModule(): NotificationsApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export function pushAvailable(): boolean {
  return notificationsModule() !== null;
}

export async function getPushStatus(): Promise<PushStatus> {
  const N = notificationsModule();
  if (!N) return 'unavailable';
  try {
    const { status } = await N.getPermissionsAsync();
    return status as PushStatus;
  } catch (e: unknown) {
    console.log(`[PUSH] Zistenie povolenia zlyhalo: ${errorText(e)}`);
    return 'undetermined';
  }
}

/**
 * Vypýta povolenie a uloží token.
 *
 * Volá sa VÝHRADNE z akcie používateľa — appka sa nikdy nepýta sama od
 * seba pri štarte. Kto povolenie raz odmietne, systém sa ho druhýkrát
 * nespýta, takže agresívne pýtanie na úvod by možnosť natrvalo spálilo.
 */
export async function enablePush(): Promise<PushStatus> {
  const N = notificationsModule();
  if (!N) return 'unavailable';

  const { status: existing } = await N.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return 'denied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) throw new Error('Chýba EAS projectId v app.json (extra.eas.projectId).');

  const { data: token } = await N.getExpoPushTokenAsync({ projectId });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nie si prihlásený.');

  // `upsert` na (user_id, token): opakované povolenie na tom istom
  // zariadení nesmie vyrobiť druhý riadok.
  const { error } = await db()
    .from('push_token')
    .upsert(
      { user_id: user.id, token, platform: Platform.OS === 'ios' ? 'ios' : 'android', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  if (error) throw error;

  return 'granted';
}

/** Vypnutie na TOMTO zariadení — token sa zmaže, ostatné zariadenia bežia ďalej. */
export async function disablePushOnThisDevice(): Promise<void> {
  const N = notificationsModule();
  if (!N) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  try {
    const { data: token } = await N.getExpoPushTokenAsync({ projectId });
    const { error } = await db().from('push_token').delete().eq('token', token);
    if (error) throw error;
  } catch (e: unknown) {
    console.log(`[PUSH] Vypnutie zlyhalo: ${errorText(e)}`);
    throw e;
  }
}

/* ------------------------------------------------------------------ *
 * KLIK NA NOTIFIKÁCIU
 *
 * CHYBA (Rastio, 9.8.2026, build #5): „ked som otvoril notifikaciu tak
 * otvorilo appku tam kde bola otvorena". Nešlo o zlé smerovanie — appka
 * na klik NEPOČÚVALA VÔBEC. Push doručený, ale slepý.
 *
 * Sú to dva rôzne prípady a treba oba, inak polovica klikov nespraví nič:
 *  - appka BEŽÍ (aj na pozadí) → `addNotificationResponseReceivedListener`
 *  - appka bola ZABITÁ a klik ju spustil → `getLastNotificationResponseAsync`,
 *    lebo listener sa v tej chvíli ešte nestihol zaregistrovať.
 * ------------------------------------------------------------------ */

/** Vráti odhlasovaciu funkciu. Bez modulu je to no-op, nie chyba. */
export function onPushTap(handler: (data: unknown) => void): () => void {
  const N = notificationsModule();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((r) => {
      handler(r?.notification?.request?.content?.data);
    });
    return () => sub.remove();
  } catch (e: unknown) {
    console.log(`[PUSH] Listener sa nepodarilo nasadiť: ${errorText(e)}`);
    return () => {};
  }
}

/**
 * Notifikácia, ktorou bola appka SPUSTENÁ zo zabitého stavu — alebo `null`.
 *
 * POZOR: systém ju vracia opakovane, kým beží proces. Volajúci si preto
 * musí pamätať, že ju už spracoval, inak by pri každom prekreslení skočil
 * na tú istú obrazovku znova.
 */
export async function initialPushTap(): Promise<unknown | null> {
  const N = notificationsModule();
  if (!N) return null;
  try {
    const r = await N.getLastNotificationResponseAsync();
    return r?.notification?.request?.content?.data ?? null;
  } catch (e: unknown) {
    console.log(`[PUSH] Úvodnú notifikáciu sa nepodarilo prečítať: ${errorText(e)}`);
    return null;
  }
}

/**
 * Notifikácia doručená, KÝM sa človek pozerá do appky, sa má tiež ukázať.
 *
 * Bez tohto ju iOS v popredí zahodí bez slova. To by bolo „nestane sa
 * nič" (CLAUDE.md §2) v prípade, keď server prácu naozaj spravil.
 */
export function setupForegroundPush(): void {
  const N = notificationsModule();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // staršie názvy tých istých polí — expo ich číta podľa verzie
        shouldShowAlert: true,
      }),
    });
  } catch (e: unknown) {
    console.log(`[PUSH] Správanie v popredí sa nepodarilo nastaviť: ${errorText(e)}`);
  }
}
