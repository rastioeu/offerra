/**
 * Regresný test zdieľaného Realtime registra (`src/lib/realtime.ts`).
 *
 * Spustenie:  npx --yes tsx scripts/check-realtime.ts
 * (`tsx` sa ZÁMERNE neinštaluje do `package.json` — menilo by to EAS
 *  fingerprint a odstrihlo OTA od buildu, viď CLAUDE.md §9 a incident
 *  13.8.2026. Preto `npx --yes`, nie `devDependencies`.)
 *
 * Test má cenu len preto, že napodobenina klienta sa chová PRESNE ako
 * `realtime-js` v tých dvoch vlastnostiach, ktoré pád spôsobili:
 *
 *   1. `channel(topic)` pri rovnakom názve vráti UŽ EXISTUJÚCI kanál,
 *   2. `.on('postgres_changes', …)` po `.subscribe()` HODÍ chybu s tou
 *      istou hláškou, akú Rastio videl na telefóne.
 *
 * Keby register prestal fungovať, tento test padne rovnako ako appka.
 */
import { createRealtimeRegistry, type ChannelLike, type ClientLike, type PgBinding, type PgPayload } from '../src/lib/realtime';

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  OK   ${name}${detail ? `\n        ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

// ── napodobenina realtime-js ────────────────────────────────────────────

type FakeChannel = ChannelLike & {
  topic: string;
  subscribed: boolean;
  bindings: PgBinding[];
  /** Poradie volaní, nech sa dá overiť, že `.on()` bolo pred `.subscribe()`. */
  calls: string[];
  emit(payload: PgPayload): void;
  emitStatus(status: string): void;
  statusCb: ((s: string) => void) | null;
  changeCbs: ((p: PgPayload) => void)[];
};

function createFakeClient() {
  const channels: FakeChannel[] = [];
  const removed: string[] = [];

  const client: ClientLike = {
    channel(topic: string) {
      // 1:1 s RealtimeClient.channel() — rovnaký názov = ten istý objekt.
      const exists = channels.find((c) => c.topic === topic);
      if (exists) return exists;

      const ch: FakeChannel = {
        topic,
        subscribed: false,
        bindings: [],
        calls: [],
        statusCb: null,
        changeCbs: [],
        on(_type, cfg, cb) {
          if (ch.subscribed) {
            // Presne tá hláška zo zariadenia.
            throw new Error(
              `cannot add postgres_changes callbacks for realtime:${topic} after subscribe()`
            );
          }
          ch.calls.push('on');
          ch.bindings.push(cfg);
          ch.changeCbs.push(cb);
          return ch;
        },
        subscribe(cb) {
          ch.calls.push('subscribe');
          ch.subscribed = true;
          ch.statusCb = cb;
          return ch;
        },
        emit(payload) {
          ch.changeCbs.forEach((cb) => cb(payload));
        },
        emitStatus(status) {
          ch.statusCb?.(status);
        },
      };
      channels.push(ch);
      return ch;
    },
    removeChannel(ch) {
      const c = ch as FakeChannel;
      removed.push(c.topic);
      const i = channels.indexOf(c);
      if (i >= 0) channels.splice(i, 1);
      return null;
    },
  };

  return { client, channels, removed };
}

const detailBinding = (id: string): PgBinding[] => [
  { event: 'UPDATE', schema: 'offerra', table: 'property', filter: `id=eq.${id}` },
];

console.log('='.repeat(60));
console.log('ZDIEĽANÝ REALTIME REGISTER — regresný test');
console.log('='.repeat(60));

// ── 1. presne ten pád, ktorý Rastio nahlásil ───────────────────────────
console.log('\n── PÁD, KTORÝ TO SPÔSOBILO: detail + editor s tým istým id ──');
{
  // Najprv dôkaz, že napodobenina vie pád vôbec vyrobiť — inak by test
  // nič nedokazoval (§1: dôkaz musí dokazovať to, čo tvrdí).
  const { client } = createFakeClient();
  let raw = '';
  try {
    const a = client.channel('property-9a0aac62');
    a.on('postgres_changes', detailBinding('9a0aac62')[0], () => {}).subscribe(() => {});
    // druhá obrazovka, ručne — starý kód
    const b = client.channel('property-9a0aac62');
    b.on('postgres_changes', detailBinding('9a0aac62')[0], () => {});
  } catch (e) {
    raw = String(e);
  }
  ok(
    'napodobenina vyrobí PÔVODNÝ pád (starý ručný kód)',
    raw.includes('after subscribe()'),
    raw || '(žiadna chyba — test by nič nedokazoval!)'
  );
}
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  const id = '9a0aac62';
  let detailReloads = 0;
  let editorReloads = 0;
  let crash = '';

  // detail obrazovka
  const offDetail = reg.subscribe({
    topic: `property-${id}`,
    bindings: detailBinding(id),
    label: '[DETAIL]',
    onChange: () => detailReloads++,
  });

  // klik na „Upraviť" — editor sa montuje, detail ZOSTÁVA namontovaný
  try {
    var offEditor = reg.subscribe({
      topic: `property-${id}`,
      bindings: detailBinding(id),
      label: '[EDITOR]',
      onChange: () => editorReloads++,
    });
  } catch (e) {
    crash = String(e);
  }

  ok('editor sa otvorí nad detailom BEZ pádu', crash === '', crash || 'žiadna chyba');
  ok('vznikol len JEDEN kanál, nie dva', channels.length === 1, `kanálov: ${channels.length}`);
  ok(
    '`.on()` bolo pred `.subscribe()` (poradie vynútené registrom)',
    channels[0].calls.join(',') === 'on,subscribe',
    `poradie volaní: ${channels[0].calls.join(' → ')}`
  );

  // zmena v DB musí prísť OBOM obrazovkám
  channels[0].emit({ eventType: 'UPDATE', new: { id } });
  ok(
    'zmena v DB dorazí OBOM obrazovkám naraz',
    detailReloads === 1 && editorReloads === 1,
    `detail: ${detailReloads}, editor: ${editorReloads}`
  );

  offEditor!();
  ok('odchod z editora kanál NEZATVORÍ (detail ho ešte drží)', channels.length === 1);
  channels[0].emit({ eventType: 'UPDATE', new: { id } });
  ok(
    'detail po odchode editora stále dostáva zmeny',
    detailReloads === 2 && editorReloads === 1,
    `detail: ${detailReloads}, editor: ${editorReloads}`
  );

  offDetail();
  ok('odchod POSLEDNEJ obrazovky kanál zatvorí', channels.length === 0);
}

// ── 2. štyri obrazovky s tým istým id (reálny strom appky) ─────────────
console.log('\n── štyri obrazovky s useProperty(id) naraz ──');
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  const id = 'abc';
  const offs: (() => void)[] = [];
  let crash = '';
  try {
    for (const label of ['[DETAIL]', '[EDITOR]', '[PONUKA]', '[PONUKY]']) {
      offs.push(reg.subscribe({ topic: `property-${id}`, bindings: detailBinding(id), label, onChange: () => {} }));
    }
  } catch (e) {
    crash = String(e);
  }
  ok('4 obrazovky, žiadny pád', crash === '', crash || 'žiadna chyba');
  ok('stále jeden kanál', channels.length === 1, `kanálov: ${channels.length}`);
  ok('register hlási 4 odberateľov', reg.debugState()[0]?.subscribers === 4, JSON.stringify(reg.debugState()));
  offs.forEach((o) => o());
  ok('po odchode všetkých je kanál zatvorený', channels.length === 0);
}

// ── 3. rôzne odbery pod tým istým topicom sa nesmú pomiešať ────────────
console.log('\n── rôzne odbery, ten istý logický topic ──');
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  let crash = '';
  try {
    reg.subscribe({ topic: 'x', bindings: [{ event: 'UPDATE', schema: 'offerra', table: 'property' }], onChange: () => {} });
    reg.subscribe({ topic: 'x', bindings: [{ event: 'INSERT', schema: 'offerra', table: 'offer' }], onChange: () => {} });
  } catch (e) {
    crash = String(e);
  }
  ok('rôzne odbery → vlastný kanál každému, bez pádu', crash === '' && channels.length === 2, `kanálov: ${channels.length} ${crash}`);
  ok(
    'názvy kanálov sa líšia odtlačkom odberov',
    new Set(channels.map((c) => c.topic)).size === 2,
    channels.map((c) => c.topic).join('  |  ')
  );
}

// ── 4. neskorý odberateľ nesmie ostať bez stavu ────────────────────────
console.log('\n── stav kanála pre neskoro pripojenú obrazovku ──');
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  reg.subscribe({ topic: 't', bindings: detailBinding('1'), onChange: () => {} });
  channels[0].emitStatus('SUBSCRIBED');
  let seen: string | null = null;
  reg.subscribe({ topic: 't', bindings: detailBinding('1'), onChange: () => {}, onStatus: (s) => (seen = s) });
  ok('neskorý odberateľ dostane UŽ ZNÁMY stav hneď', seen === 'SUBSCRIBED', `dostal: ${seen}`);

  let err: string | null = null;
  reg.subscribe({ topic: 't2', bindings: detailBinding('2'), onChange: () => {}, onStatus: (s) => (err = s) });
  channels.find((c) => c.topic.startsWith('t2'))!.emitStatus('CHANNEL_ERROR');
  ok('chyba kanála sa NEZAMLČÍ, ide volajúcemu (§2)', err === 'CHANNEL_ERROR', `dostal: ${err}`);
}

// ── 5. odolnosť: dvojitý cleanup a chyba v jednom handleri ─────────────
console.log('\n── odolnosť ──');
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  const a = reg.subscribe({ topic: 'r', bindings: detailBinding('1'), onChange: () => {} });
  const b = reg.subscribe({ topic: 'r', bindings: detailBinding('1'), onChange: () => {} });
  a();
  a(); // React smie cleanup zavolať dvakrát
  ok('dvojitý cleanup nezhodí kanál druhej obrazovky', channels.length === 1, `kanálov: ${channels.length}`);
  b();
  ok('po poslednom cleanupe je kanál zatvorený', channels.length === 0);
}
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  let second = 0;
  reg.subscribe({ topic: 'q', bindings: detailBinding('1'), label: '[ZLÝ]', onChange: () => { throw new Error('nech to padne'); } });
  reg.subscribe({ topic: 'q', bindings: detailBinding('1'), label: '[DOBRÝ]', onChange: () => second++ });
  let crash = '';
  try {
    channels[0].emit({ eventType: 'UPDATE' });
  } catch (e) {
    crash = String(e);
  }
  ok('chyba jednej obrazovky nezhodí ostatné', crash === '' && second === 1, `crash: ${crash || 'žiadny'}, druhý dostal: ${second}`);
}

// ── 6. vypnutý odber ───────────────────────────────────────────────────
console.log('\n── prázdne odbery ──');
{
  const { client, channels } = createFakeClient();
  const reg = createRealtimeRegistry(client);
  reg.subscribe({ topic: 'z', bindings: [], onChange: () => {} });
  ok('bez odberov sa kanál neotvára', channels.length === 0, `kanálov: ${channels.length}`);
}

console.log('\n' + '='.repeat(60));
console.log(fail === 0 ? `VŠETKO OK — ${pass}/${pass} kontrol prešlo.` : `${fail} KONTROL PADLO (${pass} OK).`);
console.log('='.repeat(60));
process.exit(fail === 0 ? 0 : 1);
