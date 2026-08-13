/**
 * OFFERRA — obhliadky.
 *
 * MENÍ ROZHODNUTIE Z 8.8.2026 (Rastio, 13.8.2026). Dovtedy „Chcem
 * obhliadku" odkrylo kontakt OKAMŽITE. Teraz je tam medzikrok: žiadosť
 * vznikne ako `REQUESTED` (pod prezývkou, bez kontaktu), vlastník ju
 * v tabe Obhliadka POTVRDÍ alebo ZAMIETNE, a až potvrdením (`CONFIRMED`)
 * sa kontakt odkryje OBOM stranám naraz — rovnaký mechanizmus ako pri
 * prijatí ponuky. Appka ĎALEJ NENAVRHUJE ani nepotvrdzuje TERMÍNY — to
 * zostáva na telefonáte mimo appky, mení sa len to, KEDY sa odkryje
 * kontakt, nie AKO sa dohodne stretnutie.
 *
 * `CONTACT_SHARED` ostáva ako platný stav pre RIADKY SPRED TEJTO ZMENY —
 * kontakt, ktorý si dvaja ľudia už reálne vymenili, sa spätne neschováva.
 * Nové žiadosti už tento stav nikdy nedostanú.
 *
 * Na rozdiel od ponuky obhliadka VEREJNÁ NIE JE. Ponuka je súťaž a jej
 * suma patrí na oči všetkým; obhliadka je súkromná dohoda dvoch ľudí.
 */
import { db } from './property';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'CONTACT_SHARED' | 'COMPLETED' | 'CANCELLED';

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
  REQUESTED: 'Čaká na potvrdenie',
  CONFIRMED: 'Potvrdená — kontakt odkrytý',
  CONTACT_SHARED: 'Kontakty odkryté',
  COMPLETED: 'Po obhliadke',
  CANCELLED: 'Zrušená',
};

/**
 * Veta, ktorá musí byť pri tlačidle VIDNO PREDTÝM, než naň niekto klikne.
 * Je tu ako konštanta, nie zapísaná v obrazovke, aby sa nedala zmeniť na
 * jednom mieste a zabudnúť na druhom — je to podstata informovaného súhlasu.
 *
 * PREPÍSANÉ 13.8.2026 — predtým sľubovala OKAMŽITÉ odkrytie. Teraz je
 * pravda iná: žiadosť ide vlastníkovi a kontakt sa odkryje AŽ PO jeho
 * potvrdení. Veta, ktorá by tu klamala o mechanike, je horšia než žiadna.
 */
export const VIEWING_CONSENT =
  'Vlastník uvidí tvoju žiadosť pod prezývkou a po potvrdení sa vám navzájom zobrazí kontakt ' +
  '— meno, telefón aj e-mail. Termín si potom dohodnete telefonicky mimo aplikácie.';

export async function requestViewing(propertyId: string, myId: string): Promise<Viewing> {
  const { data, error } = await db()
    .from('viewing')
    .insert({ property_id: propertyId, requester_id: myId, status: 'REQUESTED' })
    .select('id, property_id, requester_id, status, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as Viewing;
}

/** Potvrdí žiadosť — SMIE výhradne vlastník inzerátu, presadzuje to DB (§ komentár vyššie). */
export async function confirmViewing(id: string): Promise<void> {
  const { error } = await db().from('viewing').update({ status: 'CONFIRMED' }).eq('id', id);
  if (error) throw error;
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
