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
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useProfile, profileForm, saveProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Button, Card, ErrorNote, Field, SectionLabel } from './ui';

export function ContactCard() {
  const palette = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const { session } = useSession();
  const { profile, reload } = useProfile();
  const userId = session?.user.id;

  // Rovnaké pravidlo ako pri inzeráte (`use-form-draft.ts`): server smie
  // polia NAPLNIŤ, nikdy nie PREPÍSAŤ. Predtým to bol efekt závislý na
  // `profile`, takže hociktoré obnovenie profilu — napríklad po zmene
  // profilovky — zmazalo rozpísané meno aj telefón.
  const { form, set, saved } = useFormDraft(userId && `kontakt:${userId}`, profile, profileForm);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!userId || !form || busy) return;
    setBusy(true);
    setError(null);
    const problem = await saveProfile(
      t,
      userId,
      { full_name: form.fullName.trim() || null, phone: form.phone.trim() || null },
      false
    );
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setEditing(false);
    // Až teraz smie rozpísané zmiznúť — server sa mu práve vyrovnal.
    saved();
    await reload();
    toast(t('contactCard.savedToast'));
  }

  if (!profile) return null;
  const missing = !profile.full_name && !profile.phone;

  return (
    <Card>
      <SectionLabel>{t('contactCard.hiddenSection')}</SectionLabel>
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        {t('contactCard.hint')}
      </Text>

      <ErrorNote error={error} />

      {editing && form ? (
        <>
          <Row label={t('contactCard.emailLabel')} value={session?.user.email ?? t('contactCard.emailNotAvailable')} />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            {t('contactCard.emailChangeHint')}
          </Text>
          <Field
            label={t('contactCard.fullNameLabel')}
            value={form.fullName}
            onChangeText={(v) => set({ fullName: v })}
          />
          <Field label={t('contactCard.phoneLabel')} value={form.phone} onChangeText={(v) => set({ phone: v })} />
          <Button title={busy ? t('contactCard.savingButton') : t('contactCard.saveButton')} onPress={save} disabled={busy} />
          <Button title={t('contactCard.cancelButton')} onPress={() => setEditing(false)} variant="outline" disabled={busy} />
        </>
      ) : (
        <>
          {/* E-mail sa NEDÁ upraviť. Zmena e-mailu má vlastný overovací tok
              cez Supabase Auth a pole, ktoré sa tvári upraviteľne a nič
              neuloží, je horšie než read-only. */}
          <Row label={t('contactCard.emailLabel')} value={session?.user.email ?? t('contactCard.emailNotAvailable')} />
          <Row label={t('contactCard.nameLabel')} value={profile.full_name ?? t('contactCard.nameNotGiven')} />
          <Row label={t('contactCard.phoneLabel')} value={profile.phone ?? t('contactCard.phoneNotGiven')} />
          {missing ? (
            <Text style={[styles.warn, { color: palette.warning }]}>
              {t('contactCard.missingWarning')}
            </Text>
          ) : null}
          <Button title={t('contactCard.editButton')} onPress={() => setEditing(true)} variant="outline" />
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
