/**
 * Podtaby na detaile inzerátu — Ponuky / Obhliadka / Hodnotenia.
 *
 * PREČO (Rastio, 12.8.2026): predtým boli ponuky, obhliadka a hodnotenia
 * poukladané pod sebou v jednom dlhom stĺpci a majiteľ musel na rozhodnutie
 * o ponuke odísť na inú obrazovku. Teraz je všetko na jednom mieste
 * a obe strany vidia TIE ISTÉ tri taby — líši sa obsah podľa toho, čo kto
 * smie spraviť, nie samotná stavba obrazovky.
 *
 * NÁZOV „Obhliadka", nie „Komunikácia": appka nemá chat, len jednorazové
 * odkrytie kontaktu. Tab má sľubovať presne toľko, koľko appka vie.
 *
 * ČO SA SEM ZÁMERNE NEPRESUNULO — formulár „Podať ponuku". Ostáva vlastnou
 * obrazovkou (`/ponuka/[id]`), lebo pri prenájme obsahuje celý dotazník
 * nájomcu a vlastnú kontrolu. Druhá kópia toho formulára by sa časom
 * rozišla s originálom. Tab vedie naň jedným ťuknutím a ukazuje stav
 * vlastnej ponuky, čo je to, čo z neho človek potrebuje vidieť.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { OfferList } from '@/components/offer-list';
import { OwnerOffers } from '@/components/owner-offers';
import { PriceTimeline } from '@/components/price-timeline';
import { RatingCard } from '@/components/rating-card';
import { Reviews } from '@/components/reviews';
import { ViewingCard } from '@/components/viewing-card';
import { Button, Card, ErrorNote, Eyebrow, ParamCell } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import {
  fetchOfferContact,
  formatAmount,
  OFFER_STATUS_LABEL,
  type Offer,
  type OfferContact,
} from '@/lib/offers';
import { db, type PropertyWithMedia } from '@/lib/property';
import { type RatingSummary } from '@/lib/rating';
import { type Viewing } from '@/lib/viewing';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export type DetailTab = 'OFFERS' | 'VIEWING' | 'RATINGS';

const TABS: [DetailTab, string][] = [
  ['OFFERS', 'Ponuky'],
  ['VIEWING', 'Obhliadka'],
  ['RATINGS', 'Hodnotenia'],
];

export function PropertyTabs({
  item,
  offers,
  offersError,
  reloadOffers,
  reloadProperty,
  viewings,
  reloadViewings,
  myId,
  isOwner,
  closed,
  ownerSummary,
  winnerBidderId,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  offersError: string | null;
  reloadOffers: () => Promise<void>;
  reloadProperty: () => Promise<void>;
  viewings: Viewing[] | undefined;
  reloadViewings: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  /** Uzávierka ponúk už prešla. */
  closed: boolean;
  ownerSummary: RatingSummary | undefined;
  /** Kto obchod vyhral — majiteľ podľa toho vie, koho hodnotí. */
  winnerBidderId: string | undefined;
}) {
  const palette = useTheme();
  const [tab, setTab] = useState<DetailTab>('OFFERS');

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { backgroundColor: palette.surfacePressed, borderColor: palette.border }]}>
        {TABS.map(([value, label]) => {
          const active = tab === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: active ? palette.surface : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? palette.textPrimary : palette.textMuted,
                    fontWeight: active ? Weight.bold : Weight.medium,
                  },
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'OFFERS' ? (
        <OffersTab
          item={item}
          offers={offers}
          offersError={offersError}
          reloadOffers={reloadOffers}
          reloadProperty={reloadProperty}
          myId={myId}
          isOwner={isOwner}
          closed={closed}
        />
      ) : null}

      {tab === 'VIEWING' ? (
        <ViewingTab
          item={item}
          offers={offers}
          viewings={viewings}
          reloadViewings={reloadViewings}
          myId={myId}
          isOwner={isOwner}
          closed={closed}
        />
      ) : null}

      {tab === 'RATINGS' ? (
        <RatingsTab
          item={item}
          myId={myId}
          isOwner={isOwner}
          ownerSummary={ownerSummary}
          winnerBidderId={winnerBidderId}
        />
      ) : null}
    </View>
  );
}

