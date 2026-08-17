/**
 * Kontrola, či sa dá bucket s fotkami VYPÍSAŤ cudzím okom.
 *
 * PREČO EXISTUJE (Rastio, 17.8.2026): register 1.7 držal otvorený bod
 * „verejný bucket a DRAFT fotky — fotka rozrobeného inzerátu je pri znalosti
 * UUID cesty dostupná". Meranie 17.8.2026 ukázalo, že je to HORŠIE, než ten
 * zápis tvrdil: cestu netreba poznať, bucket sa dá **vypísať** anon kľúčom
 * (`POST /storage/v1/object/list/...`), takže sa fotky dajú prejsť od
 * začiatku do konca — vrátane fotiek inzerátov, ktoré nie sú zverejnené.
 *
 * ČO TENTO SKRIPT DOKAZUJE: či je vypisovanie otvorené alebo zavreté, a
 * koľko fotiek je pri ňom prístupných. Kým je otvorené, končí exit 1.
 * Po oprave (SQL v `reports/FOTKY_EXPOZICIA.md`) musí prejsť.
 *
 * ČO NEHODNOTÍ ako chybu: že sa dá priamo prečítať URL zverejnenej fotky.
 * Bucket je verejný zámerne — fotky inzerátov musí vidieť aj neprihlásený.
 * Problém je VYPISOVANIE, nie čítanie známej adresy.
 *
 * SPUSTENIE: `npx --yes tsx scripts/check-storage-exposure.ts`
 * Kľúče berie z `.env` (gitignorovaný) — do repa sa NIKDY nepíšu (§4).
 */
// `@types/node` v repe ZÁMERNE nie je: pridať ho by zmenilo `package.json`,
// teda EAS fingerprint, a odstrihlo OTA od Rastiovho buildu (§9, incident
// 13.8.2026). Preto potlačené — nie preto, že by tu bola chyba.
// @ts-ignore
import { readFileSync } from 'node:fs';

const BUCKET = 'offerra-media';

function env(): { url: string; key: string } {
  const vars: Record<string, string> = { ...(process.env as Record<string, string>) };
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // `.env` nemusí byť — potom musia byť premenné v prostredí.
  }
  const url = vars.EXPO_PUBLIC_SUPABASE_URL;
  const key = vars.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('CHYBA: chýba EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(2);
  }
  return { url, key };
}

const { url: URL_BASE, key: ANON } = env();

let fails = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

type Entry = { name: string; id: string | null };

async function list(prefix: string): Promise<{ status: number; entries: Entry[] }> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  if (!r.ok) return { status: r.status, entries: [] };
  const body = (await r.json()) as unknown;
  return { status: r.status, entries: Array.isArray(body) ? (body as Entry[]) : [] };
}

