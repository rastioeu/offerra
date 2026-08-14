/**
 * Node test bez appky/zariadenia pre `src/lib/gate.ts` (`decideRoute`).
 * Spusti: npx tsx scripts/check-gate.ts
 *
 * Existoval len komentár tvrdiaci pokrytie testom, žiadny skript v repe —
 * doplnené pri pridávaní walkthroughu (Rastio, 14.8.2026), aby brána, ktorá
 * appku už trikrát zaseknutým onboardingom prekvapila, mala skutočný test.
 */
import { decideRoute, type GateInput } from '../src/lib/gate';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL: ${name}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
  }
}

const base: GateInput = {
  session: undefined,
  profile: undefined,
  segment: undefined,
  profileError: false,
  notifOnboardedAt: null,
  walkthroughSeen: undefined,
};

// ── Session sa ešte nevie — nikdy nerozhoduj ──
check('session=undefined → čaká (null)', decideRoute({ ...base }) === null);

// ── Neprihlásený: walkthrough PRED loginom, len raz ──
check(
  'neprihlásený, walkthroughSeen=undefined → čaká (AsyncStorage sa ešte nenačítalo)',
  decideRoute({ ...base, session: null, walkthroughSeen: undefined }) === null
);
check(
  'neprihlásený, walkthroughSeen=false → /walkthrough',
  decideRoute({ ...base, session: null, walkthroughSeen: false }) === '/walkthrough'
);
check(
  'neprihlásený, walkthroughSeen=false, už na /walkthrough → nerobí nič (null)',
  decideRoute({ ...base, session: null, walkthroughSeen: false, segment: 'walkthrough' }) === null
);
check(
  'neprihlásený, walkthroughSeen=true → /login',
  decideRoute({ ...base, session: null, walkthroughSeen: true }) === '/login'
);
check(
  'neprihlásený, walkthroughSeen=true, už na /login → nerobí nič (null)',
  decideRoute({ ...base, session: null, walkthroughSeen: true, segment: 'login' }) === null
);

// ── Prihlásený: walkthrough sa už nikdy nepýta, aj keby bol walkthroughSeen=false ──
const loggedIn: GateInput = {
  ...base,
  session: { user: { id: 'u1' } },
  walkthroughSeen: false, // existujúci účet nikdy walkthrough nevidel — nesmie ho dostať DODATOČNE
};

check('prihlásený, profil=undefined → čaká', decideRoute({ ...loggedIn, profile: undefined }) === null);
check(
  'prihlásený, profil=null → /prezyvka (nie /walkthrough, aj keď walkthroughSeen=false)',
  decideRoute({ ...loggedIn, profile: null }) === '/prezyvka'
);
check(
  'prihlásený, profil existuje, bez notifOnboardedAt → /upozornenia',
  decideRoute({ ...loggedIn, profile: { id: 'p1' }, notifOnboardedAt: null }) === '/upozornenia'
);
check(
  'prihlásený, všetko hotové, na /login → /(tabs)',
  decideRoute({ ...loggedIn, profile: { id: 'p1' }, notifOnboardedAt: '2026-08-14', segment: 'login' }) === '/(tabs)'
);
check(
  'prihlásený, všetko hotové, na /walkthrough (edge case) → /(tabs)',
  decideRoute({ ...loggedIn, profile: { id: 'p1' }, notifOnboardedAt: '2026-08-14', segment: 'walkthrough' }) === '/(tabs)'
);
check(
  'prihlásený, všetko hotové, na inej obrazovke appky → nerobí nič (null)',
  decideRoute({ ...loggedIn, profile: { id: 'p1' }, notifOnboardedAt: '2026-08-14', segment: '(tabs)' }) === null
);

// ── Chyba profilu → vlastná obrazovka, nie onboarding ──
check(
  'prihlásený, profileError → čaká (null), nesmeruje na onboarding',
  decideRoute({ ...loggedIn, profile: undefined, profileError: true }) === null
);

console.log(`\n${pass}/${pass + fail} OK`);
if (fail > 0) process.exit(1);