// ── PONUKY ────────────────────────────────────────────────────────────────

function OffersTab({
  item,
  offers,
  offersError,
  reloadOffers,
  reloadProperty,
  myId,
  isOwner,
  closed,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  offersError: string | null;
  reloadOffers: () => Promise<void>;
  reloadProperty: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  closed: boolean;
}) {
  const palette = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = offers ?? [];
  const mine = myId ? list.find((o) => o.bidder_id === myId && o.status !== 'WITHDRAWN') : undefined;

  async function withdraw() {
    if (!mine || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await db()
        .from('property_offer')
        .update({ status: 'WITHDRAWN' })
        .eq('id', mine.id);
      if (e) throw e;
      await reloadOffers();
      toast('Ponuka stiahnutá', 'info');
    } catch (e: unknown) {
      const m = errorText(e);
      console.log(`[PONUKA] Stiahnutie zlyhalo: ${m}`);
      setError(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      <ErrorNote error={offersError} />
      <ErrorNote error={error} />

      {/* MAJITEĽ — rozhoduje priamo tu, nemusí nikam odchádzať. */}
      {isOwner ? (
        <Card>
          <Eyebrow>{`Ponuky (${list.length})`}</Eyebrow>
          {offers === undefined ? (
            <Text style={[styles.note, { color: palette.textMuted }]}>Načítavam…</Text>
          ) : (
            <OwnerOffers
              item={item}
              offers={list}
              reload={reloadOffers}
              reloadProperty={reloadProperty}
            />
          )}
        </Card>
      ) : null}

      {/* ZÁUJEMCA — stav svojej ponuky a čo sa s ňou dá spraviť. */}
      {!isOwner && myId ? (
        <Card>
          <Eyebrow>Moja ponuka</Eyebrow>
          {mine ? (
            <>
              <View style={styles.grid}>
                <ParamCell
                  value={formatAmount(mine.amount, item.transaction_type)}
                  label="Moja suma"
                />
                <ParamCell value={OFFER_STATUS_LABEL[mine.status]} label="Stav" />
              </View>
              {mine.status === 'ACCEPTED' ? (
                <Text style={[styles.note, { color: palette.success }]}>
                  Ponuka je prijatá. Kontakt na predávajúceho nájdeš v tabe „Obhliadka".
                </Text>
              ) : null}
              {mine.status === 'REJECTED' ? (
                <Text style={[styles.note, { color: palette.textMuted }]}>
                  Predávajúci ponuku odmietol. Podať novú môžeš, kým je inzerát otvorený.
                </Text>
              ) : null}
              {mine.status === 'PENDING' ? (
                <>
                  <Button
                    title="Upraviť moju ponuku"
                    variant="outline"
                    onPress={() => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } })}
                  />
                  <Button
                    title={busy ? 'Sťahujem…' : 'Stiahnuť ponuku'}
                    variant="danger"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert('Stiahnuť ponuku?', 'Zo zoznamu zmizne ako aktívna.', [
                        { text: 'Späť', style: 'cancel' },
                        { text: 'Stiahnuť', style: 'destructive', onPress: () => void withdraw() },
                      ])
                    }
                  />
                </>
              ) : null}
            </>
          ) : closed || item.status === 'CLOSED' ? (
            <Text style={[styles.note, { color: palette.warning }]}>
              Príjem ponúk sa uzavrel — nové ponuky už podať nemožno.
            </Text>
          ) : (
            <>
              <Text style={[styles.note, { color: palette.textMuted }]}>
                Cena je len orientačná. Ponúknuť môžeš viac aj menej — rozhodne
                predávajúci.
              </Text>
              <Button
                title="Podať ponuku"
                onPress={() => router.push({ pathname: '/ponuka/[id]', params: { id: item.id } })}
              />
            </>
          )}
        </Card>
      ) : null}

      {!myId ? (
        <Card>
          <Eyebrow>Chcem ponúknuť</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Ponuky sú verejné, ale podať ju môže len prihlásený človek — inak by
            nebolo komu odkryť kontakt, keď ju predávajúci prijme.
          </Text>
          <Button title="Prihlás sa a ponúkni" onPress={() => router.push('/login')} />
        </Card>
      ) : null}

      {/* VEREJNÝ ZOZNAM — vidí ho ktokoľvek vrátane neprihláseného.
          Majiteľovi sa neopakuje, ten má hore ten istý zoznam s akciami. */}
      {!isOwner ? (
        <Card>
          <Eyebrow>{`Všetky ponuky (${list.length})`}</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Sumy aj prezývky sú verejné. Kto za nimi stojí, sa dozvie až ten,
            koho ponuku predávajúci prijme. Správa priložená k ponuke verejná
            nie je — číta ju len predávajúci a ten, kto ju napísal.
          </Text>
          <OfferList
            offers={list}
            transaction={item.transaction_type}
            highlightBidderId={myId}
            allowReport
          />
        </Card>
      ) : null}

      <PriceTimeline propertyId={item.id} offers={list} transaction={item.transaction_type} />
    </View>
  );
}

