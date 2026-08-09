/**
 * Onboarding, krok 2: upozornenia. LOGIN → PREZÝVKA → **UPOZORNENIA** → appka.
 *
 * ZADANIE (Rastio, 9.8.2026): pri prvom prihlásení sa má appka spýtať na
 * povolenie pushu a HNEĎ POTOM ukázať výber typov — nie ich len ticho
 * zapnúť a nechať človeka, nech si to nájde v Nastaveniach.
 *
 * PREČO JE VLASTNÉ VYSVETLENIE PRED SYSTÉMOVÝM DIALÓGOM:
 * systémový dialóg sa dá položiť RAZ. Kto klikne „Nepovoliť", toho sa iOS
 * druhýkrát nespýta a zapnúť sa to dá už len v nastaveniach telefónu.
 * Preto sa najprv povie PREČO a systémový dialóg vyskočí až po stlačení
 * tlačidla — vtedy človek vie, na čo odpovedá.
 *
 * PREČO AŽ TU A NIE SKÔR: pred prezývkou by sa appka pýtala skôr, než
 * o sebe čokoľvek povedala. Po prezývke už človek videl, čo Offerra robí,
 * a je to stále onboarding — nie náhodné vyskočenie uprostred používania.
 *
 * KROK SA NEDÁ „NEDOKONČIŤ": aj preskočenie zapíše `notif_onboarded_at`.
 * Odpoveď „teraz nie" je odpoveď a druhýkrát sa nepýtame. Zapnúť sa to dá
 * kedykoľvek v Nastaveniach — a je to na obrazovke napísané.
 */
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';
import { NotificationTypeList } from '@/components/notification-types';
import { Button, Card, ErrorNote } from '@/components/ui';
import { useNotificationPrefs } from '@/hooks/use-notification-prefs';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import { enablePush, getPushStatus, type PushStatus } from '@/lib/push';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function UpozorneniaScreen() {
  const palette = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { reload } = useProfile();
  const { prefs, error: prefError, save } = useNotificationPrefs(userId);

  const [pushStatus, setPushStatus] = useState<PushStatus>('undetermined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPushStatus().then(setPushStatus);
  }, []);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await enablePush();
      setPushStatus(result);
      if (result === 'denied') {
        // ŽIADNY TICHÝ NEÚSPECH (§2). Kto klikol „Nepovoliť", musí sa
        // dozvedieť, že to už z appky zapnúť nejde.
        Alert.alert(
          'Systém to nepovolil',
          'Zapnúť sa to dá už len v nastaveniach telefónu: Nastavenia → Offerra → Oznámenia. ' +
            'Výber nižšie si aj tak nastav — bude platiť pre upozornenia v appke a zafunguje ' +
            'hneď, ako povolenie dodatočne zapneš.'
        );
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PUSH] Onboarding — zapnutie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  /** Zapíše, že krok je za nami — nech už bola odpoveď akákoľvek. */
  async function finish() {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    const problem = await saveProfile(
      userId,
      { notif_onboarded_at: new Date().toISOString() },
      false
    );
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    // Presmerovanie robí brána v `_layout.tsx`, keď dorazí nový profil.
    await reload();
  }

  const granted = pushStatus === 'granted';
  const denied = pushStatus === 'denied';
  const unavailable = pushStatus === 'unavailable';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <FormScreen>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Chceš o tom vedieť?</Text>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          Offerra ti vie dať vedieť na telefón, keď sa niečo stane s tvojím inzerátom
          alebo s ponukou, ktorú si podal — aj keď máš appku zavretú.
        </Text>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>UPOZORNENIA NA TELEFÓN</Text>

          {/* Konkrétne príklady, nie abstraktný sľub. Človek sa rozhoduje
              podľa toho, čo mu to dá — nie podľa slova „notifikácie". */}
          {!granted && !unavailable ? (
            <View style={styles.bullets}>
              <Bullet text="Niekto podal ponuku na tvoj inzerát." />
              <Bullet text="Tvoju ponuku prijali — vtedy sa odkryje kontakt." />
              <Bullet text="Niekto si vypýtal obhliadku." />
            </View>
          ) : null}

          {unavailable ? (
            <Text style={[styles.state, { color: palette.textSecondary }]}>
              Táto verzia appky push notifikácie nevie. Upozornenia budeš mať v appke
              pri zvončeku.
            </Text>
          ) : granted ? (
            <Text style={[styles.state, { color: palette.success }]}>
              Upozornenia sú zapnuté. Vypnúť sa dajú kedykoľvek v Nastaveniach.
            </Text>
          ) : denied ? (
            <Text style={[styles.state, { color: palette.textSecondary }]}>
              Telefón upozornenia zablokoval. Zapnúť sa dajú v Nastaveniach telefónu:
              Nastavenia → Offerra → Oznámenia.
            </Text>
          ) : (
            <Button
              title={busy ? 'Moment…' : 'Zapnúť upozornenia'}
              onPress={ask}
              disabled={busy}
            />
          )}
        </Card>

        {/* Výber typov je TU, nie skrytý v Nastaveniach (zadanie).
            Ukazuje sa vždy — aj keď človek push nepovolil — lebo tie isté
            preferencie riadia aj zvonček v appke. */}
        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>ČO TI MÁME POSIELAŤ</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Všetko je zapnuté a chodí to ihneď. Čokoľvek tu vypneš, nepríde ti ani
            na telefón, ani do zvončeka v appke. Dá sa to kedykoľvek zmeniť
            v Nastaveniach.
          </Text>
          <ErrorNote error={prefError} />
          <NotificationTypeList prefs={prefs} onChange={(t, patch) => void save(t, patch)} />
        </Card>

        <ErrorNote error={error} />

        <Button
          title={busy ? 'Ukladám…' : granted ? 'Hotovo' : 'Pokračovať'}
          onPress={finish}
          disabled={busy}
        />
        {!granted && !unavailable ? (
          <Text style={[styles.skip, { color: palette.textMuted }]}>
            Bez povolenia appka funguje normálne — upozornenia nájdeš pri zvončeku.
          </Text>
        ) : null}
      </FormScreen>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  const palette = useTheme();
  return (
    <View style={styles.bullet}>
      <View style={[styles.dot, { backgroundColor: palette.secondary }]} />
      <Text style={[styles.bulletText, { color: palette.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyLg, marginTop: Spacing.sm, marginBottom: Spacing.md },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  bullets: { gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: Radius.full, marginTop: 6 },
  bulletText: { ...Type.bodyMd, flexShrink: 1 },
  state: { ...Type.bodyMd, marginTop: Spacing.sm },
  hint: { ...Type.caption, marginTop: Spacing.xs },
  skip: { ...Type.caption, textAlign: 'center', marginTop: Spacing.sm },
});
