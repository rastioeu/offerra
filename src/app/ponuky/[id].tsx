/**
 * Správa ponúk — pohľad MAJITEĽA. `id` je id nehnuteľnosti.
 *
 * Oproti verejnému zoznamu má navyše dve veci, ktoré verejné nie sú:
 *  - dotazník nájomcu pri prenájme (DB ho cudziemu ani nevydá),
 *  - po prijatí ponuky skutočný kontakt na záujemcu.
 *
 * Kontakt sa NEČÍTA z tabuľky `profile` — rola `authenticated` na
 * `full_name`/`phone` nemá SELECT vôbec. Ide cez `offerra.offer_contact()`,
 * ktorá ho vydá len stranám prijatej ponuky.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, ErrorNote } from '@/components/ui';
import { useOffers, useTenantProfiles } from '@/hooks/use-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useProperty } from '@/hooks/use-properties';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchOfferContact,
  formatAmount,
  OFFER_STATUS_LABEL,
  type OfferContact,
  type TenantProfile,
} from '@/lib/offers';
import { db, formatDate } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function ManageOffersScreen() {
  const palette = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item } = useProperty(id);
  const { offers, error, reload } = useOffers(id);
  const tenants = useTenantProfiles((offers ?? []).map((o) => o.id));

  const [contacts, setContacts] = useState<Record<string, OfferContact | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useRefreshOnFocus(reload);

  async function decide(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
    setBusy(offerId);
    try {
      const { error: e } = await db().from('property_offer').update({ status }).eq('id', offerId);
      if (e) throw e;
      await reload();
      if (status === 'ACCEPTED') {
        const c = await fetchOfferContact(offerId);
        setContacts((prev) => ({ ...prev, [offerId]: c }));
        Alert.alert(
          'Ponuka prijatá',
          c?.full_name || c?.phone
            ? `Kontakt na záujemcu je teraz odkrytý: ${[c.full_name, c.phone].filter(Boolean).join(' · ')}`
            : 'Záujemca si zatiaľ nevyplnil meno ani telefón. Odkryje sa ti, hneď ako to spraví.'
        );
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[PONUKY] Rozhodnutie zlyhalo: ${m}`);
      Alert.alert('Nepodarilo sa uložiť', m);
    } finally {
      setBusy(null);
    }
  }

  async function revealContact(offerId: string) {
    try {
      const c = await fetchOfferContact(offerId);
      setContacts((prev) => ({ ...prev, [offerId]: c }));
      if (!c) Alert.alert('Kontakt nie je dostupný', 'Odkryje sa až po prijatí ponuky.');
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      Alert.alert('Načítanie kontaktu zlyhalo', m);
    }
  }

  const isRent = item?.transaction_type === 'RENT';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ponuky na inzerát',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />

        {offers === undefined || !item ? (
          <ActivityIndicator color={palette.primary} style={styles.spinner} />
        ) : null}

        {item ? <Text style={[styles.title, { color: palette.textPrimary }]}>{item.title}</Text> : null}

        {offers?.length === 0 ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            Na tento inzerát zatiaľ nikto neponúkol.
          </Text>
        ) : null}

        {item &&
          offers?.map((o) => {
            const t: TenantProfile | undefined = tenants[o.id];
            const contact = contacts[o.id];
            return (
              <Card key={o.id}>
                <View style={styles.head}>
                  <View style={styles.headLeft}>
                    <Text style={[styles.nick, { color: palette.textPrimary }]}>
                      {o.bidder?.nickname ?? 'neznámy'}
                    </Text>
                    <Text style={[styles.date, { color: palette.textMuted }]}>{formatDate(o.created_at)}</Text>
                  </View>
                  <View style={styles.headRight}>
                    <Text style={[styles.amount, { color: palette.primary }]}>
                      {formatAmount(o.amount, item.transaction_type)}
                    </Text>
                    <Badge
                      text={OFFER_STATUS_LABEL[o.status]}
                      tone={o.status === 'ACCEPTED' ? 'accent' : o.status === 'PENDING' ? 'warning' : 'neutral'}
                    />
                  </View>
                </View>

                {o.message ? (
                  <Text style={[styles.message, { color: palette.textSecondary }]}>„{o.message}"</Text>
                ) : null}

                {isRent ? (
                  t ? (
                    <View style={[styles.tenant, { borderTopColor: palette.border }]}>
                      <Text style={[styles.section, { color: palette.textMuted }]}>O NÁJOMCOVI</Text>
                      <Row label="Osôb" value={t.num_people != null ? String(t.num_people) : '—'} />
                      <Row
                        label="Zvieratá"
                        value={t.has_pets ? t.pet_details || 'Áno' : 'Nemá'}
                      />
                      <Row
                        label="Dĺžka nájmu"
                        value={t.lease_duration_months != null ? `${t.lease_duration_months} mes.` : '—'}
                      />
                      <Row label="Zamestnanie" value={t.employment_status ?? '—'} />
                      <Row
                        label="Príjem orientačne"
                        value={
                          t.monthly_income_hint != null
                            ? new Intl.NumberFormat('sk-SK', {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0,
                              }).format(t.monthly_income_hint)
                            : '—'
                        }
                      />
                      {t.note ? <Row label="Poznámka" value={t.note} /> : null}
                    </View>
                  ) : (
                    <Text style={[styles.date, { color: palette.textMuted }]}>
                      Záujemca dotazník nevyplnil.
                    </Text>
                  )
                ) : null}

                {o.status === 'ACCEPTED' ? (
                  <View style={[styles.contact, { borderColor: palette.secondary }]}>
                    <Text style={[styles.section, { color: palette.link }]}>ODKRYTÝ KONTAKT</Text>
                    {contact ? (
                      <>
                        <Row label="Meno" value={contact.full_name ?? 'nevyplnené'} />
                        <Row label="Telefón" value={contact.phone ?? 'nevyplnený'} />
                      </>
                    ) : (
                      <Button title="Zobraziť kontakt" onPress={() => revealContact(o.id)} variant="outline" />
                    )}
                  </View>
                ) : null}

                {o.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <Button
                      title={busy === o.id ? 'Ukladám…' : 'Prijať'}
                      onPress={() => decide(o.id, 'ACCEPTED')}
                      disabled={busy !== null}
                    />
                    <Button
                      title="Odmietnuť"
                      onPress={() => decide(o.id, 'REJECTED')}
                      variant="outline"
                      disabled={busy !== null}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
      </ScrollView>
    </SafeAreaView>
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
  spinner: { marginTop: Spacing.xxl },
  title: { ...Type.title, fontWeight: Weight.bold },
  empty: { ...Type.body },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  headLeft: { flexShrink: 1, gap: 2 },
  headRight: { alignItems: 'flex-end', gap: 4 },
  nick: { ...Type.subtitle, fontWeight: Weight.semibold },
  date: { ...Type.caption },
  amount: { ...Type.subtitle, fontWeight: Weight.bold },
  message: { ...Type.bodyMd, fontStyle: 'italic' },
  tenant: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.xs },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  contact: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
  actions: { gap: Spacing.sm },
});
