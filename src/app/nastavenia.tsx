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
import { useTheme, useThemeMode, getThemeModeLabel, type ThemeMode } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { disablePushOnThisDevice, enablePush, getPushStatus, type PushStatus } from '@/lib/push';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';
import { useTranslation, SUPPORTED_LANGUAGES, type LanguageChoice } from '@/i18n';

export default function NastaveniaScreen() {
  const palette = useTheme();
  const { t, choice: languageChoice, setLanguage } = useTranslation();
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
        if (result === 'granted') toast(t('nastavenia.pushEnabled'));
        else if (result === 'denied') {
          Alert.alert(t('nastavenia.pushSystemDeniedTitle'), t('nastavenia.pushSystemDeniedBody'));
        }
      } else {
        await disablePushOnThisDevice();
        setPushStatus('undetermined');
        toast(t('nastavenia.pushDisabledOnDevice'), 'info');
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PUSH] Prepnutie zlyhalo: ${m}`);
      Alert.alert(t('nastavenia.pushToggleFailedTitle'), m);
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
      Alert.alert(t('nastavenia.signOutFailedTitle'), m);
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(t('nastavenia.deleteAccountTitle'), t('nastavenia.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.continue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('nastavenia.confirmAgainTitle'), t('nastavenia.confirmAgainBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('nastavenia.deleteAccount'), style: 'destructive', onPress: deleteAccount },
          ]),
      },
    ]);
  }

  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await db().rpc('delete_my_account');
      if (error) throw error;
      // Session už nemá za kým existovať — lokálne ju treba zahodiť tiež.
      await supabase.auth.signOut().catch(() => undefined);
      Alert.alert(t('nastavenia.accountDeletedTitle'), t('nastavenia.accountDeletedBody'));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[NASTAVENIA] Zmazanie účtu zlyhalo: ${m}`);
      Alert.alert(t('nastavenia.deleteAccountFailedTitle'), m);
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
      await Share.share({ message: json, title: t('nastavenia.exportShareTitle') });
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[NASTAVENIA] Export dát zlyhal: ${m}`);
      Alert.alert(t('nastavenia.exportFailedTitle'), m);
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('nastavenia.title'),
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
          <SectionLabel>{t('nastavenia.appearanceSection')}</SectionLabel>
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.appearanceHint')}</Text>
          <ChoiceRow<ThemeMode>
            label={t('nastavenia.modeLabel')}
            options={(['light', 'dark', 'system'] as ThemeMode[]).map((m) => ({
              value: m,
              label: getThemeModeLabel(t)[m],
            }))}
            value={themeMode}
            onChange={(v) => setThemeMode(v ?? 'light')}
          />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            {t('nastavenia.appearanceNowHint', {
              mode: effectiveTheme === 'dark' ? t('nastavenia.appearanceNowDark') : t('nastavenia.appearanceNowLight'),
            })}
          </Text>
        </Card>

        <Card>
          <SectionLabel>{t('nastavenia.notificationsSection')}</SectionLabel>
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.notificationsHint')}</Text>

          {/* Povolenie sa pýta VÝHRADNE odtiaľto, z akcie používateľa.
              Kto ho raz odmietne, systém sa ho druhýkrát nespýta — takže
              agresívne pýtanie na úvod by tú možnosť natrvalo spálilo. */}
          <View style={[styles.notifRow, { borderTopColor: palette.border }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={[styles.label, { color: palette.textPrimary }]}>
                  {t('nastavenia.pushRowLabel')}
                </Text>
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  {pushStatus === 'granted'
                    ? t('nastavenia.pushGrantedHint')
                    : pushStatus === 'denied'
                      ? t('nastavenia.pushDeniedHint')
                      : pushStatus === 'unavailable'
                        ? t('nastavenia.pushUnavailableHint')
                        : t('nastavenia.pushDefaultHint')}
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

          <NotificationTypeList prefs={prefs} onChange={(type, patch) => void save(type, patch)} />
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>{t('nastavenia.languageSection')}</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.languageHint')}</Text>
          <ChoiceRow<LanguageChoice>
            label={t('nastavenia.languageLabel')}
            options={[
              ...SUPPORTED_LANGUAGES.map((l) => ({ value: l.code as LanguageChoice, label: l.native })),
              { value: 'system' as LanguageChoice, label: t('nastavenia.languageSystem') },
            ]}
            value={languageChoice}
            onChange={(v) => setLanguage(v ?? 'system')}
          />
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>{t('nastavenia.aboutSection')}</Text>
          <Button title={t('nastavenia.howItWorks')} onPress={() => router.push('/ako-funguje')} variant="outline" />
          <Button title={t('nastavenia.whatsNew')} onPress={() => router.push('/novinky')} variant="outline" />
          {/* Apple chce, aby sa používateľ k podmienkam dostal bez
              opustenia appky. Text je ten istý ako na verejnej stránke —
              generuje sa z jedného zdroja (`src/lib/legal.ts`). */}
          <Button
            title={t('nastavenia.privacyPolicy')}
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
            variant="outline"
          />
          <Button
            title={t('nastavenia.termsOfUse')}
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
            variant="outline"
          />
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.changelogHint')}</Text>
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>{t('nastavenia.dataSection')}</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.dataHint')}</Text>
          <Button
            title={exporting ? t('nastavenia.exportPreparing') : t('nastavenia.exportButton')}
            onPress={exportData}
            variant="outline"
            disabled={exporting}
          />
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>{t('nastavenia.accountSection')}</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.accountHint')}</Text>
          <Button
            title={busy ? t('nastavenia.signOutBusy') : t('nastavenia.signOut')}
            onPress={handleSignOut}
            variant="outline"
            disabled={busy}
          />
          <Button title={t('nastavenia.deleteAccount')} onPress={confirmDelete} variant="danger" disabled={busy} />
          <Text style={[styles.hint, { color: palette.textMuted }]}>{t('nastavenia.deleteAccountConfirmHint')}</Text>
        </Card>

        <Button title={t('common.back')} onPress={() => router.back()} variant="outline" />
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
