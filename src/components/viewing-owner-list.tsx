/**
 * Obhliadky očami MAJITEĽA — súčasť panelu „Ponuky na inzerát".
 *
 * Zámerne NIE samostatná obrazovka: majiteľ sa rozhoduje o ponukách
 * a obhliadkach naraz („ten, čo tu už bol, ponúka menej") a chodiť kvôli
 * tomu na dve miesta by rozhodovanie len sťažilo.
 *
 * Kontakt na záujemcu sa odkryje POTVRDENÍM. Nie je to voľba v UI —
 * potvrdenie je ten súhlas: majiteľ sa práve rozhodol pustiť si toho
 * človeka domov.
 */
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import {
  completedCount,
  confirmViewing,
  formatViewingTime,
  setViewingStatus,
  viewingTime,
  VIEWING_STATUS_LABEL,
  type Viewing,
} from '@/lib/viewings';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Avatar } from './avatar';
import { Badge, Button, Card, ErrorNote, Eyebrow } from './ui';
import { ViewingRequest } from './viewing-request';

export function ViewingOwnerList({
  items,
  onChanged,
}: {
  items: Viewing[];
  onChanged: () => void;
}) {
  const palette = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Ktorej obhliadke práve navrhujem iný čas. */
  const [retiming, setRetiming] = useState<Viewing | null>(null);

  const done = completedCount(items);
  const live = items.filter((v) => v.status === 'REQUESTED' || v.status === 'CONFIRMED');

  async function run(id: string, what: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await what();
      onChanged();
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKY] Akcia majiteľa zlyhala: ${m}`);
      setError(m);
      Alert.alert('Nepodarilo sa', m);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Eyebrow>Obhliadky</Eyebrow>

      {/* Dôveryhodný signál pri rozhodovaní o ponukách — kto si byt naozaj
          pozrel, myslí to vážnejšie než kto ponúkol naslepo. */}
      {done > 0 ? (
        <Text style={[styles.stat, { color: palette.accentDeep }]}>
          {done === 1 ? '1 záujemca už bol na obhliadke' :
            done < 5 ? `${done} záujemcovia už boli na obhliadke` :
            `${done} záujemcov už bolo na obhliadke`}
        </Text>
      ) : null}

      {items.length === 0 ? (
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          Zatiaľ o obhliadku nikto nepožiadal.
        </Text>
      ) : null}

      <ErrorNote error={error} />

      {items.map((v) => {
        const busy = busyId === v.id;
        return (
          <View key={v.id} style={[styles.row, { borderBottomColor: palette.border }]}>
            <Avatar name={v.requester?.nickname ?? 'neznámy'} size={38} />

            <View style={styles.body}>
              <View style={styles.headRow}>
                <Text style={[styles.nick, { color: palette.textPrimary }]} numberOfLines={2}>
                  {v.requester?.nickname ?? 'neznámy'}
                </Text>
                <Badge
                  text={VIEWING_STATUS_LABEL[v.status]}
                  tone={
                    v.status === 'CONFIRMED' ? 'accent'
                      : v.status === 'COMPLETED' ? 'navy'
                      : v.status === 'DECLINED' ? 'warning'
                      : 'neutral'
                  }
                />
              </View>

              <Text style={[styles.when, { color: palette.textSecondary }]}>
                {formatViewingTime(viewingTime(v))}
              </Text>

              {v.note ? (
                <Text style={[styles.note, { color: palette.textMuted }]}>„{v.note}"</Text>
              ) : null}

              {v.status === 'REQUESTED' ? (
                <View style={styles.actions}>
                  <Button
                    title="Potvrdiť termín"
                    onPress={() => void run(v.id, () => confirmViewing(v.id, new Date(v.proposed_time)))}
                    disabled={busy}
                    loading={busy}
                  />
                  <Button title="Navrhnúť iný čas" variant="outline" onPress={() => setRetiming(v)} />
                  <Button
                    title="Zamietnuť"
                    variant="danger"
                    onPress={() => void run(v.id, () => setViewingStatus(v.id, 'DECLINED'))}
                    disabled={busy}
                  />
                </View>
              ) : null}

              {v.status === 'CONFIRMED' ? (
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  Kontakt máte navzájom odkrytý. Označiť obhliadku za absolvovanú
                  môže záujemca.
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {live.length === 0 && items.length > 0 ? (
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          Žiadna otvorená obhliadka.
        </Text>
      ) : null}

      {/* Iný čas sa vyberá tým istým výberom ako pri žiadosti — nie druhým
          kolotočom, ktorý by sa časom rozišiel s prvým. */}
      <ViewingRequest
        visible={retiming !== null}
        busy={busyId !== null}
        error={error}
        onClose={() => setRetiming(null)}
        onSubmit={(at) => {
          const v = retiming;
          if (!v) return;
          void run(v.id, async () => {
            await confirmViewing(v.id, at);
            setRetiming(null);
          });
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  stat: { ...Type.bodyLg, fontWeight: Weight.semibold },
  empty: { ...Type.bodyMd },
  row: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { flex: 1, gap: Spacing.xs },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  nick: { ...Type.bodyLg, fontWeight: Weight.semibold, flexShrink: 1 },
  when: { ...Type.bodyMd },
  note: { ...Type.bodyMd },
  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
});