// ── OBHLIADKA ─────────────────────────────────────────────────────────────

function ViewingTab({
  item,
  offers,
  viewings,
  reloadViewings,
  myId,
  isOwner,
  closed,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  viewings: Viewing[] | undefined;
  reloadViewings: () => Promise<void>;
  myId: string | undefined;
  isOwner: boolean;
  closed: boolean;
}) {
  const palette = useTheme();

  if (!myId) {
    return (
      <View style={styles.body}>
        <Card>
          <Eyebrow>Obhliadka</Eyebrow>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Obhliadku si vypýta len prihlásený človek. Pri vypýtaní si vy dvaja
            navzájom odkryjete meno, telefón a e-mail — inak niet ako sa
            dohodnúť na termíne.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <ViewingCard
        propertyId={item.id}
        myId={myId}
        isOwner={isOwner}
        closed={closed}
        viewings={viewings}
        reload={reloadViewings}
      />

      {/* Kontakt odkrytý PRIJATOU PONUKOU. Je tu zámerne spolu s obhliadkou
          (Rastio, 12.8.2026): odkryť sa dá dvoma cestami a človek nemá čo
          hľadať, ktorou z nich to bolo. Zaujíma ho jedno — na koho zavolať. */}
      <AcceptedOfferContacts item={item} offers={offers} myId={myId} isOwner={isOwner} />
    </View>
  );
}

/**
 * Kontakt z PRIJATEJ ponuky. Majiteľ ho vidí na víťazného záujemcu, záujemca
 * na majiteľa — a rozhoduje o tom `offer_contact()` v databáze, nie tento
 * komponent. Mimo stavu ACCEPTED vráti prázdno aj samotným stranám.
 */
function AcceptedOfferContacts({
  item,
  offers,
  myId,
  isOwner,
}: {
  item: PropertyWithMedia;
  offers: Offer[] | undefined;
  myId: string;
  isOwner: boolean;
}) {
  const palette = useTheme();
  const [contacts, setContacts] = useState<Record<string, OfferContact>>({});

  const accepted = (offers ?? []).filter(
    (o) => o.status === 'ACCEPTED' && (isOwner || o.bidder_id === myId)
  );
  const key = accepted.map((o) => o.id).join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, OfferContact> = {};
      for (const id of key.split(',')) {
        try {
          const c = await fetchOfferContact(id);
          if (c) next[id] = c;
        } catch (e: unknown) {
          console.log(`[PONUKA] Kontakt nedostupný: ${errorText(e)}`);
        }
      }
      if (!cancelled) setContacts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (accepted.length === 0) return null;

  return (
    <Card>
      <Eyebrow>Kontakt z prijatej ponuky</Eyebrow>
      {accepted.map((o) => {
        const c = contacts[o.id];
        return (
          <View key={o.id} style={styles.item}>
            <Text style={[styles.status, { color: palette.textPrimary }]}>
              {isOwner
                ? `${o.bidder?.nickname ?? 'záujemca'} · ${formatAmount(o.amount, item.transaction_type)}`
                : `Predávajúci · moja ponuka ${formatAmount(o.amount, item.transaction_type)}`}
            </Text>
            {c ? (
              <View style={styles.grid}>
                <ParamCell value={c.nickname} label="Prezývka" />
                <ParamCell value={c.full_name ?? 'nevyplnené'} label="Meno" />
                <ParamCell value={c.phone ?? 'nevyplnený'} label="Telefón" />
                <ParamCell value={c.email ?? 'nedostupný'} label="E-mail" />
              </View>
            ) : (
              <Text style={[styles.note, { color: palette.textMuted }]}>Načítavam kontakt…</Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}

// ── HODNOTENIA ────────────────────────────────────────────────────────────

/**
 * ROZSAH: hodnotenia CELÉHO majiteľa, nie len z tohto inzerátu.
 *
 * Rozhodnutie (12.8.2026) a dôvod: hodnotenie je o ČLOVEKU, nie o veci.
 * Kto sa rozhoduje, či mu poslať peniaze, potrebuje vedieť, ako sa správal
 * v obchodoch celkovo. Per-inzerát by navyše skoro vždy ukázalo nula alebo
 * jedno hodnotenie — inzerát sa predá raz — takže by to bola sekcia, ktorá
 * vyzerá ako dôkaz dôveryhodnosti, ale nič nedokazuje. To je horšie než
 * žiadna. Hodnotenie sa síce ZADÁVA per obchod (a DB to tak aj drží), ale
 * ZOBRAZUJE sa zosumarizované za človeka.
 */
function RatingsTab({
  item,
  myId,
  isOwner,
  ownerSummary,
  winnerBidderId,
}: {
  item: PropertyWithMedia;
  myId: string | undefined;
  isOwner: boolean;
  ownerSummary: RatingSummary | undefined;
  winnerBidderId: string | undefined;
}) {
  const palette = useTheme();
  const nickname = item.owner?.nickname ?? 'predávajúci';

  return (
    <View style={styles.body}>
      {/* Hodnotenie sa zobrazí LEN keď to dovolí databáza (`can_rate`),
          takže sa obrazovka nemá ako opýtať na niečo, čo server odmietne. */}
      {item.status === 'CLOSED' ? (
        <RatingCard
          propertyId={item.id}
          rateeId={isOwner ? (winnerBidderId ?? null) : item.owner_id}
          rateeNickname={isOwner ? 'záujemcom' : nickname}
          myId={myId}
        />
      ) : null}

      <Reviews userId={item.owner_id} nickname={nickname} summary={ownerSummary} />

      <Text style={[styles.note, { color: palette.textMuted }]}>
        {isOwner
          ? 'Toto je tvoja povesť naprieč všetkými obchodmi, nie len týmto inzerátom — presne tak ju vidia aj záujemcovia.'
          : `Sú to hodnotenia ${nickname} zo VŠETKÝCH jeho obchodov, nie len z tohto inzerátu. Inzerát sa predá raz, povesť sa buduje dlhšie.`}
      </Text>
      {item.status !== 'CLOSED' ? (
        <Text style={[styles.note, { color: palette.textMuted }]}>
          Hodnotiť sa dá až po uzavretí obchodu, a len tí dvaja, ktorí ho spolu
          uzavreli.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  bar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabText: { ...Type.bodyMd },

  body: { gap: Spacing.md },
  note: { ...Type.bodyMd },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  item: { gap: Spacing.sm, marginTop: Spacing.sm },
  status: { ...Type.bodyLg },
});
