/**
 * Skryté kontaktné údaje — e-mail, meno, telefón.
 *
 * Presunuté z obrazovky „Moje" do Nastavení (Rastio, 9.8.2026). Dôvod je
 * ten istý, prečo sa tab premenoval: „Moje" je o tom, čo mám v appke —
 * inzeráty, ponuky, dopyty. Kontaktné údaje sú nastavenie účtu, nie obsah.
 *
 * PREZÝVKA tu ZÁMERNE nie je — tá ostala na „Moje". Je to identita, ktorú
 * ľudia vidia, nie skrytý údaj; meniť ju vedľa telefónu by bolo mätúce.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Button, Card, ErrorNote, Field, SectionLabel } from './ui';

export function ContactCard() {
  const palette = useTheme();
  const toast = useToast();
  const { session } = useSession();
  const { profile, reload } = useProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function save() {
    const userId = session?.user.id;
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    const problem = await saveProfile(
      userId,
      { full_name: fullName.trim() || null, phone: phone.trim() || null },
      false
    );
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setEditing(false);
    await reload();
    toast('Údaje uložené');
  }

  if (!profile) return null;
  const missing = !profile.full_name && !profile.phone;

  return (
    <Card>
      <SectionLabel>SKRYTÉ ÚDAJE</SectionLabel>
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        Vidí ich LEN protistrana prijatej ponuky, a to až po jej prijatí.
        Nikto iný sa k nim nedostane — ani technicky.
      </Text>

      <ErrorNote error={error} />

      {editing ? (
        <>
          <Row label="E-mail" value={session?.user.email ?? 'nedostupný'} />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            E-mail sa mení cez prihlásenie, nie tu.
          </Text>
          <Field label="Meno a priezvisko" value={fullName} onChangeText={setFullName} />
          <Field label="Telefón" value={phone} onChangeText={setPhone} />
          <Button title={busy ? 'Ukladám…' : 'Uložiť'} onPress={save} disabled={busy} />
          <Button title="Zrušiť" onPress={() => setEditing(false)} variant="outline" disabled={busy} />
        </>
      ) : (
        <>
          {/* E-mail sa NEDÁ upraviť. Zmena e-mailu má vlastný overovací tok
              cez Supabase Auth a pole, ktoré sa tvári upraviteľne a nič
              neuloží, je horšie než read-only. */}
          <Row label="E-mail" value={session?.user.email ?? 'nedostupný'} />
          <Row label="Meno" value={profile.full_name ?? 'nevyplnené'} />
          <Row label="Telefón" value={profile.phone ?? 'nevyplnený'} />
          {missing ? (
            <Text style={[styles.warn, { color: palette.warning }]}>
              Bez mena a telefónu sa ti druhá strana po prijatí ponuky nemá ako ozvať.
            </Text>
          ) : null}
          <Button title="Upraviť údaje" onPress={() => setEditing(true)} variant="outline" />
        </>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const palette = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { ...Type.caption },
  warn: { ...Type.caption, fontWeight: Weight.medium },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginTop: 2 },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.semibold, flexShrink: 1, textAlign: 'right' },
});
