/**
 * Zrušená/odmietnutá obhliadka bol mŕtvy stav — nedalo sa požiadať znova
 * (Rastio, 19.8.2026, screenshot). `guard_viewing_update()` mal blanket
 * blok „uzavretá sa nemení" na CANCELLED aj COMPLETED naraz, žiadna cesta
 * von.
 *
 * OPRAVA NIE JE nový INSERT — `viewing` má `unique (property_id,
 * requester_id)`, takže druhá žiadosť na ten istý inzerát od toho istého
 * záujemcu je vždy UPDATE tej istej riadky, nikdy nový riadok. „Nová
 * žiadosť" preto znamená CANCELLED → REQUESTED na existujúcej riadke —
 * COMPLETED ostáva plne uzavreté (nezmenené).
 *
 * Mení DVE funkcie cez rovnakú cestu ako všetky doterajšie DB zmeny
 * (Management API, nie psql — CLAUDE.md §4):
 *
 * 1. `guard_viewing_update()` — povolí CANCELLED → REQUESTED, ale LEN
 *    pôvodnému záujemcovi (nie vlastníkovi), s rovnakou kontrolou
 *    blokovania ako pri prvej žiadosti (`offerra.is_blocked()`) a
 *    cooldownom proti spamu: reopen sa nesmie zopakovať skôr, než ubehne
 *    `rate_limit_viewings_window_minutes` od posledného zrušenia (rovnaký
 *    admin-nastaviteľný prah ako pri INSERTe — `trg_viewing_rate_limit`
 *    beží len na INSERT a tento krok by inak vôbec nevidel, lebo ide
 *    o UPDATE existujúcej riadky).
 * 2. `on_viewing_decided()` — pri reopene pošle vlastníkovi notifikáciu
 *    `ZIADOST_O_OBHLIADKU`, rovnakého typu ako pri prvej žiadosti
 *    (`on_viewing_insert()`), inak by o novej žiadosti nevedel.
 *
 * SPUSTENIE
 * ---------
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-viewing-reopen.mjs
 *
 * Skript je IDEMPOTENTNÝ (CREATE OR REPLACE). Token sa berie LEN
 * z prostredia, do repa sa nikdy nezapisuje (§4, `rastioeu/offerra` je
 * verejný).
 *
 * PO SPUSTENÍ over: `node scripts/check-viewing-reopen.mjs` (rovnaký token).
 */
const PROJECT_REF = 'vxqvpgzwefcehugmhaft';
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const GUARD_SQL = `
create or replace function offerra.guard_viewing_update()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'public', 'pg_temp'
as $function$
declare
  v_owner uuid;
  v_actor uuid := auth.uid();
  v_window int;
begin
  if new.property_id  is distinct from old.property_id  then
    raise exception 'Obhliadku nemožno presunúť na iný inzerát.' using errcode='42501';
  end if;
  if new.requester_id is distinct from old.requester_id then
    raise exception 'Obhliadku nemožno prepísať na iného záujemcu.' using errcode='42501';
  end if;
  if new.created_at   is distinct from old.created_at   then
    raise exception 'Dátum vzniku obhliadky sa nemení.' using errcode='42501';
  end if;

  if old.status = 'COMPLETED' and new.status is distinct from old.status then
    raise exception 'Uzavretá obhliadka sa už nemení.' using errcode='42501';
  end if;

  -- ZRUŠENÁ/ODMIETNUTÁ obhliadka NIE JE mŕtvy stav (Rastio, 19.8.2026):
  -- pôvodný záujemca smie požiadať znova. \`unique (property_id,
  -- requester_id)\` nedovolí nový INSERT na ten istý pár, takže „nová
  -- žiadosť" je táto istá riadka: CANCELLED → REQUESTED, nie nový riadok.
  -- Preto to (a) smie spustiť LEN pôvodný záujemca, nie vlastník,
  -- (b) prechádza rovnakou kontrolou blokovania ako INSERT
  -- (\`viewing_insert_own\`), a (c) je rate-limitované rovnakým prahom ako
  -- prvá žiadosť — \`trg_viewing_rate_limit\` beží len na INSERT, tento krok
  -- nevidí, lebo ide o UPDATE existujúcej riadky.
  if old.status = 'CANCELLED' and new.status is distinct from old.status then
    if new.status <> 'REQUESTED' then
      raise exception 'Zrušenú obhliadku možno len znova požiadať.' using errcode='42501';
    end if;
    if v_actor is distinct from old.requester_id then
      raise exception 'Novú žiadosť môže podať len pôvodný záujemca.' using errcode='42501';
    end if;
    if offerra.is_blocked() then
      raise exception 'Tento účet nemôže momentálne žiadať o obhliadky.' using errcode='42501';
    end if;
    select value::int into v_window from offerra.app_config where key = 'rate_limit_viewings_window_minutes';
    if v_window is not null and old.updated_at > now() - (v_window || ' minutes')::interval then
      raise exception 'Túto obhliadku si nedávno zrušil/zamietol. Skús požiadať znova o chvíľu.' using errcode = 'P0429';
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  select p.owner_id into v_owner from offerra.property p where p.id = old.property_id;

  if old.status = 'REQUESTED' then
    if new.status = 'CONFIRMED' then
      -- JEDINÁ cesta k odkrytiu kontaktu — a smie ju spustiť VÝHRADNE
      -- vlastník. Bez tejto podmienky by si requester vedel kontakt
      -- odomknúť sám priamym UPDATE-om.
      if v_actor is distinct from v_owner then
        raise exception 'Žiadosť o obhliadku môže potvrdiť len vlastník inzerátu.' using errcode='42501';
      end if;
    elsif new.status = 'CANCELLED' then
      -- Zrušiť/odmietnuť ešte NEPOTVRDENÚ žiadosť smie majiteľ (odmietnutie)
      -- aj sám žiadateľ (stiahnutie) — rovnaký princíp ako stiahnutie
      -- ponuky. Kontakt sa v tomto stave nikdy neodkryl, niet čo stratiť.
      if v_actor is distinct from v_owner and v_actor is distinct from old.requester_id then
        raise exception 'Túto žiadosť nemôžeš meniť.' using errcode='42501';
      end if;
    else
      raise exception 'Nepotvrdenú žiadosť možno len potvrdiť alebo zrušiť.' using errcode='42501';
    end if;

  elsif old.status in ('CONFIRMED','CONTACT_SHARED') then
    -- Po odkrytí kontaktu (nový aj legacy stav) smú OBAJA označiť
    -- za absolvovanú alebo zrušenú — presne ako doteraz.
    if v_actor is distinct from v_owner and v_actor is distinct from old.requester_id then
      raise exception 'Túto obhliadku nemôžeš meniť.' using errcode='42501';
    end if;
    if new.status not in ('COMPLETED','CANCELLED') then
      raise exception 'Potvrdená obhliadka sa dá len označiť za absolvovanú alebo zrušiť.' using errcode='42501';
    end if;

  else
    raise exception 'Neznámy prechod stavu obhliadky.' using errcode='42501';
  end if;

  return new;
end;
$function$;`;

