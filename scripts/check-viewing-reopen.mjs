/**
 * Overuje `guard_viewing_update()` / `on_viewing_decided()` po
 * `apply-viewing-reopen.mjs` — priamo na DB cez Management API, nie cez
 * appku (žiadny simulátor v tomto prostredí, §3).
 *
 * PREČO TAKTO: appka má LEN jeden demo účet (`EXPO_PUBLIC_DEMO_PASSWORD`),
 * takže dve strany (vlastník + záujemca) sa cez REST/PostgREST nedajú
 * naraz prihlásiť. Namiesto REST volaní táto kontrola spúšťa SQL priamo
 * a simuluje `auth.uid()` cez \`set local request.jwt.claim.sub\` —
 * `guard_viewing_update()` aj RLS na `viewing` čítajú TÚTO istú funkciu,
 * takže test reálne overuje tú istú autorizačnú logiku, akú appka spustí
 * cez PostgREST. Čo test NEDOKAZUJE: že appka to tlačidlo v UI naozaj
 * zobrazí a ťuknutie skutočne zavolá tento UPDATE — to je 🟡 v reporte.
 *
 * Používa REÁLNE seedované riadky (nie vymyslené), aby test nezávisel od
 * dát, ktoré sám vytvoril:
 *   viewing 5f52a28c-… — CANCELLED, requester Dlbvrai, property Martin
 *   viewing 680575a4-… — COMPLETED, iný requester, tá istá property
 * Na konci vracia testovaciu riadku do CANCELLED (funkčný stav ako pred
 * behom testu; `updated_at` sa prirodzene posunie — rovnaká poznámka ako
 * pri `check-storage-exposure.ts`).
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/check-viewing-reopen.mjs
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const PROPERTY_ID = 'a3a438b5-f86b-4fe8-9276-0ae2e69e8ae2'; // Martin, predaj
const OWNER_ID = 'cd32d6c1-03bb-4a00-b5f1-f6640ba2695a';
const REQUESTER_ID = '0a57c179-3ff4-48f3-acbc-37f534e17ff5'; // Dlbvrai
const OTHER_REQUESTER_ID = '4f52dc9e-386f-4ae1-94fb-aa0f0149e2b4'; // niekto iný, na test cudzieho reopenu
const CANCELLED_VIEWING_ID = '5f52a28c-74f3-46e8-9835-549d741659e5';
const COMPLETED_VIEWING_ID = '680575a4-2ebc-4f87-8420-96a247d90f2c';
const COMPLETED_REQUESTER_ID = '33fadff3-69a5-4b6f-9e62-cd6e554b8a05'; // skutočný žiadateľ tej riadky

let fails = 0;
function check(label, ok, detail) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? `\n        ${detail}` : ''}`);
  if (!ok) fails++;
}

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('CHYBA: chýba SUPABASE_ACCESS_TOKEN.');
    process.exit(2);
  }
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.text();
  if (!r.ok) return { ok: false, status: r.status, body };
  return { ok: true, status: 200, body: body ? JSON.parse(body) : null };
}

/** Jeden UPDATE ako konkrétny používateľ — SET LOCAL platí len v tejto dávke. */
async function updateAs(userId, viewingId, newStatus) {
  return sql(`
    begin;
    set local role authenticated;
    set local request.jwt.claim.sub = '${userId}';
    update offerra.viewing set status = '${newStatus}' where id = '${viewingId}';
    commit;
  `);
}

/**
 * Test musí byť opakovateľný AJ v tej istej hodine — inak by ho vlastný
 * cooldown z predošlého behu (bod 5) urobil neopakovateľný do 60 minút.
 * `viewing_touch` by explicitné `updated_at` prepísala na `now()`, preto
 * sa dočasne vypína (superuser, mimo `authenticated`, guard triggeru sa to
 * netýka — mení sa `updated_at`, nie `status`, takže by prešiel aj bez
 * vypnutia, ale `touch` prepíše hodnotu späť).
 */
async function resetCancelledRowToThePast() {
  await sql(`
    alter table offerra.viewing disable trigger viewing_touch;
    update offerra.viewing set updated_at = now() - interval '2 hours'
      where id = '${CANCELLED_VIEWING_ID}' and status = 'CANCELLED';
    alter table offerra.viewing enable trigger viewing_touch;
  `);
}

async function statusOf(viewingId) {
  const r = await sql(`select status, updated_at from offerra.viewing where id = '${viewingId}';`);
  return r.ok ? r.body[0] : null;
}

