/**
 * Zdieľaný register Supabase Realtime kanálov — ČISTÁ vrstva.
 *
 * Tento súbor zámerne NEIMPORTUJE `supabase` (ani nič z Expa), aby sa dal
 * spustiť v Node a otestovať bez appky — rovnaký dôvod a rovnaký vzor ako
 * `deadline.ts` (§ CLAUDE.md 10). Klienta si vpichne volajúci; appka to
 * robí v `hooks/use-realtime-channel.ts`.
 *
 * ── PREČO TENTO SÚBOR VÔBEC EXISTUJE (Rastio, 17.8.2026) ────────────────
 *
 * Hláška `cannot add postgres_changes callbacks for realtime:… after
 * subscribe()` padla DRUHÝ raz — najprv v `NotificationBell` (8.8.2026),
 * teraz v editore inzerátu. Rastio preto žiadal architektonické riešenie,
 * nie tretiu záplatu.
 *
 * KOREŇOVÁ PRÍČINA (odmeraná v `realtime-js`, `RealtimeClient.channel()`):
 *
 *   const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
 *   if (!exists) { …vytvor nový… } else { return exists; }
 *
 * `supabase.channel(topic)` pri ROVNAKOM názve **nevracia nový kanál, ale
 * ten už existujúci — často už pripojený**. Ďalšie `.on()` naň potom padne.
 * Nie je to teda o poradí `.on()` / `.subscribe()` (to bolo na oboch
 * miestach správne od začiatku, v jednej reťazi) — je to o KOLÍZII NÁZVOV
 * medzi dvoma nezávislými vlastníkmi toho istého topicu.
 *
 * Ako to register vylučuje — tri veci naraz:
 *
 *  1. **`.on()` sa nedá napísať po `.subscribe()`.** Volajúci `.on()` ani
 *     `.subscribe()` nikdy nevidí; odovzdá odbery ako DÁTA (`bindings`) a
 *     reťaz zloží register — vždy v poradí všetky `.on()`, potom jeden
 *     `.subscribe()`. Nesprávne poradie sa nedá vyjadriť.
 *  2. **Jeden kanál na topic, s počítadlom odberateľov.** Druhý vlastník
 *     toho istého topicu už `.on()` NEVOLÁ — len pridá svoj callback do
 *     zoznamu existujúceho kanála. Presne to padalo.
 *  3. **Kanál sa zavrie až pri odchode POSLEDNÉHO odberateľa.** Pôvodný
 *     per-instance kód volal `removeChannel` pri každom unmounte, takže
 *     prvá odchádzajúca obrazovka vypla Realtime aj tej druhej, ktorá
 *     ostala visieť (druhá, tichá chyba toho istého vzoru).
 *
 * Názov skutočného kanála navyše obsahuje ODTLAČOK odberov, takže dva
 * rôzne odbery pod tým istým logickým topicom nikdy nesadnú na jeden
 * kanál — dostanú dva a oba fungujú.
 */

export type PgEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

/** Jeden odber zmien v tabuľke — presne to, čo `postgres_changes` čaká. */
export type PgBinding = {
  event: PgEvent;
  schema: string;
  table: string;
  /** napr. `id=eq.<uuid>`; bez filtra prichádzajú zmeny celej tabuľky. */
  filter?: string;
};

/** Stavy, ktoré posiela `.subscribe()`. Reťazec, nie enum — pochádza z knižnice. */
export type RealtimeStatus = string;

export type PgPayload = {
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  [k: string]: unknown;
};

/**
 * Minimum, ktoré register od klienta potrebuje. Vďaka tomu mu vie Node test
 * podstrčiť napodobeninu a overiť poradie volaní — bez siete a bez Expa.
 */
export type ChannelLike = {
  on(type: 'postgres_changes', cfg: PgBinding, cb: (payload: PgPayload) => void): ChannelLike;
  subscribe(cb: (status: RealtimeStatus) => void): ChannelLike;
};

export type ClientLike = {
  channel(topic: string): ChannelLike;
  removeChannel(ch: ChannelLike): unknown;
};

export type Subscription = {
  /** Logický názov, pod ktorým odberatelia kanál zdieľajú. */
  topic: string;
  bindings: PgBinding[];
  /** Zavolá sa pri každej zmene v DB, ktorá sedí na niektorý `binding`. */
  onChange: (payload: PgPayload) => void;
  /** Stav kanála. Nový odberateľ dostane hneď aj ten UŽ ZNÁMY stav. */
  onStatus?: (status: RealtimeStatus) => void;
  /** Predpona do logu, napr. `[DETAIL]`. Slúži len na čitateľnosť logu. */
  label?: string;
};

type Entry = {
  channel: ChannelLike | null;
  subscribers: Set<Subscription>;
  lastStatus: RealtimeStatus | null;
};

