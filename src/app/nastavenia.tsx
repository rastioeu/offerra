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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';
import { Spacing, Type, Weight } from '@/theme/tokens';

const NOTIF_KEY = 'offerra.notifications';

export default function NastaveniaScreen() {
  const palette = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY)
      .then((v) => setNotifications(v !== 'off'))
      .catch((e: unknown) => console.log(`[NASTAVENIA] Načítanie zlyhalo: ${String(e)}`));
  }, []);

  async function toggleNotifications(next: boolean) {
    setNotifications(next);
    try {
      await AsyncStorage.setItem(NOTIF_KEY, next ? 'on' : 'off');
    } catch (e: unknown) {
      console.log(`[NASTAVENIA] Uloženie zlyhalo: ${String(e)}`);
      Alert.alert('Nastavenie sa neuložilo', String(e));
      setNotifications(!next);
    }
  }

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
          <Text style={[styles.section, { color: palette.textMuted }]}>UPOZORNENIA</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={[styles.label, { color: palette.textPrimary }]}>Upozornenia na ponuky</Text>
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                Zatiaľ len predvoľba — Offerra ešte push upozornenia neposiela.
                Keď pribudnú, bude platiť toto nastavenie.
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ true: palette.secondary, false: palette.border }}
            />
          </View>
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>JAZYK</Text>
          <Text style={[styles.label, { color: palette.textPrimary }]}>Slovenčina</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Offerra je zatiaľ len po slovensky. Ďalšie jazyky pribudnú neskôr.
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flexShrink: 1, gap: 2 },
  label: { ...Type.bodyLg, fontWeight: Weight.medium },
  hint: { ...Type.caption },
});
