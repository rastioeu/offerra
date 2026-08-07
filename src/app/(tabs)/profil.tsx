/**
 * Profil — identita a moje veci.
 *
 * FÁZA 2 nahradila pôvodnú debug obrazovku z Fázy 0 (tá ukazovala surový
 * `user.id` a expiráciu tokenu ako dôkaz, že prihlásenie funguje). Dôkaz
 * už máme, takže tu je teraz skutočný profil.
 *
 * `full_name` a `phone` sa načítavajú cez `offerra.my_profile()` — cez
 * tabuľku to nejde, rola `authenticated` na tie stĺpce nemá SELECT.
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type * as ImagePickerType from 'expo-image-picker';

import { Badge, Button, Card, ErrorNote, Field } from '@/components/ui';
import { useMyOffers, useRequests } from '@/hooks/use-offers';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, OFFER_STATUS_LABEL, REQUEST_STATUS_LABEL, formatBudget } from '@/lib/offers';
import { formatDate, STATUS_LABEL } from '@/lib/property';
import { supabase } from '@/lib/supabase';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

const BUCKET = 'offerra-media';

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default function ProfilScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const { profile, error, reload } = useProfile(userId);
  const { items: properties } = useMyProperties(userId);
  const { items: offers } = useMyOffers(userId);
  const { items: requests } = useRequests(userId);

  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname);
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  async function save() {
    if (!userId || busy) return;
    setBusy(true);
    setSaveError(null);
    const problem = await saveProfile(
      userId,
      { nickname: nickname.trim(), full_name: fullName.trim() || null, phone: phone.trim() || null },
      false
    );
    setBusy(false);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setEditing(false);
    await reload();
  }

  async function changePhoto() {
    if (!userId || busy) return;
    let ImagePicker: typeof ImagePickerType;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Fotku sa nedá zmeniť', 'Táto verzia appky nemá modul na výber fotiek.');
      return;
    }
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Chýba prístup k fotkám', 'Povoľ ho v Nastaveniach telefónu.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Fotku sa nepodarilo načítať.');

      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, decodeBase64(asset.base64), { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Cache-bust — `upsert` prepíše ten istý súbor, `expo-image` cachuje podľa URI.
      const problem = await saveProfile(userId, { avatar_url: `${pub.publicUrl}?t=${Date.now()}` }, false);
      if (problem) throw new Error(problem);
      await reload();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[PROFIL] Zmena fotky zlyhala: ${m}`);
      Alert.alert('Zmena fotky zlyhala', m);
    } finally {
      setBusy(false);
    }
  }

  const missingContact = profile && !profile.full_name && !profile.phone;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Profil</Text>
          <Pressable
            onPress={() => router.push('/nastavenia')}
            accessibilityRole="button"
            accessibilityLabel="Nastavenia"
            hitSlop={12}>
            <Text style={[styles.gear, { color: palette.textSecondary }]}>⚙︎</Text>
          </Pressable>
        </View>

        <ErrorNote error={error ?? saveError} />
        {profile === undefined ? <ActivityIndicator color={palette.primary} /> : null}

        {profile ? (
          <>
            <Card>
              <View style={styles.identity}>
                <Pressable onPress={changePhoto} accessibilityRole="button" disabled={busy}>
                  {profile.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={[styles.avatar, { backgroundColor: palette.surfacePressed }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarEmpty, { backgroundColor: palette.surfacePressed }]}>
                      <Text style={[styles.avatarLetter, { color: palette.primary }]}>
                        {profile.nickname.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <View style={styles.identityText}>
                  <Text style={[styles.nick, { color: palette.textPrimary }]}>{profile.nickname}</Text>
                  <Text style={[styles.hint, { color: palette.textMuted }]}>
                    Takto ťa vidia ostatní pri ponukách
                  </Text>
                  <Pressable onPress={changePhoto} accessibilityRole="button" disabled={busy}>
                    <Text style={[styles.link, { color: palette.link }]}>
                      {busy ? 'Pracujem…' : profile.avatar_url ? 'Zmeniť fotku' : 'Pridať fotku'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>
                SKRYTÉ ÚDAJE — VIDÍ ICH LEN PROTISTRANA PRIJATEJ PONUKY
              </Text>

              {editing ? (
                <>
                  <Field label="Prezývka" value={nickname} onChangeText={setNickname} />
                  <Field label="Meno a priezvisko" value={fullName} onChangeText={setFullName} />
                  <Field label="Telefón" value={phone} onChangeText={setPhone} />
                  <Button title={busy ? 'Ukladám…' : 'Uložiť'} onPress={save} disabled={busy} />
                  <Button title="Zrušiť" onPress={() => setEditing(false)} variant="outline" disabled={busy} />
                </>
              ) : (
                <>
                  <Row label="Meno" value={profile.full_name ?? 'nevyplnené'} />
                  <Row label="Telefón" value={profile.phone ?? 'nevyplnený'} />
                  {missingContact ? (
                    <Text style={[styles.warn, { color: palette.warning }]}>
                      Bez mena a telefónu sa ti druhá strana po prijatí ponuky nemá ako ozvať.
                    </Text>
                  ) : null}
                  <Button title="Upraviť údaje" onPress={() => setEditing(true)} variant="outline" />
                </>
              )}
            </Card>

            <SectionList
              label={`MOJE INZERÁTY (${properties?.length ?? 0})`}
              empty="Zatiaľ žiadne."
              rows={(properties ?? []).map((p) => ({
                key: p.id,
                title: p.title.trim() || 'Bez názvu',
                meta: `${[p.city, `${p.media.length} fotiek`].filter(Boolean).join(' · ')}`,
                badge: STATUS_LABEL[p.status],
                onPress: () => router.push({ pathname: '/inzerat/[id]', params: { id: p.id } }),
              }))}
            />

            <SectionList
              label={`MOJE PONUKY (${offers?.length ?? 0})`}
              empty="Zatiaľ si nikomu neponúkol."
              rows={(offers ?? []).map((o) => ({
                key: o.id,
                title: o.property?.title || 'Inzerát',
                meta: `${formatAmount(o.amount, o.property?.transaction_type ?? 'SALE')} · ${formatDate(o.created_at)}`,
                badge: OFFER_STATUS_LABEL[o.status],
                onPress: () =>
                  router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } }),
              }))}
            />

            <SectionList
              label={`MOJE DOPYTY (${requests?.length ?? 0})`}
              empty={'Zatiaľ žiadne. Pridaj ich cez tab „Pridať".'}
              rows={(requests ?? []).map((r) => ({
                key: r.id,
                title: r.description?.slice(0, 60) || 'Dopyt',
                meta: `${formatBudget(r.budget_min, r.budget_max)}${r.city ? ` · ${r.city}` : ''}`,
                badge: REQUEST_STATUS_LABEL[r.status],
                onPress: () => router.push({ pathname: '/dopyt/[id]', params: { id: r.id } }),
              }))}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionList({
  label,
  empty,
  rows,
}: {
  label: string;
  empty: string;
  rows: { key: string; title: string; meta: string; badge: string; onPress: () => void }[];
}) {
  const palette = useTheme();
  return (
    <Card>
      <Text style={[styles.section, { color: palette.textMuted }]}>{label}</Text>
      {rows.length === 0 ? <Text style={[styles.hint, { color: palette.textMuted }]}>{empty}</Text> : null}
      {rows.map((r) => (
        <Pressable
          key={r.key}
          onPress={r.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.listRow,
            { borderColor: palette.border, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
          ]}>
          <View style={styles.listText}>
            <Text numberOfLines={1} style={[styles.listTitle, { color: palette.textPrimary }]}>
              {r.title}
            </Text>
            <Text style={[styles.hint, { color: palette.textMuted }]}>{r.meta}</Text>
          </View>
          <Badge text={r.badge} />
        </Pressable>
      ))}
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
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.hero, fontWeight: Weight.bold },
  gear: { fontSize: 24, lineHeight: 28 },
  identity: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  identityText: { flexShrink: 1, gap: 2 },
  avatar: { width: 72, height: 72, borderRadius: Radius.full },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { ...Type.hero, fontWeight: Weight.bold },
  nick: { ...Type.heading, fontWeight: Weight.bold },
  hint: { ...Type.caption },
  link: { ...Type.bodyMd, fontWeight: Weight.semibold, marginTop: 4 },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  warn: { ...Type.caption, fontWeight: Weight.medium },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  listText: { flexShrink: 1, gap: 2 },
  listTitle: { ...Type.bodyLg, fontWeight: Weight.medium },
});
