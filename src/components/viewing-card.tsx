/**
 * Obhliadka na detaile inzerátu.
 *
 * Celá karta stojí na jednej vete: používateľ musí vedieť, ČO sa stane,
 * ešte PREDTÝM než klikne (Rastio, 8.8.2026). Preto je varovanie nad
 * tlačidlom, nie v potvrdzovacom dialógu za ním — a je tam aj vtedy, keď
 * dialóg preskočí.
 *
 * POTVRDZOVACÍ TOK (Rastio, 13.8.2026, mení predošlé rozhodnutie z 8.8.):
 * žiadosť vznikne ako `REQUESTED`, kontakt je stále skrytý. Vlastník ju tu
 * potvrdí alebo odmietne — až potvrdením (`CONFIRMED`) sa kontakt odkryje
 * obom stranám. Kto smie ktorý prechod spraviť, presadzuje databáza
 * (`guard_viewing_update`), nie táto obrazovka — tá len ponúka tlačidlá,
 * ktoré k tomu vedú.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { errorText } from '@/lib/errors';
import {
  confirmViewing,
  fetchViewingContact,
  getViewingConsent,
  getViewingStatusLabel,
  requestViewing,
  setViewingStatus,
  type Viewing,
  type ViewingContact,
} from '@/lib/viewing';
import { Spacing, Type } from '@/theme/tokens';

import { Button, Card, ErrorNote, Eyebrow, ParamCell } from './ui';

/** Stavy, v ktorých je kontakt naozaj odkrytý — nové aj legacy pred zmenou. */
const REVEALED: Viewing['status'][] = ['CONFIRMED', 'CONTACT_SHARED'];

