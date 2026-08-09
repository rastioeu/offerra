/**
 * Ponuky na inzerát rozbalené PRIAMO v „Moje inzeráty".
 *
 * ZVOLENÝ VZOR: **expand-in-place**, nie spodný panel. Dôvod je konkrétny,
 * nie estetický:
 *
 *  - Vlastník má naraz najviac päť inzerátov (drží to limit
 *    `max_active_listings`) a na jednom inzeráte býva pár ponúk. „Dlhé
 *    zoznamy", kvôli ktorým by mal zmysel panel, tu jednoducho nevznikajú.
 *  - Spodný panel prekryje zvyšok obrazovky, takže sa nedajú porovnať dva
 *    inzeráty vedľa seba — a práve to vlastník robí.
 *  - Panel už v appke je (obrazovka „Ponuky na inzerát"). Mať ho na dvoch
 *    miestach s dvoma rôznymi stavmi je presne tá trieda chyby, ktorá nás
 *    tu stála zvonček aj chybové hlášky.
 *
 * Plná obrazovka detailu OSTÁVA — len už nie je jedinou cestou k ponukám.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useOffers, useTenantProfiles } from '@/hooks/use-offers';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import { formatAmount, OFFER_STATUS_LABEL, type Offer } from '@/lib/offers';
import { closedLabel, db, formatDate, type PropertyWithMedia } from '@/lib/property';
import { closeDeal } from '@/lib/rating';
import { Money as MoneyType, Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Avatar } from './avatar';
import { Button, ErrorNote } from './ui';

export function InlineOffers({
  item,
  onChanged,
}: {
  item: PropertyWithMedia;
  /** Zoznam inzerátov sa musí prekresliť — počty ponúk sa práve zmenili. */
  onChanged: () => void;
}) {
  const palette = useTheme();
  const toast = useToast();
  const { offers, error, reload } = useOffers(item.id);
  const tenants = useTenantProfiles((offers ?? []).map((o) => o.id));
  const [busy, setBusy] = useState<string | null>(null);

  const isRent = item.transaction_type === 'RENT';

  async function decide(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
    setBusy(offerId);
    try {
      const { error: e } = await db().from('property_offer').update({ status }).eq('id', offerId);
      if (e) throw e;
      await reload();
      onChanged();
      toast(status === 'ACCEPTED' ? 'Ponuka prijatá — kontakt je odkrytý' : 'Ponuka odmietnutá', status === 'ACCEPTED' ? 'success' : 'info');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Rozhodnutie zlyhalo: ${m}`);
      Alert.alert('Nepodarilo sa uložiť', m);
    } finally {
      setBusy(null);
    }
  }

  async function finish(offerId: string) {
    setBusy(offerId);
    try {
      await closeDeal(item.id, offerId, null);
      await reload();
      onChanged();
      toast('Obchod uzavretý — teraz sa môžete ohodnotiť');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKY] Uzavretie zlyhalo: ${m}`);
      Alert.alert('Uzavretie zlyhalo', m);
    } finally {
      setBusy(null);
    }
  }

  if (offers === undefined) {
    return <Text style={[styles.note, { color: palette.textMuted }]}>Načítavam ponuky…</Text>;
  }

  return (
    <View style={[styles.wrap, { borderLeftColor: palette.accent }]}>
      <ErrorNote error={error} />

      {offers.length === 0 ? (
        <Text style={[styles.note, { color: palette.textMuted }]}>
          Na tento inzerát zatiaľ nikto neponúkol.
        </Text>
      ) : null}

      {offers.map((o: Offer) => {
        const t = tenants[o.id];
        const pending = o.status === 'PENDING';
        return (
          <View key={o.id} style={[styles.offer, { borderTopColor: palette.border }]}>
            <View style={styles.head}>
              <Avatar name={o.bidder?.nickname ?? '?'} uri={o.bidder?.avatar_url} size={32} />
              <View style={styles.headText}>
                <Text style={[styles.nick, { color: palette.textPrimary }]}>
                  {o.bidder?.nickname ?? 'neznámy'}
                </Text>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {formatDate(o.created_at)} · {OFFER_STATUS_LABEL[o.status].toLowerCase()}
                </Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  { color: o.status === 'ACCEPTED' ? palette.success : palette.accent },
                ]}>
                {formatAmount(o.amount, item.transaction_type)}
              </Text>
            </View>

            {o.message ? (
              <Text style={[styles.message, { color: palette.textSecondary }]}>„{o.message}"</Text>
            ) : null}

            {/* Dotazník nájomcu — pri prenájme je to hlavný podklad
                rozhodnutia, takže patrí sem, nie o obrazovku ďalej. */}
            {isRent && t ? (
              <Text style={[styles.meta, { color: palette.textSecondary }]}>
                {[
                  t.num_people != null ? `${t.num_people} osoby` : null,
                  t.has_pets ? 'so zvieraťom' : 'bez zvierat',
                  t.lease_duration_months != null ? `na ${t.lease_duration_months} mes.` : null,
                  t.employment_status,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            {pending ? (
              <View style={styles.actions}>
                <Button
                  title="Prijať"
                  onPress={() => void decide(o.id, 'ACCEPTED')}
                  disabled={busy !== null}
                />
                <Button
                  title="Odmietnuť"
                  variant="outline"
                  onPress={() => void decide(o.id, 'REJECTED')}
                  disabled={busy !== null}
                />
              </View>
            ) : null}

            {/* Uzavretie obchodu je TU, nie o obrazovku ďalej — je to
                posledný krok toho istého rozhodnutia. */}
            {o.status === 'ACCEPTED' && item.status === 'ACTIVE' ? (
              <Button
                title={`${closedLabel(item.transaction_type)} tomuto záujemcovi`}
                variant="outline"
                disabled={busy !== null}
                onPress={() =>
                  Alert.alert(
                    `${closedLabel(item.transaction_type)}?`,
                    'Inzerát zmizne z katalógu, ostatné čakajúce ponuky sa uzavrú a vy dvaja sa budete môcť ohodnotiť. Späť sa to vziať nedá.',
                    [
                      { text: 'Zrušiť', style: 'cancel' },
                      { text: 'Uzavrieť obchod', onPress: () => void finish(o.id) },
                    ]
                  )
                }
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Ľavý farebný pruh hovorí, že to patrí k riadku nad tým.
  wrap: { borderLeftWidth: 2, paddingLeft: Spacing.md, marginLeft: Spacing.sm, marginTop: Spacing.xs },
  offer: { paddingTop: Spacing.sm, marginTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headText: { flex: 1, gap: 1 },
  nick: { ...Type.bodyMd, fontWeight: Weight.semibold },
  meta: { ...Type.caption },
  message: { ...Type.caption, fontStyle: 'italic' },
  amount: { fontFamily: MoneyType.fontFamily, ...MoneyType.small, fontWeight: Weight.bold },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  note: { ...Type.caption, marginLeft: Spacing.sm, marginTop: Spacing.xs },
});
