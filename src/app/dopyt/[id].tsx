/**
 * Detail dopytu + tlačidlo „Osloviť".
 *
 * NOTIFIKÁCIE V OFFERRE NEEXISTUJÚ (overené v registri — appka nemá
 * `expo-notifications` ani push token). Oslovenie preto zatiaľ nie je
 * push ani DM, ale ZÁZNAM: adresát ho vidí vo svojom profile pri danom
 * dopyte. Je to vedomý medzikrok, nie nedopatrenie — a hlavne sa pri ňom
 * nič nestratí, keď notifikácie pribudnú.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModalScreen } from '@/components/modal-screen';

import { Badge, Button, Card, ErrorNote, Field, KeyboardDoneBar } from '@/components/ui';
import { useOutreach, useRequest } from '@/hooks/use-offers';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { formatBudget } from '@/lib/offers';
import { db, DEMAND_LABEL, formatArea, formatDate, PROPERTY_LABEL, type PropertyType } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

export default function RequestDetailScreen() {
  const palette = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const myId = session?.user.id;

  const { item, error } = useRequest(id);
  const { items: myProperties } = useMyProperties(myId);
  const { items: outreach, reload: reloadOutreach } = useOutreach(id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMine = Boolean(myId && item && item.user_id === myId);
  const activeProperties = (myProperties ?? []).filter((p) => p.status === 'ACTIVE');
  const alreadySent = new Set(outreach.map((o) => o.property_id));

  async function send() {
    if (!item || !myId || !chosen || busy) return;
    setBusy(true);
    try {
      const { error: e } = await db().from('request_outreach').insert({
        request_id: item.id,
        property_id: chosen,
        from_id: myId,
        message: message.trim() || null,
      });
      if (e) throw e;
      await reloadOutreach();
      setPickerOpen(false);
      setChosen(null);
      setMessage('');
      Alert.alert(
        'Oslovenie odoslané',
        'Autor dopytu ho uvidí vo svojom profile. Push notifikácie zatiaľ appka nemá.'
      );
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OSLOVENIE] Odoslanie zlyhalo: ${m}`);
      Alert.alert(
        'Oslovenie sa nepodarilo',
        /duplicate key/i.test(m) ? 'Týmto inzerátom si tento dopyt už oslovil.' : m
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Dopyt',
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorNote error={error} />
        {item === undefined ? <ActivityIndicator color={palette.primary} style={styles.spinner} /> : null}
        {item === null && !error ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>Dopyt sa nenašiel.</Text>
        ) : null}

        {item ? (
          <>
            <View style={styles.badges}>
              <Badge text={DEMAND_LABEL[item.transaction_type].toUpperCase()} tone="accent" />
              {item.property_type ? <Badge text={PROPERTY_LABEL[item.property_type as PropertyType]} /> : null}
            </View>

            <Text style={[styles.budget, { color: palette.primary }]}>
              {formatBudget(item.budget_min, item.budget_max)}
            </Text>
            <Text style={[styles.author, { color: palette.textMuted }]}>
              Hľadá {item.author?.nickname ?? 'neznámy'} · {formatDate(item.created_at)}
            </Text>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>ČO HĽADÁ</Text>
              <Row label="Lokalita" value={[item.city, item.district, item.region].filter(Boolean).join(' · ') || '—'} />
              <Row label="Typ" value={item.property_type ? PROPERTY_LABEL[item.property_type as PropertyType] : 'akýkoľvek'} />
              <Row label="Izby" value={item.rooms_min != null ? `aspoň ${item.rooms_min}` : '—'} />
              <Row label="Výmera" value={item.area_min != null ? `aspoň ${formatArea(item.area_min)}` : '—'} />
            </Card>

            {item.description ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>POPIS</Text>
                <Text style={[styles.desc, { color: palette.textPrimary }]}>{item.description}</Text>
              </Card>
            ) : null}

            {isMine ? (
              <Card>
                <Text style={[styles.section, { color: palette.textMuted }]}>
                  OSLOVENIA ({outreach.length})
                </Text>
                {outreach.length === 0 ? (
                  <Text style={[styles.desc, { color: palette.textMuted }]}>
                    Zatiaľ ťa nikto neoslovil.
                  </Text>
                ) : (
                  outreach.map((o) => (
                    <View key={o.id} style={[styles.outreach, { borderColor: palette.border }]}>
                      <Text style={[styles.desc, { color: palette.textPrimary }]}>
                        {o.message || 'Bez správy.'}
                      </Text>
                      <Text style={[styles.author, { color: palette.textMuted }]}>{formatDate(o.created_at)}</Text>
                    </View>
                  ))
                )}
              </Card>
            ) : myId ? (
              <>
                <Button
                  title="Osloviť so svojím inzerátom"
                  onPress={() => {
                    if (activeProperties.length === 0) {
                      Alert.alert(
                        'Nemáš čo ponúknuť',
                        'Osloviť sa dá len zverejneným inzerátom. Najprv nejaký zverejni v tabe „Pridať".'
                      );
                      return;
                    }
                    setPickerOpen(true);
                  }}
                />
                {outreach.length > 0 ? (
                  <Text style={[styles.author, { color: palette.textMuted }]}>
                    Už si tento dopyt oslovil ({outreach.length}×).
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <ModalScreen visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Ktorým inzerátom?">
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
            {activeProperties.map((p) => {
              const used = alreadySent.has(p.id);
              const active = chosen === p.id;
              return (
                <Pressable
                  key={p.id}
                  disabled={used}
                  onPress={() => setChosen(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: used }}
                  style={[
                    styles.option,
                    {
                      backgroundColor: active ? palette.surfacePressed : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                      opacity: used ? 0.5 : 1,
                    },
                  ]}>
                  <Text style={[styles.optionTitle, { color: palette.textPrimary }]}>{p.title || 'Bez názvu'}</Text>
                  <Text style={[styles.author, { color: palette.textMuted }]}>
                    {used ? 'týmto si už oslovil' : [p.city, formatArea(p.area_m2)].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
              );
            })}

            <Field
              label="Správa (nepovinné)"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Napíš, prečo by ho mohol tvoj inzerát zaujímať."
            />

            <Button
              title={busy ? 'Odosielam…' : 'Odoslať oslovenie'}
              onPress={send}
              disabled={busy || !chosen}
            />
          </ScrollView>
          <KeyboardDoneBar />
      </ModalScreen>
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
  empty: { ...Type.body, textAlign: 'center', marginTop: Spacing.xxl },
  badges: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  budget: { ...Type.hero, fontWeight: Weight.bold },
  author: { ...Type.caption },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  desc: { ...Type.bodyLg },
  outreach: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  rowLabel: { ...Type.bodyMd },
  rowValue: { ...Type.bodyMd, fontWeight: Weight.medium, flexShrink: 1, textAlign: 'right' },
  modal: { padding: Spacing.lg, gap: Spacing.md },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...Type.title, fontWeight: Weight.bold },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
  modalScroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  option: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 2 },
  optionTitle: { ...Type.bodyLg, fontWeight: Weight.semibold },
});
