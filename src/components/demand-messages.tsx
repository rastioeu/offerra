/**
 * Správy pri dopyte (Rastio, 13.8.2026: „pridaj chat aj pri dopytoch").
 *
 * ROVNAKÁ MECHANIKA ako pri inzeráte, len druhá strana je zadávateľ dopytu,
 * nie vlastník inzerátu. Znovupoužíva `Conversation` a `OwnerThreads`
 * z `message-thread.tsx` nezmenené — mení sa len `subject` (`requestId`
 * namiesto `propertyId`) a odkiaľ sa berú „tichí" ľudia, ktorí sa ozvali
 * inou cestou, ale v chate ešte nenapísali: pri inzeráte to boli ponuky,
 * tu sú to OSLOVENIA (`request_outreach`).
 *
 * IDENTITA OSTÁVA POD PREZÝVKOU, rovnako ako pri inzeráte — chat je
 * dostupný vždy, aj pred formálnym oslovením, ale sám kontakt neodkrýva.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, ErrorNote, Eyebrow } from '@/components/ui';
import { Conversation, OwnerThreads } from '@/components/message-thread';
import { useTheme } from '@/hooks/use-theme';
import { errorText } from '@/lib/errors';
import { fetchNicknames } from '@/lib/messages';
import { type Outreach } from '@/lib/offers';

export function DemandMessages({
  requestId,
  requestOwnerId,
  outreach,
  outreachError,
  myId,
  isMine,
}: {
  requestId: string;
  requestOwnerId: string;
  /** Kto tento dopyt oslovil svojím inzerátom — zdroj „tichých" ľudí pre vlastníka. */
  outreach: Outreach[];
  outreachError?: string | null;
  myId: string | undefined;
  /** Prihlásený je zadávateľ TOHTO dopytu. */
  isMine: boolean;
}) {
  const palette = useTheme();

  if (!myId) {
    return (
      <Card>
        <Eyebrow>Správy</Eyebrow>
        <Text style={{ color: palette.textMuted }}>
          Na písanie správ sa treba prihlásiť. Konverzácia je vždy len medzi tebou
          a druhou stranou — nikto iný ju nevidí.
        </Text>
      </Card>
    );
  }

  // ZÁUJEMCA (niekto s vlastným inzerátom, ktorý si dopyt prezerá) — jedno
  // vlákno so zadávateľom. Rovnaký dôvod ako pri inzeráte: pýtať sa dá
  // ešte PRED formálnym oslovením ("sedí ti presne toto, alebo aj...?").
  if (!isMine) {
    return (
      <View style={{ gap: 12 }}>
        <Conversation subject={{ requestId }} myId={myId} otherId={requestOwnerId} otherName="zadávateľom" />
      </View>
    );
  }

  return <DemandOwnerThreads requestId={requestId} outreach={outreach} outreachError={outreachError} myId={myId} />;
}

function DemandOwnerThreads({
  requestId,
  outreach,
  outreachError,
  myId,
}: {
  requestId: string;
  outreach: Outreach[];
  outreachError?: string | null;
  myId: string;
}) {
  // `Outreach` nenesie prezývku — appka ju pri oslovení nenačítava. Dotiahne
  // sa tu, nech „tichý" riadok v zozname vlákien ukáže meno, nie id. Zlyhanie
  // nie je kritické — riadok potom ukáže neutrálny popisok namiesto mena.
  const [names, setNames] = useState<Record<string, string>>({});
  const ids = [...new Set(outreach.map((o) => o.from_id))].sort().join(',');

  useEffect(() => {
    if (!ids) {
      setNames({});
      return;
    }
    let cancelled = false;
    void fetchNicknames(ids.split(','))
      .then((n) => {
        if (!cancelled) setNames(n);
      })
      .catch((e: unknown) => console.log(`[SPRÁVY] Prezývky oslovení sa nenačítali: ${errorText(e)}`));
    return () => {
      cancelled = true;
    };
  }, [ids]);

  // ZADÁVATEĽ — zoznam vlákien. „Tichí" sú tí, čo dopyt oslovili svojím
  // inzerátom, ale ešte nenapísali; vylúčení sú tí, s kým už oslovenie
  // rovno prešlo do chatu (`OwnerThreads` ich odfiltruje podľa existujúceho
  // vlákna).
  const silentEntries = outreach.map((o) => ({
    id: o.from_id,
    nickname: names[o.from_id] ?? 'Ten, kto ťa oslovil',
    note: 'Oslovil ťa svojím inzerátom, nepísali ste si. Ozvi sa prvý.',
  }));

  return (
    <View style={{ gap: 12 }}>
      <ErrorNote error={outreachError ?? null} />
      <OwnerThreads subject={{ requestId }} myId={myId} silentEntries={silentEntries} />
    </View>
  );
}
