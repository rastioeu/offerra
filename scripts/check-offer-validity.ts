/**
 * Regresný test pre logiku platnosti ponuky (`src/lib/offer-validity.ts`) —
 * rovnaký vzor a rovnaký dôvod ako `check-deadline.ts` (CLAUDE.md §10):
 * appka stráca vizuálne veci TICHO, appka nespadne, typecheck prejde. Tento
 * skript overuje LOGIKU, nie DÁTA v databáze ani skutočný render na
 * obrazovke — to je 🟡 v registri.
 *
 * SPUSTENIE: `npx --yes tsx scripts/check-offer-validity.ts` (žiadna appka, žiadna databáza).
 */
import { isOfferExpired, offerValidityLabel, offerValidityDaysLabel } from '../src/lib/offer-validity';
import skJson from '../src/i18n/locales/sk.json';

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

console.log('── isOfferExpired: živý čas MUSÍ rozhodovať, nie len status (race condition proti cronu) ──');
{
  check('PENDING + valid_until v budúcnosti → NIE JE expired', !isOfferExpired('PENDING', inDays(5)), '');
  check('PENDING + valid_until v minulosti → JE expired (cron ešte nestihol prekrpiť status)', isOfferExpired('PENDING', inHours(-1)), '');
  check('PENDING + valid_until = null (bez obmedzenia) → NIE JE expired', !isOfferExpired('PENDING', null), '');
  check('status = EXPIRED → JE expired aj keby valid_until chýbal', isOfferExpired('EXPIRED', null), '');
  check('ACCEPTED + valid_until v minulosti → JE expired (ponuka bola prijatá PRED tým, čo prešla)', isOfferExpired('ACCEPTED', inHours(-1)), 'zámerne: appka Accept tlačidlo skryje LEN pre PENDING, toto je len čistá funkcia');
}

console.log('\n── karta MUSÍ dostať text, keď má ponuka platnosť, a NIE keď nemá ──');
{
  const iso = inDays(10);
  const label = offerValidityLabel(t, language, 'PENDING', iso);
  check('budúca platnosť (10 dní) → label NIE JE null', label !== null, `offerValidityLabel = ${JSON.stringify(label)}`);
  check('text obsahuje "ostáva" a počet dní', Boolean(label && /ostáva 9 dní|ostáva 10 dní/.test(label)), `„${label}"`);
}
{
  const label = offerValidityLabel(t, language, 'PENDING', null);
  check('bez platnosti (valid_until = null) → label JE null (appka o platnosti mlčí)', label === null, `offerValidityLabel = ${label}`);
}
{
  const iso = inHours(-5);
  const label = offerValidityLabel(t, language, 'PENDING', iso);
  check('uplynutá platnosť → label stále NIE JE null (ukáže fakt)', label !== null, `„${label}"`);
  check('uplynutá platnosť → text "Platnosť uplynula"', label === t('offerValidity.expired'), `„${label}"`);
}
{
  const iso = inHours(3);
  const label = offerValidityLabel(t, language, 'PENDING', iso);
  check('menej než deň → hodinový tvar, nie „0 dní"', Boolean(label && /\d+ h/.test(label)), `„${label}"`);
}
{
  // Status EXPIRED musí dať rovnaký text ako živo-uplynutá platnosť —
  // appka nesmie hovoriť dvoma rôznymi vetami o tej istej veci podľa
  // toho, či to stihol cron, alebo nie.
  const iso = inHours(-5);
  const byTime = offerValidityLabel(t, language, 'PENDING', iso);
  const byStatus = offerValidityLabel(t, language, 'EXPIRED', iso);
  check('rovnaký text bez ohľadu na to, či expiráciu vidno zo status alebo z valid_until', byTime === byStatus, `PENDING: „${byTime}" vs EXPIRED: „${byStatus}"`);
}

console.log('\n── offerValidityDaysLabel: „1 dní" je gramaticky ZLE, picker ide od 1 dňa (Rastio, 27.8.2026) ──');
{
  for (const [days, want] of [[1, '1 deň'], [3, '3 dni'], [7, '7 dní'], [14, '14 dní'], [30, '30 dní']] as [number, string][]) {
    const got = offerValidityDaysLabel(t, language, days);
    check(`${days} → „${want}"`, got === want, `vyšlo „${got}"`);
  }
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Platnosť ponuky je pokazená.`);
  process.exit(1);
}
console.log('VŠETKO OK — logika platnosti ponuky je v poriadku.');
