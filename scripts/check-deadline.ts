/**
 * Regresný test pre countdown štítok „Ponuky do… · ostáva X dní".
 *
 * PREČO EXISTUJE (Rastio, 13.8.2026): štítok na karte v katalógu zmizol
 * TRETÍ RAZ, hoci kód, ktorý oň zobrazenie žiada, bol pri všetkých troch
 * nahláseniach v poriadku. Príčinou nebola krehká podmienka v komponente —
 * bola to DÁTA, ktoré po každom veľkom preseedovaní katalógu (redizajn
 * 8.8, podtaby 12.8) nikto znova nenastavil, a nikto si to nevšimol skôr
 * než Rastio. Tento skript kontroluje LOGIKU (že karta správne zobrazí
 * štítok, keď má dostať uzávierku), nie DÁTA v databáze — dáta sa menia,
 * pravidlo pre zobrazenie nie.
 *
 * SPUSTENIE: `npx tsx scripts/check-deadline.ts` (žiadna appka, žiadna databáza).
 * Zapadá do CLAUDE.md „veci, čo sa strácajú pri redizajne" — pred
 * označením akejkoľvek zmeny detailu/karty inzerátu za hotovú.
 */
import {
  deadlineLabel,
  deadlineOutcome,
  deadlineUrgency,
  EXTEND_DAYS,
  extendedDeadline,
  isDeadlinePassed,
  SOON_DAYS,
} from '../src/lib/deadline';
import skJson from '../src/i18n/locales/sk.json';

/**
 * Lokálna napodobenina `t()` LEN pre tento test (19.8.2026, lokalizácia).
 * Číta priamo `sk.json` — žiadny import `src/i18n/index.tsx` (ten ťahá
 * `AsyncStorage`/React a rozbil by beh v holom Node, presne to, čomu sa
 * `deadline.ts` má vyhýbať). Test tak aj naďalej overuje SKUTOČNÝ
 * slovenský text, nie halucinovanú kópiu.
 */
type Locale = Record<string, Record<string, string>>;
function t(key: string, params?: Record<string, string | number>): string {
  const [domain, ...rest] = key.split('.');
  const k = rest.join('.');
  const raw = (skJson as Locale)[domain]?.[k];
  if (typeof raw !== 'string') return key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (m, name: string) => (params[name] != null ? String(params[name]) : m));
}
const language = 'sk';

let fails = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

