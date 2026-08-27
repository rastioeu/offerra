/**
 * Overuje DB časť „Platnosti ponuky" po `apply-offer-validity.mjs` — priamo
 * na DB cez Management API, nie cez appku (žiadny simulátor v tomto
 * prostredí, §3). Rovnaký vzor ako `check-viewing-reopen.mjs`.
 *
 * PREČO SYNTETICKÁ PONUKA, NIE EXISTUJÚCI RIADOK: na rozdiel od
 * `check-viewing-reopen.mjs` (kde sa dala reálna CANCELLED obhliadka
 * bezpečne vrátiť do pôvodného stavu), tu potrebujeme ponuku s `valid_until`
 * V MINULOSTI — taká medzi seedmi neexistuje a vyrábať si ju na existujúcom
 * riadku by znamenalo natrvalo zmeniť dáta niekoho iného. Skript preto:
 *   1. vyberie SKUTOČNÝ seed inzerát + seed biddera bez živej ponuky medzi nimi,
 *   2. vloží testovaciu ponuku priamo (mimo RLS, ako `postgres`) s dočasne
 *      vypnutými triggermi `offer_notify_insert`/`trg_offer_rate_limit`
 *      (nech test neposiela skutočnému seed vlastníkovi push o „novej
 *      ponuke", ktorá nie je skutočná — rovnaký dôvod, prečo
 *      `check-viewing-reopen.mjs` dočasne vypína `viewing_touch`),
 *   3. na konci testovaciu ponuku aj jej notifikáciu ZMAŽE — nie len
 *      resetne, lebo žiadny „pôvodný stav" pre ňu neexistuje.
 *
 * SPUSTENIE: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/check-offer-validity-db.mjs
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

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

async function updateAs(userId, offerId, patch) {
  const set = Object.entries(patch).map(([k, v]) => `${k} = ${v === null ? 'null' : `'${v}'`}`).join(', ');
  return sql(`
    begin;
    set local role authenticated;
    set local request.jwt.claim.sub = '${userId}';
    update offerra.property_offer set ${set} where id = '${offerId}';
    commit;
  `);
}

async function statusOf(offerId) {
  const r = await sql(`select status, valid_until from offerra.property_offer where id = '${offerId}';`);
  return r.ok ? r.body[0] : null;
}

async function main() {
  console.log('── príprava: reálny seed inzerát + seed bidder bez živej ponuky ──');
  const cand = await sql(`
    select p.id as property_id, p.owner_id, pr.id as bidder_id
    from offerra.property p
    join offerra.profile pr on pr.id <> p.owner_id and pr.is_seed = true
    where p.status = 'ACTIVE' and p.is_seed = true
      and not exists (
        select 1 from offerra.property_offer o
        where o.property_id = p.id and o.bidder_id = pr.id and o.status = 'PENDING'
      )
    limit 1;
  `);
  if (!cand.ok || cand.body.length === 0) {
    console.log('CHYBA: nenašiel som vhodný seed pár (inzerát + bidder). Zastavujem.');
    process.exit(2);
  }
  const { property_id: PROPERTY_ID, owner_id: OWNER_ID, bidder_id: BIDDER_ID } = cand.body[0];
  console.log(`  property ${PROPERTY_ID}, owner ${OWNER_ID}, bidder ${BIDDER_ID}`);

  console.log('\n── vkladám testovaciu ponuku (valid_until pred hodinou, PENDING) ──');
  await sql(`alter table offerra.property_offer disable trigger offer_notify_insert;`);
  await sql(`alter table offerra.property_offer disable trigger trg_offer_rate_limit;`);
  const ins = await sql(`
    insert into offerra.property_offer (property_id, bidder_id, amount, status, valid_until)
    values ('${PROPERTY_ID}', '${BIDDER_ID}', 1, 'PENDING', now() - interval '1 hour')
    returning id;
  `);
  await sql(`alter table offerra.property_offer enable trigger offer_notify_insert;`);
  await sql(`alter table offerra.property_offer enable trigger trg_offer_rate_limit;`);
  if (!ins.ok) {
    console.log(`CHYBA: vloženie testovacej ponuky zlyhalo: ${ins.body}. Zastavujem.`);
    process.exit(2);
  }
  const OFFER_ID = ins.body[0].id;
  console.log(`  testovacia ponuka ${OFFER_ID}`);

  try {
    console.log('\n── 1. majiteľ NESMIE prijať ponuku, ktorej platnosť už uplynula (živý čas, nie cron) ──');
    const acceptTry = await updateAs(OWNER_ID, OFFER_ID, { status: 'ACCEPTED' });
    const afterAccept = await statusOf(OFFER_ID);
    check(
      'ACCEPT na expirovanú ponuku zamietnutý, stav ostal PENDING',
      !acceptTry.ok && afterAccept.status === 'PENDING' && /[Pp]latnos/.test(acceptTry.body),
      acceptTry.ok ? `prešlo — CHYBA, nemalo (stav: ${afterAccept.status})` : `zamietnuté: ${acceptTry.body.slice(0, 200)}`,
    );

    console.log('\n── 2. anon SMIE čítať valid_until (stĺpcový grant) ──');
    const anonRead = await sql(`
      begin;
      set local role anon;
      select valid_until from offerra.property_offer where id = '${OFFER_ID}';
      commit;
    `);
    check('anon SELECT valid_until prešiel bez 42501', anonRead.ok, anonRead.ok ? undefined : anonRead.body.slice(0, 300));

    console.log('\n── 3. offerra.expire_offers() preklopí PENDING + prešlé valid_until na EXPIRED ──');
    const t0 = (await sql(`select now() as t;`)).body[0].t;
    const expireRun = await sql(`select offerra.expire_offers() as n;`);
    const afterExpire = await statusOf(OFFER_ID);
    check(
      'expire_offers() nahlásil aspoň 1 zmenenú ponuku',
      expireRun.ok && expireRun.body[0].n >= 1,
      expireRun.ok ? `n = ${expireRun.body[0].n}` : expireRun.body.slice(0, 200),
    );
    check('testovacia ponuka je teraz EXPIRED', afterExpire.status === 'EXPIRED', `status = ${afterExpire.status}`);

    console.log('\n── 4. bidder dostal notifikáciu PONUKA_EXPIROVANA ──');
    const notif = await sql(
      `select count(*)::int as n from offerra.notification where offer_id = '${OFFER_ID}' and user_id = '${BIDDER_ID}' and type = 'PONUKA_EXPIROVANA' and created_at > '${t0}'::timestamptz - interval '5 seconds';`,
    );
    check('notifikácia existuje', notif.ok && notif.body[0].n >= 1, notif.ok ? `n = ${notif.body[0].n}` : notif.body.slice(0, 200));

    console.log('\n── 5. majiteľ NESMIE prijať ani teraz EXPIRED ponuku ──');
    const acceptTry2 = await updateAs(OWNER_ID, OFFER_ID, { status: 'ACCEPTED' });
    const afterAccept2 = await statusOf(OFFER_ID);
    check(
      'ACCEPT na EXPIRED ponuku zamietnutý',
      !acceptTry2.ok && afterAccept2.status === 'EXPIRED',
      acceptTry2.ok ? `prešlo — CHYBA, nemalo (stav: ${afterAccept2.status})` : `zamietnuté: ${acceptTry2.body.slice(0, 200)}`,
    );

    console.log('\n── 6. bidder NESMIE nastaviť platnosť do minulosti (nová PENDING ponuka) ──');
    await sql(`alter table offerra.property_offer disable trigger offer_notify_insert;`);
    await sql(`alter table offerra.property_offer disable trigger trg_offer_rate_limit;`);
    const badInsert = await sql(`
      begin;
      set local role authenticated;
      set local request.jwt.claim.sub = '${BIDDER_ID}';
      insert into offerra.property_offer (property_id, bidder_id, amount, status, valid_until)
      values ('${PROPERTY_ID}', '${BIDDER_ID}', 1, 'PENDING', now() - interval '1 hour');
      commit;
    `);
    await sql(`alter table offerra.property_offer enable trigger offer_notify_insert;`);
    await sql(`alter table offerra.property_offer enable trigger trg_offer_rate_limit;`);
    check(
      'INSERT s valid_until v minulosti zamietnutý (RLS offer_insert_own)',
      !badInsert.ok,
      badInsert.ok ? 'prešlo — CHYBA, RLS to malo zamietnuť' : `zamietnuté: ${badInsert.body.slice(0, 200)}`,
    );
  } finally {
    console.log('\n── upratávanie: mazanie testovacej ponuky a jej notifikácie ──');
    await sql(`delete from offerra.notification where offer_id = '${OFFER_ID}';`);
    await sql(`delete from offerra.property_offer where id = '${OFFER_ID}';`);
    // Bod 6 mohol (pri neúspechu testu) reálne vložiť druhú ponuku — tú istú
    // dvojicu vyčistíme tiež, nech seed dáta ostanú presne také, aké boli.
    await sql(`delete from offerra.property_offer where property_id = '${PROPERTY_ID}' and bidder_id = '${BIDDER_ID}' and amount = 1;`);
    console.log('  hotovo — seed dáta sú v pôvodnom stave.');
  }

  console.log('\n' + '='.repeat(60));
  if (fails > 0) {
    console.log(`ZLYHALO: ${fails} kontrol.`);
    process.exit(1);
  }
  console.log('VŠETKO OK — platnosť ponuky funguje presne podľa zadania.');
}

void main();
