/**
 * „Nahlásiť" — inzerát, používateľa alebo konkrétnu ponuku.
 *
 * Appka po nahlásení NIKOHO automaticky neodstráni ani nezablokuje.
 * Vytvorí sa záznam na posúdenie a používateľ dostane potvrdenie —
 * nič viac. Automatika na jedno nahlásenie by sa dala zneužiť ako zbraň
 * proti konkurencii, čo je pri realitnom trhu reálne riziko.
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { db } from '@/lib/property';
import { REPORT_REASONS, type ReportTarget, type ReportReason } from '@/lib/report';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Button, ErrorNote, Field, KeyboardDoneBar } from './ui';

export function ReportButton({
  targetType,
  targetId,
  label,
  compact,
  hideTrigger,
  openExternally,
  onExternalClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  label: string;
  compact?: boolean;
  /**
   * Skryje odkaz „Nahlásiť" a formulár sa otvára zvonku — používa to
   * podržanie prstu na karte v katalógu (bod 12). Ten istý formulár,
   * len iné spúšťacie miesto; kopírovať ho druhýkrát by znamenalo dve
   * miesta, kde sa dá pokaziť validácia.
   */
  hideTrigger?: boolean;
  openExternally?: boolean;
  onExternalClose?: () => void;
}) {
  const palette = useTheme();
  const { session } = useSession();
  const myId = session?.user.id;

  const [open, setOpen] = useState(false);
  const visible = hideTrigger ? Boolean(openExternally) : open;
  const close = () => {
    setOpen(false);
    onExternalClose?.();
  };
  const [already, setAlready] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Či som to už nahlásil. Bez toho by druhý pokus spadol na unikátnom
  // indexe a používateľ by nechápal prečo.
  useEffect(() => {
    if (!myId || !targetId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error: e } = await db().rpc('my_report_exists', {
          p_target_type: targetType,
          p_target_id: targetId,
        });
        if (e) throw e;
        if (!cancelled) setAlready(Boolean(data));
      } catch (e: unknown) {
        console.log(`[NAHLÁSENIE] Kontrola zlyhala: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myId, targetType, targetId]);

  async function submit() {
    if (!myId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await db().from('report').insert({
        reporter_id: myId,
        target_type: targetType,
        target_id: targetId,
        reason,
        note: note.trim() || null,
      });
      if (e) throw e;
      close();
      setAlready(true);
      setNote('');
      Alert.alert(
        'Nahlásenie odoslané',
        'Ďakujeme. Pozrieme sa na to. Nič sa nezmaže automaticky — ' +
          'obsah posúdi človek.'
      );
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      console.log(`[NAHLÁSENIE] Odoslanie zlyhalo: ${m}`);
      setError(/duplicate key/i.test(m) ? 'Toto si už nahlásil.' : m);
    } finally {
      setBusy(false);
    }
  }

  // Už nahlásené + otvorené zvonku (podržanie prstu): povedz to a zavri.
  // Musí to byť EFEKT, nie vetva v rendere — `Alert` aj zmena stavu rodiča
  // sú vedľajšie účinky a v tele komponentu by spôsobili varovanie a v
  // najhoršom slučku prekreslení.
  useEffect(() => {
    if (hideTrigger && openExternally && already) {
      Alert.alert('Už nahlásené', 'Toto si už nahlásil, stačí raz.');
      onExternalClose?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideTrigger, openExternally, already]);

  if (!myId) return null;

  return (
    <>
      {hideTrigger ? null : (
        <Pressable
          onPress={() => (already ? Alert.alert('Už nahlásené', 'Toto si už nahlásil, stačí raz.') : setOpen(true))}
          accessibilityRole="button"
          hitSlop={8}>
          <Text
            style={[
              compact ? styles.compact : styles.link,
              { color: already ? palette.textMuted : palette.danger },
            ]}>
            {already ? 'Nahlásené' : label}
          </Text>
        </Pressable>
      )}

      <Modal visible={visible} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={[styles.modal, { backgroundColor: palette.background }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{label}</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.close, { color: palette.link }]}>Zavrieť</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
            <Text style={[styles.lead, { color: palette.textSecondary }]}>
              Nič sa nezmaže automaticky. Nahlásenie si pozrie človek a rozhodne.
            </Text>

            <Text style={[styles.section, { color: palette.textMuted }]}>DÔVOD</Text>
            <View style={styles.reasons}>
              {REPORT_REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setReason(r.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.reason,
                      {
                        backgroundColor: active ? palette.primary : palette.surface,
                        borderColor: active ? palette.primary : palette.borderStrong,
                      },
                    ]}>
                    <Text style={[styles.reasonText, { color: active ? palette.onPrimary : palette.textPrimary }]}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="Čo sa stalo (nepovinné)"
              hint="Čím konkrétnejšie, tým rýchlejšie sa to dá posúdiť."
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="napr. rovnaká fotka je aj na inom inzeráte s inou adresou"
            />

            <ErrorNote error={error} />

            <Button title={busy ? 'Odosielam…' : 'Odoslať nahlásenie'} onPress={submit} disabled={busy} />
          </ScrollView>
          <KeyboardDoneBar />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { ...Type.bodyMd, fontWeight: Weight.semibold },
  compact: { ...Type.caption, fontWeight: Weight.semibold },
  modal: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.title, fontWeight: Weight.bold, flexShrink: 1 },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
  scroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  lead: { ...Type.bodyMd },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  reasons: { gap: Spacing.sm },
  reason: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  reasonText: { ...Type.bodyLg, fontWeight: Weight.medium },
});