const DECIDED_SQL = `
create or replace function offerra.on_viewing_decided()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'offerra', 'public', 'pg_temp'
as $function$
declare v_title text; v_owner uuid; v_nick text;
begin
  if new.status = old.status then return new; end if;

  -- ZNOVU-ŽIADOSŤ (CANCELLED → REQUESTED, Rastio 19.8.2026): vlastník o nej
  -- musí vedieť rovnako ako o prvej žiadosti — inak by zapadla v tabe, ktorý
  -- nemá dôvod znova otvoriť. Rovnaký typ notifikácie ako
  -- \`on_viewing_insert()\`, aby ju appka zobrazila rovnako.
  if old.status = 'CANCELLED' and new.status = 'REQUESTED' then
    select p.owner_id, p.title into v_owner, v_title from offerra.property p where p.id = new.property_id;
    select pr.nickname into v_nick from offerra.profile pr where pr.id = new.requester_id;
    perform offerra.push_notification(
      v_owner, 'ZIADOST_O_OBHLIADKU',
      'Nová žiadosť o obhliadku',
      coalesce(v_nick, 'Niekto') || ' žiada znova o obhliadku „' || coalesce(v_title, 'inzerát') ||
      '". Potvrď žiadosť v tabe Obhliadka.', new.property_id, null);
    return new;
  end if;

  -- Zaujíma nás LEN prechod z nepotvrdenej žiadosti — COMPLETED/CANCELLED
  -- z už potvrdeného stavu si obe strany videli naživo, netreba upozorniť.
  if old.status <> 'REQUESTED' then return new; end if;

  select p.title into v_title from offerra.property p where p.id = new.property_id;

  if new.status = 'CONFIRMED' then
    perform offerra.push_notification(
      new.requester_id, 'OBHLIADKA_POTVRDENA',
      'Obhliadka potvrdená',
      'Vlastník potvrdil tvoju žiadosť na „' || coalesce(v_title, 'inzerát') ||
      '". Kontakt je teraz odkrytý.', new.property_id, null);
  elsif new.status = 'CANCELLED' then
    perform offerra.push_notification(
      new.requester_id, 'OBHLIADKA_ZAMIETNUTA',
      'Žiadosť o obhliadku zamietnutá',
      'Na inzerát „' || coalesce(v_title, 'inzerát') || '".', new.property_id, null);
  end if;
  return new;
end;
$function$;`;

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('CHYBA: chýba SUPABASE_ACCESS_TOKEN.');
    console.error('Spusti ako: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-viewing-reopen.mjs');
    process.exit(2);
  }
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.text();
  if (!r.ok) {
    throw new Error(`SQL HTTP ${r.status}: ${body.slice(0, 800)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  console.log('Nahrádzam offerra.guard_viewing_update() …');
  await sql(GUARD_SQL);
  console.log('Nahrádzam offerra.on_viewing_decided() …');
  await sql(DECIDED_SQL);
  console.log('Hotovo. Over: node scripts/check-viewing-reopen.mjs');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
