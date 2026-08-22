/**
 * OFFERRA — správy 1:1.
 *
 * Rozhodnutie Rastia 12.8.2026: appka dostáva chat. Do dnes ho zámerne
 * nemala a texty to hovorili nahlas — tie sa preto menia spolu s ním
 * (CLAUDE.md §8), inak by appka klamala o tom, ako funguje.
 *
 * VŽDY DVAJA. Vlákno neurčuje inzerát, ale DVOJICA ľudí pri ňom. Vlastník
 * má s každým záujemcom vlastnú konverzáciu a záujemcovia o sebe navzájom
 * nevedia. Drží to RLS `message_select_parties` v databáze, nie táto
 * vrstva — tá by sa dala obísť.
 *
 * IDENTITA OSTÁVA POD PREZÝVKOU. Chat je dostupný vždy, aj pred podaním
 * ponuky, ale sám osebe kontakt NEODKRÝVA. Odkrytie má appka naviazané na
 * prijatú ponuku a na obhliadku a chat to obchádzať nesmie — preto sa
 * v ňom kontaktné údaje ani nedajú napísať (`send_message` ich odmietne).
 */
import type { TFunc } from '@/i18n';

import { db } from './property';

export type Message = {
  id: string;
  property_id: string | null;
  request_id: string | null;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

/**
 * PREDMET vlákna — inzerát ALEBO dopyt, nikdy oboje. Rovnaké obmedzenie
 * ako `message_one_subject` v databáze; tento typ ho robí nevysloviteľným
 * aj v TypeScripte — nejde zostaviť subjekt s oboma poľami naraz.
 *
 * Pridané 13.8.2026 (Rastio: „pridaj chat aj pri dopytoch"). Dovtedy tu
 * bol `propertyId: string` natvrdo — mechanika je identická, mení sa len
 * to, ČO je predmetom rozhovoru.
 */
export type MessageSubject = { propertyId: string; requestId?: never } | { requestId: string; propertyId?: never };

function subjectIds(s: MessageSubject): { propertyId: string | null; requestId: string | null } {
  return 'propertyId' in s && s.propertyId
    ? { propertyId: s.propertyId, requestId: null }
    : { propertyId: null, requestId: (s as { requestId: string }).requestId };
}

export const MESSAGE_MAX = 2000;

/**
 * Rovnaký zákaz, aký drží databáza — TU LEN NA TO, aby človek nemusel
 * čakať na server, kým sa dozvie, že mu správa neprejde.
 *
 * NIE JE TO OCHRANA. Klienta obíde ktokoľvek s `curl`, a keby bola
 * kontrola len tu, chat by obišiel celý mechanizmus odkrývania kontaktu.
 * Skutočný strážca je `offerra.contact_in_text()` v databáze; táto funkcia
 * je jej kópia a keď sa niekedy rozídu, platí databáza.
 */
export function contactInText(text: string): 'email' | 'phone' | null {
  const t = (text ?? '').toLowerCase();

  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(t)) return 'email';
  if (/[a-z0-9._%+-]+\s*(\(at\)|\[at\]|\s+at\s+|zavinac|zavináč)\s*[a-z0-9.-]+\s*(\.|\s+bodka\s+)\s*[a-z]{2,}/.test(t)) {
    return 'email';
  }

  // Oddeľovače sa zahodia a pozerá sa na SÚVISLÉ skupiny číslic. „0902 123
  // 456" je tak jedno desaťciferné číslo, kým „3 izby, 78 m2" sú dve
  // krátke skupiny. Prah 9 je dĺžka slovenského čísla bez predvoľby.
  const zlepene = t.replace(/[\s\-./()]+/g, '');
  for (const skupina of zlepene.split(/[^0-9+]+/)) {
    if (skupina.replace(/[^0-9]/g, '').length >= 9) return 'phone';
  }
  return null;
}

/** Hláška, ktorú človek uvidí. Musí povedať, ČO prekáža aj KEDY kontakt dostane. */
export function contactBlockedText(t: TFunc, reason: 'email' | 'phone'): string {
  return t('messages.contactBlocked', {
    reason: reason === 'email' ? t('messages.reasonEmail') : t('messages.reasonPhone'),
  });
}

/**
 * Celé vlákno s JEDNÝM človekom pri jednom predmete (inzerát alebo dopyt).
 *
 * Filter na dvojicu je tu preto, aby vlastník nedostal do jedného vlákna
 * všetkých záujemcov naraz — RLS mu vlastné vlákna púšťa všetky, lebo
 * v každom z nich je stranou.
 */
export async function fetchThread(subject: MessageSubject, otherId: string): Promise<Message[]> {
  const { propertyId, requestId } = subjectIds(subject);
  let q = db().from('message').select('*');
  q = propertyId ? q.eq('property_id', propertyId) : q.eq('request_id', requestId as string);
  const { data, error } = await q
    .or(`sender_id.eq.${otherId},recipient_id.eq.${otherId}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

/** Odošle správu. Kontrolu kontaktu robí DATABÁZA — sem sa vráti jej hláška. */
export async function sendMessage(subject: MessageSubject, recipientId: string, content: string): Promise<Message> {
  const { propertyId, requestId } = subjectIds(subject);
  const { data, error } = await db().rpc('send_message', {
    p_property_id: propertyId,
    p_request_id: requestId,
    p_recipient: recipientId,
    p_content: content,
  });
  if (error) throw error;
  return data as Message;
}

/** Vráti, koľko správ sa naozaj označilo — nula znamená, že netreba nič načítavať. */
export async function markRead(subject: MessageSubject, otherId: string): Promise<number> {
  const { propertyId, requestId } = subjectIds(subject);
  const { data, error } = await db().rpc('mark_messages_read', {
    p_property_id: propertyId,
    p_other: otherId,
    p_request_id: requestId,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export type Thread = {
  otherId: string;
  last: Message;
  unread: number;
};

/**
 * Zoznam vlákien pri predmete — pre vlastníka (inzerátu alebo dopytu),
 * ktorý ich má viac.
 *
 * Zoskupuje sa TU, nie v databáze: RLS už na server-strane odfiltrovala
 * všetko, v čom nie som stranou, takže sem príde len to moje. Objem je
 * v ráde desiatok správ na jeden predmet.
 */
export async function fetchThreads(subject: MessageSubject, myId: string): Promise<Thread[]> {
  const { propertyId, requestId } = subjectIds(subject);
  let q = db().from('message').select('*');
  q = propertyId ? q.eq('property_id', propertyId) : q.eq('request_id', requestId as string);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;

  const byOther = new Map<string, Thread>();
  for (const m of (data ?? []) as Message[]) {
    const otherId = m.sender_id === myId ? m.recipient_id : m.sender_id;
    const t = byOther.get(otherId) ?? { otherId, last: m, unread: 0 };
    t.last = m;
    if (m.recipient_id === myId && !m.read_at) t.unread += 1;
    byOther.set(otherId, t);
  }
  return [...byOther.values()].sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}

/** Prezývky protistrán — vlastník potrebuje vedieť, s kým z nich píše. */
export async function fetchNicknames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data, error } = await db().from('profile').select('id,nickname').in('id', ids);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { id: string; nickname: string | null }[]) {
    if (r.nickname) map[r.id] = r.nickname;
  }
  return map;
}