function inDays(d: number): string {
  return new Date(Date.now() + d * 86_400_000).toISOString();
}
function inHours(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

console.log('── karta MUSÍ dostať text a farbu, keď má inzerát uzávierku ──');

// Toto je presne to, čo `PropertyCard` robí: ak je `deadline` (výstup
// `deadlineLabel`) pravdivý, vykreslí `PhotoBadge`. Test preto overuje
// TÚ ISTÚ podmienku, akú má komponent — `if (deadline || …)`.
{
  const iso = inDays(10);
  const label = deadlineLabel(t, language, iso);
  check('budúca uzávierka (10 dní) → štítok NIE JE null (karta by ho zobrazila)',
    label !== null, `deadlineLabel = ${JSON.stringify(label)}`);
  check('text obsahuje "ostáva" a počet dní',
    Boolean(label && /ostáva 9 dní|ostáva 10 dní/.test(label)), `„${label}"`);
}

{
  const iso = inDays(1.5);
  const urg = deadlineUrgency(iso);
  check(`< ${SOON_DAYS} dni → urgencia SOON (červený štítok)`, urg === 'SOON', `urgency = ${urg}`);
}

{
  const iso = inDays(SOON_DAYS + 1);
  const urg = deadlineUrgency(iso);
  check(`> ${SOON_DAYS} dni → urgencia OPEN (pokojná farba)`, urg === 'OPEN', `urgency = ${urg}`);
}

{
  const iso = inHours(-5);
  const label = deadlineLabel(t, language, iso);
  const urg = deadlineUrgency(iso);
  check('uplynutá uzávierka → štítok stále NIE JE null (karta ho zobrazí ako fakt)',
    label !== null, `deadlineLabel = ${JSON.stringify(label)}`);
  check('uplynutá uzávierka → text "ukončený"', Boolean(label?.includes('ukončený')), `„${label}"`);
  check('uplynutá uzávierka → urgencia PASSED (sivý štítok)', urg === 'PASSED', `urgency = ${urg}`);
  check('isDeadlinePassed() súhlasí s deadlineUrgency()', isDeadlinePassed(iso) === true, `isDeadlinePassed = ${isDeadlinePassed(iso)}`);
}

{
  const iso = inHours(3);
  const label = deadlineLabel(t, language, iso);
  check('menej než deň → hodinový tvar, nie „0 dní"',
    Boolean(label && /o \d+ h/.test(label)), `„${label}"`);
}

console.log('\n── karta NESMIE nič vypísať, keď inzerát uzávierku NEMÁ ──');
{
  const label = deadlineLabel(t, language, null);
  const urg = deadlineUrgency(null);
  check('žiadna uzávierka → deadlineLabel je null (karta štítok nevykreslí)', label === null, `deadlineLabel = ${label}`);
  check('žiadna uzávierka → urgencia NONE', urg === 'NONE', `urgency = ${urg}`);
  check('žiadna uzávierka → isDeadlinePassed je false', isDeadlinePassed(null) === false, `isDeadlinePassed = ${isDeadlinePassed(null)}`);
}

console.log('\n── ČO SA STANE PO UZÁVIERKE (Rastio, 17.8.2026) ──');
// Zmerané v dátach: dva ACTIVE inzeráty mali uzávierku prešlú 2 a 5 dní,
// sedeli v katalógu ako živé a majiteľovi to nikto nepovedal.
{
  const o = deadlineOutcome({ t, language, deadline: inDays(-2), active: true, offerCount: 3 });
  check(
    'prešlá uzávierka + inzerát STÁLE živý → majiteľ dostane otázku',
    o.kind === 'AWAITING_OWNER',
    `kind = ${o.kind}`,
  );
  if (o.kind === 'AWAITING_OWNER') {
    check('text hovorí, KEDY sa uzavreli a ako dávno', /uzavreli/.test(o.body) && /pred 2 dňami/.test(o.body), `„${o.body}"`);
    check('s ponukami je prvá cesta „vybrať z ponúk"', o.actions[0] === 'PICK_OFFER', o.actions.join(' · '));
    check('ponúka aj predĺžiť aj archivovať', o.actions.includes('EXTEND') && o.actions.includes('ARCHIVE'), o.actions.join(' · '));
    check('počet ponúk je v texte správne vyskloňovaný', /3 ponuky/.test(o.body), `„${o.body}"`);
  }
}
{
  // Veta znie „Máš …", takže po číslovke musí byť AKUZATÍV. Prvá verzia
  // dala „Máš 1 ponuka" — chybu našiel tento test, nie Rastio.
  for (const [n, tvar] of [[1, 'Máš 1 ponuku'], [2, 'Máš 2 ponuky'], [4, 'Máš 4 ponuky'], [5, 'Máš 5 ponúk'], [11, 'Máš 11 ponúk']] as [number, string][]) {
    const o = deadlineOutcome({ t, language, deadline: inDays(-1), active: true, offerCount: n });
    check(`${n} → „${tvar}"`, o.kind === 'AWAITING_OWNER' && o.body.includes(tvar), o.kind === 'AWAITING_OWNER' ? `„${o.body.split('.')[1]?.trim()}"` : o.kind);
  }
}
{
  const o = deadlineOutcome({ t, language, deadline: inDays(-5), active: true, offerCount: 0 });
  check(
    'BEZ ponúk sa „vybrať z ponúk" NEPONÚKA (viedlo by na prázdny zoznam)',
    o.kind === 'AWAITING_OWNER' && !o.actions.includes('PICK_OFFER'),
    o.kind === 'AWAITING_OWNER' ? o.actions.join(' · ') : o.kind,
  );
  check(
    'text bez ponúk to povie priamo',
    o.kind === 'AWAITING_OWNER' && /Nikto ponuku nepodal/.test(o.body),
    o.kind === 'AWAITING_OWNER' ? `„${o.body}"` : o.kind,
  );
}
{
  const o = deadlineOutcome({ t, language, deadline: inDays(10), active: true, offerCount: 1 });
  check('bežiaca uzávierka → žiadna výzva, len odpočet', o.kind === 'RUNNING', `kind = ${o.kind}`);
}
{
  const o = deadlineOutcome({ t, language, deadline: null, active: true, offerCount: 0 });
  check('inzerát bez uzávierky → žiadna výzva', o.kind === 'NONE', `kind = ${o.kind}`);
}
{
  // Uzavretý/archivovaný inzerát už nemá čo riešiť — výzva by strašila
  // pri niečom, čo je dávno vybavené.
  const o = deadlineOutcome({ t, language, deadline: inDays(-30), active: false, offerCount: 4 });
  check('inzerát, ktorý už nie je živý → žiadna výzva', o.kind === 'SETTLED', `kind = ${o.kind}`);
}
{
  const o = deadlineOutcome({ t, language, deadline: inHours(-2), active: true, offerCount: 1 });
  check(
    'uzávierka prešla dnes → „(dnes)", nie „pred 0 dňami"',
    o.kind === 'AWAITING_OWNER' && /\(dnes\)/.test(o.body),
    o.kind === 'AWAITING_OWNER' ? `„${o.body}"` : o.kind,
  );
}

console.log('\n── PREDĹŽENIE uzávierky ──');
{
  const now = Date.UTC(2026, 7, 17, 12, 0, 0);
  const iso = extendedDeadline(EXTEND_DAYS, now);
  const days = (new Date(iso).getTime() - now) / 86_400_000;
  check(`predlžuje presne o ${EXTEND_DAYS} dní ODO DNEŠKA`, days === EXTEND_DAYS, `nová uzávierka: ${iso}`);
  // Predĺžiť „o 7 dní" od PÔVODNÉHO termínu, ktorý prešiel pred 5 dňami, by
  // dalo 2 dni — to nikto nechce.
  const o = deadlineOutcome({ t, language, deadline: iso, active: true, offerCount: 0, now });
  check('po predĺžení uzávierka znovu BEŽÍ', o.kind === 'RUNNING', `kind = ${o.kind}`);
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Countdown štítok na karte je pokazený.`);
  process.exit(1);
}
console.log('VŠETKO OK — logika countdown štítku je v poriadku.');
