/**
 * Obhliadka očami ZÁUJEMCU — karta v detaile inzerátu.
 *
 * Je zámerne oddelená od ponuky: obhliadku si možno vyžiadať pred podaním
 * ponuky aj po ňom. Kto si chce byt najprv pozrieť a až potom ponúkať, nemá
 * byť nútený ponúknuť naslepo.
 *
 * Kontakt na majiteľa sa objaví až po POTVRDENÍ — nie hneď po požiadaní.
 * Drží to databáza (`viewing_contact()`), táto karta len zobrazuje, čo
 * dostane.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import {
  fetchViewingContact,
  formatViewingTime,
  requestViewing,
  setViewingStatus,
  viewingTime,
  VIEWING_STATUS_LABEL,
  type Viewing,
  type ViewingContact,
} from '@/lib/viewings';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Badge, Button, Card, ErrorNote, Eyebrow, Row } from './ui';
import { ViewingRequest } from './viewing-request';

export function ViewingCard({
  propertyId,
  userId,
  mine,
  onChanged,
  onNeedSignIn,
}: {
  propertyId: string;
  /** `undefined` = neprihlásený. */
  userId: string | undefined;
  /** Moja obhliadka na tomto inzeráte, ak nejaká je. */
  mine: Viewing | undefined;
  onChanged: () => void;
  /** Neprihlásený nesmie skončiť v modáli, ktorý mu na konci povie „nie". */
  onNeedSignIn: () => void;
}) {
  const palette = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<ViewingContact | null>(null);

  const live = mine && (mine.status === 'REQUESTED' || mine.status === 'CONFIRMED');
  const revealed = mine && (mine.status === 'CONFIRMED' || mine.status === 'COMPLETED');

  const loadContact = useCallback(async () => {
    if (!mine || !revealed) {
      setContact(null);
      return;
    }
    try {
      setContact(await fetchViewingContact(mine.id));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKA] Kontakt sa nepodarilo načítať: ${m}`);
      setError(m);
    }
  }, [mine, revealed]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  async function run(what: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await what();
      onChanged();
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKA] Akcia zlyhala: ${m}`);
      setError(m);
      Alert.alert('Nepodarilo sa', m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Eyebrow>Obhliadka</Eyebrow>

      {!mine ? (
        <>
          <Text style={[styles.body, { color: palette.textSecondary }]}>
            Chceš si to pozrieť naživo? Dohodni si obhliadku — nezaväzuje ťa
            to k ponuke a ponuku môžeš podať pred ňou aj po nej.
          </Text>
          <Button
            title={userId ? 'Dohodnúť obhliadku' : 'Prihlás sa a dohodni obhliadku'}
            variant="outline"
            onPress={() => (userId ? setOpen(true) : onNeedSignIn())}
          />
        </>
      ) : (
        <>
          <View style={styles.headRow}>
            <Text style={[styles.when, { color: palette.textPrimary }]}>
              {formatViewingTime(viewingTime(mine))}
            </Text>
            <Badge
              text={VIEWING_STATUS_LABEL[mine.status]}
              tone={
                mine.status === 'CONFIRMED' ? 'accent'
                  : mine.status === 'COMPLETED' ? 'navy'
                  : mine.status === 'DECLINED' ? 'warning'
                  : 'neutral'
              }
            />
          </View>

          {mine.status === 'REQUESTED' ? (
            <Text style={[styles.body, { color: palette.textMuted }]}>
              Čaká sa na majiteľa. Kontakt uvidíte obaja až keď obhliadku potvrdí.
            </Text>
          ) : null}

          {mine.status === 'CONFIRMED' && mine.confirmed_time !== mine.proposed_time ? (
            <Text style={[styles.body, { color: palette.warning }]}>
              Majiteľ potvrdil iný čas, než si navrhol. Ak ti nevyhovuje, obhliadku zruš.
            </Text>
          ) : null}

          {revealed && contact ? (
            <View style={styles.contact}>
              <Row label="Prezývka" value={contact.nickname ?? '—'} />
              <Row label="Meno" value={contact.full_name ?? 'nevyplnené'} />
              <Row label="Telefón" value={contact.phone ?? 'nevyplnený'} />
              <Row label="E-mail" value={contact.email ?? 'nedostupný'} />
              <Row label="Ulica" value={contact.street ?? 'neuvedená'} />
            </View>
          ) : null}

          <ErrorNote error={error} />

          {mine.status === 'CONFIRMED' ? (
            <Button
              title="Bol som na obhliadke"
              onPress={() => void run(() => setViewingStatus(mine.id, 'COMPLETED'))}
              disabled={busy}
              loading={busy}
            />
          ) : null}

          {live ? (
            <Button
              title="Zrušiť obhliadku"
              variant="outline"
              onPress={() => void run(() => setViewingStatus(mine.id, 'CANCELLED'))}
              disabled={busy}
            />
          ) : (
            <Button title="Dohodnúť novú obhliadku" variant="outline" onPress={() => setOpen(true)} />
          )}
        </>
      )}

      <ViewingRequest
        visible={open}
        busy={busy}
        error={error}
        onClose={() => setOpen(false)}
        onSubmit={(at, note) =>
          void run(async () => {
            if (!userId) throw new Error('Na dohodnutie obhliadky sa treba prihlásiť.');
            await requestViewing({ propertyId, requesterId: userId, proposedTime: at, note });
            setOpen(false);
          })
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { ...Type.bodyLg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  when: { ...Type.subtitle, fontWeight: Weight.semibold, flexShrink: 1 },
  contact: { gap: Spacing.sm },
});