/**
 * Stabilný odtlačok odberov — poradie polí nesmie rozhodovať o tom, či dva
 * rovnaké odbery zdieľajú kanál, preto sa kľúče skladajú ručne a zoznam sa
 * triedi.
 */
export function bindingsKey(bindings: PgBinding[]): string {
  return bindings
    .map((b) => `${b.event}|${b.schema}.${b.table}|${b.filter ?? ''}`)
    .sort()
    .join(';');
}

/** Log — jeden tvar pre všetky kanály, nech sa dá v konzole filtrovať. */
function log(label: string | undefined, msg: string) {
  console.log(`${label ? `${label} ` : ''}[REALTIME] ${msg}`);
}

export function createRealtimeRegistry(client: ClientLike) {
  const entries = new Map<string, Entry>();

  /**
   * Prihlási odber a vráti funkciu na odhlásenie. Volať dvakrát tú istú
   * vrátenú funkciu je bezpečné (React vie cleanup zavolať opakovane).
   */
  function subscribe(sub: Subscription): () => void {
    // Kanál bez jediného odberu by sa pripojil a nikdy nič nedoručil —
    // tichá strata živých zmien. Poistka je TU, nie len v hooku, aby ju
    // nešlo obísť iným volajúcim (našel to `scripts/check-realtime.ts`).
    if (sub.bindings.length === 0) {
      log(sub.label, `odber ${sub.topic} bez jediného bindingu — kanál neotváram`);
      return () => {};
    }

    const key = `${sub.topic}::${bindingsKey(sub.bindings)}`;
    const existing = entries.get(key);

    if (existing) {
      // ── TU sa predtým padalo ──────────────────────────────────────────
      // Druhý vlastník toho istého topicu NEVOLÁ `.on()`. Iba pridá svoj
      // callback k už bežiacemu kanálu.
      existing.subscribers.add(sub);
      log(sub.label, `pripájam sa na existujúci kanál ${key} (odberateľov: ${existing.subscribers.size})`);
      // Nech nový odberateľ nečaká na stav, ktorý už dávno prišiel.
      if (existing.lastStatus !== null) {
        fanOutStatus([sub], existing.lastStatus);
      }
      return () => release(key, sub);
    }

    const entry: Entry = { channel: null, subscribers: new Set([sub]), lastStatus: null };
    entries.set(key, entry);
    log(sub.label, `otváram kanál ${key}`);

    // Reťaz sa skladá TU, a to je celá poistka: všetky `.on()` prebehnú
    // pred jediným `.subscribe()`, pretože inak sa tento kód nedá napísať.
    let chain = client.channel(key);
    for (const binding of sub.bindings) {
      chain = chain.on('postgres_changes', binding, (payload) => {
        // Kópia zoznamu — odberateľ sa smie odhlásiť vo svojom handleri.
        for (const s of [...entry.subscribers]) {
          try {
            s.onChange(payload);
          } catch (e: unknown) {
            // §2: žiadny tichý catch. Chyba jedného odberateľa nesmie
            // zhodiť ostatných, ale MUSÍ byť vidieť celá.
            log(s.label, `chyba v obsluhe zmeny na ${key}: ${String(e)}`);
          }
        }
      });
    }

    entry.channel = chain.subscribe((status) => {
      entry.lastStatus = status;
      log(sub.label, `stav kanála ${key}: ${status}`);
      fanOutStatus([...entry.subscribers], status);
    });

    return () => release(key, sub);
  }

  function fanOutStatus(subs: Subscription[], status: RealtimeStatus) {
    for (const s of subs) {
      try {
        s.onStatus?.(status);
      } catch (e: unknown) {
        log(s.label, `chyba v obsluhe stavu: ${String(e)}`);
      }
    }
  }

  function release(key: string, sub: Subscription) {
    const entry = entries.get(key);
    if (!entry || !entry.subscribers.has(sub)) return; // druhé zavolanie cleanupu
    entry.subscribers.delete(sub);

    if (entry.subscribers.size > 0) {
      log(sub.label, `odhlasujem sa z ${key}, kanál drží ${entry.subscribers.size} ďalších`);
      return;
    }

    // Posledný odberateľ — až teraz sa kanál naozaj zatvára.
    log(sub.label, `zatváram kanál ${key} (posledný odberateľ)`);
    entries.delete(key);
    if (entry.channel) client.removeChannel(entry.channel);
  }

  /** Len pre testy a diagnostiku — koľko kanálov a odberateľov práve žije. */
  function debugState() {
    return [...entries.entries()].map(([key, e]) => ({
      key,
      subscribers: e.subscribers.size,
      status: e.lastStatus,
    }));
  }

  return { subscribe, debugState };
}

export type RealtimeRegistry = ReturnType<typeof createRealtimeRegistry>;
