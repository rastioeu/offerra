/**
 * Prezývka — povinný krok po prvom prihlásení (vzor MUTARK `setup.tsx`:
 * LOGIN → NICKNAME → appka).
 *
 * Prečo povinný: ponuky sú verejné a podpisuje ich prezývka. Bez nej by
 * v zozname ponúk nebolo čo zobraziť. V DB je to vynútené cudzím kľúčom —
 * `property.owner_id` aj `property_offer.bidder_id` mieria na
 * `offerra.profile`, takže bez profilu sa nedá ani inzerovať, ani ponúkať.
 * Táto obrazovka je len pohodlná cesta k tomu istému pravidlu.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorNote, Field } from '@/components/ui';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

export default function PrezyvkaScreen() {
  const palette = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { reload } = useProfile();

  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = nickname.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 3;

  async function submit() {
    if (!userId || busy) return;
    if (trimmed.length < 3) {
      setError('Prezývka musí mať aspoň 3 znaky.');
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await saveProfile(
      userId,
      {
        nickname: trimmed,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      },
      true
    );
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    // Presmerovanie robí brána v `_layout.tsx`, keď dorazí nový profil.
    await reload();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: palette.textPrimary }]}>Ako ťa máme volať?</Text>
          <Text style={[styles.lead, { color: palette.textSecondary }]}>
            Pod prezývkou budú tvoje ponuky vidieť všetci — aj neprihlásení.
            Tvoje skutočné meno a telefón ostávajú skryté a odkryjú sa až vtedy,
            keď niekto tvoju ponuku prijme.
          </Text>

          <Field
            label="Prezývka"
            hint="3 až 20 znakov. Vidí ju každý."
            value={nickname}
            onChangeText={setNickname}
            placeholder="napr. tichy_kupec"
          />
          {tooShort ? (
            <Text style={[styles.warn, { color: palette.warning }]}>Ešte aspoň {3 - trimmed.length} znaky.</Text>
          ) : null}

          <View style={[styles.divider, { borderTopColor: palette.border }]} />

          <Text style={[styles.section, { color: palette.textMuted }]}>
            SKRYTÉ ÚDAJE — ODKRYJÚ SA AŽ PRI DOHODE
          </Text>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Môžeš ich doplniť aj neskôr v Profile. Bez nich sa však druhá strana
            po prijatí ponuky nemá ako ozvať.
          </Text>

          <Field
            label="Meno a priezvisko (nepovinné)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ján Novák"
          />
          <Field
            label="Telefón (nepovinné)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+421 9xx xxx xxx"
          />

          <ErrorNote error={error} />

          <Button title={busy ? 'Ukladám…' : 'Pokračovať'} onPress={submit} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyLg },
  warn: { ...Type.caption, fontWeight: Weight.medium, marginTop: -Spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  note: { ...Type.caption, marginTop: -Spacing.sm },
});
