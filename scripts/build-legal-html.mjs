/**
 * Vygeneruje statické HTML pre GitHub Pages z `src/lib/legal.ts`.
 *
 * PREČO GENEROVAŤ A NEPÍSAŤ DVAKRÁT: App Store Connect vyžaduje verejnú
 * URL na ochranu osobných údajov, appka potrebuje ten istý text offline.
 * Dva ručne písané dokumenty by si o mesiac odporovali — a dokument
 * o súkromí, ktorý klame, je horší než žiadny.
 *
 * Spustenie:  node scripts/build-legal-html.mjs
 * Výstup:     docs/index.html, docs/privacy.html, docs/terms.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Kam sa generuje. Bez argumentu do `docs/` v tomto repe, s argumentom
// kamkoľvek — používa sa na naplnenie samostatného webového repa
// `rastioeu/offerra_web`.
const OUT = process.argv[2] ? process.argv[2] : join(ROOT, 'docs');

/**
 * Texty sa čítajú zo zdroja ako TEXT a vyhodnotia sa po odstránení
 * TypeScriptu. Je to lacnejšie než pridávať build krok pre jeden súbor,
 * ktorý nemá žiadne závislosti.
 */
function loadLegal() {
  const src = readFileSync(join(ROOT, 'src/lib/legal.ts'), 'utf8');
  // Typy sa odstraňujú stavovo, nie regexom: `export type LegalDoc = {…}`
  // je viacriadkový a regex na `;` by ho odrezal v strede.
  const lines = src.split('\n');
  const kept = [];
  let depth = 0;
  let inType = false;
  for (const line of lines) {
    if (!inType && /^export type /.test(line)) {
      inType = true;
      depth = 0;
    }
    if (inType) {
      depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (depth <= 0 && /;\s*$/.test(line)) inType = false;
      continue;
    }
    kept.push(line);
  }
  const js = kept
    .join('\n')
    .replace(/^import[^;]+;$/gm, '')
    // najprv `export const` -> `const`, až POTOM anotácie typu:
    // opačné poradie by anotáciu na exportovanej konštante netrafilo
    .replace(/\bexport const\b/g, 'const')
    .replace(/^(const \w+)\s*:\s*[^=]+=/gm, '$1 =');
  const fn = new Function(`${js}; return { LEGAL_DOCS, LEGAL_UPDATED, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR };`);
  return fn();
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root{--bg:#FBF7F2;--card:#FFFDFB;--line:#EFE6DC;--ink:#1C1815;--ink2:#5C534B;--ink3:#7A7068;--navy:#103A6B;--warm:#A85526}
@media (prefers-color-scheme:dark){:root{--bg:#161311;--card:#211D1A;--line:#38322D;--ink:#F7F3EF;--ink2:#C4B8AE;--ink3:#A2968C;--navy:#7FB3F0;--warm:#E39A5E}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:32px 20px 64px}
.wrap{max-width:720px;margin:0 auto}
a{color:var(--navy)}
header{margin-bottom:28px}
.brand{font-weight:800;letter-spacing:-.02em;font-size:22px;color:var(--warm);text-decoration:none}
h1{font-size:30px;line-height:1.2;margin:18px 0 6px}
.lead{color:var(--ink2);font-size:17px;margin:0 0 6px}
.updated{color:var(--ink3);font-size:14px;margin:0}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:16px 0}
h2{font-size:19px;margin:0 0 10px}
p{margin:0 0 10px;color:var(--ink2)}
p:last-child{margin-bottom:0}
nav{display:flex;gap:14px;margin-top:14px;flex-wrap:wrap}
nav a{font-weight:600;text-decoration:none;border:1px solid var(--line);background:var(--card);padding:8px 14px;border-radius:999px}
footer{color:var(--ink3);font-size:14px;margin-top:28px}
`;

function page({ title, body }) {
  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Offerra</title>
<meta name="description" content="${esc(title)} aplikácie Offerra.">
<style>${CSS}</style>
</head>
<body><div class="wrap">
<header><a class="brand" href="./">Offerra</a></header>
${body}
<footer>Offerra — obrátený trh s nehnuteľnosťami.</footer>
</div></body>
</html>
`;
}

function docPage(doc, updated) {
  const body = `
<h1>${esc(doc.title)}</h1>
<p class="lead">${esc(doc.lead)}</p>
<p class="updated">Aktualizované ${esc(updated)}</p>
<nav><a href="./privacy.html">Ochrana osobných údajov</a><a href="./terms.html">Podmienky používania</a><a href="./support.html">Podpora</a></nav>
${doc.sections
  .map(
    (s) =>
      `<section><h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n')}</section>`
  )
  .join('\n')}`;
  return page({ title: doc.title, body });
}

const { LEGAL_DOCS, LEGAL_UPDATED, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } = loadLegal();

mkdirSync(OUT, { recursive: true });
for (const doc of Object.values(LEGAL_DOCS)) {
  writeFileSync(join(OUT, `${doc.slug}.html`), docPage(doc, LEGAL_UPDATED));
}

writeFileSync(
  join(OUT, 'index.html'),
  page({
    title: 'Offerra',
    body: `
<h1>Offerra</h1>
<p class="lead">Obrátený trh s nehnuteľnosťami. Predávajúci nemusí povedať cenu — záujemcovia predkladajú vlastné ponuky pod prezývkou a všetci vidia, ako to ide. Skutočné meno a telefón sa odkryjú až vtedy, keď predávajúci niektorú ponuku prijme.</p>
<nav><a href="./privacy.html">Ochrana osobných údajov</a><a href="./terms.html">Podmienky používania</a><a href="./support.html">Podpora</a></nav>
<section><h2>Ako to funguje</h2>
<p><strong>Cena je nepovinná.</strong> Kto ponúka nehnuteľnosť, môže uviesť orientačnú sumu — alebo nechať pole prázdne a počkať, čo mu ľudia ponúknu.</p>
<p><strong>Ponuky sú verejné, ľudia nie.</strong> Sumu, prezývku aj dátum každej ponuky vidí ktokoľvek. Kto za prezývkou stojí, sa nedozvie nikto — dovtedy.</p>
<p><strong>Kontakt až po dohode.</strong> Keď predávajúci ponuku prijme, meno, telefón a e-mail sa odkryjú obom stranám naraz.</p>
<p><strong>Hľadať sa dá aj naopak.</strong> Napíšeš, čo hľadáš, a majitelia ťa môžu osloviť sami.</p>
</section>
<section><h2>Aplikácia</h2><p>Offerra je mobilná aplikácia pre iOS. Je v slovenčine a je bezplatná.</p></section>`,
  })
);

writeFileSync(
  join(OUT, 'support.html'),
  page({
    title: 'Podpora',
    body: `
<h1>Podpora</h1>
<p class="lead">Niečo nefunguje, máš otázku alebo chceš nahlásiť obsah? Napíš — odpovedá človek.</p>
<nav><a href="./privacy.html">Ochrana osobných údajov</a><a href="./terms.html">Podmienky používania</a></nav>
<section><h2>Kontakt</h2>
<p>E-mail: <a href="mailto:${esc(LEGAL_CONTACT_EMAIL)}">${esc(LEGAL_CONTACT_EMAIL)}</a></p>
<p>Prevádzkovateľ: ${esc(LEGAL_OPERATOR)}</p>
<p>Odpovedáme spravidla do niekoľkých pracovných dní.</p>
</section>
<section><h2>Nahlásenie obsahu</h2>
<p>Nevhodný inzerát, ponuku aj používateľa je možné nahlásiť priamo v aplikácii — pri každom z nich je odkaz „Nahlásiť“. Nič sa nemaže automaticky, každé nahlásenie posudzuje človek.</p>
<p>Ak sa do aplikácie nedostaneš, napíš na e-mail vyššie.</p>
</section>
<section><h2>Zmazanie účtu</h2>
<p>Účet zmažeš priamo v aplikácii: Profil → Nastavenia → Zmazať účet. Odstráni sa profil, inzeráty, fotografie, ponuky aj dopyty. Nie je na to potrebná žiadna žiadosť.</p>
</section>`,
  })
);

// GitHub Pages by inak hnalo obsah cez Jekyll a súbory so `_` by zmizli.
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`Vygenerované do ${OUT}: index.html, privacy.html, terms.html, support.html`);
