/**
 * Obhliadka na detaile inzerátu.
 *
 * Celá karta stojí na jednej vete: používateľ musí vedieť, ČO sa stane,
 * ešte PREDTÝM než klikne (Rastio, 8.8.2026). Preto je varovanie nad
 * tlačidlom, nie v potvrdzovacom dialógu za ním — a je tam aj vtedy, keď
 * dialóg preskočí.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import {
  fetchViewingContact,
  requestViewing,
  setViewingStatus,
  VIEWING_CONSENT,
  VIEWING_STATUS_LABEL,
  type Viewing,
  type ViewingContact,
} from '@/lib/viewing';
import { Spacing, Type } from '@/theme/tokens';

import { Button, Card, ErrorNote, Eyebrow, ParamCell } from './ui';

export function ViewingCard({
  propertyId,
  myId,
  isOwner,
  closed,
  viewings,
  reload,
}: {
  propertyId: string;
  myId: string | undefined;
  isOwner: boolean;
  /** Uzavretý inzerát — obhliadku už žiadať nemá zmysel. */
  closed: boolean;
  viewings: Viewing[] | undefined;
  reload: () => Promise<void>;
}) {
  const palette = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, ViewingContact>>({});

  const mine = myId ? viewings?.find((v) => v.requester_id === myId) : undefined;
  // Majiteľ vidí všetky, záujemca len tú svoju — o tom rozhodlo RLS,
  // nie tento riadok.
  const visible = isOwner ? (viewings ?? []) : mine ? [mine] : [];

  const loadContacts = useCallback(async () => {
    const next: Record<string, ViewingContact> = {};
    for (const v of visible) {
      if (v.status === 'CANCELLED') continue;
      try {
        const c = await fetchViewingContact(v.id);
        if (c) next[v.id] = c;
      } catch (e: unknown) {
        console.log(`[OBHLIADKA] Kontakt nedostupný: ${errorText(e)}`);
      }
    }
    setContacts(next);
    // Zoznam obhliadok sa mení len po akcii, preto stačí kľúč z ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((v) => `${v.id}:${v.status}`).join(',')]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  async function ask() {
    if (!myId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestViewing(propertyId, myId);
      await reload();
      toast('Kontakty odkryté — dohodnite sa telefonicky');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKA] Žiadosť zlyhala: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  async function mark(v: Viewing, status: 'COMPLETED' | 'CANCELLED') {
    setBusy(true);
    setError(null);
    try {
      await setViewingStatus(v.id, status);
      await reload();
      toast(status === 'COMPLETED' ? 'Označené ako po obhliadke' : 'Obhliadka zrušená', 'info');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKA] Zmena stavu zlyhala: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  if (!myId) return null;

  return (
    <Card>
      <Eyebrow>Obhliadka</Eyebrow>
      <ErrorNote error={error} />

      {!isOwner && !mine ? (
        <>
          <Text style={[styles.note, { color: palette.textSecondary }]}>{VIEWING_CONSENT}</Text>
          {closed ? (
            <Text style={[styles.note, { color: palette.textMuted }]}>
              Inzerát už ponuky neprijíma — obhliadku cezeň dohodnúť nemožno.
            </Text>
          ) : (
            <Button
              title={busy ? 'Odkrývam…' : 'Chcem obhliadku'}
              disabled={busy}
              onPress={() =>
                Alert.alert('Odkryť kontakt?', VIEWING_CONSENT, [
                  { text: 'Zrušiť', style: 'cancel' },
                  { text: 'Áno, odkryť', onPress: () => void ask() },
                ])
              }
            />
          )}
        </>
      ) : null}

      {isOwner && visible.length === 0 ? (
        <Text style={[styles.note, { color: palette.textMuted }]}>
          Zatiaľ nikto o obhliadku nepožiadal. Keď požiada, uvidíš tu jeho kontakt.
        </Text>
      ) : null}

      {visible.map((v) => {
        const c = contacts[v.id];
        return (
          <View key={v.id} style={styles.item}>
            <Text style={[styles.status, { color: palette.textPrimary }]}>
              {VIEWING_STATUS_LABEL[v.status]}
            </Text>
            {v.status === 'CANCELLED' ? (
              <Text style={[styles.note, { color: palette.textMuted }]}>
                Zrušená. Kontakt, ktorý ste už videli, sa tým nemaže.
              </Text>
            ) : c ? (
              <View style={styles.grid}>
                <ParamCell value={c.nickname ?? '—'} label="Prezývka" />
                <ParamCell value={c.full_name ?? 'nevyplnené'} label="Meno" />
                <ParamCell value={c.phone ?? 'nevyplnený'} label="Telefón" />
                <ParamCell value={c.email ?? 'nedostupný'} label="E-mail" />
              </View>
            ) : (
              <Text style={[styles.note, { color: palette.textMuted }]}>Načítavam kontakt…</Text>
            )}

            {v.status === 'CONTACT_SHARED' || v.status === 'REQUESTED' ? (
              <View style={styles.actions}>
                <Button
                  title="Bol som na obhliadke"
                  variant="outline"
                  disabled={busy}
                  onPress={() => void mark(v, 'COMPLETED')}
                />
                <Button
                  title="Zrušiť"
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Zrušiť obhliadku?',
                      'Kontakt, ktorý druhá strana už videla, sa tým nezmaže — len sa dohoda označí za neplatnú.',
                      [
                        { text: 'Späť', style: 'cancel' },
                        { text: 'Zrušiť obhliadku', style: 'destructive', onPress: () => void mark(v, 'CANCELLED') },
                      ]
                    )
                  }
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  note: { ...Type.bodyMd },
  item: { gap: Spacing.sm, marginTop: Spacing.sm },
  status: { ...Type.bodyLg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
});
