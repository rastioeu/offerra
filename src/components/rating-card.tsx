/**
 * Hodnotenie druhej strany po uzavretom obchode.
 *
 * Zobrazí sa LEN vtedy, keď to databáza dovolí (`can_rate`) — appka sa
 * nepýta „som vlastník?", odpoveď je v DB. Tým sa nedá dostať do stavu,
 * keď obrazovka ponúka niečo, čo server odmietne.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import { db } from '@/lib/property';
import { canRate, saveRating, type Rating } from '@/lib/rating';
import { Spacing, Type, Weight } from '@/theme/tokens';

import { Button, Card, ErrorNote, Eyebrow, Field } from './ui';

export function RatingCard({
  propertyId,
  rateeId,
  rateeNickname,
  myId,
}: {
  propertyId: string;
  /** Koho hodnotím. `null` = obchod nemá druhú stranu (uzavretý mimo appky). */
  rateeId: string | null;
  rateeNickname: string;
  myId: string | undefined;
}) {
  const palette = useTheme();
  const toast = useToast();
  const [allowed, setAllowed] = useState(false);
  const [mine, setMine] = useState<Rating | null>(null);
  const [received, setReceived] = useState<Rating | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId || !rateeId) return;
    try {
      setAllowed(await canRate(propertyId, rateeId));
      const { data, error: e } = await db()
        .from('rating')
        .select('id, property_id, rater_id, ratee_id, stars, comment, created_at, updated_at')
        .eq('property_id', propertyId);
      if (e) throw e;
      const rows = (data ?? []) as Rating[];
      const m = rows.find((x) => x.rater_id === myId) ?? null;
      setMine(m);
      setReceived(rows.find((x) => x.ratee_id === myId) ?? null);
      if (m) {
        setStars(m.stars);
        setComment(m.comment ?? '');
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[HODNOTENIE] Načítanie zlyhalo: ${m}`);
      setError(m);
    }
  }, [propertyId, rateeId, myId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!myId || !rateeId || busy) return;
    if (stars < 1) {
      setError('Vyber počet hviezdičiek — bez toho hodnotenie neuložím.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveRating(propertyId, rateeId, myId, stars, comment.trim() || null);
      toast(mine ? 'Hodnotenie upravené' : 'Hodnotenie odoslané');
      await load();
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[HODNOTENIE] Uloženie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  if (!myId || !rateeId || (!allowed && !mine && !received)) return null;

  return (
    <Card>
      <Eyebrow>Hodnotenie</Eyebrow>

      {allowed ? (
        <>
          <Text style={[styles.note, { color: palette.textSecondary }]}>
            Ako sa ti jednalo s {rateeNickname}? Hodnotenie je VEREJNÉ — hviezdičky
            aj text uvidí každý, kto o obchod s ním uvažuje. Píš tak, aby to
            pomohlo ďalšiemu človeku.
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setStars(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n} z 5`}
                hitSlop={6}>
                <Text style={[styles.star, { color: n <= stars ? palette.accentDeep : palette.border }]}>★</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Pár slov (nepovinné)"
            hint="Uvidí to každý pri jeho prezývke. Píš vecne — je to o obchode, nie o človeku."
            value={comment}
            onChangeText={setComment}
            placeholder="napr. dohoda bez problémov, prišiel načas"
            multiline
          />

          <ErrorNote error={error} />
          <Button
            title={busy ? 'Ukladám…' : mine ? 'Upraviť hodnotenie' : 'Odoslať hodnotenie'}
            onPress={submit}
            disabled={busy}
          />
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Zmeniť sa to dá kedykoľvek.
          </Text>
        </>
      ) : null}

      {received ? (
        <View style={styles.receivedBox}>
          <Text style={[styles.note, { color: palette.textMuted }]}>Ako {rateeNickname} ohodnotil teba:</Text>
          <Text style={[styles.star, { color: palette.accentDeep }]}>{'★'.repeat(received.stars)}</Text>
          {received.comment ? (
            <Text style={[styles.note, { color: palette.textSecondary }]}>„{received.comment}"</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  note: { ...Type.bodyMd },
  stars: { flexDirection: 'row', gap: Spacing.xs },
  star: { fontSize: 34, fontWeight: Weight.bold, lineHeight: 40 },
  receivedBox: { gap: 4, marginTop: Spacing.sm },
});
