/**
 * Jednorazová ponuka zapnúť upozornenia — po PRVEJ akcii, na ktorú bude
 * niekto reagovať.
 *
 * PREČO NIE PRI ŠTARTE APPKY: kto povolenie odmietne, systém sa ho
 * druhýkrát nespýta. Otázka položená v momente, keď človek ešte nevie,
 * načo mu to je, tú možnosť natrvalo spáli. Po podaní ponuky alebo
 * zverejnení inzerátu už dôvod pozná — čaká odpoveď.
 *
 * PREČO LEN RAZ: odpoveď „nie" je odpoveď. Zapnúť sa to dá kedykoľvek
 * v Nastaveniach a je to tam napísané.
 */
import { Alert } from 'react-native';

import { errorText } from './errors';
import { db } from './property';
import { enablePush, getPushStatus } from './push';

/** Text sa líši podľa toho, čo človek práve spravil — inak by to bola fráza. */
type Moment = 'OFFER' | 'LISTING';

const BODY: Record<Moment, string> = {
  OFFER:
    'Keď predávajúci na tvoju ponuku odpovie, dáme ti vedieť — aj keď budeš mať appku zavretú.',
  LISTING:
    'Keď na tvoj inzerát niekto podá ponuku alebo požiada o obhliadku, dáme ti vedieť — aj so zavretou appkou.',
};

export async function maybeOfferPush(userId: string | undefined, moment: Moment): Promise<void> {
  if (!userId) return;
  try {
    const status = await getPushStatus();
    // Už povolené, už odmietnuté systémom, alebo build push nevie —
    // v žiadnom z tých prípadov nie je čo ponúkať.
    if (status !== 'undetermined') return;

    const { data, error } = await db()
      .from('dismissed_hint')
      .select('hint')
      .eq('user_id', userId)
      .eq('hint', 'PUSH_OFFER');
    if (error) throw error;
    if ((data ?? []).length > 0) return;

    Alert.alert('Chceš o tom vedieť?', BODY[moment], [
      {
        text: 'Teraz nie',
        style: 'cancel',
        onPress: () => void remember(userId),
      },
      {
        text: 'Zapnúť',
        onPress: () => {
          void remember(userId);
          void enablePush().catch((e: unknown) =>
            console.log(`[PUSH] Zapnutie z ponuky zlyhalo: ${errorText(e)}`)
          );
        },
      },
    ]);
  } catch (e: unknown) {
    // Ponuka zapnúť push nie je nič, kvôli čomu by mala padnúť akcia,
    // ktorú človek práve dokončil. Ale zamlčať to nebudem.
    console.log(`[PUSH] Ponuka zapnúť push zlyhala: ${errorText(e)}`);
  }
}

async function remember(userId: string): Promise<void> {
  const { error } = await db()
    .from('dismissed_hint')
    .upsert({ user_id: userId, hint: 'PUSH_OFFER' }, { onConflict: 'user_id,hint' });
  if (error) console.log(`[PUSH] Zapamätanie odpovede zlyhalo: ${errorText(error)}`);
}
