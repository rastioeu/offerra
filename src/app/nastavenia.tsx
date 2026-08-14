/**
 * Nastavenia — oddelené od Profilu (vzor MUTARK `settings.tsx`).
 *
 * Profil = kto som. Nastavenia = ako sa appka správa.
 *
 * MUTARK maže účet edge funkciou `delete-account`. Offerra to robí SQL
 * funkciou `offerra.delete_my_account()` — nepotrebuje samostatný deploy
 * a testuje sa rovnako ako zvyšok schémy. Kaskády zmažú profil, inzeráty,
 * fotky, ponuky aj dopyty.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ChoiceRow, ErrorNote, SectionLabel } from '@/components/ui';
import { NotificationTypeList } from '@/components/notification-types';
import { useNotificationPrefs } from '@/hooks/use-notification-prefs';
import { useSession } from '@/hooks/use-session';
import { ContactCard } from '@/components/contact-card';
import { useToast } from '@/components/toast';
import { useTheme, useThemeMode, THEME_MODE_LABEL, type ThemeMode } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { disablePushOnThisDevice, enablePush, getPushStatus, type PushStatus } from '@/lib/push';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

export default function NastaveniaScreen() {
  const palette = useTheme();
  const { mode: themeMode, setMode: setThemeMode, effective: effectiveTheme } = useThemeMode();
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();
  const { prefs, error: prefError, save } = useNotificationPrefs(session?.user.id);
  const [busy, setBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>('undetermined');
  const [pushBusy, setPushBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void getPushStatus().then(setPushStatus);
  }, []);

  async function togglePush(on: boolean) {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (on) {
        const result = await enablePush();
        setPushStatus(result);
        if (result === 'granted') toast('Upozornenia zapnuté');
        else if (result === 'denied') {
          Alert.alert(
            'Systém to nepovolil',
            'Zapnúť sa to dá už len v nastaveniach telefónu: Nastavenia → Offerra → Oznámenia.'
          );
        }
      } else {
        await disablePushOnThisDevice();
        setPushStatus('undetermined');
        toast('Upozornenia na tomto zariadení vypnuté', 'info');
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PUSH] Prepnutie zlyhalo: ${m}`);
      Alert.alert('Nepodarilo sa to', m);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      // Presmerovanie robí brána v `_layout.tsx`.
    } catch (e: unknown) {
      const m = errorText(e);
      Alert.alert('Odhlásenie zlyhalo', m);
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Zmazať účet?',
      'Natrvalo sa zmaže tvoj profil, prezývka, všetky inzeráty aj s fotkami, ' +
        'podané ponuky a dopyty. Nedá sa to vrátiť.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Pokračovať',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Naozaj?', 'Toto je posledné potvrdenie. Účet sa zmaže okamžite.', [
              { text: 'Zrušiť', style: 'cancel' },
              { text: 'Zmazať účet', style: 'destructive', onPress: deleteAccount },
            ]),
        },
      ]
    );
  }

  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await db().rpc('delete_my_account');
      if (error) throw error;
      // Session už nemá za kým existovať — lokálne ju treba zahodiť tiež.
      await supabase.auth.signOut().catch(() => undefined);
      Alert.alert('Účet zmazaný', 'Ďakujeme, že si to skúsil.');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[NASTAVENIA] Zmazanie účtu zlyhalo: ${m}`);
      Alert.alert('Zmazanie účtu zlyhalo', m);
      setBusy(false);
    }
  }

  /**
   * GDPR export (Rastio, 14.8.2026) — Privacy Policy sľubuje právo na
   * prenositeľnosť údajov, toto ho reálne pokrýva. `export_my_data()` je
   * scope-nutá výhradne na `auth.uid()` na strane servera (mig_40).
   *
   * ZÁMERNE natívny `Share` z `react-native`, nie `expo-file-system` /
   * `expo-sharing` — tie by pridali nový natívny modul a odstrihli by OTA
   * od existujúceho buildu presne tak, ako sa to appke už raz stalo (§9).
   */
  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const { data, error } = await db().rpc('export_my_data');
      if (error) throw error;
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: 'Moje dáta z Offerra' });
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[NASTAVENIA] Export dát zlyhal: ${m}`);
      Alert.alert('Export sa nepodaril', m);
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nastavenia',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Kontaktné údaje sú PRVÉ — je to jediná vec tu, ktorú si človek
            príde naozaj nastaviť. Presunuté z „Moje" (Rastio, 9.8.2026). */}
        <ContactCard />

        {/* Vzhľad je druhý. Kto sa sem prišiel dostať z tmavej appky späť na
            svetlú, nemá čo hľadať pod tromi kartami upozornení. */}
        <Card>
          <SectionLabel>VZHĽAD</SectionLabel>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Offerra je navrhnutá ako svetlá. „Podľa telefónu" znamená, že sa
            prepne na tmavú vždy, keď je tmavý režim zapnutý v systéme.
          </Text>
          <ChoiceRow<ThemeMode>
            label="Režim"
            options={(['light', 'dark', 'system'] as ThemeMode[]).map((m) => ({
              value: m,
              label: THEME_MODE_LABEL[m],
            }))}
            value={themeMode}
            onChange={(v) => setThemeMode(v ?? 'light')}
          />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Teraz je zapnutý {effectiveTheme === 'dark' ? 'tmavý' : 'svetlý'} vzhľad.
            Voľba sa pamätá aj po zatvorení appky.
          </Text>
        </Card>

        <Card>
          <SectionLabel>UPOZORNENIA</SectionLabel>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Prepínače nižšie platia pre oznámenia v appke aj pre push na telefón.
            Vypnutý typ neposiela ani jedno.
          </Text>

          {/* Povolenie sa pýta VÝHRADNE odtiaľto, z akcie používateľa.
              Kto ho raz odmietne, systém sa ho druhýkrát nespýta — takže
              agresívne pýtanie na úvod by tú možnosť natrvalo spálilo. */}
          <View style={[styles.notifRow, { borderTopColor: palette.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={[styles.label, { color: palette.textPrimary }]}>
                  Upozornenia na telefóne
                </Text>
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  {pushStatus === 'granted'
                    ? 'Zapnuté. Oznámenia chodia aj keď máš appku zavretú.'
                    : pushStatus === 'denied'
                      ? 'Zakázané v nastaveniach telefónu. Povoliť sa to dá už len tam: Nastavenia → Offerra → Oznámenia.'
                      : pushStatus === 'unavailable'
                        ? 'Táto verzia appky ich ešte nevie — pribudnú s najbližšou aktualizáciou z TestFlightu.'
                        : 'Zapni, ak chceš vedieť o novej ponuke aj so zavretou appkou.'}
                </Text>
              </View>
              <Switch
                value={pushStatus === 'granted'}
                disabled={pushBusy || pushStatus === 'unavailable' || pushStatus === 'denied'}
                onValueChange={togglePush}
                trackColor={{ true: palette.secondary, false: palette.border }}
              />
            </View>
          </View>
          <ErrorNote error={prefError} />

          <NotificationTypeList prefs={prefs} onChange={(t, patch) => void save(t, patch)} />
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>JAZYK</Text>
          <Text style={[styles.label, { color: palette.textPrimary }]}>Slovenčina</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Offerra je zatiaľ len po slovensky. Ďalšie jazyky pribudnú neskôr.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>O APPKE</Text>
          <Button title="Ako funguje Offerra" onPress={() => router.push('/ako-funguje')} variant="outline" />
          <Button title="Čo je nové" onPress={() => router.push('/novinky')} variant="outline" />
          {/* Apple chce, aby sa používateľ k podmienkam dostal bez
              opustenia appky. Text je ten istý ako na verejnej stránke —
              generuje sa z jedného zdroja (`src/lib/legal.ts`). */}
          <Button
            title="Ochrana osobných údajov"
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
            variant="outline"
          />
          <Button
            title="Podmienky používania"
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
            variant="outline"
          />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Zoznam zmien podľa verzií — podľa neho spoznáš, čo ti už dorazilo.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>MOJE DÁTA</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Export všetkého, čo o tebe appka eviduje — profil, inzeráty, ponuky,
            dopyty, obhliadky, hodnotenia, správy. Právo na prenositeľnosť údajov
            podľa Zásad ochrany súkromia.
          </Text>
          <Button
            title={exporting ? 'Pripravujem…' : 'Stiahnuť moje dáta'}
            onPress={exportData}
            variant="outline"
            disabled={exporting}
          />
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>ÚČET</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Odhlásenie ti dáta nechá — vrátiš sa k nim po prihlásení. Zmazanie účtu
            je nezvratné a zmaže aj inzeráty, ponuky a dopyty.
          </Text>
          <Button
            title={busy ? 'Pracujem…' : 'Odhlásiť sa'}
            onPress={handleSignOut}
            variant="outline"
            disabled={busy}
          />
          <Button title="Zmazať účet" onPress={confirmDelete} variant="danger" disabled={busy} />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Zmazanie účtu je nezvratné a pýta si dve potvrdenia.
          </Text>
        </Card>

        <Button title="Späť" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  notifRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, gap: Spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flexShrink: 1, gap: 2 },
  label: { ...Type.bodyLg, fontWeight: Weight.medium },
  hint: { ...Type.caption },
});
