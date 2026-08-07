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
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ErrorNote, SectionLabel } from '@/components/ui';
import { useNotificationPrefs } from '@/hooks/use-notification-prefs';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
  FREQUENCY_LABEL,
  NOTIFICATION_TYPES,
  type NotificationFrequency,
} from '@/lib/notifications';
import { signOut } from '@/lib/auth';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function NastaveniaScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { prefs, error: prefError, save } = useNotificationPrefs(session?.user.id);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      // Presmerovanie robí brána v `_layout.tsx`.
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
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
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[NASTAVENIA] Zmazanie účtu zlyhalo: ${m}`);
      Alert.alert('Zmazanie účtu zlyhalo', m);
      setBusy(false);
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
        <Card>
          <SectionLabel>UPOZORNENIA</SectionLabel>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Offerra zatiaľ push upozornenia NEPOSIELA. Toto je predvoľba, ktorú
            bude musieť rešpektovať každé budúce odosielanie — nastav si ju už
            teraz.
          </Text>
          <ErrorNote error={prefError} />

          {NOTIFICATION_TYPES.map((t) => {
            const pref = prefs[t.type];
            const enabled = t.system ? true : (pref?.enabled ?? true);
            const frequency = (pref?.frequency ?? 'IHNED') as NotificationFrequency;
            return (
              <View key={t.type} style={[styles.notifRow, { borderTopColor: palette.border }]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchText}>
                    <Text style={[styles.label, { color: palette.textPrimary }]}>{t.label}</Text>
                    {t.hint ? (
                      <Text style={[styles.hint, { color: palette.textMuted }]}>{t.hint}</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={enabled}
                    disabled={t.system}
                    onValueChange={(v) => save(t.type, { enabled: v })}
                    trackColor={{ true: palette.secondary, false: palette.border }}
                  />
                </View>

                {/* Frekvencia dáva zmysel len pri zapnutom type. */}
                {enabled && !t.system ? (
                  <View style={styles.freqRow}>
                    {(['IHNED', 'DENNY_SUHRN', 'TYZDENNY_SUHRN'] as NotificationFrequency[]).map((f) => {
                      const active = frequency === f;
                      const ready = f === 'IHNED';
                      return (
                        <Pressable
                          key={f}
                          onPress={() =>
                            ready
                              ? save(t.type, { frequency: f })
                              : Alert.alert(
                                  'Súhrny zatiaľ nefungujú',
                                  'Denný a týždenný súhrn potrebuje plánovanú úlohu na serveri, ' +
                                    'ktorú Offerra ešte nemá. Nastavenie by sa uložilo, ale nič by ho nečítalo — ' +
                                    'preto ho zatiaľ nepúšťam.'
                                )
                          }
                          accessibilityRole="button"
                          accessibilityState={{ selected: active, disabled: !ready }}
                          style={[
                            styles.freq,
                            {
                              backgroundColor: active ? palette.primary : palette.surface,
                              borderColor: active ? palette.primary : palette.border,
                              opacity: ready ? 1 : 0.45,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.freqText,
                              { color: active ? palette.onPrimary : palette.textSecondary },
                            ]}>
                            {FREQUENCY_LABEL[f]}
                            {ready ? '' : ' (čoskoro)'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
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
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Zoznam zmien podľa verzií — podľa neho spoznáš, čo ti už dorazilo.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>ÚČET</Text>
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
  freqRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  freq: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  freqText: { ...Type.caption, fontWeight: Weight.semibold },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flexShrink: 1, gap: 2 },
  label: { ...Type.bodyLg, fontWeight: Weight.medium },
  hint: { ...Type.caption },
});
