/**
 * Správa — tab viditeľný LEN pre rolu ADMIN.
 *
 * Skrytie tabu je pohodlie, nie ochrana. Skutočná ochrana je v databáze:
 * každá funkcia použitá na tejto obrazovke sa pýta `offerra.is_admin()`
 * a bežnému účtu vráti chybu alebo prázdno — aj keby sa sem dostal.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Badge, Button, Card, CheckRow, ErrorNote } from '@/components/ui';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useSession } from '@/hooks/use-session';
import { useToast, useUndoToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import type { AdminStats, AdminUser, ReportRow } from '@/lib/admin';
import { db, formatDate, getStatusLabel, type PropertyStatus } from '@/lib/property';
import {
  getReportReasons,
  getReportReasonLabel,
  getReportStatusLabel,
  type ReportReason,
  type ReportStatus,
} from '@/lib/report';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';
import { errorText } from '@/lib/errors';

type Section = 'REPORTS' | 'PROPERTIES' | 'USERS' | 'SETTINGS';

type ConfigRow = { key: string; value: string; label: string; hint: string | null };
type TopLister = {
  user_id: string;
  nickname: string;
  email: string;
  active_count: number;
  total_count: number;
  agent_declared_at: string | null;
  is_blocked: boolean;
};
type DuplicateContact = { kind: string; value: string; accounts: number; nicknames: string };

/**
 * PODOZRIVÍ POUŽÍVATELIA (Rastio, 13.8.2026) — tri vzorce, LEN signály na
 * ručnú kontrolu, rovnaký princíp ako `Alert_`/`RepeatOffender` vyššie:
 * appka nikoho neblokuje sama.
 *
 *   1. ZÁPLAVA — ponuky na neobvykle veľa RÔZNYCH inzerátov v krátkom čase.
 *   2. NÍZKE PONUKY — opakovane výrazne pod orientačnou cenou naprieč
 *      VIACERÝMI inzerátmi (raz je vyjednávanie, opakovane je vzorec).
 *   3. TEN ISTÝ VLASTNÍK — tretí vzorec pridaný BEZ pýtania (zadanie:
 *      „ak ťa napadne ďalší rozumný vzor, pridaj ho"): jeden záujemca
 *      opakovane ponúka na inzeráty TOHO ISTÉHO predávajúceho — pri
 *      otvorených ponukách (sumy sú verejné) je to spôsob, ako si vlastník
 *      môže druhým účtom nadsadzovať vlastnú cenu.
 *
 * Prahy sú nastaviteľné cez `app_config` — pozri `susParams` nižšie.
 */
type SuspiciousFlood = {
  user_id: string;
  nickname: string;
  pocet_inzeratov: number;
  pocet_ponuk: number;
  is_blocked: boolean;
};
type SuspiciousLowball = {
  user_id: string;
  nickname: string;
  pocet_nizkych: number;
  priemerny_pomer: number;
  is_blocked: boolean;
};
type SuspiciousShill = {
  bidder_id: string;
  bidder_nickname: string;
  owner_id: string;
  owner_nickname: string;
  pocet_inzeratov: number;
};

/** Kľúče `app_config`, ktoré ovládajú prahy vyššie — v tomto poradí sa aj vypíšu. */
const SUSPICIOUS_CONFIG_KEYS = [
  'suspicious_offer_flood_hours',
  'suspicious_offer_flood_count',
  'suspicious_lowball_pct',
  'suspicious_lowball_min_count',
  'suspicious_shill_min_count',
] as const;

/**
 * Rate limiting (Rastio, 14.8.2026) — prahy pre DB triggery, ktoré blokujú
 * nadmerné akcie (`mig_41_rate_limiting.sql`). Rovnaký mechanizmus ako
 * `SUSPICIOUS_CONFIG_KEYS` vyššie — je to preventívna poistka PRED tým, čo
 * podozriví používatelia vyššie len detekujú spätne.
 */
const RATE_LIMIT_CONFIG_KEYS = [
  'rate_limit_offers_count',
  'rate_limit_offers_window_minutes',
  'rate_limit_messages_count',
  'rate_limit_messages_window_minutes',
  'rate_limit_listings_count',
  'rate_limit_listings_window_minutes',
  'rate_limit_viewings_count',
  'rate_limit_viewings_window_minutes',
] as const;

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

/**
 * OPAKOVANÉ PORUŠENIA (návrh, 12.8.2026 — Rastio si vyhradil rozhodnutie).
 *
 * Prah sú TRI potvrdené nahlásenia na tú istú osobu: jedno býva omyl, dve
 * môžu byť náhoda, tri už tvoria vzorec. Ráta sa cez všetky jej inzeráty
 * a ponuky, nie cez jeden inzerát — inak by stačilo založiť nový a
 * počítadlo by sa vynulovalo.
 *
 * Je to UPOZORNENIE PRE SPRÁVCU, nie automatika. Appka nikoho neblokuje
 * sama a ani blokovať nebude: pri troch nahláseniach môže ísť rovnako
 * dobre o cielenú kampaň proti jednému človeku. Rozhodnutie ostáva na
 * človeku, rovnako ako pri `Alert_`.
 */