async function main() {
  if (process.argv.includes('--reset-only')) {
    await resetCancelledRowToThePast();
    console.log('Testovacia riadka resetnutá na `updated_at` = pred 2 hodinami.');
    return;
  }
  await resetCancelledRowToThePast();

  const before = await statusOf(CANCELLED_VIEWING_ID);
  console.log(`── stav pred testom: ${before.status} (viewing ${CANCELLED_VIEWING_ID}) ──`);
  if (before.status !== 'CANCELLED') {
    console.log('CHYBA: testovacia riadka nie je CANCELLED — test predpokladá tento stav. Zastavujem.');
    process.exit(2);
  }

  console.log('\n── 1. vlastník NESMIE reopenúť cudziu žiadosť ──');
  const ownerTry = await updateAs(OWNER_ID, CANCELLED_VIEWING_ID, 'REQUESTED');
  check(
    'vlastníkov pokus o CANCELLED → REQUESTED zamietnutý',
    !ownerTry.ok && /pôvodný záujemca/.test(ownerTry.body),
    ownerTry.ok ? 'prešlo — CHYBA, nemalo' : `zamietnuté: ${ownerTry.body.slice(0, 200)}`,
  );

  console.log('\n── 2. cudzí (iný) používateľ NESMIE reopenúť ──');
  // Lucia nie je ani vlastník, ani žiadateľ tejto riadky — RLS
  // (`viewing_update_parties`) ju preto vôbec neuvidí a UPDATE potichu
  // zasiahne 0 riadkov (žiadna výnimka, ale ani žiadna zmena). Trigger sa
  // teda vôbec nespustí — správny výsledok je „riadok sa nezmenil", nie
  // nutne chybová hláška.
  const strangerTry = await updateAs(OTHER_REQUESTER_ID, CANCELLED_VIEWING_ID, 'REQUESTED');
  const afterStranger = await statusOf(CANCELLED_VIEWING_ID);
  check(
    'cudzieho pokus o CANCELLED → REQUESTED nič nezmenil',
    afterStranger.status === 'CANCELLED',
    strangerTry.ok
      ? `HTTP OK, riadok ostal ${afterStranger.status} (RLS ho nepustila k triggeru — 0 riadkov update-nutých)`
      : `zamietnuté priamo: ${strangerTry.body.slice(0, 200)}`,
  );

  console.log('\n── 3. pôvodný záujemca SMIE požiadať znova ──');
  // Pevná časová značka spred akcie — porovnávanie dvoch „posledná minúta"
  // okien voči POHYBLIVÉMU `now()` je nespoľahlivé (posun okna medzi dvoma
  // dotazmi). Namiesto toho: čo pribudlo PO tomto presnom bode.
  const t0 = (await sql(`select now() as t;`)).body[0].t;
  const reopenTry = await updateAs(REQUESTER_ID, CANCELLED_VIEWING_ID, 'REQUESTED');
  const after1 = await statusOf(CANCELLED_VIEWING_ID);
  check(
    'CANCELLED → REQUESTED pôvodným záujemcom prešlo',
    reopenTry.ok && after1.status === 'REQUESTED',
    reopenTry.ok ? `stav je teraz ${after1.status}` : `HTTP odpoveď: ${reopenTry.body.slice(0, 300)}`,
  );

  console.log('\n── 4. vlastník dostal novú notifikáciu o žiadosti ──');
  const notifAfter = await sql(
    `select count(*)::int as n from offerra.notification where property_id = '${PROPERTY_ID}' and user_id = '${OWNER_ID}' and type = 'ZIADOST_O_OBHLIADKU' and created_at > '${t0}';`,
  );
  const after_n = notifAfter.ok ? notifAfter.body[0].n : -1;
  check('pribudla notifikácia ZIADOST_O_OBHLIADKU vlastníkovi', after_n >= 1, `nových od reopenu: ${after_n}`);

  console.log('\n── 5. cooldown: hneď znova zrušiť a reopenúť MUSÍ zlyhať ──');
  const cancelBack = await updateAs(REQUESTER_ID, CANCELLED_VIEWING_ID, 'CANCELLED');
  const immediateReopen = cancelBack.ok
    ? await updateAs(REQUESTER_ID, CANCELLED_VIEWING_ID, 'REQUESTED')
    : { ok: true, body: 'zrušenie samo zlyhalo, reopen sa neskúšal' };
  check(
    'okamžitý reopen po vlastnom zrušení je blokovaný (cooldown)',
    cancelBack.ok && !immediateReopen.ok && /nedávno zrušil/.test(immediateReopen.body),
    !cancelBack.ok
      ? `zrušenie naspäť zlyhalo: ${cancelBack.body.slice(0, 200)}`
      : immediateReopen.ok
        ? 'prešlo — CHYBA, malo byť blokované cooldownom'
        : `zamietnuté: ${immediateReopen.body.slice(0, 200)}`,
  );

  console.log('\n── 6. COMPLETED ostáva plne uzavreté (nezmenené touto opravou) ──');
  const completedBefore = await statusOf(COMPLETED_VIEWING_ID);
  // Musí ísť o SKUTOČNÉHO žiadateľa tejto riadky — inak RLS zopakuje presne
  // to, čo test 2 vyššie (0 riadkov, žiadna výnimka), a test by nedokázal nič.
  const completedTry =
    completedBefore.status === 'COMPLETED'
      ? await updateAs(COMPLETED_REQUESTER_ID, COMPLETED_VIEWING_ID, 'REQUESTED')
      : { ok: false, body: 'preskočené — testovacia riadka už nie je COMPLETED' };
  check(
    'COMPLETED → REQUESTED zamietnuté, presne ako predtým',
    completedBefore.status === 'COMPLETED' && !completedTry.ok && /už nemení/.test(completedTry.body),
    completedBefore.status !== 'COMPLETED'
      ? `testovacia riadka je teraz ${completedBefore.status}, nie COMPLETED`
      : completedTry.ok
        ? 'prešlo — CHYBA, nemalo'
        : `zamietnuté: ${completedTry.body.slice(0, 200)}`,
  );

  const final = await statusOf(CANCELLED_VIEWING_ID);
  console.log(`\n── upratané: testovacia riadka je teraz ${final.status} (funkčne ako pred behom) ──`);

  console.log('\n' + '='.repeat(60));
  if (fails > 0) {
    console.log(`ZLYHALO: ${fails} kontrol.`);
    process.exit(1);
  }
  console.log(`VŠETKO OK — reopen funguje presne podľa zadania.`);
}

void main();
