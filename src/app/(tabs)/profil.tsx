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
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityTimeline, type ActivityEvent } from '@/components/activity-timeline';
import { Icon } from '@/components/icon';
import { Badge, Button, Card, ErrorNote, Field, KeyboardDoneBar, SectionLabel } from '@/components/ui';
import { useFavoriteProperties } from '@/hooks/use-favorites';
import { useMyOffers, useRequests } from '@/hooks/use-offers';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { AppHeader } from '@/components/app-header';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, OFFER_STATUS_LABEL, REQUEST_STATUS_LABEL, formatBudget } from '@/lib/offers';
import { buildInfoLine, readBuildInfo } from '@/lib/build-info';
import { photoErrorMessage, pickPhoto, uploadPhoto } from '@/lib/photo';
import { formatArea, formatDate, STATUS_LABEL, TRANSACTION_LABEL } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function ProfilScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const { profile, error, reload } = useProfile();
  const { items: properties } = useMyProperties(userId);
  const { items: offers } = useMyOffers(userId);
  const { items: requests } = useRequests(userId);
  const { items: favorites } = useFavoriteProperties(userId);

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
    setBusy(true);
    try {
      const photo = await pickPhoto([1, 1]);
      if (!photo) return; // zrušené používateľom

      // Vždy tá istá cesta + `upsert` — profilovka má byť jedna, nie
      // hromada starých súborov.
      const url = await uploadPhoto(`${userId}/avatar.jpg`, photo, true);

      // Cache-bust: `upsert` prepíše ten istý súbor a `expo-image` cachuje
      // podľa URI, takže bez tohto by ostala visieť stará fotka.
      const problem = await saveProfile(userId, { avatar_url: `${url}?t=${Date.now()}` }, false);
      if (problem) throw new Error(problem);

      console.log('[FOTKA] 7 HOTOVO (profilovka)');
      await reload();
    } catch (e: unknown) {
      const m = photoErrorMessage(e);
      console.log(`[PROFIL] Zmena fotky zlyhala: ${m}`);
      Alert.alert('Fotku sa nepodarilo zmeniť', m);
    } finally {
      setBusy(false);
    }
  }

  const missingContact = profile && !profile.full_name && !profile.phone;
  const build = readBuildInfo();

  // Časová os — udalosti z rôznych zdrojov zlúčené a zoradené podľa času.
  // Práve to zlúčenie robí z plochých zoznamov príbeh.
  const timeline: ActivityEvent[] = [
    ...(properties ?? []).map((p) => ({
      id: p.id,
      at: p.created_at,
      kind: 'INZERAT' as const,
      title: p.title || 'Bez názvu',
      detail: [p.city, STATUS_LABEL[p.status]].filter(Boolean).join(' · '),
      onPress: () => router.push({ pathname: '/inzerat/[id]', params: { id: p.id } }),
    })),
    ...(offers ?? []).map((o) => ({
      id: o.id,
      at: o.created_at,
      kind: 'PONUKA_ODOSLANA' as const,
      title: o.property?.title || 'Inzerát',
      detail: `${formatAmount(o.amount, o.property?.transaction_type ?? 'SALE')} · ${OFFER_STATUS_LABEL[o.status]}`,
      onPress: () => router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } }),
    })),
    ...(requests ?? []).map((r) => ({
      id: r.id,
      at: r.created_at,
      kind: 'DOPYT' as const,
      title: r.description?.slice(0, 60) || 'Dopyt',
      detail: formatBudget(r.budget_min, r.budget_max),
      onPress: () => router.push({ pathname: '/dopyt/[id]', params: { id: r.id } }),
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Profil</Text>
          <Pressable
            onPress={() => router.push('/nastavenia')}
            accessibilityRole="button"
            accessibilityLabel="Nastavenia"
            hitSlop={12}>
            <Icon name="gearshape" size={24} color={palette.textSecondary} />
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
                  <Row label="E-mail" value={session?.user.email ?? 'nedostupný'} />
                  <Text style={[styles.hint, { color: palette.textMuted }]}>
                    E-mail sa mení cez prihlásenie, nie tu.
                  </Text>
                  <Field label="Prezývka" value={nickname} onChangeText={setNickname} />
                  <Field label="Meno a priezvisko" value={fullName} onChangeText={setFullName} />
                  <Field label="Telefón" value={phone} onChangeText={setPhone} />
                  <Button title={busy ? 'Ukladám…' : 'Uložiť'} onPress={save} disabled={busy} />
                  <Button title="Zrušiť" onPress={() => setEditing(false)} variant="outline" disabled={busy} />
                </>
              ) : (
                <>
                  {/* E-mail sa NEDÁ upraviť tu. Zmena e-mailu má vlastný
                      overovací tok cez Supabase Auth (potvrdzovací odkaz na
                      starú aj novú adresu) a pole, ktoré sa tvári
                      upraviteľne a nič neuloží, je horšie než read-only. */}
                  <Row label="E-mail" value={session?.user.email ?? 'nedostupný'} />
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

            <Card>
              <SectionLabel>ČASOVÁ OS</SectionLabel>
              <ActivityTimeline events={timeline.slice(0, 25)} />
            </Card>

            <SectionList
              label={`OBĽÚBENÉ (${favorites?.length ?? 0})`}
              empty="Zatiaľ nič. Ťukni na srdiečko pri inzeráte."
              rows={(favorites ?? []).map((p) => ({
                key: p.id,
                title: p.title || 'Bez názvu',
                meta: [p.city, formatArea(p.area_m2)].filter(Boolean).join(' · ') || '—',
                badge: TRANSACTION_LABEL[p.transaction_type],
                onPress: () => router.push({ pathname: '/nehnutelnost/[id]', params: { id: p.id } }),
              }))}
            />

            <SectionList
              label={`MOJE PONUKY (${offers?.length ?? 0})`}
              empty="Zatiaľ si nikomu neponúkol."
              rows={(offers ?? []).map((o) => ({
                key: o.id,
                title: o.property?.title || 'Inzerát',
                // „videná" je pri čakajúcej ponuke to jediné, čo sa medzi
                // podaním a rozhodnutím zmení — patrí do prehľadu.
                meta: [
                  formatAmount(o.amount, o.property?.transaction_type ?? 'SALE'),
                  formatDate(o.created_at),
                  o.status === 'PENDING' && o.viewed_by_owner_at ? 'videná' : null,
                ]
                  .filter(Boolean)
                  .join(' · '),
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
            {/* Verzný riadok — podľa `ota` spoznáš, či ti dorazila
                najnovšia aktualizácia. Porovnaj s „Update group ID". */}
            <View style={styles.buildRow}>
              <Text style={[styles.build, { color: palette.textMuted }]}>{buildInfoLine(build)}</Text>
              {build.problem ? (
                <Text style={[styles.hint, { color: palette.warning }]}>{build.problem}</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
      <KeyboardDoneBar />
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
            <Text numberOfLines={2} style={[styles.listTitle, { color: palette.textPrimary }]}>
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
  buildRow: { alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  build: { ...Type.caption, fontFamily: 'Courier' },
});
