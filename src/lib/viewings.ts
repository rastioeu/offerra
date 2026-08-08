/**
 * OBHLIADKY — krok, ktorý v appke chýbal.
 *
 * Obhliadka je NEZÁVISLÁ od ponuky. Dá sa vyžiadať pred podaním ponuky aj
 * po ňom a obe poradia musia fungovať — preto vlastná tabuľka, nie stĺpec
 * na ponuke.
 *
 * KEDY SA ODKRÝVA KONTAKT: až keď majiteľ obhliadku POTVRDÍ, a vtedy obom
 * stranám. Nie pri žiadosti — inak by stačilo rozposlať žiadosti po celom
 * Slovensku a pozbierať telefónne čísla. Potvrdenie je ten súhlas:
 * majiteľ sa práve rozhodol pustiť si toho človeka domov. Drží to
 * `viewing_contact()` v databáze, nie skrytie v UI.
 */
import { db } from './property';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export type Viewing = {
  id: string;
  property_id: string;
  requester_id: string;
  proposed_time: string;
  confirmed_time: string | null;
  status: ViewingStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  /** Doplnené joinom — pri pohľade majiteľa. */
  requester?: { nickname: string } | null;
  /** Doplnené joinom — pri pohľade záujemcu. */
  property?: { id: string; title: string; city: string | null } | null;
};

export const VIEWING_STATUS_LABEL: Record<ViewingStatus, string> = {
  REQUESTED: 'Čaká na potvrdenie',
  CONFIRMED: 'Potvrdená',
  DECLINED: 'Zamietnutá',
  COMPLETED: 'Absolvovaná',
  CANCELLED: 'Zrušená',
};

/** Kontakt protistrany. Mimo CONFIRMED/COMPLETED vráti `null` — tak je to
 *  v databáze, nie len tu. */
export type ViewingContact = {
  nickname: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  /** Ulica inzerátu. Vidí ju len ten, kto na obhliadku ide. */
  street: string | null;
};

export async function fetchViewingContact(viewingId: string): Promise<ViewingContact | null> {
  const { data, error } = await db().rpc('viewing_contact', { p_viewing_id: viewingId });
  if (error) throw error;
  return ((data ?? []) as ViewingContact[])[0] ?? null;
}

export async function requestViewing(input: {
  propertyId: string;
  requesterId: string;
  proposedTime: Date;
  note: string | null;
}): Promise<void> {
  const { error } = await db().from('viewing').insert({
    property_id: input.propertyId,
    requester_id: input.requesterId,
    proposed_time: input.proposedTime.toISOString(),
    note: input.note,
  });
  if (error) throw error;
}

/** Majiteľ potvrdzuje. Smie posunúť čas — záujemca to buď príjme, alebo
 *  obhliadku zruší. */
export async function confirmViewing(id: string, at: Date): Promise<void> {
  const { error } = await db()
    .from('viewing')
    .update({ status: 'CONFIRMED', confirmed_time: at.toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function setViewingStatus(id: string, status: ViewingStatus): Promise<void> {
  const { error } = await db().from('viewing').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Kedy sa obhliadka koná — potvrdený čas má prednosť pred navrhnutým. */
export function viewingTime(v: Viewing): string {
  return v.confirmed_time ?? v.proposed_time;
}

export function formatViewingTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * „3 záujemcovia už boli na obhliadke" — signál pre majiteľa pri
 * rozhodovaní o ponukách. Ráta sa z riadkov, ktoré majiteľ aj tak vidí,
 * takže netreba zvláštny dotaz ani funkciu v databáze.
 */
export function completedCount(viewings: Viewing[]): number {
  return viewings.filter((v) => v.status === 'COMPLETED').length;
}
