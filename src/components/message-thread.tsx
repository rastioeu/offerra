/**
 * Správy 1:1 v detaile inzerátu.
 *
 * DVE ROLY, JEDNA MECHANIKA. Záujemca má jedno vlákno — s vlastníkom.
 * Vlastník ich má toľko, koľko ľudí mu napísalo, a vidí zoznam, z ktorého
 * si jedno otvorí. Nie je to spoločná debata pod inzerátom: každý záujemca
 * vidí VÝHRADNE to svoje a o ostatných nevie (drží to RLS v databáze).
 *
 * PREZÝVKA, NIE MENO. Chat je dostupný aj pred podaním ponuky, ale sám
 * kontakt neodkrýva — to ostáva na prijatej ponuke a obhliadke. Preto sa
 * v ňom nedajú poslať kontaktné údaje; odmietne ich `send_message()`
 * v databáze, nie táto obrazovka.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ErrorNote, Eyebrow } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { errorText } from '@/lib/errors';
import {
  contactBlockedText,
  contactInText,
  fetchNicknames,
  fetchThread,
  fetchThreads,
  markRead,
  MESSAGE_MAX,
  sendMessage,
  type Message,
  type MessageSubject,
  type Thread,
} from '@/lib/messages';
import { type Offer } from '@/lib/offers';
import { type PropertyWithMedia } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export function MessagesTab({
  item,
  offers,
  myId,
  isOwner,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  myId: string | undefined;
  isOwner: boolean;
}) {
  const palette = useTheme();
  const { t } = useTranslation();

  if (!myId) {
    return (
      <View style={styles.body}>
        <Card>
          <Eyebrow>{t('messages.messagesTitle')}</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {t('messages.loginRequired')}
          </Text>
        </Card>
      </View>
    );
  }

  // ZÁUJEMCA — jedno vlákno, s vlastníkom. Zoznam by nemal čo ukázať.
  if (!isOwner) {
    return (
      <View style={styles.body}>
        <Conversation
          subject={{ propertyId: item.id }}
          myId={myId}
          otherId={item.owner_id}
          otherName={t('messages.withSellerName')}
        />
      </View>
    );
  }

  // Záujemcovia, ktorí PODALI PONUKU, ale ešte nenapísali — vlastník sa má
  // vedieť ozvať prvý, nie čakať, kým naňho niekto začne.
  const silentEntries = (offers ?? [])
    .filter((o) => o.status !== 'WITHDRAWN' && o.bidder_id !== myId)
    .map((o) => ({
      id: o.bidder_id,
      nickname: o.bidder?.nickname ?? t('messages.bidderFallback'),
      note: t('messages.silentOfferNote'),
    }));

  return <OwnerThreads subject={{ propertyId: item.id }} myId={myId} silentEntries={silentEntries} />;
}

// ── VLASTNÍK: zoznam vlákien ──────────────────────────────────────────────
//
// Znovupoužiteľné aj pre dopyty (`demand-messages.tsx`, 13.8.2026 —
// „pridaj chat aj pri dopytoch") — mechanika je identická, mení sa len
// PREDMET (`subject`) a odkiaľ prichádzajú „tichí" ľudia (pri inzeráte
// ponuky, pri dopyte oslovenia). Preto tento komponent NEVIE nič o ponukách
// — dostáva ich už hotové ako `silentEntries`.

export function OwnerThreads({
  subject,
  myId,
  silentEntries,
}: {
  subject: MessageSubject;
  myId: string;
  /**
   * Ľudia, ktorí sa už ozvali INOU cestou (ponukou, oslovením), ale
   * v chate ešte nenapísali. Vlastník sa má vedieť ozvať prvý — bez
   * tohto zoznamu by vedel začať konverzáciu len ten, komu niekto
   * napísal ako prvému.
   */
  silentEntries: { id: string; nickname: string; note: string }[];
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const [threads, setThreads] = useState<Thread[] | undefined>(undefined);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const th = await fetchThreads(subject, myId);
      setThreads(th);
      const ids = th.map((x) => x.otherId);
      if (ids.length > 0) setNames(await fetchNicknames(ids));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[SPRÁVY] Zoznam vlákien zlyhal: ${m}`);
      setError(m);
      setThreads([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(subject), myId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ľudia, ktorí sa ozvali inou cestou, ale v chate ešte nenapísali —
  // vylúčení tí, čo už vlákno majú, nech sa neduplikujú v zozname.
  const withThread = new Set((threads ?? []).map((th) => th.otherId));
  const silent = silentEntries.filter((s) => !withThread.has(s.id));

  if (open) {
    return (
      <View style={styles.body}>
        <Pressable onPress={() => { setOpen(null); void load(); }} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.back, { color: palette.link }]}>{t('messages.backToList')}</Text>
        </Pressable>
        <Conversation
          subject={subject}
          myId={myId}
          otherId={open}
          otherName={names[open] ?? silentEntries.find((s) => s.id === open)?.nickname ?? t('messages.withOtherPartyName')}
        />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <ErrorNote error={error} />
      <Card>
        <Eyebrow>{t('messages.messagesTitle')}</Eyebrow>

        {threads === undefined ? (
          <Text style={[styles.note, { color: palette.textMuted }]}>{t('messages.loading')}</Text>
        ) : threads.length === 0 && silent.length === 0 ? (
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {t('messages.noOneWroteYet')}
          </Text>
        ) : null}

        {(threads ?? []).map((th) => (
          <Pressable
            key={th.otherId}
            onPress={() => setOpen(th.otherId)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.threadRow,
              { borderTopColor: palette.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={styles.threadText}>
              <Text style={[styles.threadName, { color: palette.textPrimary }]}>
                {names[th.otherId] ?? t('messages.bidderFallback')}
              </Text>
              <Text style={[styles.threadLast, { color: palette.textMuted }]} numberOfLines={1}>
                {th.last.sender_id === myId ? t('messages.youPrefix') : ''}
                {th.last.content}
              </Text>
            </View>
            {th.unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: palette.accentDeep }]}>
                <Text style={[styles.badgeText, { color: palette.onPrimary }]}>{th.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}

        {silent.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setOpen(s.id)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.threadRow,
              { borderTopColor: palette.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={styles.threadText}>
              <Text style={[styles.threadName, { color: palette.textPrimary }]}>{s.nickname}</Text>
              <Text style={[styles.threadLast, { color: palette.textMuted }]}>{s.note}</Text>
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

// ── JEDNO VLÁKNO ──────────────────────────────────────────────────────────
//
// Exportovaná — `demand-messages.tsx` ju používa nezmenenú, len s iným
// `subject`. Konverzácia sama o sebe nevie, či ide o inzerát alebo dopyt,
// a nemusí to vedieť: predmet je vyriešený už v `subject`.

export function Conversation({
  subject,
  myId,
  otherId,
  otherName,
}: {
  subject: MessageSubject;
  myId: string;
  otherId: string;
  otherName: string;
}) {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const [list, setList] = useState<Message[] | undefined>(undefined);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const subjectKey = JSON.stringify(subject);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchThread(subject, otherId);
      setList(rows);
      // Prečítané sa značí až keď je vlákno naozaj otvorené — inak by sa
      // odznak „neprečítané" zhasol bez toho, aby to niekto videl.
      if (rows.some((m) => m.recipient_id === myId && !m.read_at)) {
        await markRead(subject, otherId);
      }
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[SPRÁVY] Vlákno sa nenačítalo: ${m}`);
      setError(m);
      setList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey, otherId, myId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Klientská kontrola je LEN pre rýchlosť odozvy — skutočný zákaz drží
  // databáza. Preto sa tlačidlo nevypína, len sa vopred povie, čo prekáža.
  const blocked = text.trim() ? contactInText(text) : null;

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendMessage(subject, otherId, body);
      setText('');
      await load();
      requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[SPRÁVY] Odoslanie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Eyebrow>{t('messages.conversationWith', { name: otherName })}</Eyebrow>

      <Text style={[styles.note, { color: palette.textMuted }]}>
        {t('messages.conversationHint')}
      </Text>

      <ErrorNote error={error} />

      <ScrollView
        ref={scroller}
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
        {list === undefined ? (
          <ActivityIndicator />
        ) : list.length === 0 ? (
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {t('messages.nothingYet')}
          </Text>
        ) : (
          list.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  {
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    backgroundColor: mine ? palette.accentDeep : palette.surfacePressed,
                  },
                ]}>
                <Text style={[styles.bubbleText, { color: mine ? palette.onPrimary : palette.textPrimary }]}>
                  {m.content}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    { color: mine ? palette.onPrimary : palette.textMuted, opacity: mine ? 0.75 : 1 },
                  ]}>
                  {timeOf(language, m.created_at)}
                  {mine && m.read_at ? t('messages.readSuffix') : ''}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('messages.inputPlaceholder')}
        placeholderTextColor={palette.textPlaceholder}
        multiline
        maxLength={MESSAGE_MAX}
        style={[
          styles.input,
          { backgroundColor: palette.surface, borderColor: palette.borderStrong, color: palette.textPrimary },
        ]}
      />

      {blocked ? (
        <Text style={[styles.blocked, { color: palette.danger }]}>{contactBlockedText(t, blocked)}</Text>
      ) : null}

      <Button
        title={t('messages.sendButton')}
        onPress={send}
        loading={busy}
        disabled={busy || text.trim().length === 0}
      />
    </Card>
  );
}

function timeOf(language: string, iso: string): string {
  const d = new Date(iso);
  const tag = language === 'de' ? 'de-DE' : language === 'en' ? 'en-GB' : 'sk-SK';
  return d.toLocaleString(tag, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  body: { gap: Spacing.md },
  note: { ...Type.caption },
  back: { ...Type.caption, fontWeight: Weight.semibold },
  scroll: { maxHeight: 320 },
  scrollBody: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  bubbleText: { ...Type.body },
  bubbleTime: { ...Type.caption },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 72,
    textAlignVertical: 'top',
    ...Type.body,
  },
  blocked: { ...Type.caption, fontWeight: Weight.semibold },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  threadText: { flex: 1, gap: 2 },
  threadName: { ...Type.body, fontWeight: Weight.semibold },
  threadLast: { ...Type.caption },
  badge: { minWidth: 22, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { ...Type.caption, fontWeight: Weight.bold, textAlign: 'center' },
});
