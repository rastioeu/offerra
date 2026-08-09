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
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Badge, Button, Card, ErrorNote, Field, KeyboardDoneBar, SectionLabel } from '@/components/ui';
import { useFavoriteProperties } from '@/hooks/use-favorites';
import { useMyOffers, useMyOutreach, useRequests } from '@/hooks/use-offers';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { AppHeader } from '@/components/app-header';
import { InlineOffers } from '@/components/inline-offers';
import { MyListingRow } from '@/components/my-listing-row';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, OFFER_STATUS_LABEL, REQUEST_STATUS_LABEL, formatBudget } from '@/lib/offers';
import { buildInfoLine, readBuildInfo } from '@/lib/build-info';
import { photoErrorMessage, pickPhoto, uploadPhoto } from '@/lib/photo';
import { formatArea, formatDate, STATUS_LABEL, TRANSACTION_LABEL } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function ProfilScreen() {
  const palette = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const { profile, error, reload } = useProfile();
  const { items: properties, reload: reloadProperties } = useMyProperties(userId);
  const { items: offers } = useMyOffers(userId);
  const { items: requests } = useRequests(userId);
  const { items: myOutreach } = useMyOutreach();
  const { items: favorites } = useFavoriteProperties(userId);

  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);
  /** Ktorý inzerát má rozbalené ponuky. `null` = žiadny. */
  const [openListing, setOpenListing] = useState<string | null>(null);
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
    toast('Profil uložený');
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
      toast('Profilovka zmenená');
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
    // Oslovenia MOJICH dopytov. Vedú na PONÚKNUTÝ inzerát, nie na môj
    // dopyt — tam sa dá niečo spraviť (pozrieť si ho, vypýtať obhliadku).
    ...(myOutreach ?? []).map((o) => ({
      id: o.id,
      at: o.created_at,
      kind: 'OSLOVENIE_DOPYTU' as const,
      title: o.property_title || 'Inzerát',
      detail: [o.from_nickname, o.property_city].filter(Boolean).join(' · '),
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
        {/* Ozubené koliesko tu ZÁMERNE nie je — je v hornej lište, teda
            na všetkých obrazovkách. Dve by boli duplicita. */}
        <Text style={[styles.title, { color: palette.textPrimary }]}>Moje</Text>

        <ErrorNote error={error ?? saveError} />
        {profile === undefined ? <ActivityIndicator color={palette.primary} /> : null}

        {profile ? (
          <>
            <Card>
              <View style={styles.identity}>
                <Pressable onPress={changePhoto} accessibilityRole="button" disabled={busy}>
                  {/* Tá istá komponenta ako v zozname ponúk — s prstencom,
                      lebo tu ide o MOJU identitu, nie o riadok v zozname. */}
                  <Avatar name={profile.nickname} uri={profile.avatar_url} size={72} ring />
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
                {`MOJE INZERÁTY (${properties?.length ?? 0})`}
              </Text>
              {(properties ?? []).length === 0 ? (
                <Text style={[styles.hint, { color: palette.textMuted }]}>Zatiaľ žiadne.</Text>
              ) : null}
              {(properties ?? []).map((p) => (
                <View key={p.id}>
                <MyListingRow
                  item={p}
                  // Kam ťuknutie vedie, závisí od toho, čo sa na inzeráte
                  // dá ROBIŤ. Pri zverejnenom a uzavretom sú to ponuky
                  // (prijať, odmietnuť, uzavrieť obchod, hodnotiť); pri
                  // koncepte niet čo spravovať, tam patrí úprava.
                  // Ťuknutie ROZBALÍ ponuky na mieste, nikam neodnaviguje.
                  // Koncept ponuky nemá, tam vedie rovno do úpravy.
                  onPress={() =>
                    p.status === 'DRAFT' || p.status === 'REJECTED'
                      ? router.push({ pathname: '/inzerat/[id]', params: { id: p.id } })
                      : setOpenListing((cur) => (cur === p.id ? null : p.id))
                  }
                />
                {openListing === p.id ? (
                  <InlineOffers item={p} onChanged={reloadProperties} />
                ) : null}
                </View>
              ))}
              {(properties ?? []).some((p) => p.status === 'ACTIVE' || p.status === 'CLOSED') ? (
                <Text style={[styles.hint, { color: palette.textMuted }]}>
                  Ťuknutím rozbalíš ponuky aj s tlačidlami — netreba nikam chodiť.
                  Celý inzerát aj s fotkami otvoríš cez „Upraviť" v ňom.
                </Text>
              ) : null}
            </Card>

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
  buildRow: { alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  build: { ...Type.caption, fontFamily: 'Courier' },
});
