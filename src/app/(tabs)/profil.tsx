import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

/**
 * FÁZA 0 — Profil zámerne ukazuje surové údaje o session.
 *
 * Je to **dôkazová obrazovka**: zadanie (bod 7) žiada overiť prihlásenie
 * zdieľaným účtom priamo v TestFlight builde a doložiť to screenshotom.
 * `user.id` a expirácia tokenu na obrazovke znamenajú, že screenshot sám
 * je dôkazom — netreba pripájať zariadenie na konzolu.
 *
 * Vo Fáze 1 sa to nahradí skutočným profilom (moje inzeráty, štatistiky).
 */
export default function ProfilScreen() {
  const palette = useTheme();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      // Presmerovanie na login robí brána v `_layout.tsx`.
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Odhlásenie zlyhalo', message);
      setBusy(false);
    }
  }

  const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Profil</Text>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardLabel, { color: palette.textMuted }]}>PRIHLÁSENÝ POUŽÍVATEĽ</Text>

          <Row label="E-mail" value={session?.user.email ?? '—'} palette={palette} />
          <Row label="user.id" value={session?.user.id ?? '—'} palette={palette} mono />
          <Row label="Token platný do" value={expiresAt} palette={palette} mono />
          <Row
            label="Zdroj"
            value={session ? 'Supabase Auth (zdieľaný s MUTARK)' : '—'}
            palette={palette}
          />
        </View>

        <Text style={[styles.note, { color: palette.textMuted }]}>
          Fáza 0 — táto obrazovka zobrazuje údaje o session zámerne, ako dôkaz
          že prihlásenie funguje aj v natívnom builde. Nahradí ju skutočný
          profil.
        </Text>

        <Pressable
          onPress={handleSignOut}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: palette.danger,
              opacity: busy ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}>
          <Text style={[styles.buttonText, { color: palette.danger }]}>
            {busy ? 'Odhlasujem…' : 'Odhlásiť sa'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  palette,
  mono,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useTheme>;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text
        selectable
        style={[
          styles.rowValue,
          { color: palette.textPrimary },
          mono ? styles.mono : null,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  title: { ...Type.heading, fontWeight: Weight.bold },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardLabel: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  row: { gap: 2 },
  rowLabel: { ...Type.caption, fontWeight: Weight.medium },
  rowValue: { ...Type.bodyMd },
  mono: { fontFamily: 'Courier' },
  note: { ...Type.small },
  button: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonText: { ...Type.button, fontWeight: Weight.semibold },
});
