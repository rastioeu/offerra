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
import { Badge, Button, Card, ErrorNote, KeyboardDoneBar, SectionLabel } from '@/components/ui';
import { useFavoriteProperties } from '@/hooks/use-favorites';
import { useMyOffers, useMyOutreach, useRequests } from '@/hooks/use-offers';
import { useOfferCountdownTick } from '@/hooks/use-offer-countdown-tick';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { AppHeader } from '@/components/app-header';
import { MyListingRow } from '@/components/my-listing-row';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { offerCountdown } from '@/lib/offer-validity';
import { formatAmount, getOfferStatusLabel, getRequestStatusLabel, formatBudget } from '@/lib/offers';
import { buildInfoLine, readBuildInfo } from '@/lib/build-info';
import { photoErrorMessage, pickPhoto, uploadPhoto } from '@/lib/photo';
import { formatArea, formatDate, getStatusLabel, getTransactionLabel } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function ProfilScreen() {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const { profile, error, reload } = useProfile();
  const { items: properties } = useMyProperties(userId);
  const { items: offers } = useMyOffers(userId);
  const { items: requests } = useRequests(userId);
  const { items: myOutreach } = useMyOutreach();
  const { items: favorites } = useFavoriteProperties(userId);

  const [busy, setBusy] = useState(false);

  // Dva NEZÁVISLÉ spoločné tikajúce časy — jeden pre „Moje inzeráty"
  // (najbližšie vypršiavajúca PRICHÁDZAJÚCA ponuka na KAŽDOM inzeráte),
  // jeden pre „Moje ponuky" (platnosť KAŽDEJ mojej podanej ponuky). Dve
  // sekcie, dva intervaly — stále „jeden na zoznam", nie jeden na riadok
  // (Rastio, 1.9.2026 pre `OfferList`, tá istá zásada tu na dve miesta).
  const myListingsNow = useOfferCountdownTick((properties ?? []).map((p) => p.nearest_offer_valid_until));
  const myOffersNow = useOfferCountdownTick((offers ?? []).map((o) => o.valid_until));

  // Formulár na meno, telefón a prezývku tu ZÁMERNE nie je. Kontaktné údaje
  // sa upravujú v Nastaveniach (`ContactCard`), prezývka na `/prezyvka`.
  // Do 9.8.2026 tu po tom presune ostali polia aj s ukladaním, ktoré sa
  // nemali ako zobraziť — a ich napĺňanie v efekte bolo tá istá chyba,
  // ktorá zmazala rozpísaný inzerát pri pridaní fotky (`use-form-draft.ts`).

  async function changePhoto() {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const photo = await pickPhoto(t, [1, 1]);
      if (!photo) return; // zrušené používateľom

      // Vždy tá istá cesta + `upsert` — profilovka má byť jedna, nie
      // hromada starých súborov.
      const url = await uploadPhoto(`${userId}/avatar.jpg`, photo, true);

      // Cache-bust: `upsert` prepíše ten istý súbor a `expo-image` cachuje
      // podľa URI, takže bez tohto by ostala visieť stará fotka.
      const problem = await saveProfile(t, userId, { avatar_url: `${url}?t=${Date.now()}` }, false);
      if (problem) throw new Error(problem);

      console.log('[FOTKA] 7 HOTOVO (profilovka)');
      await reload();
      toast(t('profil.avatarChangedToast'));
    } catch (e: unknown) {
      const m = photoErrorMessage(t, e);
      console.log(`[PROFIL] Zmena fotky zlyhala: ${m}`);
      Alert.alert(t('profil.avatarChangeFailedTitle'), m);
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
      title: p.title || t('pridat.noTitle'),
      detail: [p.city, getStatusLabel(t)[p.status]].filter(Boolean).join(' · '),
      onPress: () => router.push({ pathname: '/inzerat/[id]', params: { id: p.id } }),
    })),
    ...(offers ?? []).map((o) => ({
      id: o.id,
      at: o.created_at,
      kind: 'PONUKA_ODOSLANA' as const,
      title: o.property?.title || t('profil.listingFallback'),
      detail: `${formatAmount(t, o.amount, o.property?.transaction_type ?? 'SALE')} · ${getOfferStatusLabel(t)[o.status]}`,
      onPress: () => router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } }),
    })),
    // Oslovenia MOJICH dopytov. Vedú na PONÚKNUTÝ inzerát, nie na môj
    // dopyt — tam sa dá niečo spraviť (pozrieť si ho, vypýtať obhliadku).
    ...(myOutreach ?? []).map((o) => ({
      id: o.id,
      at: o.created_at,
      kind: 'OSLOVENIE_DOPYTU' as const,
      title: o.property_title || t('profil.listingFallback'),
      detail: [o.from_nickname, o.property_city].filter(Boolean).join(' · '),
      onPress: () => router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } }),
    })),
    ...(requests ?? []).map((r) => ({
      id: r.id,
      at: r.created_at,
      kind: 'DOPYT' as const,
      title: r.description?.slice(0, 60) || t('profil.demandFallback'),
      detail: formatBudget(t, r.budget_min, r.budget_max),
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
        <Text style={[styles.title, { color: palette.textPrimary }]}>{t('profil.title')}</Text>

        <ErrorNote error={error} />
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
                  <Text style={[styles.hint, { color: palette.textMuted }]}>{t('profil.howOthersSeeYou')}</Text>
                  <Pressable onPress={changePhoto} accessibilityRole="button" disabled={busy}>
                    <Text style={[styles.link, { color: palette.link }]}>
                      {busy ? t('nastavenia.signOutBusy') : profile.avatar_url ? t('profil.changePhoto') : t('profil.addPhoto')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>
                {t('profil.myListingsCount', { count: properties?.length ?? 0 })}
              </Text>
              {(properties ?? []).length === 0 ? (
                <Text style={[styles.hint, { color: palette.textMuted }]}>{t('profil.noneYet')}</Text>
              ) : null}
              {(properties ?? []).map((p) => (
                <MyListingRow
                  key={p.id}
                  item={p}
                  now={myListingsNow}
                  // ZJEDNOTENÉ S DETAILOM (Rastio, 13.8.2026) — mení predošlé
                  // rozhodnutie o inline rozbaľovaní. Predtým ťuknutie
                  // rozbalilo ponuky NA MIESTE s vlastným Prijať/Odmietnuť —
                  // druhé miesto s tou istou akciou, presne tá trieda chyby,
                  // ktorá appku už raz stála zvonček aj chybové hlášky
                  // (komentár v zmazanom `inline-offers.tsx`). Teraz vedie
                  // VŽDY do toho istého detailu, aký vidí cudzí človek
                  // z katalógu — podtaby Ponuky/Správy/Obhliadka/Hypotéka/
                  // Hodnotenia sú jediné miesto, kde sa s inzerátom niečo
                  // robí. Koncept ponuky nemá, tam patrí rovno úprava.
                  onPress={() =>
                    p.status === 'DRAFT' || p.status === 'REJECTED'
                      ? router.push({ pathname: '/inzerat/[id]', params: { id: p.id } })
                      : router.push({ pathname: '/nehnutelnost/[id]', params: { id: p.id } })
                  }
                />
              ))}
              {(properties ?? []).some((p) => p.status === 'ACTIVE' || p.status === 'CLOSED') ? (
                <Text style={[styles.hint, { color: palette.textMuted }]}>{t('profil.tapToOpenNote')}</Text>
              ) : null}
            </Card>

            <Card>
              <SectionLabel>{t('profil.timeline')}</SectionLabel>
              <ActivityTimeline events={timeline.slice(0, 25)} />
            </Card>

            <SectionList
              label={t('profil.favoritesCount', { count: favorites?.length ?? 0 })}
              empty={t('profil.favoritesEmpty')}
              rows={(favorites ?? []).map((p) => ({
                key: p.id,
                title: p.title || t('pridat.noTitle'),
                meta: [p.city, formatArea(p.area_m2)].filter(Boolean).join(' · ') || '—',
                badge: getTransactionLabel(t)[p.transaction_type],
                onPress: () => router.push({ pathname: '/nehnutelnost/[id]', params: { id: p.id } }),
              }))}
            />

            <SectionList
              label={t('profil.myOffersCount', { count: offers?.length ?? 0 })}
              empty={t('profil.myOffersEmpty')}
              rows={(offers ?? []).map((o) => {
                // Živý odpočet platnosti KAŽDEJ mojej ponuky (Rastio,
                // 2.9.2026) — tu sa `status` posiela SKUTOČNÝ, nie napevno
                // ako pri katalógu/„Moje inzeráty": táto ponuka nebola
                // vopred filtrovaná na „neexpirovanú", takže `EXPIRED` sem
                // naozaj môže prísť priamo z DB.
                const cd = offerCountdown(t, language, o.status, o.valid_until, myOffersNow);
                return {
                  key: o.id,
                  title: o.property?.title || t('profil.listingFallback'),
                  // „videná" je pri čakajúcej ponuke to jediné, čo sa medzi
                  // podaním a rozhodnutím zmení — patrí do prehľadu.
                  meta: [
                    formatAmount(t, o.amount, o.property?.transaction_type ?? 'SALE'),
                    formatDate(language, o.created_at),
                    o.status === 'PENDING' && o.viewed_by_owner_at ? t('profil.seenByOwner') : null,
                    cd ? cd.text : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  metaUrgent: cd?.urgent ?? false,
                  badge: getOfferStatusLabel(t)[o.status],
                  onPress: () =>
                    router.push({ pathname: '/nehnutelnost/[id]', params: { id: o.property_id } }),
                };
              })}
            />

            <SectionList
              label={t('profil.myDemandsCount', { count: requests?.length ?? 0 })}
              empty={t('profil.myDemandsEmpty')}
              rows={(requests ?? []).map((r) => ({
                key: r.id,
                title: r.description?.slice(0, 60) || t('profil.demandFallback'),
                meta: `${formatBudget(t, r.budget_min, r.budget_max)}${r.city ? ` · ${r.city}` : ''}`,
                badge: getRequestStatusLabel(t)[r.status],
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
  rows: { key: string; title: string; meta: string; metaUrgent?: boolean; badge: string; onPress: () => void }[];
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
            {/* Posledná hodina platnosti ponuky = zvýraznenie (Rastio,
                1.9.2026) — platí aj tu, nie len na detaile ponuky. */}
            <Text style={[styles.hint, { color: r.metaUrgent ? palette.danger : palette.textMuted, fontWeight: r.metaUrgent ? Weight.bold : Weight.regular }]}>
              {r.meta}
            </Text>
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
