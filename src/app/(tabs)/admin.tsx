/**
 * Správa — tab viditeľný LEN pre rolu ADMIN.
 *
 * Skrytie tabu je pohodlie, nie ochrana. Skutočná ochrana je v databáze:
 * každá funkcia použitá na tejto obrazovke sa pýta `offerra.is_admin()`
 * a bežnému účtu vráti chybu alebo prázdno — aj keby sa sem dostal.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, ErrorNote } from '@/components/ui';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { AdminStats, AdminUser, ReportRow } from '@/lib/admin';
import { db, formatDate, STATUS_LABEL, type PropertyStatus } from '@/lib/property';
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, type ReportReason, type ReportStatus } from '@/lib/report';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

type Section = 'REPORTS' | 'PROPERTIES' | 'USERS';

/**
 * Prah upozornenia (schválil Rastio 7.8.2026): TRAJA RÔZNI nahlasovatelia
 * na tú istú vec — jeden nahnevaný konkurent nestačí. Výnimka: dôvod
 * PODVOD upozorní už pri PRVOM nahlásení, lebo pri nehnuteľnostiach ide
 * o peniaze a čas hrá proti obeti. Prah spúšťa UPOZORNENIE, nie akciu.
 */
type Alert_ = {
  target_type: string;
  target_id: string;
  nahlaseni: number;
  dovody: string;
  naliehave: boolean;
};

type AdminProperty = {
  id: string;
  title: string;
  status: PropertyStatus;
  city: string | null;
  created_at: string;
  rejection_reason: string | null;
};