async function main() {
  console.log('── 1. dá sa bucket VYPÍSAŤ anon kľúčom? (toto je tá diera) ──');
  const root = await list('');
  const listable = root.status === 200 && root.entries.length > 0;
  check(
    'vypisovanie bucketu je pre cudzie oko ZAVRETÉ',
    !listable,
    listable
      ? `HTTP ${root.status}, vrátilo ${root.entries.length} priečinkov → prejsť sa dá celý bucket`
      : `HTTP ${root.status}, nič sa nevypísalo`,
  );

  let files = 0;
  const propertyFolders = new Set<string>();
  if (listable) {
    for (const user of root.entries) {
      const props = await list(`${user.name}/`);
      for (const p of props.entries) {
        propertyFolders.add(p.name);
        const inner = await list(`${user.name}/${p.name}/`);
        files += inner.entries.filter((e) => e.id).length;
      }
    }
    console.log(
      `        rozsah: ${root.entries.length} používateľských priečinkov, ` +
        `${propertyFolders.size} inzerátov, ${files} fotiek`,
    );
  }

  console.log('\n── 2. sú medzi nimi fotky NEZVEREJNENÝCH inzerátov? ──');
  if (!listable) {
    check('nedá sa zistiť, pretože vypisovanie je zavreté — presne tak to má byť', true, 'preskočené');
  } else {
    const r = await fetch(`${URL_BASE}/rest/v1/property?select=id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Accept-Profile': 'offerra' },
    });
    const visible = new Set(((await r.json()) as { id: string }[]).map((p) => p.id));
    const hidden = [...propertyFolders].filter((f) => !visible.has(f));
    check(
      'fotky inzerátov, ktoré cez REST nie sú verejné, NIE SÚ prístupné',
      hidden.length === 0,
      `${hidden.length} z ${propertyFolders.size} priečinkov patrí inzerátom, ktoré anonym cez REST nevidí ` +
        '(koncepty, archivované, zmazané) — ich fotky sú aj tak čitateľné',
    );
  }

  console.log('\n── 3. čo MUSÍ ostať funkčné ──');
  // Zverejnené fotky musí vidieť aj neprihlásený — bucket je verejný ZÁMERNE.
  // Keby oprava zavrela aj toto, katalóg ostane bez fotiek (regresia z Fázy 24).
  const media = await fetch(`${URL_BASE}/rest/v1/media?select=url&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Accept-Profile': 'offerra' },
  });
  const rows = (await media.json()) as { url: string }[];
  if (rows.length === 0) {
    check('nedá sa overiť — REST nevrátil žiadnu fotku', false, 'žiadny riadok v `media`');
  } else {
    const direct = await fetch(rows[0].url);
    check(
      'zverejnenú fotku prečíta aj úplne cudzí prehliadač (bez kľúča)',
      direct.ok,
      `HTTP ${direct.status} — bez toho by katalóg ostal bez fotiek`,
    );
  }

  console.log('\n── 4. zapisovať cudzí NESMIE ──');
  // Merané 17.8.2026: RLS zápis blokuje. Test je tu, aby sa to pri zmene
  // politík nepokazilo nepozorovane.
  // Stačia značkovacie bajty JPEG (SOI + EOI): storage sa pri zápise najprv
  // pýta RLS, až potom obsahu. `Buffer` tu zámerne nie je — viď poznámku
  // o `@types/node` na začiatku súboru.
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const wr = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/_kontrola-expozicie.jpg`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'image/jpeg' },
    body: jpeg,
  });
  // Samotné „HTTP 400" NESTAČÍ: Supabase ním obaľuje aj zamietnutie RLS
  // (`statusCode 403`), aj odmietnutý MIME type (`415`). Keby test veril len
  // stavovému kódu, prešiel by aj vtedy, keď zápis zamietlo niečo úplne iné
  // než oprávnenie — a nedokazoval by nič (§1).
  const wrBody = (await wr.json().catch(() => ({}))) as { statusCode?: string; message?: string };
  const refusedByRls =
    !wr.ok && (wrBody.statusCode === '403' || /row-level security|Unauthorized/i.test(wrBody.message ?? ''));
  check(
    'anon kľúčom sa do bucketu NEDÁ nahrávať — a zamietla to RLS, nie kontrola formátu',
    refusedByRls,
    `HTTP ${wr.status}, statusCode ${wrBody.statusCode ?? '?'} — „${wrBody.message ?? 'bez správy'}"`,
  );
  if (wr.ok) {
    // Keby to niekedy prešlo, po sebe uklidím — test nesmie nechať smeti.
    await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/_kontrola-expozicie.jpg`, {
      method: 'DELETE',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
  }

  console.log('\n' + '='.repeat(60));
  if (fails > 0) {
    console.log(`ZLYHALO: ${fails} kontrol. Fotky sú prístupnejšie, než majú byť.`);
    console.log('Oprava (SQL do Supabase → SQL editor): reports/FOTKY_EXPOZICIA.md');
    process.exit(1);
  }
  console.log('VŠETKO OK — bucket sa nedá vypísať a zverejnené fotky sa čítať dajú.');
}

void main();
