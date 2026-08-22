/**
 * DRUHÁ a POSLEDNÁ ponuka zapnúť upozornenia — po prvej akcii, na ktorú
 * bude niekto reagovať.
 *
 * VZŤAH KU KROKU V ONBOARDINGU (`upozornenia.tsx`, 9.8.2026): prvý raz
 * sa pýta onboarding. Toto je záchranná sieť pre toho, kto tam krok
 * PRESKOČIL — vtedy systémový dialóg nikdy nevyskočil, povolenie ostalo
 * `undetermined` a dá sa oň ešte požiadať.
 *
 * Kto v onboardingu klikol „Nepovoliť", sem nedôjde: `getPushStatus()`
 * vráti `denied` a funkcia sa hneď vráti. iOS sa druhýkrát nespýta a
 * predstierať opak by bolo klamstvo — v tom prípade to ide už len cez
 * nastavenia telefónu.
 *
 * PREČO LEN RAZ: odpoveď „nie" je odpoveď. Zapnúť sa to dá kedykoľvek
 * v Nastaveniach a je to tam napísané.
 */
import { Alert } from 'react-native';

import type { TFunc } from '@/i18n';

import { errorText } from './errors';
import { db } from './property';
import { enablePush, getPushStatus } from './push';

/** Text sa líši podľa toho, čo človek práve spravil — inak by to bola fráza. */
type Moment = 'OFFER' | 'LISTING';

function bodyFor(t: TFunc, moment: Moment): string {
  return moment === 'OFFER' ? t('pushPrompt.bodyOffer') : t('pushPrompt.bodyListing');
}

export async function maybeOfferPush(t: TFunc, userId: string | undefined, moment: Moment): Promise<void> {
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

    Alert.alert(t('pushPrompt.title'), bodyFor(t, moment), [
      {
        text: t('pushPrompt.notNow'),
        style: 'cancel',
        onPress: () => void remember(userId),
      },
      {
        text: t('pushPrompt.enable'),
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
