/**
 * Regresný test pre logiku platnosti ponuky (`src/lib/offer-validity.ts`) —
 * rovnaký vzor a rovnaký dôvod ako `check-deadline.ts` (CLAUDE.md §10):
 * appka stráca vizuálne veci TICHO, appka nespadne, typecheck prejde. Tento
 * skript overuje LOGIKU, nie DÁTA v databáze ani skutočný render na
 * obrazovke — to je 🟡 v registri.
 *
 * SPUSTENIE: `npx --yes tsx scripts/check-offer-validity.ts` (žiadna appka, žiadna databáza).
 */
import { isOfferExpired, offerCountdown, offerValidityDaysLabel } from '../src/lib/offer-validity';
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

// Pevný okamih pre celý test — inak by dva volania `Date.now()) o zlomok
// milisekundy od seba vedeli pri sekundovom odpočte (`HH:MM:SS`) zhodiť
// výsledok o jednu sekundu a test by bol falošne krehký.
const NOW = Date.now();
function inMs(ms: number): string {
  return new Date(NOW + ms).toISOString();
}

console.log('── isOfferExpired: živý čas MUSÍ rozhodovať, nie len status (race condition proti cronu) ──');
{
  check('PENDING + valid_until v budúcnosti → NIE JE expired', !isOfferExpired('PENDING', inMs(5 * 86_400_000), NOW), '');
  check('PENDING + valid_until v minulosti → JE expired (cron ešte nestihol prekrpiť status)', isOfferExpired('PENDING', inMs(-3_600_000), NOW), '');
  check('PENDING + valid_until = null (bez obmedzenia) → NIE JE expired', !isOfferExpired('PENDING', null, NOW), '');
  check('status = EXPIRED → JE expired aj keby valid_until chýbal', isOfferExpired('EXPIRED', null, NOW), '');
  check('ACCEPTED + valid_until v minulosti → JE expired (ponuka bola prijatá PRED tým, čo prešla)', isOfferExpired('ACCEPTED', inMs(-3_600_000), NOW), 'zámerne: appka Accept tlačidlo skryje LEN pre PENDING, toto je len čistá funkcia');
}

console.log('\n── offerCountdown: bez platnosti appka mlčí ──');
{
  const cd = offerCountdown(t, language, 'PENDING', null, NOW);
  check('valid_until = null → offerCountdown JE null', cd === null, `${JSON.stringify(cd)}`);
}