type RepeatOffender = {
  user_id: string;
  nickname: string;
  potvrdene: number;
  dovody: string;
  blokovany: boolean;
};

/**
 * Ktoré dôvody majú „skryť inzerát" PREDVOLENE zaškrtnuté.
 *
 * Spam, podvod a falošný inzerát nemajú verziu, v ktorej by inzerát mal
 * v katalógu ostať — ak je nahlásenie opodstatnené, obsah je zlý celý.
 * Realitka a nevhodný obsah sa naopak dajú vyriešiť aj úpravou textu,
 * takže tam rozhoduje správca prípad od prípadu (zadanie Rastia).
 */
function hideByDefault(reason: string): boolean {
  return reason === 'SPAM' || reason === 'PODVOD' || reason === 'FALOSNY_INZERAT';
}

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
  const { t, language } = useTranslation();
  const toast = useToast();
  const confirmWithUndo = useUndoToast();
  const router = useRouter();
  const { session } = useSession();

  const [section, setSection] = useState<Section>('REPORTS');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [alerts, setAlerts] = useState<Alert_[]>([]);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [topListers, setTopListers] = useState<TopLister[]>([]);
  const [dupes, setDupes] = useState<DuplicateContact[]>([]);
  /** `null` = bez filtra. Nefiltruje sa na serveri — 200 riadkov je málo. */
  const [reasonFilter, setReasonFilter] = useState<ReportReason | null>(null);
  /**
   * Zaškrtnutie „skryť inzerát" pri jednotlivých nahláseniach.
   * Kľúč = id nahlásenia; chýbajúci kľúč znamená PREDVOLENÚ hodnotu podľa
   * dôvodu (`hideByDefault`), nie „neskrývať" — inak by sa predvoľba
   * stratila hneď, ako by správca zaškrtol niečo iné.
   */
  const [hideChoice, setHideChoice] = useState<Record<string, boolean>>({});
  const [offenders, setOffenders] = useState<RepeatOffender[]>([]);
  const [limitDraft, setLimitDraft] = useState('');
  const [floods, setFloods] = useState<SuspiciousFlood[]>([]);
  const [lowballs, setLowballs] = useState<SuspiciousLowball[]>([]);
  const [shills, setShills] = useState<SuspiciousShill[]>([]);
  /** Rozpísané hodnoty prahov v `SETTINGS` — kľúč = `app_config.key`. */
  const [susDraft, setSusDraft] = useState<Record<string, string>>({});
  const [rlDraft, setRlDraft] = useState<Record<string, string>>({});
  /** Filtre, do ktorých vedie ťuknutie na dlaždicu štatistiky. */
  const [propertyFilter, setPropertyFilter] = useState<PropertyStatus | null>(null);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [s, r, p, u, a, c, t, d, ro, fl, lb, sh] = await Promise.all([
        db().rpc('admin_stats'),
        db().from('report').select('*').order('created_at', { ascending: false }).limit(200),
        db().from('property').select('id,title,status,city,created_at,rejection_reason')
          .order('created_at', { ascending: false }).limit(200),
        db().rpc('admin_users'),
        db().rpc('admin_alerts'),
        db().from('app_config').select('key,value,label,hint').order('key'),
        db().rpc('admin_top_listers'),
        db().rpc('admin_duplicate_contacts'),
        db().rpc('admin_repeat_offenders'),
        db().rpc('admin_suspicious_offer_flood'),
        db().rpc('admin_suspicious_lowball'),
        db().rpc('admin_suspicious_shill_bidding'),
      ]);
      if (s.error) throw s.error;
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      if (u.error) throw u.error;
      if (a.error) throw a.error;
      if (c.error) throw c.error;
      if (t.error) throw t.error;
      if (d.error) throw d.error;
      if (ro.error) throw ro.error;
      if (fl.error) throw fl.error;
      if (lb.error) throw lb.error;
      if (sh.error) throw sh.error;
      setStats(((s.data ?? []) as AdminStats[])[0] ?? null);
      setReports((r.data ?? []) as ReportRow[]);
      setProperties((p.data ?? []) as AdminProperty[]);
      setUsers((u.data ?? []) as AdminUser[]);
      setAlerts((a.data ?? []) as Alert_[]);
      const cfg = (c.data ?? []) as ConfigRow[];
      setConfig(cfg);
      setLimitDraft(cfg.find((x) => x.key === 'max_active_listings')?.value ?? '');
      setSusDraft(
        Object.fromEntries(
          SUSPICIOUS_CONFIG_KEYS.map((k) => [k, cfg.find((x) => x.key === k)?.value ?? '']),
        ),
      );
      setRlDraft(
        Object.fromEntries(
          RATE_LIMIT_CONFIG_KEYS.map((k) => [k, cfg.find((x) => x.key === k)?.value ?? '']),
        ),
      );
      setTopListers((t.data ?? []) as TopLister[]);
      setDupes((d.data ?? []) as DuplicateContact[]);
      setOffenders((ro.data ?? []) as RepeatOffender[]);
      setFloods((fl.data ?? []) as SuspiciousFlood[]);
      setLowballs((lb.data ?? []) as SuspiciousLowball[]);
      setShills((sh.data ?? []) as SuspiciousShill[]);
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
      toast(done);
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ADMIN] ${fn} zlyhalo: ${m}`);
      Alert.alert(t('admin.actionFailedTitle'), m);
    }
  }

  /**
   * Vybavenie nahlásenia. JEDNA operácia, nie dve — server v jednej
   * transakcii prepíše stav, (voliteľne) skryje inzerát a upozorní
   * nahláseného. Dovtedy to boli dva kroky v dvoch sekciách a ten druhý
   * sa dal zabudnúť.
   *
   * Vracia, koľko potvrdených nahlásení má ten človek CELKOVO — správca to
   * má vedieť v tej chvíli, keď rozhoduje, nie až keď si to niekde nájde.
   */
  async function resolveReport(r: ReportRow, hide: boolean) {
    try {
      const { data, error: e } = await db().rpc('admin_resolve_report', {
        p_report_id: r.id,
        p_hide: hide,
      });
      if (e) throw e;
      await reload();
      const total = typeof data === 'number' ? data : 0;
      toast(
        hide
          ? t('admin.resolvedHiddenToast', { total })
          : t('admin.resolvedToast', { total }),
      );
      if (total >= 3) {
        Alert.alert(
          t('admin.repeatViolationsTitle'),
          t('admin.repeatViolationsBody', { total }),
        );
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ADMIN] Vybavenie nahlásenia zlyhalo: ${m}`);
      Alert.alert(t('admin.actionFailedTitle'), m);
    }
  }

  function reject(p: AdminProperty) {
    Alert.alert(t('admin.hidePropertyTitle'), t('admin.hidePropertyBody'), [
      { text: t('admin.cancel'), style: 'cancel' },
      {
        text: t('admin.hidePropertyConfirm'),
        style: 'destructive',
        onPress: () =>
          call('admin_set_property_status',
            { p_property_id: p.id, p_status: 'REJECTED', p_reason: t('admin.rejectedByAdminReason') },
            t('admin.propertyHiddenToast')),
      },
    ]);
  }

  function destroy(p: AdminProperty) {
    Alert.alert(t('admin.deletePermanentlyTitle'), t('admin.deletePermanentlyBody'), [
      { text: t('admin.cancel'), style: 'cancel' },
      {
        text: t('admin.delete'),
        style: 'destructive',
        onPress: () => call('admin_delete_property', { p_property_id: p.id }, t('admin.propertyDeletedToast')),
      },
    ]);
  }

  /**
   * Overenie. VYŽADUJE poznámku, čo presne bolo overené — odznak, ktorý
   * nevie povedať na základe čoho vznikol, je len ozdoba, a pri
   * nehnuteľnostiach nebezpečná. Drží to aj databáza.
   */
  function toggleVerified(u: AdminUser) {
    if (u.verified_at) {
      Alert.alert(t('admin.removeVerificationTitle'), t('admin.removeVerificationBody', { nickname: u.nickname }), [
        { text: t('admin.cancel'), style: 'cancel' },
        {
          text: t('admin.removeVerificationConfirm'),
          style: 'destructive',
          onPress: () => call('admin_set_verified', { p_user_id: u.id, p_verified: false }, t('admin.verificationRemovedToast')),
        },
      ]);
      return;
    }
    Alert.prompt?.(
      t('admin.verifyUserTitle'),
      t('admin.verifyUserBody'),
      [
        { text: t('admin.cancel'), style: 'cancel' },
        {
          text: t('admin.verifyConfirm'),
          onPress: (note?: string) =>
            call(
              'admin_set_verified',
              { p_user_id: u.id, p_verified: true, p_note: note ?? '' },
              t('admin.verifiedToast')
            ),
        },
      ],
      'plain-text',
      t('admin.verifyPlaceholder')
    );
  }

  /**
   * Povýšenie a odobratie práv správcu.
   *
   * Príkaz vykonáva DATABÁZA (`admin_set_role`), nie táto obrazovka —
   * kontroluje si sama, či volajúci je správca, či nemení vlastnú rolu
   * a či po odobratí ostane aspoň jeden správca. Obrazovka len pýta
   * potvrdenie; keby sa dala obísť, na pravidlách sa nezmení nič.
   */
  function toggleAdmin(u: AdminUser) {
    const granting = u.role !== 'ADMIN';
    Alert.alert(
      granting ? t('admin.grantAdminTitle') : t('admin.revokeAdminTitle'),
      granting
        ? t('admin.grantAdminBody', { nickname: u.nickname })
        : t('admin.revokeAdminBody', { nickname: u.nickname }),
      [
        { text: t('admin.cancel'), style: 'cancel' },
        {
          text: granting ? t('admin.grantAdminConfirm') : t('admin.revokeAdminConfirm'),
          style: granting ? 'default' : 'destructive',
          onPress: () =>
            call(
              'admin_set_role',
              { p_user_id: u.id, p_admin: granting },
              granting ? t('admin.grantedAdminToast', { nickname: u.nickname }) : t('admin.revokedAdminToast', { nickname: u.nickname })
            ),
        },
      ]
    );
  }

  function toggleBlock(u: AdminUser) {
    const blocking = !u.is_blocked;
    Alert.alert(
      blocking ? t('admin.blockUserTitle') : t('admin.unblockUserTitle'),
      blocking
        ? t('admin.blockUserBody')
        : t('admin.unblockUserBody'),
      [
        { text: t('admin.cancel'), style: 'cancel' },
        {
          text: blocking ? t('admin.blockConfirm') : t('admin.unblockConfirm'),
          style: blocking ? 'destructive' : 'default',
          onPress: () => {
            if (!blocking) {
              // Odblokovanie nie je tá riziková akcia zo zadania — undo
              // okno je tu navyše len pre BLOKOVANIE (Rastio, 14.8.2026).
              void call('admin_set_blocked', { p_user_id: u.id, p_blocked: false, p_reason: null },
                t('admin.unblockedToast'));
              return;
            }
            confirmWithUndo(t('admin.blockPending', { nickname: u.nickname }), () =>
              call('admin_set_blocked',
                { p_user_id: u.id, p_blocked: true, p_reason: t('admin.blockedReason') },
                t('admin.blockedToast'))
            );
          },
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
      targetType === 'USER' ? t('admin.reportedUserTitle') : t('admin.reportedOfferTitle'),
      [t('admin.targetIdLine', { id: targetId }), extra].filter(Boolean).join('\n\n') +
        '\n\n' + t('admin.noOwnScreenNote')
    );
  }

  const openReports = reports.filter((r) => r.status === 'PENDING');
  const shownReports = reports
    .filter((r) => (reasonFilter ? r.reason === reasonFilter : true))
    .filter((r) => (onlyPending ? r.status === 'PENDING' : true));
  const shownProperties = propertyFilter ? properties.filter((p) => p.status === propertyFilter) : properties;
  const shownUsers = onlyBlocked ? users.filter((u) => u.is_blocked) : users;
  /** Koľko nahlásení pripadá na ktorý dôvod — bez toho je filter hádanie. */
  const reasonCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{t('admin.screenTitle')}</Text>

        <ErrorNote error={error} />
        {loading ? <ActivityIndicator color={palette.primary} /> : null}

        {stats ? (
          <Card>
            <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.statsSection')}</Text>
            <View style={styles.stats}>
              {/* Klikateľné sú LEN dlaždice, ktoré majú kam viesť. Ponuky
                  a Dopyty admin pohľad zatiaľ nemajú — tvárili by sa
                  klikateľne a nič by nespravili, čo §2 zakazuje. */}
              <Stat
                label={t('admin.statPublished')}
                value={stats.inzeraty_aktivne}
                onPress={() => {
                  setSection('PROPERTIES');
                  setPropertyFilter('ACTIVE');
                }}
              />
              <Stat
                label={t('admin.statPropertiesTotal')}
                value={stats.inzeraty_spolu}
                onPress={() => {
                  setSection('PROPERTIES');
                  setPropertyFilter(null);
                }}
              />
              <Stat label={t('admin.statOffers')} value={stats.ponuky} />
              <Stat label={t('admin.statDemands')} value={stats.dopyty} />
              <Stat
                label={t('admin.statUsers')}
                value={stats.pouzivatelia}
                onPress={() => {
                  setSection('USERS');
                  setOnlyBlocked(false);
                }}
              />
              <Stat
                label={t('admin.statBlocked')}
                value={stats.zablokovani}
                onPress={() => {
                  setSection('USERS');
                  setOnlyBlocked(true);
                }}
              />
              <Stat
                label={t('admin.statOpenReports')}
                value={stats.nahlasenia_otvorene}
                highlight
                onPress={() => {
                  setSection('REPORTS');
                  setReasonFilter(null);
                  setOnlyPending(true);
                }}
              />
            </View>
          </Card>
        ) : null}

        {alerts.length > 0 ? (
          <Card>
            <Text style={[styles.section, { color: palette.danger }]}>
              {t('admin.needsAttention', { count: alerts.length })}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              {t('admin.needsAttentionHint')}
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
                    {a.target_type === 'PROPERTY' ? t('admin.targetProperty') : a.target_type === 'USER' ? t('admin.targetUser') : t('admin.targetOffer')}{' '}
                    {a.target_id.slice(0, 8)}
                  </Text>
                  {a.naliehave ? <Badge text={t('admin.fraudBadge')} tone="warning" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {a.nahlaseni}× · {a.dovody}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {/* OPAKOVANÉ PORUŠENIA — návrh z 12.8.2026. Je to zoznam pre teba,
            nie akcia: appka nikoho neblokuje sama a ani nebude. Pri troch
            nahláseniach môže ísť rovnako dobre o cielenú kampaň proti
            jednému človeku, a to rozlíši len človek. */}
        {offenders.length > 0 ? (
          <Card>
            <Text style={[styles.section, { color: palette.warning }]}>
              {t('admin.repeatOffenders', { count: offenders.length })}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              {t('admin.repeatOffendersHint')}
            </Text>
            {offenders.map((o) => (
              <Pressable
                key={o.user_id}
                onPress={() => openTarget('USER', o.user_id, `${o.potvrdene}× potvrdené · ${o.dovody}`)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.alert,
                  {
                    borderColor: palette.warning,
                    backgroundColor: pressed ? palette.surfacePressed : 'transparent',
                  },
                ]}>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{o.nickname}</Text>
                  {o.blokovany ? <Badge text={t('admin.blockedBadge')} tone="neutral" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {o.potvrdene}× potvrdené · {o.dovody}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['REPORTS', t('admin.tabReports', { count: openReports.length })],
              ['PROPERTIES', t('admin.tabProperties')],
              ['USERS', t('admin.tabUsers')],
              ['SETTINGS', t('admin.tabSettings')],
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

        {/* Filter podľa dôvodu. Podozrenia na realitku sa musia dať oddeliť
            od zvyšku jedným ťuknutím — inak sa v zozname stratia. */}
        {section === 'REPORTS' ? (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {t('admin.reportsHint')}
          </Text>
        ) : null}

        {section === 'REPORTS' && reports.length > 0 ? (
          <View style={styles.filterRow}>
            {([null, ...getReportReasons(t).map((x) => x.value)] as (ReportReason | null)[]).map((v) => {
              const on = reasonFilter === v;
              const count = v == null ? reports.length : (reasonCounts[v] ?? 0);
              const label = v == null ? t('admin.filterAll') : v === 'REALITKA' ? t('admin.filterAgency') : getReportReasonLabel(t)[v].split(' —')[0];
              return (
                <Pressable
                  key={v ?? 'ALL'}
                  onPress={() => setReasonFilter(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? palette.primary : palette.surface,
                      borderColor: on ? palette.primary : palette.border,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: on ? palette.onPrimary : palette.textSecondary }]}>
                    {label} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {section === 'REPORTS' ? (
          shownReports.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textMuted }]}>
              {reasonFilter ? t('admin.noReportsWithReason') : t('admin.noReports')}
            </Text>
          ) : (
            shownReports.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => openTarget(r.target_type, r.target_id, r.note ?? undefined)}
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    {r.target_type === 'PROPERTY' ? t('admin.targetProperty') : r.target_type === 'USER' ? t('admin.targetUser') : t('admin.targetOffer')}
                  </Text>
                  <Badge
                    text={getReportStatusLabel(t)[r.status as ReportStatus] ?? r.status}
                    tone={r.status === 'PENDING' ? 'warning' : 'neutral'}
                  />
                </View>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {getReportReasonLabel(t)[r.reason as ReportReason] ?? r.reason}
                </Text>
                {r.note ? <Text style={[styles.note, { color: palette.textPrimary }]}>{t('admin.noteQuoted', { note: r.note })}</Text> : null}
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {t('admin.reportMeta', { date: formatDate(language, r.created_at), id: r.target_id.slice(0, 8) })}
                </Text>
                {r.status === 'PENDING' ? (
                  <>
                    {/* Voľba je LEN pri inzeráte. Pri používateľovi a ponuke
                        by „skryť" nemalo čo spraviť — blokovanie účtu je
                        samostatná akcia v sekcii Používatelia. */}
                    {r.target_type === 'PROPERTY' ? (
                      <CheckRow
                        checked={hideChoice[r.id] ?? hideByDefault(r.reason)}
                        onToggle={() =>
                          setHideChoice((prev) => ({
                            ...prev,
                            [r.id]: !(prev[r.id] ?? hideByDefault(r.reason)),
                          }))
                        }
                        label={t('admin.hidePropertyLabel')}
                        hint={
                          hideByDefault(r.reason)
                            ? t('admin.hidePropertyHintDefault')
                            : t('admin.hidePropertyHintManual')
                        }
                      />
                    ) : null}
                    <View style={styles.actions}>
                      <Button
                        title={t('admin.markResolvedButton')}
                        onPress={() =>
                          resolveReport(
                            r,
                            r.target_type === 'PROPERTY'
                              ? (hideChoice[r.id] ?? hideByDefault(r.reason))
                              : false,
                          )
                        }
                        variant="outline"
                      />
                      <Button
                        title={t('admin.dismissReportButton')}
                        onPress={() => call('admin_set_report_status', { p_report_id: r.id, p_status: 'DISMISSED' }, t('admin.reportDismissed'))}
                        variant="outline"
                      />
                    </View>
                  </>
                ) : null}
              </Card>
              </Pressable>
            ))
          )
        ) : null}

        {section === 'PROPERTIES' ? (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {t('admin.propertiesHint')}
          </Text>
        ) : null}

        {section === 'PROPERTIES'
          ? shownProperties.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/nehnutelnost/[id]', params: { id: p.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: palette.textPrimary }]}>
                    {p.title || t('admin.untitledListing')}
                  </Text>
                  <Badge
                    text={p.status === 'REJECTED' ? t('admin.hiddenBadge') : getStatusLabel(t)[p.status]}
                    tone={p.status === 'ACTIVE' ? 'accent' : 'warning'}
                  />
                </View>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {[p.city, formatDate(language, p.created_at)].filter(Boolean).join(' · ')}
                </Text>
                {p.rejection_reason ? (
                  <Text style={[styles.note, { color: palette.warning }]}>{p.rejection_reason}</Text>
                ) : null}
                <View style={styles.actions}>
                  {p.status !== 'ACTIVE' ? (
                    <Button
                      title={t('admin.approveButton')}
                      onPress={() =>
                        call('admin_set_property_status', { p_property_id: p.id, p_status: 'ACTIVE' }, t('admin.publishedToast'))
                      }
                    />
                  ) : (
                    <Button title={t('admin.hideFromCatalogButton')} onPress={() => reject(p)} variant="outline" />
                  )}
                  <Button title={t('admin.deletePermanentlyButton')} onPress={() => destroy(p)} variant="danger" />
                </View>
              </Card>
              </Pressable>
            ))
          : null}

        {section === 'USERS' ? (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {t('admin.usersHint')}
          </Text>
        ) : null}

        {section === 'USERS'
          ? shownUsers.map((u) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  Alert.alert(
                    u.nickname,
                    [
                      t('admin.userIdLine', { id: u.id }),
                      t('admin.userEmailLine', { email: u.email }),
                      t('admin.userRoleLine', { role: u.role }),
                      t('admin.userListingsLine', { count: u.inzeraty }),
                      t('admin.userRegisteredLine', { date: formatDate(language, u.created_at) }),
                      u.is_blocked ? t('admin.userStatusBlocked') : t('admin.userStatusActive'),
                    ].join('\n')
                  )
                }
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <Card>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{u.nickname}</Text>
                  {u.role === 'ADMIN' ? <Badge text={t('admin.adminBadge')} tone="accent" /> : null}
                  {u.is_blocked ? <Badge text={t('admin.blockedBadge')} tone="warning" /> : null}
                {u.verified_at ? <Badge text={t('admin.verifiedBadge')} tone="accent" /> : null}
                {u.role === 'ADMIN' ? <Badge text={t('admin.adminBadge')} tone="navy" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {t('admin.userMeta', { email: u.email, count: u.inzeraty, date: formatDate(language, u.created_at) })}
                </Text>
                {u.verified_note ? (
                  <Text style={[styles.meta, { color: palette.textMuted }]}>
                    {t('admin.verifiedNote', { note: u.verified_note })}
                  </Text>
                ) : null}
                <Button
                  title={u.verified_at ? t('admin.removeVerificationButton') : t('admin.verifyUserButton')}
                  onPress={() => toggleVerified(u)}
                  variant="outline"
                />
                {/* Vlastnú rolu meniť nemožno — tlačidlo pri sebe samom
                    preto nie je vôbec, nie len zašednuté. Tlačidlo, ktoré
                    by aj tak neprešlo, je horšie než jeho absencia. */}
                {u.id !== session?.user.id ? (
                  <Button
                    title={u.role === 'ADMIN' ? t('admin.revokeAdminButton') : t('admin.grantAdminButton')}
                    onPress={() => toggleAdmin(u)}
                    variant="outline"
                  />
                ) : null}
                {u.id !== session?.user.id ? (
                  <Button
                    title={u.is_blocked ? t('admin.unblockButton') : t('admin.blockButton')}
                    onPress={() => toggleBlock(u)}
                    variant={u.is_blocked ? 'outline' : 'danger'}
                  />
                ) : (
                  <Text style={[styles.meta, { color: palette.textMuted }]}>{t('admin.thatsYou')}</Text>
                )}
              </Card>
              </Pressable>
            ))
          : null}

        {section === 'SETTINGS' ? (
          <>
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.listingLimitSection')}</Text>
              {config
                .filter((c) => c.key === 'max_active_listings')
                .map((c) => (
                  <View key={c.key} style={styles.cfg}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{c.label}</Text>
                    {c.hint ? (
                      <Text style={[styles.meta, { color: palette.textMuted }]}>{c.hint}</Text>
                    ) : null}
                    <View style={styles.cfgRow}>
                      <TextInput
                        value={limitDraft}
                        onChangeText={setLimitDraft}
                        keyboardType="numeric"
                        accessibilityLabel={c.label}
                        style={[
                          styles.cfgInput,
                          { borderColor: palette.borderStrong, color: palette.textPrimary, backgroundColor: palette.surface },
                        ]}
                      />
                      <Button
                        title={t('admin.saveButton')}
                        disabled={limitDraft.trim() === c.value}
                        onPress={() =>
                          call(
                            'admin_set_config',
                            { p_key: 'max_active_listings', p_value: limitDraft.trim() },
                            t('admin.limitUpdatedToast', { value: limitDraft.trim() })
                          )
                        }
                      />
                    </View>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>
                      {t('admin.currentlyLimit', { value: c.value })}
                    </Text>
                  </View>
                ))}
            </Card>

            {/* Heuristiky sú SIGNÁLY na ručnú kontrolu, nie dôvod na ban.
                Dve osoby v jednej domácnosti majú tiež jeden telefón. */}
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.topListersSection')}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.topListersHint')}
              </Text>
              {topListers.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>{t('admin.noListingsYet')}</Text>
              ) : (
                topListers.slice(0, 15).map((tl) => (
                  <View key={tl.user_id} style={styles.cfg}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{tl.nickname}</Text>
                      {tl.is_blocked ? <Badge text={t('admin.blockedBadge')} tone="warning" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {t('admin.listerMeta', { active: tl.active_count, total: tl.total_count, email: tl.email })}
                    </Text>
                    <Text style={[styles.meta, { color: tl.agent_declared_at ? palette.textMuted : palette.warning }]}>
                      {tl.agent_declared_at
                        ? t('admin.agentDeclared', { date: formatDate(language, tl.agent_declared_at) })
                        : t('admin.agentNotDeclared')}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.duplicateContactsSection')}</Text>
              {dupes.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>{t('admin.nothingFound')}</Text>
              ) : (
                dupes.map((d) => (
                  <View key={`${d.kind}-${d.value}`} style={styles.cfg}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                      {t('admin.duplicateAccountsCount', { kind: d.kind === 'TELEFON' ? t('admin.duplicatePhone') : t('admin.duplicateEmail'), count: d.accounts })}
                    </Text>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>{d.value}</Text>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>{d.nicknames}</Text>
                  </View>
                ))
              )}
            </Card>

            {/* PODOZRIVÍ POUŽÍVATELIA — tri vzorce, len signál na ručnú
                kontrolu (pozri komentár pri type SuspiciousFlood vyššie). */}
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.susThresholdsSection')}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.susThresholdsHint')}
              </Text>
              {SUSPICIOUS_CONFIG_KEYS.map((key) => {
                const c = config.find((x) => x.key === key);
                if (!c) return null;
                const draft = susDraft[key] ?? '';
                return (
                  <View key={key} style={styles.cfg}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{c.label}</Text>
                    {c.hint ? <Text style={[styles.meta, { color: palette.textMuted }]}>{c.hint}</Text> : null}
                    <View style={styles.cfgRow}>
                      <TextInput
                        value={draft}
                        onChangeText={(v) => setSusDraft((prev) => ({ ...prev, [key]: v }))}
                        keyboardType="numeric"
                        accessibilityLabel={c.label}
                        style={[
                          styles.cfgInput,
                          { borderColor: palette.borderStrong, color: palette.textPrimary, backgroundColor: palette.surface },
                        ]}
                      />
                      <Button
                        title={t('admin.saveButton')}
                        disabled={draft.trim() === c.value}
                        onPress={() =>
                          call('admin_set_config', { p_key: key, p_value: draft.trim() },
                            t('admin.thresholdUpdatedToast', { label: c.label, value: draft.trim() }))
                        }
                      />
                    </View>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>{t('admin.currentlyValue', { value: c.value })}</Text>
                  </View>
                );
              })}
            </Card>

            {/* RATE LIMITING (Rastio, 14.8.2026) — DB triggery blokujú akciu
                priamo (mig_41), toto sú len ich prahy. Prevencia, nie
                detekcia — dopĺňa PODOZRIVÝCH POUŽÍVATEĽOV vyššie. */}
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>{t('admin.rateLimitSection')}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.rateLimitHint')}
              </Text>
              {RATE_LIMIT_CONFIG_KEYS.map((key) => {
                const c = config.find((x) => x.key === key);
                if (!c) return null;
                const draft = rlDraft[key] ?? '';
                return (
                  <View key={key} style={styles.cfg}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{c.label}</Text>
                    {c.hint ? <Text style={[styles.meta, { color: palette.textMuted }]}>{c.hint}</Text> : null}
                    <View style={styles.cfgRow}>
                      <TextInput
                        value={draft}
                        onChangeText={(v) => setRlDraft((prev) => ({ ...prev, [key]: v }))}
                        keyboardType="numeric"
                        accessibilityLabel={c.label}
                        style={[
                          styles.cfgInput,
                          { borderColor: palette.borderStrong, color: palette.textPrimary, backgroundColor: palette.surface },
                        ]}
                      />
                      <Button
                        title={t('admin.saveButton')}
                        disabled={draft.trim() === c.value}
                        onPress={() =>
                          call('admin_set_config', { p_key: key, p_value: draft.trim() },
                            t('admin.thresholdUpdatedToast', { label: c.label, value: draft.trim() }))
                        }
                      />
                    </View>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>{t('admin.currentlyValue', { value: c.value })}</Text>
                  </View>
                );
              })}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>{t('admin.floodSection', { count: floods.length })}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.floodHint')}
              </Text>
              {floods.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>{t('admin.nothingFound')}</Text>
              ) : (
                floods.map((f) => (
                  <Pressable
                    key={f.user_id}
                    onPress={() =>
                      openTarget('USER', f.user_id, t('admin.floodTargetNote', { properties: f.pocet_inzeratov, offers: f.pocet_ponuk }))
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{f.nickname}</Text>
                      {f.is_blocked ? <Badge text={t('admin.blockedBadge')} tone="neutral" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {t('admin.floodMeta', { properties: f.pocet_inzeratov, offers: f.pocet_ponuk })}
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>{t('admin.lowballSection', { count: lowballs.length })}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.lowballHint')}
              </Text>
              {lowballs.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>{t('admin.nothingFound')}</Text>
              ) : (
                lowballs.map((l) => (
                  <Pressable
                    key={l.user_id}
                    onPress={() =>
                      openTarget('USER', l.user_id,
                        t('admin.lowballTargetNote', { count: l.pocet_nizkych, pct: Math.round(l.priemerny_pomer * 100) }))
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{l.nickname}</Text>
                      {l.is_blocked ? <Badge text={t('admin.blockedBadge')} tone="neutral" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {t('admin.lowballMeta', { count: l.pocet_nizkych, pct: Math.round(l.priemerny_pomer * 100) })}
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>
                {t('admin.shillSection', { count: shills.length })}
              </Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {t('admin.shillHint')}
              </Text>
              {shills.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>{t('admin.nothingFound')}</Text>
              ) : (
                shills.map((sh) => (
                  <Pressable
                    key={`${sh.bidder_id}-${sh.owner_id}`}
                    onPress={() =>
                      openTarget('USER', sh.bidder_id,
                        t('admin.shillTargetNote', { owner: sh.owner_nickname, count: sh.pocet_inzeratov }))
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{sh.bidder_nickname}</Text>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {t('admin.shillMeta', { owner: sh.owner_nickname, count: sh.pocet_inzeratov })}
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Dlaždica štatistiky. S `onPress` je klikateľná a vedie do už
 * vyfiltrovaného zoznamu; bez neho ostáva obyčajným číslom — a hlavne
 * BEZ šípky, aby nesľubovala akciu, ktorá neexistuje.
 */
function Stat({
  label,
  value,
  highlight,
  onPress,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const tone = highlight && value > 0 ? palette.warning : palette.primary;
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? t('admin.statOpenList', { label, value }) : undefined}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.stat,
        {
          borderColor: highlight && value > 0 ? palette.warning : palette.border,
          backgroundColor: pressed ? palette.surfacePressed : 'transparent',
        },
      ]}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
      {onPress ? <Text style={[styles.statArrow, { color: palette.textMuted }]}>›</Text> : null}
    </Wrap>
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
  statArrow: { position: 'absolute', top: 4, right: 8, ...Type.bodyLg, fontWeight: Weight.bold },
  statLabel: { ...Type.caption },
  tabs: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  tab: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  chipText: { ...Type.caption, fontWeight: Weight.semibold },
  cfg: { gap: 4, marginTop: Spacing.sm },
  cfgRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cfgInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 90, ...Type.bodyLg },
  tabText: { ...Type.caption, fontWeight: Weight.semibold },
  empty: { ...Type.body },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  rowTitle: { ...Type.subtitle, fontWeight: Weight.semibold, flexShrink: 1 },
  meta: { ...Type.caption },
  note: { ...Type.bodyMd },
  actions: { gap: Spacing.sm },
  alert: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
});
