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

/** `null`, keď modul v tomto builde nie je. */
function notificationsModule(): typeof import('expo-notifications') | null {
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
