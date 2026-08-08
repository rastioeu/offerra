/**
 * OFFERRA — obhliadky.
 *
 * Rozhodnutie Rastia 8.8.2026: appka termíny NENAVRHUJE a NEPOTVRDZUJE.
 * Jedno tlačidlo, kontakt sa odkryje OKAMŽITE obom stranám, čas a miesto
 * si ľudia dohodnú telefonicky. Preto tu nenájdeš `proposed_times` ani
 * `confirmed_time` — nechýbajú, v tomto toku nemajú čo znamenať.
 *
 * Na rozdiel od ponuky obhliadka VEREJNÁ NIE JE. Ponuka je súťaž a jej
 * suma patrí na oči všetkým; obhliadka je súkromná dohoda dvoch ľudí.
 */
import { db } from './property';

export type ViewingStatus = 'REQUESTED' | 'CONTACT_SHARED' | 'COMPLETED' | 'CANCELLED';

export type Viewing = {
  id: string;
  property_id: string;
  requester_id: string;
  status: ViewingStatus;
  created_at: string;
  updated_at: string;
};

/** Kontakt protistrany. Rovnaký tvar ako pri ponuke, len bez čakania. */
export type ViewingContact = {
  party: 'OWNER' | 'REQUESTER';
  nickname: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export const VIEWING_STATUS_LABEL: Record<ViewingStatus, string> = {
  REQUESTED: 'Požiadané',
  CONTACT_SHARED: 'Kontakty odkryté',
  COMPLETED: 'Po obhliadke',
  CANCELLED: 'Zrušená',
};

/**
 * Veta, ktorá musí byť pri tlačidle VIDNO PREDTÝM, než naň niekto klikne.
 * Je tu ako konštanta, nie zapísaná v obrazovke, aby sa nedala zmeniť na
 * jednom mieste a zabudnúť na druhom — je to podstata informovaného súhlasu.
 */
export const VIEWING_CONSENT =
  'Kliknutím sa tvoje meno, telefón a e-mail okamžite zobrazia majiteľovi ' +
  'inzerátu a jeho kontakt tebe. Termín si dohodnete telefonicky mimo aplikácie. ' +
  'Späť sa to vziať nedá.';

export async function requestViewing(propertyId: string, myId: string): Promise<Viewing> {
  const { data, error } = await db()
    .from('viewing')
    .insert({ property_id: propertyId, requester_id: myId, status: 'CONTACT_SHARED' })
    .select('id, property_id, requester_id, status, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as Viewing;
}

export async function fetchViewingContact(viewingId: string): Promise<ViewingContact | null> {
  const { data, error } = await db().rpc('viewing_contact', { p_viewing_id: viewingId });
  if (error) throw error;
  return ((data ?? []) as ViewingContact[])[0] ?? null;
}

export async function setViewingStatus(id: string, status: ViewingStatus): Promise<void> {
  const { error } = await db().from('viewing').update({ status }).eq('id', id);
  if (error) throw error;
}
