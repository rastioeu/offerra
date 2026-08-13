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
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import type { AdminStats, AdminUser, ReportRow } from '@/lib/admin';
import { db, formatDate, STATUS_LABEL, type PropertyStatus } from '@/lib/property';
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
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
  const toast = useToast();
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
      Alert.alert('Akcia zlyhala', m);
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
          ? `Vybavené, inzerát je skrytý. Používateľ má ${total} potvrdených nahlásení.`
          : `Vybavené. Používateľ má ${total} potvrdených nahlásení.`,
      );
      if (total >= 3) {
        Alert.alert(
          'Opakované porušenia',
          `Tento účet má ${total} potvrdených nahlásení. Zablokovať ho vieš v sekcii Používatelia — ` +
            'appka to sama nespraví.',
        );
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[ADMIN] Vybavenie nahlásenia zlyhalo: ${m}`);
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

  /**
   * Overenie. VYŽADUJE poznámku, čo presne bolo overené — odznak, ktorý
   * nevie povedať na základe čoho vznikol, je len ozdoba, a pri
   * nehnuteľnostiach nebezpečná. Drží to aj databáza.
   */
  function toggleVerified(u: AdminUser) {
    if (u.verified_at) {
      Alert.alert('Odobrať overenie?', `${u.nickname} stratí odznak.`, [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odobrať',
          style: 'destructive',
          onPress: () => call('admin_set_verified', { p_user_id: u.id, p_verified: false }, 'Overenie odobraté.'),
        },
      ]);
      return;
    }
    Alert.prompt?.(
      'Overiť používateľa',
      'Napíš, ČO si overil — táto veta sa zobrazí ľuďom pri jeho odznaku.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Overiť',
          onPress: (note?: string) =>
            call(
              'admin_set_verified',
              { p_user_id: u.id, p_verified: true, p_note: note ?? '' },
              'Používateľ je overený.'
            ),
        },
      ],
      'plain-text',
      'Doklad totožnosti a list vlastníctva'
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
      granting ? 'Urobiť správcom?' : 'Odobrať práva správcu?',
      granting
        ? `Naozaj urobiť ${u.nickname} správcom? Získa plný prístup do tejto konzoly — ` +
          'uvidí nahlásenia, môže skrývať inzeráty a blokovať účty.'
        : `${u.nickname} stratí prístup do konzoly. Jeho účet a dáta ostanú nedotknuté.`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: granting ? 'Urobiť správcom' : 'Odobrať',
          style: granting ? 'default' : 'destructive',
          onPress: () =>
            call(
              'admin_set_role',
              { p_user_id: u.id, p_admin: granting },
              granting ? `${u.nickname} je správca.` : `${u.nickname} už správcom nie je.`
            ),
        },
      ]
    );
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
        <Text style={[styles.title, { color: palette.textPrimary }]}>Správa</Text>

        <ErrorNote error={error} />
        {loading ? <ActivityIndicator color={palette.primary} /> : null}

        {stats ? (
          <Card>
            <Text style={[styles.section, { color: palette.textMuted }]}>ŠTATISTIKA</Text>
            <View style={styles.stats}>
              {/* Klikateľné sú LEN dlaždice, ktoré majú kam viesť. Ponuky
                  a Dopyty admin pohľad zatiaľ nemajú — tvárili by sa
                  klikateľne a nič by nespravili, čo §2 zakazuje. */}
              <Stat
                label="Zverejnené"
                value={stats.inzeraty_aktivne}
                onPress={() => {
                  setSection('PROPERTIES');
                  setPropertyFilter('ACTIVE');
                }}
              />
              <Stat
                label="Inzeráty spolu"
                value={stats.inzeraty_spolu}
                onPress={() => {
                  setSection('PROPERTIES');
                  setPropertyFilter(null);
                }}
              />
              <Stat label="Ponuky" value={stats.ponuky} />
              <Stat label="Dopyty" value={stats.dopyty} />
              <Stat
                label="Používatelia"
                value={stats.pouzivatelia}
                onPress={() => {
                  setSection('USERS');
                  setOnlyBlocked(false);
                }}
              />
              <Stat
                label="Zablokovaní"
                value={stats.zablokovani}
                onPress={() => {
                  setSection('USERS');
                  setOnlyBlocked(true);
                }}
              />
              <Stat
                label="Otvorené nahlásenia"
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

        {/* OPAKOVANÉ PORUŠENIA — návrh z 12.8.2026. Je to zoznam pre teba,
            nie akcia: appka nikoho neblokuje sama a ani nebude. Pri troch
            nahláseniach môže ísť rovnako dobre o cielenú kampaň proti
            jednému človeku, a to rozlíši len človek. */}
        {offenders.length > 0 ? (
          <Card>
            <Text style={[styles.section, { color: palette.warning }]}>
              OPAKOVANÉ PORUŠENIA ({offenders.length})
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              Tri a viac POTVRDENÝCH nahlásení na tú istú osobu — cez všetky jej inzeráty
              a ponuky. Appka nikoho neblokuje sama; zablokovať sa dá v sekcii Používatelia.
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
                  {o.blokovany ? <Badge text="ZABLOKOVANÝ" tone="neutral" /> : null}
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
              ['REPORTS', `Nahlásenia (${openReports.length})`],
              ['PROPERTIES', 'Inzeráty'],
              ['USERS', 'Používatelia'],
              ['SETTINGS', 'Nastavenia'],
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
            „Označiť ako riešené" znamená, že si zasiahol — nahlásený sa o tom
            dozvie upozornením a pri inzeráte sa rovno rozhodne, či sa má skryť.
            „Zamietnuť" znamená, že nahlásenie bolo neopodstatnené; vtedy sa
            nahlásenému neposiela nič. Ani jedno NIČ NEMAŽE — skrytý inzerát
            vlastník ďalej vidí aj s dôvodom.
          </Text>
        ) : null}

        {section === 'REPORTS' && reports.length > 0 ? (
          <View style={styles.filterRow}>
            {([null, ...REPORT_REASONS.map((x) => x.value)] as (ReportReason | null)[]).map((v) => {
              const on = reasonFilter === v;
              const count = v == null ? reports.length : (reasonCounts[v] ?? 0);
              const label = v == null ? 'Všetky' : v === 'REALITKA' ? 'Realitka' : REPORT_REASON_LABEL[v].split(' —')[0];
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
              {reasonFilter ? 'Žiadne nahlásenie s týmto dôvodom.' : 'Žiadne nahlásenia.'}
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
                        label="Skryť inzerát z katalógu"
                        hint={
                          hideByDefault(r.reason)
                            ? 'Pri tomto dôvode predvolene áno. Odškrtni, ak má inzerát ostať zverejnený.'
                            : 'Pri tomto dôvode rozhodni sám — dá sa to vyriešiť aj úpravou textu.'
                        }
                      />
                    ) : null}
                    <View style={styles.actions}>
                      <Button
                        title="Označiť ako riešené"
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
                        title="Zamietnuť nahlásenie"
                        onPress={() => call('admin_set_report_status', { p_report_id: r.id, p_status: 'DISMISSED' }, 'Zamietnuté.')}
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
            „Skryť z katalógu" inzerát nezmaže — vlastník ho ďalej vidí aj s dôvodom
            a dá sa vrátiť späť. „Zmazať natrvalo" zmaže aj fotky a ponuky a vrátiť
            sa nedá.
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

        {section === 'USERS' ? (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            Zablokovaný používateľ sa nevie prihlásiť ani nič pridať a jeho účet
            neprijíma oznámenia. Doterajšie inzeráty a ponuky mu ostanú a
            odblokovaním sa vráti všetko naspäť — nie je to zmazanie.
            {'\n\n'}
            Správcu môže urobiť len iný správca. Vlastnú rolu si zmeniť nevieš
            a posledného správcu appka odobrať nedovolí — inak by ostala bez
            neho. Každá zmena roly sa zapisuje.
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
                {u.verified_at ? <Badge text="OVERENÝ" tone="accent" /> : null}
                {u.role === 'ADMIN' ? <Badge text="SPRÁVCA" tone="navy" /> : null}
                </View>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {u.email} · {u.inzeraty} inzerátov · od {formatDate(u.created_at)}
                </Text>
                {u.verified_note ? (
                  <Text style={[styles.meta, { color: palette.textMuted }]}>
                    Overené: {u.verified_note}
                  </Text>
                ) : null}
                <Button
                  title={u.verified_at ? 'Odobrať overenie' : 'Overiť používateľa'}
                  onPress={() => toggleVerified(u)}
                  variant="outline"
                />
                {/* Vlastnú rolu meniť nemožno — tlačidlo pri sebe samom
                    preto nie je vôbec, nie len zašednuté. Tlačidlo, ktoré
                    by aj tak neprešlo, je horšie než jeho absencia. */}
                {u.id !== session?.user.id ? (
                  <Button
                    title={u.role === 'ADMIN' ? 'Odobrať práva správcu' : 'Urobiť správcom'}
                    onPress={() => toggleAdmin(u)}
                    variant="outline"
                  />
                ) : null}
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

        {section === 'SETTINGS' ? (
          <>
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>LIMIT INZERÁTOV</Text>
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
                        title="Uložiť"
                        disabled={limitDraft.trim() === c.value}
                        onPress={() =>
                          call(
                            'admin_set_config',
                            { p_key: 'max_active_listings', p_value: limitDraft.trim() },
                            `Limit je teraz ${limitDraft.trim()}. Platí okamžite, nový build netreba.`
                          )
                        }
                      />
                    </View>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>
                      Teraz platí: {c.value}. Zmena sa prejaví hneď pri ďalšom pokuse o zverejnenie.
                    </Text>
                  </View>
                ))}
            </Card>

            {/* Heuristiky sú SIGNÁLY na ručnú kontrolu, nie dôvod na ban.
                Dve osoby v jednej domácnosti majú tiež jeden telefón. */}
            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>NAJVIAC INZERÁTOV</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                Podnet na pozretie, nie obvinenie. „Bez deklarácie" znamená účet z čias
                pred zavedením potvrdenia, nie priznanie.
              </Text>
              {topListers.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>Zatiaľ nikto nemá inzerát.</Text>
              ) : (
                topListers.slice(0, 15).map((t) => (
                  <View key={t.user_id} style={styles.cfg}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{t.nickname}</Text>
                      {t.is_blocked ? <Badge text="ZABLOKOVANÝ" tone="warning" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {t.active_count} aktívnych · {t.total_count} spolu · {t.email}
                    </Text>
                    <Text style={[styles.meta, { color: t.agent_declared_at ? palette.textMuted : palette.warning }]}>
                      {t.agent_declared_at
                        ? `Deklaroval fyzickú osobu ${formatDate(t.agent_declared_at)}`
                        : 'Bez deklarácie fyzickej osoby'}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.textMuted }]}>ROVNAKÝ KONTAKT NA VIACERÝCH ÚČTOCH</Text>
              {dupes.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>Nič také sa nenašlo.</Text>
              ) : (
                dupes.map((d) => (
                  <View key={`${d.kind}-${d.value}`} style={styles.cfg}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>
                      {d.kind === 'TELEFON' ? 'Telefón' : 'E-mail'} · {d.accounts} účty
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
              <Text style={[styles.section, { color: palette.textMuted }]}>PODOZRIVÍ POUŽÍVATELIA — PRAHY</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                Od koľkých inzerátov/percent sa účet nižšie objaví. Platí hneď, nový build netreba.
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
                        title="Uložiť"
                        disabled={draft.trim() === c.value}
                        onPress={() =>
                          call('admin_set_config', { p_key: key, p_value: draft.trim() },
                            `${c.label}: teraz ${draft.trim()}.`)
                        }
                      />
                    </View>
                    <Text style={[styles.meta, { color: palette.textMuted }]}>Teraz platí: {c.value}.</Text>
                  </View>
                );
              })}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>ZÁPLAVA PONÚK ({floods.length})</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                Ponuka na neobvykle veľa RÔZNYCH inzerátov v krátkom čase — podnet na pozretie, nie obvinenie.
              </Text>
              {floods.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>Nič také sa nenašlo.</Text>
              ) : (
                floods.map((f) => (
                  <Pressable
                    key={f.user_id}
                    onPress={() =>
                      openTarget('USER', f.user_id, `${f.pocet_inzeratov} rôznych inzerátov · ${f.pocet_ponuk} ponúk`)
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{f.nickname}</Text>
                      {f.is_blocked ? <Badge text="ZABLOKOVANÝ" tone="neutral" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {f.pocet_inzeratov} rôznych inzerátov · {f.pocet_ponuk} ponúk
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>OPAKOVANE NÍZKE PONUKY ({lowballs.length})</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                Výrazne pod orientačnou cenou naprieč VIACERÝMI inzerátmi — raz je vyjednávanie, opakovane je vzorec.
              </Text>
              {lowballs.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>Nič také sa nenašlo.</Text>
              ) : (
                lowballs.map((l) => (
                  <Pressable
                    key={l.user_id}
                    onPress={() =>
                      openTarget('USER', l.user_id,
                        `${l.pocet_nizkych} nízkych ponúk · priemerne ${Math.round(l.priemerny_pomer * 100)} % ceny`)
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{l.nickname}</Text>
                      {l.is_blocked ? <Badge text="ZABLOKOVANÝ" tone="neutral" /> : null}
                    </View>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      {l.pocet_nizkych} nízkych ponúk · priemerne {Math.round(l.priemerny_pomer * 100)} % ceny
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>

            <Card>
              <Text style={[styles.section, { color: palette.warning }]}>
                OPAKOVANE PONÚKA TOMU ISTÉMU VLASTNÍKOVI ({shills.length})
              </Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                Jeden záujemca opakovane ponúka na inzeráty toho istého predávajúceho — pri otvorených
                ponukách môže ísť o umelé nadsadzovanie ceny druhým účtom.
              </Text>
              {shills.length === 0 ? (
                <Text style={[styles.empty, { color: palette.textMuted }]}>Nič také sa nenašlo.</Text>
              ) : (
                shills.map((sh) => (
                  <Pressable
                    key={`${sh.bidder_id}-${sh.owner_id}`}
                    onPress={() =>
                      openTarget('USER', sh.bidder_id,
                        `Ponúka vlastníkovi ${sh.owner_nickname} na ${sh.pocet_inzeratov} rôznych inzerátoch`)
                    }
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.alert,
                      { borderColor: palette.warning, backgroundColor: pressed ? palette.surfacePressed : 'transparent' },
                    ]}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{sh.bidder_nickname}</Text>
                    <Text style={[styles.meta, { color: palette.textSecondary }]}>
                      → vlastníkovi {sh.owner_nickname} na {sh.pocet_inzeratov} rôznych inzerátoch
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
  const tone = highlight && value > 0 ? palette.warning : palette.primary;
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${label}: ${value}, otvoriť zoznam` : undefined}
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