export function ViewingCard({
  propertyId,
  myId,
  isOwner,
  closed,
  viewings,
  reload,
  reloadProperty,
}: {
  propertyId: string;
  myId: string | undefined;
  isOwner: boolean;
  /** Uzavretý inzerát — obhliadku už žiadať nemá zmysel. */
  closed: boolean;
  viewings: Viewing[] | undefined;
  reload: () => Promise<void>;
  /** Na obnovu stavu inzerátu, keď žiadosť narazí na RLS — pozri `ask()`. */
  reloadProperty: () => Promise<void>;
}) {
  const palette = useTheme();
  const toast = useToast();
  const { t } = useTranslation();
  const VIEWING_CONSENT = getViewingConsent(t);
  const VIEWING_STATUS_LABEL = getViewingStatusLabel(t);
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
      // Pred potvrdením kontakt neexistuje — netreba oň ani žiadať.
      if (!REVEALED.includes(v.status)) continue;
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
      // ZNOVU-ŽIADOSŤ (Rastio, 19.8.2026): `viewing` má `unique
      // (property_id, requester_id)` — druhá žiadosť na ten istý inzerát
      // NIKDY nie je nový riadok, vždy je to UPDATE tej istej CANCELLED
      // riadky. Databáza (`guard_viewing_update`) to isté presadzuje aj
      // nezávisle od appky — toto len volí správnu cestu.
      if (mine && mine.status === 'CANCELLED') {
        await setViewingStatus(mine.id, 'REQUESTED');
      } else {
        await requestViewing(propertyId, myId);
      }
      await reload();
      toast(t('viewing.requestSentToast'), 'info');
    } catch (e: unknown) {
      // Surová chyba (aj s Postgres kódom) ide vždy do logu — nikdy sa
      // nezahadzuje (CLAUDE.md §2). Používateľovi sa ale pri tomto
      // konkrétnom kóde (RLS na vklad) NEMÁ ukázať naraz s technickým
      // textom (Rastio, 13.8.2026, screenshot: obe hlášky naraz mátali).
      // 42501 sem reálne príde len jedným spôsobom — tlačidlo bolo
      // klikateľné so ZASTARANÝM stavom inzerátu (medzičasom prestal byť
      // ACTIVE, napr. admin ho skryl po nahlásení) — server to správne
      // odmietol, len appka o tom ešte nevedela.
      const code = (e as { code?: unknown } | null)?.code;
      console.log(`[OBHLIADKA] Žiadosť zlyhala: ${errorText(e)}`);
      if (code === '42501') {
        setError(t('viewing.listingUnavailable'));
        void reloadProperty();
      } else {
        setError(errorText(e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirm(v: Viewing) {
    setBusy(true);
    setError(null);
    try {
      await confirmViewing(v.id);
      await reload();
      toast(t('viewing.confirmedToast'), 'info');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[OBHLIADKA] Potvrdenie zlyhalo: ${m}`);
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
      toast(status === 'COMPLETED' ? t('viewing.markedCompletedToast') : t('viewing.markedCancelledToast'), 'info');
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
      <Eyebrow>{t('viewing.eyebrow')}</Eyebrow>
      <ErrorNote error={error} />

      {/* ZRUŠENÁ/ODMIETNUTÁ obhliadka NIE JE mŕtvy stav (Rastio, 19.8.2026,
          screenshot) — kým je `mine.status === 'CANCELLED'`, tlačidlo sa
          ukáže znova. Databáza to isté presadzuje nezávisle
          (`guard_viewing_update`), takže appka tu len ponúka cestu, ktorú
          server aj tak dovolí. */}
      {!isOwner && (!mine || mine.status === 'CANCELLED') ? (
        <>
          <Text style={[styles.note, { color: palette.textSecondary }]}>{VIEWING_CONSENT}</Text>
          {mine?.status === 'CANCELLED' ? (
            <Text style={[styles.note, { color: palette.textMuted }]}>{t('viewing.previousCancelledHint')}</Text>
          ) : null}
          {closed ? (
            <Text style={[styles.note, { color: palette.textMuted }]}>{t('viewing.closedHint')}</Text>
          ) : (
            <Button
              title={busy ? t('viewing.sending') : mine ? t('viewing.askAgain') : t('viewing.ask')}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  mine ? t('viewing.askAgainConfirmTitle') : t('viewing.askConfirmTitle'),
                  VIEWING_CONSENT,
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('viewing.askConfirmYes'), onPress: () => void ask() },
                  ],
                )
              }
            />
          )}
        </>
      ) : null}

      {isOwner && visible.length === 0 ? (
        <Text style={[styles.note, { color: palette.textMuted }]}>{t('viewing.noRequestsYet')}</Text>
      ) : null}

      {visible.map((v) => {
        const c = contacts[v.id];
        const revealed = REVEALED.includes(v.status);
        return (
          <View key={v.id} style={styles.item}>
            <Text style={[styles.status, { color: palette.textPrimary }]}>
              {VIEWING_STATUS_LABEL[v.status]}
            </Text>

            {v.status === 'CANCELLED' ? (
              <Text style={[styles.note, { color: palette.textMuted }]}>
                {/* ZÁMERNE bez tvrdenia o tom, či sa kontakt stihol odkryť
                    — z aktuálneho riadku sa to nedá zistiť (`CANCELLED` už
                    nenesie, z akého stavu prišla) a klamať by bolo horšie
                    než napísať menej. */}
                {t('viewing.cancelledShort')}
              </Text>
            ) : v.status === 'REQUESTED' ? (
              isOwner ? (
                <>
                  <Text style={[styles.note, { color: palette.textSecondary }]}>
                    {t('viewing.ownerPendingHint')}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      title={t('viewing.confirmButton')}
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(t('viewing.confirmConfirmTitle'), VIEWING_CONSENT, [
                          { text: t('common.back'), style: 'cancel' },
                          { text: t('common.continue'), onPress: () => void confirm(v) },
                        ])
                      }
                    />
                    <Button
                      title={t('viewing.declineButton')}
                      variant="outline"
                      disabled={busy}
                      onPress={() => void mark(v, 'CANCELLED')}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.note, { color: palette.textSecondary }]}>
                    {t('viewing.requesterPendingHint')}
                  </Text>
                  <Button
                    title={t('viewing.withdrawButton')}
                    variant="outline"
                    disabled={busy}
                    onPress={() => void mark(v, 'CANCELLED')}
                  />
                </>
              )
            ) : revealed && c ? (
              <View style={styles.grid}>
                <ParamCell value={c.nickname ?? '—'} label={t('viewing.paramNickname')} />
                <ParamCell value={c.full_name ?? t('viewing.paramNameEmpty')} label={t('viewing.paramName')} />
                <ParamCell value={c.phone ?? t('viewing.paramPhoneEmpty')} label={t('viewing.paramPhone')} />
                <ParamCell value={c.email ?? t('viewing.paramEmailEmpty')} label={t('viewing.paramEmail')} />
              </View>
            ) : revealed ? (
              <Text style={[styles.note, { color: palette.textMuted }]}>{t('viewing.loadingContact')}</Text>
            ) : null}

            {revealed ? (
              <View style={styles.actions}>
                <Button
                  title={t('viewing.attendedButton')}
                  variant="outline"
                  disabled={busy}
                  onPress={() => void mark(v, 'COMPLETED')}
                />
                <Button
                  title={t('common.cancel')}
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(t('viewing.cancelConfirmTitle'), t('viewing.cancelConfirmBody'), [
                      { text: t('common.back'), style: 'cancel' },
                      { text: t('viewing.cancelConfirmYes'), style: 'destructive', onPress: () => void mark(v, 'CANCELLED') },
                    ])
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
