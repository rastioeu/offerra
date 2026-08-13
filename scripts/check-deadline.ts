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
 * SPUSTENIE: `npm run check:deadline` (žiadna appka, žiadna databáza).
 * Zapadá do CLAUDE.md „veci, čo sa strácajú pri redizajne" — pred
 * označením akejkoľvek zmeny detailu/karty inzerátu za hotovú.
 */
import { deadlineLabel, deadlineUrgency, isDeadlinePassed, SOON_DAYS } from '../src/lib/deadline';

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
  const label = deadlineLabel(iso);
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
  const label = deadlineLabel(iso);
  const urg = deadlineUrgency(iso);
  check('uplynutá uzávierka → štítok stále NIE JE null (karta ho zobrazí ako fakt)',
    label !== null, `deadlineLabel = ${JSON.stringify(label)}`);
  check('uplynutá uzávierka → text "ukončený"', Boolean(label?.includes('ukončený')), `„${label}"`);
  check('uplynutá uzávierka → urgencia PASSED (sivý štítok)', urg === 'PASSED', `urgency = ${urg}`);
  check('isDeadlinePassed() súhlasí s deadlineUrgency()', isDeadlinePassed(iso) === true, `isDeadlinePassed = ${isDeadlinePassed(iso)}`);
}

{
  const iso = inHours(3);
  const label = deadlineLabel(iso);
  check('menej než deň → hodinový tvar, nie „0 dní"',
    Boolean(label && /o \d+ h/.test(label)), `„${label}"`);
}

console.log('\n── karta NESMIE nič vypísať, keď inzerát uzávierku NEMÁ ──');
{
  const label = deadlineLabel(null);
  const urg = deadlineUrgency(null);
  check('žiadna uzávierka → deadlineLabel je null (karta štítok nevykreslí)', label === null, `deadlineLabel = ${label}`);
  check('žiadna uzávierka → urgencia NONE', urg === 'NONE', `urgency = ${urg}`);
  check('žiadna uzávierka → isDeadlinePassed je false', isDeadlinePassed(null) === false, `isDeadlinePassed = ${isDeadlinePassed(null)}`);
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Countdown štítok na karte je pokazený.`);
  process.exit(1);
}
console.log('VŠETKO OK — logika countdown štítku je v poriadku.');
