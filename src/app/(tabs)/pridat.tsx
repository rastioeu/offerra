/**
 * Tab „Pridať" — vytvorenie nového inzerátu a prehľad tých mojich.
 *
 * Nový inzerát vzniká hneď ako DRAFT v DB (nie až po vyplnení formulára).
 * Dôvod: fotky sa nahrávajú do `{ownerId}/{propertyId}/…`, takže `propertyId`
 * musí existovať PRED prvým uploadom. Vedľajší efekt je dobrý — rozrobený
 * inzerát sa nestratí, keď appka spadne alebo ju používateľ zavrie.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyNote } from '@/components/empty-state';
import { Badge, Button, ErrorNote } from '@/components/ui';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useMyProperties } from '@/hooks/use-properties';
import { useSession } from '@/hooks/use-session';
import { AppHeader } from '@/components/app-header';
import { useTheme } from '@/hooks/use-theme';
import { db, formatDate, PROPERTY_LABEL, STATUS_LABEL, TRANSACTION_LABEL } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function PridatScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { items, error, reload } = useMyProperties(userId);
  const [creating, setCreating] = useState(false);
  useRefreshOnFocus(reload);

  async function createDraft() {
    if (!userId || creating) return;
    setCreating(true);
    try {
      const { data, error: e } = await db()
        .from('property')
        .insert({
          owner_id: userId,
          status: 'DRAFT',
          transaction_type: 'SALE',
          property_type: 'APARTMENT',
          title: '',
        })
        .select('id')
        .single();
      if (e) throw e;
      await reload();
      router.push({ pathname: '/inzerat/[id]', params: { id: (data as { id: string }).id } });
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[PRIDAŤ] Vytvorenie konceptu zlyhalo: ${m}`);
      Alert.alert('Nepodarilo sa založiť inzerát', m);
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Pridať</Text>

        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          Ponúkaš nehnuteľnosť, alebo naopak niečo hľadáš? Offerra vie oboje.
        </Text>

        <Button
          title={creating ? 'Zakladám…' : '+ Pridať nehnuteľnosť'}
          onPress={createDraft}
          disabled={creating || !userId}
        />
        <Button
          title="+ Pridať dopyt"
          onPress={() => router.push('/dopyt/novy')}
          variant="outline"
          disabled={!userId}
        />

        <ErrorNote error={error} />

        <Text style={[styles.section, { color: palette.textMuted }]}>MOJE INZERÁTY</Text>

        {items === undefined ? <ActivityIndicator color={palette.primary} /> : null}

        {items?.length === 0 ? (
          <EmptyNote>Zatiaľ nemáš žiadny inzerát. Založ prvý tlačidlom vyššie.</EmptyNote>
        ) : null}

        {items?.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push({ pathname: '/inzerat/[id]', params: { id: p.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? palette.surfacePressed : palette.surface,
                borderColor: palette.border,
              },
            ]}>
            <View style={styles.rowHead}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: palette.textPrimary }]}>
                {p.title.trim() || 'Bez názvu'}
              </Text>
              <Badge
                text={STATUS_LABEL[p.status]}
                tone={p.status === 'ACTIVE' ? 'accent' : p.status === 'REJECTED' ? 'warning' : p.status === 'DRAFT' ? 'warning' : 'neutral'}
              />
            </View>
            <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
              {TRANSACTION_LABEL[p.transaction_type]} · {PROPERTY_LABEL[p.property_type]}
              {p.city ? ` · ${p.city}` : ''} · {p.media.length} fotiek
            </Text>
            <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
              Upravené {formatDate(p.updated_at)}
            </Text>
            {p.status === 'REJECTED' ? (
              <Text style={[styles.rowMeta, { color: palette.danger }]}>
                Skryté správcom{p.rejection_reason ? `: ${p.rejection_reason}` : ''}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyMd },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1, marginTop: Spacing.sm },
  empty: { ...Type.body },
  row: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.xs },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  rowTitle: { ...Type.subtitle, fontWeight: Weight.semibold, flexShrink: 1 },
  rowMeta: { ...Type.caption },
});