console.log('\n── offerCountdown: STUPŇOVITÝ odpočet (Rastio, 1.9.2026) ──');
{
  // ≥ 24 hodín → tier "days", text zložený z pluralizovaného počtu dní.
  const cd = offerCountdown(t, language, 'PENDING', inMs(10 * 86_400_000), NOW);
  check('10 dní → tier "days"', cd?.tier === 'days', `${JSON.stringify(cd)}`);
  check('10 dní → text "ostáva 10 dní"', cd?.text === 'ostáva 10 dní', `„${cd?.text}"`);
  check('10 dní → NIE JE urgent', cd?.urgent === false, `${JSON.stringify(cd)}`);
}
{
  // presne na hranici 24 h (86 400 s) → ešte "days" (deň 1), pod hranicou už "hm".
  const cd = offerCountdown(t, language, 'PENDING', inMs(86_400_000), NOW);
  check('presne 24 h → tier "days" (1 deň)', cd?.tier === 'days', `${JSON.stringify(cd)}`);
  check('presne 24 h → text "ostáva 1 deň"', cd?.text === 'ostáva 1 deň', `„${cd?.text}"`);
}
{
  // < 24 h, ≥ 1 h → tier "hm", formát „ostáva Xh Ym" — NIE dvojbodkový (Rastio,
  // 2.9.2026: „14:07" sa dá prečítať ako HODINA na hodinách, nie ako trvanie).
  const cd = offerCountdown(t, language, 'PENDING', inMs(5 * 3_600_000 + 7 * 60_000), NOW);
  check('5 h 7 min → tier "hm"', cd?.tier === 'hm', `${JSON.stringify(cd)}`);
  check('5 h 7 min → text "ostáva 5h 7m"', cd?.text === 'ostáva 5h 7m', `„${cd?.text}"`);
  check('5 h 7 min → NIE JE urgent', cd?.urgent === false, `${JSON.stringify(cd)}`);
}
{
  // presne na hranici 1 h (3 600 s) → ešte "hm" (posledná sekunda pred hms).
  const cd = offerCountdown(t, language, 'PENDING', inMs(3_600_000), NOW);
  check('presne 1 h → tier "hm" (ostáva 1h 0m)', cd?.tier === 'hm', `${JSON.stringify(cd)}`);
  check('presne 1 h → text "ostáva 1h 0m"', cd?.text === 'ostáva 1h 0m', `„${cd?.text}"`);
}
{
  // < 1 h, ≥ 1 min → tier "hms", formát „ostáva Xm Ys", tiká po sekundách, URGENT.
  const cd = offerCountdown(t, language, 'PENDING', inMs(47 * 60_000 + 32_000), NOW);
  check('47 min 32 s → tier "hms"', cd?.tier === 'hms', `${JSON.stringify(cd)}`);
  check('47 min 32 s → text "ostáva 47m 32s"', cd?.text === 'ostáva 47m 32s', `„${cd?.text}"`);
  check('47 min 32 s → JE urgent (zvýraznenie)', cd?.urgent === true, `${JSON.stringify(cd)}`);
}
{
  // < 1 min → tier "hms", ale BEZ "0m" — len „ostáva X s" (Rastio, 2.9.2026).
  const cd = offerCountdown(t, language, 'PENDING', inMs(38_000), NOW);
  check('38 s pred koncom → tier "hms" (posledná minúta)', cd?.tier === 'hms', `${JSON.stringify(cd)}`);
  check('38 s pred koncom → text "ostáva 38 s" (BEZ "0m")', cd?.text === 'ostáva 38 s', `„${cd?.text}"`);
}
{
  // pár sekúnd pred koncom → stále "hms", nie "expired" (ešte nie <= now).
  const cd = offerCountdown(t, language, 'PENDING', inMs(3_000), NOW);
  check('3 s pred koncom → tier "hms" (ostáva 3 s)', cd?.tier === 'hms' && cd.text === 'ostáva 3 s', `${JSON.stringify(cd)}`);
}
{
  // uplynutá platnosť (živo, status ešte PENDING) → tier "expired".
  const cd = offerCountdown(t, language, 'PENDING', inMs(-5 * 3_600_000), NOW);
  check('uplynutá platnosť → tier "expired"', cd?.tier === 'expired', `${JSON.stringify(cd)}`);
  check('uplynutá platnosť → text "Platnosť uplynula"', cd?.text === t('offerValidity.expired'), `„${cd?.text}"`);
  check('uplynutá platnosť → NIE JE urgent (už uplynulo, netreba tikať)', cd?.urgent === false, `${JSON.stringify(cd)}`);
}
{
  // Status EXPIRED musí dať rovnaký výsledok ako živo-uplynutá platnosť —
  // appka nesmie hovoriť dvoma rôznymi vetami o tej istej veci podľa toho,
  // či to stihol cron, alebo nie.
  const iso = inMs(-5 * 3_600_000);
  const byTime = offerCountdown(t, language, 'PENDING', iso, NOW);
  const byStatus = offerCountdown(t, language, 'EXPIRED', iso, NOW);
  check('rovnaký výsledok bez ohľadu na to, či expiráciu vidno zo status alebo z valid_until', JSON.stringify(byTime) === JSON.stringify(byStatus), `PENDING: ${JSON.stringify(byTime)} vs EXPIRED: ${JSON.stringify(byStatus)}`);
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