export default function AdminScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();

  const [section, setSection] = useState<Section>('REPORTS');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [alerts, setAlerts] = useState<Alert_[]>([]);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [s, r, p, u, a] = await Promise.all([
        db().rpc('admin_stats'),
        db().from('report').select('*').order('created_at', { ascending: false }).limit(200),
        db().from('property').select('id,title,status,city,created_at,rejection_reason')
          .order('created_at', { ascending: false }).limit(200),
        db().rpc('admin_users'),
        db().rpc('admin_alerts'),
      ]);
      if (s.error) throw s.error;
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      if (u.error) throw u.error;
      if (a.error) throw a.error;
      setStats(((s.data ?? []) as AdminStats[])[0] ?? null);
      setReports((r.data ?? []) as ReportRow[]);
      setProperties((p.data ?? []) as AdminProperty[]);
      setUsers((u.data ?? []) as AdminUser[]);
      setAlerts((a.data ?? []) as Alert_[]);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ADMIN] Načítanie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);
  useRefreshOnFocus(reload);

  async function call(fn: string, args: Record<string, unknown>, done: string) {
    try {
      const { error: e } = await db().rpc(fn, args);
      if (e) throw e;
      await reload();
      Alert.alert('Hotovo', done);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ADMIN] ${fn} zlyhalo: ${m}`);
      Alert.alert('Akcia zlyhala', m);
    }
  }

  function reject(p: AdminProperty) {
    Alert.alert('Skryť inzerát?', 'Zmizne z katalógu, ale ostane v databáze aj vlastníkovi.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Skryť',
        style: 'destructive',
        onPress: () =>
          call('admin_set_property_status',
            { p_property_id: p.id, p_status: 'REJECTED', p_reason: 'Zamietnuté správcom' },
            'Inzerát je skrytý z katalógu.'),
      },
    ]);
  }

  function destroy(p: AdminProperty) {
    Alert.alert('Zmazať natrvalo?', 'Zmaže sa aj s fotkami a ponukami. Nedá sa vrátiť.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: () => call('admin_delete_property', { p_property_id: p.id }, 'Inzerát je zmazaný.'),
      },
    ]);
  }

  function toggleBlock(u: AdminUser) {
    const blocking = !u.is_blocked;
    Alert.alert(
      blocking ? 'Zablokovať používateľa?' : 'Odblokovať?',
      blocking
        ? 'Nebude sa vedieť prihlásiť ani nič pridať. Jeho doterajšie dáta ostanú.'
        : 'Bude sa vedieť znovu prihlásiť a pridávať.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: blocking ? 'Zablokovať' : 'Odblokovať',
          style: blocking ? 'destructive' : 'default',
          onPress: () =>
            call('admin_set_blocked',
              { p_user_id: u.id, p_blocked: blocking, p_reason: blocking ? 'Zablokované správcom' : null },
              blocking ? 'Používateľ je zablokovaný.' : 'Používateľ je odblokovaný.'),
        },
      ]
    );
  }

  /**
   * Kam vedie ťuknutie na nahlásenie. Inzerát má obrazovku, používateľ ani
   * ponuka nie — tam sa aspoň ukáže CELÉ id, ktoré je v riadku odrezané na
   * osem znakov. Slepé ťuknutie, po ktorom sa nič nestane, je zakázané
   * (CLAUDE.md §2).
   */
  function openTarget(targetType: string, targetId: string, extra?: string) {
    if (targetType === 'PROPERTY') {
      router.push({ pathname: '/nehnutelnost/[id]', params: { id: targetId } });
      return;
    }
    Alert.alert(
      targetType === 'USER' ? 'Nahlásený používateľ' : 'Nahlásená ponuka',
      [`ID: ${targetId}`, extra].filter(Boolean).join('\n\n') +
        '\n\nVlastnú obrazovku zatiaľ nemá — konať sa dá cez zoznam Používatelia.'
    );
  }

  const openReports = reports.filter((r) => r.status === 'PENDING');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Správa</Text>

        <ErrorNote error={error} />
        {loading ? <ActivityIndicator color={palette.primary} /> : null}

        {stats ? (
          <Card>
            <Text style={[styles.section, { color: palette.textMuted }]}>ŠTATISTIKA</Text>
            <View style={styles.stats}>
              <Stat label="Zverejnené" value={stats.inzeraty_aktivne} />
              <Stat label="Inzeráty spolu" value={stats.inzeraty_spolu} />
              <Stat label="Ponuky" value={stats.ponuky} />
              <Stat label="Dopyty" value={stats.dopyty} />
              <Stat label="Používatelia" value={stats.pouzivatelia} />
              <Stat label="Zablokovaní" value={stats.zablokovani} />
              <Stat label="Otvorené nahlásenia" value={stats.nahlasenia_otvorene} highlight />
            </View>
          </Card>
        ) : null}

        {alerts.length > 0 ? (
          <Card>
            <Text style={[styles.section, { color: palette.danger }]}>
              VYŽADUJE POZORNOSŤ ({alerts.length})
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              Traja rôzni ľudia nahlásili to isté — alebo niekto nahlásil podvod.
            </Text>
            {alerts.map((a) => (
              <Pressable
                key={`${a.target_type}-${a.target_id}`}
                onPress={() => openTarget(a.target_type, a.target_id, `${a.nahlaseni}× · ${a.dovody}`)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.alert,
                  {
                    borderColor: a.naliehave ? palette.danger : palette.warning,
                    backgroundColor: pressed ? palette.surfacePressed : 'transparent',
                  },
                ]}>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    {a.target_type === 'PROPERTY' ? 'Inzerát' : a.target_type === 'USER' ? 'Používateľ' : 'Ponuka'}{' '}
                    {a.target_id.slice(0, 8)}
                  </Text>
                  {a.naliehave ? <Badge text="PODVOD" tone="warning" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {a.nahlaseni}× · {a.dovody}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['REPORTS', `Nahlásenia (${openReports.length})`],
              ['PROPERTIES', 'Inzeráty'],
              ['USERS', 'Používatelia'],
            ] as [Section, string][]
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setSection(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: section === key }}
              style={[
                styles.tab,
                {
                  backgroundColor: section === key ? palette.primary : palette.surface,
                  borderColor: section === key ? palette.primary : palette.border,
                },
              ]}>
              <Text style={[styles.tabText, { color: section === key ? palette.onPrimary : palette.textSecondary }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {section === 'REPORTS' ? (
          reports.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textMuted }]}>Žiadne nahlásenia.</Text>
          ) : (
            reports.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => openTarget(r.target_type, r.target_id, r.note ?? undefined)}
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    {r.target_type === 'PROPERTY' ? 'Inzerát' : r.target_type === 'USER' ? 'Používateľ' : 'Ponuka'}
                  </Text>
                  <Badge
                    text={REPORT_STATUS_LABEL[r.status as ReportStatus] ?? r.status}
                    tone={r.status === 'PENDING' ? 'warning' : 'neutral'}
                  />
                </View>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {REPORT_REASON_LABEL[r.reason as ReportReason] ?? r.reason}
                </Text>
                {r.note ? <Text style={[styles.note, { color: palette.textPrimary }]}>„{r.note}"</Text> : null}
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {formatDate(r.created_at)} · cieľ {r.target_id.slice(0, 8)}
                </Text>
                {r.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <Button
                      title="Označiť ako riešené"
                      onPress={() => call('admin_set_report_status', { p_report_id: r.id, p_status: 'ACTIONED' }, 'Označené.')}
                      variant="outline"
                    />
                    <Button
                      title="Zamietnuť nahlásenie"
                      onPress={() => call('admin_set_report_status', { p_report_id: r.id, p_status: 'DISMISSED' }, 'Zamietnuté.')}
                      variant="outline"
                    />
                  </View>
                ) : null}
              </Card>
              </Pressable>
            ))
          )
        ) : null}

        {section === 'PROPERTIES'
          ? properties.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/nehnutelnost/[id]', params: { id: p.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    {p.title || 'Bez názvu'}
                  </Text>
                  <Badge
                    text={p.status === 'REJECTED' ? 'Skryté' : STATUS_LABEL[p.status]}
                    tone={p.status === 'ACTIVE' ? 'accent' : 'warning'}
                  />
                </View>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {[p.city, formatDate(p.created_at)].filter(Boolean).join(' · ')}
                </Text>
                {p.rejection_reason ? (
                  <Text style={[styles.note, { color: palette.warning }]}>{p.rejection_reason}</Text>
                ) : null}
                <View style={styles.actions}>
                  {p.status !== 'ACTIVE' ? (
                    <Button
                      title="Schváliť"
                      onPress={() =>
                        call('admin_set_property_status', { p_property_id: p.id, p_status: 'ACTIVE' }, 'Zverejnené.')
                      }
                    />
                  ) : (
                    <Button title="Skryť z katalógu" onPress={() => reject(p)} variant="outline" />
                  )}
                  <Button title="Zmazať natrvalo" onPress={() => destroy(p)} variant="danger" />
                </View>
              </Card>
              </Pressable>
            ))
          : null}

        {section === 'USERS'
          ? users.map((u) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  Alert.alert(
                    u.nickname,
                    [
                      `ID: ${u.id}`,
                      `E-mail: ${u.email}`,
                      `Rola: ${u.role}`,
                      `Inzerátov: ${u.inzeraty}`,
                      `Registrovaný: ${formatDate(u.created_at)}`,
                      u.is_blocked ? 'Stav: ZABLOKOVANÝ' : 'Stav: aktívny',
                    ].join('\n')
                  )
                }
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{u.nickname}</Text>
                  {u.role === 'ADMIN' ? <Badge text="SPRÁVCA" tone="accent" /> : null}
                  {u.is_blocked ? <Badge text="ZABLOKOVANÝ" tone="warning" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {u.email} · {u.inzeraty} inzerátov · od {formatDate(u.created_at)}
                </Text>
                {u.id !== session?.user.id ? (
                  <Button
                    title={u.is_blocked ? 'Odblokovať' : 'Zablokovať'}
                    onPress={() => toggleBlock(u)}
                    variant={u.is_blocked ? 'outline' : 'danger'}
                  />
                ) : (
                  <Text style={[styles.meta, { color: palette.textMuted }]}>To si ty.</Text>
                )}
              </Card>
              </Pressable>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const palette = useTheme();
  return (
    <View style={[styles.stat, { borderColor: highlight && value > 0 ? palette.warning : palette.border }]}>
      <Text style={[styles.statValue, { color: highlight && value > 0 ? palette.warning : palette.primary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { ...Type.hero, fontWeight: Weight.bold },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 96 },
  statValue: { ...Type.heading, fontWeight: Weight.bold, fontVariant: ['tabular-nums'] },
  statLabel: { ...Type.caption },
  tabs: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  tab: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  tabText: { ...Type.caption, fontWeight: Weight.semibold },
  empty: { ...Type.body },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  rowTitle: { ...Type.subtitle, fontWeight: Weight.semibold, flexShrink: 1 },
  meta: { ...Type.caption },
  note: { ...Type.bodyMd },
  actions: { gap: Spacing.sm },
  alert: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
});
