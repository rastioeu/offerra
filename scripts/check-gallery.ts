/**
 * Regresný test gest fullscreen galérie.
 *
 * PREČO EXISTUJE (Rastio, 17.8.2026): prvá verzia prehliadača sa otvorila a
 * nápovedu zobrazila, ale swipe do strán nelistoval (počítadlo ostávalo
 * 3/3) a swipe dole nezatváral. Nedalo sa to overiť inak než prstom na
 * telefóne, pretože celá logika bola pomiešaná s animáciami vo workletoch.
 * Preto je rozhodovanie odteraz v `src/lib/gallery-gesture.ts` a overuje sa
 * TU, v Node.
 *
 * ČO TENTO TEST DOKAZUJE: že keď gesto DORAZÍ do kódu, appka sa rozhodne
 * správne — kam odlistovať, kedy zatvoriť, ako obmedziť posun priblíženej
 * fotky, a že sa počítadlo mení.
 * ČO NEDOKAZUJE: že gesto do kódu dorazí. To je otázka natívnej vrstvy
 * (`GestureHandlerRootView` vnútri `Modal`u) a overuje sa LEN na zariadení
 * — CLAUDE.md §1.
 *
 * SPUSTENIE: `npx --yes tsx scripts/check-gallery.ts`
 * (`tsx` NIKDY nepridávaj do `package.json` — §9, mení EAS fingerprint.)
 */
import {
  AXIS_LOCK,
  CLOSE_DRAG,
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  PAGE_TRIGGER_RATIO,
  SWIPE_VELOCITY,
  TAP_SLOP,
  axisOf,
  clamp,
  nextIndex,
  panLimit,
  shouldClose,
  stripOffset,
  zoomOffset,
} from '../src/lib/gallery-gesture';

let fails = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}\n        ${detail}`);
  if (!ok) fails++;
}

/** Šírka iPhonu, na ktorom to Rastio hlásil. */
const W = 390;
const H = 844;

console.log('── 1. os ťahu: bez zámku by každý ťah robil obe veci naraz ──');
{
  check(
    `mikropohyb (${AXIS_LOCK - 3}px) → os sa NEROZHODUJE (null)`,
    axisOf(AXIS_LOCK - 3, 2) === null,
    `axisOf(${AXIS_LOCK - 3}, 2) = ${axisOf(AXIS_LOCK - 3, 2)}`,
  );
  check('prevažne vodorovný ťah → os X', axisOf(-60, 12) === 'x', `axisOf(-60, 12) = ${axisOf(-60, 12)}`);
  check('prevažne zvislý ťah → os Y', axisOf(9, 70) === 'y', `axisOf(9, 70) = ${axisOf(9, 70)}`);
  check('presná diagonála → X (listovanie má prednosť)', axisOf(40, 40) === 'x', `axisOf(40, 40) = ${axisOf(40, 40)}`);
  // Prečo je toto kontrola a nie len konštanta: `Gesture.Tap` v RNGH má
  // vlastné meze ako NAN, takže dvojťap na pohyb prsta NEZLYHÁ, kým mu
  // `maxDistance` nedáme. Bez toho by sa dva rýchle šmyky vyhodnotili ako
  // dvojťap a fotka by pri listovaní skákala do priblíženia.
  check(
    `tolerancia ťapu (${TAP_SLOP}px) je MENEJ než ${Math.round(W * PAGE_TRIGGER_RATIO)}px na prelistovanie`,
    TAP_SLOP > 0 && TAP_SLOP < W * PAGE_TRIGGER_RATIO,
    `TAP_SLOP = ${TAP_SLOP} → žiadny šmyk, ktorý listuje, sa nedá vyhodnotiť ako ťap`,
  );
}

console.log('\n── 2. LISTOVANIE — presne to, čo nefungovalo ──');
{
  const short = { index: 1, count: 3, width: W, translationX: -20, velocityX: -50 };
  check(
    'krátky pomalý ťah → fotka sa NEMENÍ (nechceme preklikávať omylom)',
    nextIndex(short) === 1,
    `posun -20px, rýchlosť -50 → index ${nextIndex(short)}`,
  );

  const farLeft = { index: 1, count: 3, width: W, translationX: -Math.ceil(W * PAGE_TRIGGER_RATIO) - 1, velocityX: -100 };
  check(
    `ťah vľavo za ${Math.round(PAGE_TRIGGER_RATIO * 100)} % šírky → ĎALŠIA fotka`,
    nextIndex(farLeft) === 2,
    `posun ${farLeft.translationX}px → index ${nextIndex(farLeft)}`,
  );

  const farRight = { index: 1, count: 3, width: W, translationX: 120, velocityX: 100 };
  check('ťah vpravo → PREDCHÁDZAJÚCA fotka', nextIndex(farRight) === 0, `posun +120px → index ${nextIndex(farRight)}`);

  const flick = { index: 0, count: 3, width: W, translationX: -24, velocityX: -(SWIPE_VELOCITY + 200) };
  check(
    'krátky RÝCHLY šmyk vľavo → listuje aj bez dlhého posunu',
    nextIndex(flick) === 1,
    `posun -24px, rýchlosť ${flick.velocityX} → index ${nextIndex(flick)}`,
  );

  const reversed = { index: 1, count: 3, width: W, translationX: -180, velocityX: SWIPE_VELOCITY + 300 };
  check(
    'ťah vľavo, ale na konci švihnutie VPRAVO → rozhoduje rýchlosť, vracia sa',
    nextIndex(reversed) === 0,
    `posun -180px, rýchlosť +${reversed.velocityX} → index ${nextIndex(reversed)}`,
  );

  check(
    'na poslednej fotke sa ďalej nelistuje',
    nextIndex({ index: 2, count: 3, width: W, translationX: -300, velocityX: -900 }) === 2,
    'index 2 z 3 → 2',
  );
  check(
    'na prvej fotke sa dozadu nelistuje',
    nextIndex({ index: 0, count: 3, width: W, translationX: 300, velocityX: 900 }) === 0,
    'index 0 → 0',
  );
  check(
    'jediná fotka → listovanie nič nerobí',
    nextIndex({ index: 0, count: 1, width: W, translationX: -300, velocityX: -900 }) === 0,
    'count 1 → index 0',
  );
}

console.log('\n── 3. POČÍTADLO sa MUSÍ meniť (Rastio: „zostáva 3/3") ──');
{
  // Presne jeho situácia: tri fotky, otvorené na tretej.
  let index = 2;
  const count = 3;
  const seen: string[] = [`${index + 1}/${count}`];

  // Tri po sebe idúce ťahy vpravo (späť), potom jeden vľavo.
  for (const drag of [140, 140, 140, -140]) {
    index = nextIndex({ index, count, width: W, translationX: drag, velocityX: drag > 0 ? 200 : -200 });
    seen.push(`${index + 1}/${count}`);
  }

  check(
    'ťah vpravo z 3/3 → počítadlo ide na 2/3',
    seen[1] === '2/3',
    `postup: ${seen.join(' → ')}`,
  );
  check('ďalší ťah → 1/3', seen[2] === '1/3', `postup: ${seen.join(' → ')}`);
  check('na prvej fotke počítadlo STOJÍ na 1/3', seen[3] === '1/3', `postup: ${seen.join(' → ')}`);
  check('ťah vľavo → znova 2/3', seen[4] === '2/3', `postup: ${seen.join(' → ')}`);
}

console.log('\n── 4. ZATVORENIE potiahnutím dole ──');
{
  check(
    `posun ${CLOSE_DRAG + 20}px dole → zatvára`,
    shouldClose({ translationY: CLOSE_DRAG + 20, velocityY: 200 }) === true,
    `shouldClose = ${shouldClose({ translationY: CLOSE_DRAG + 20, velocityY: 200 })}`,
  );
  check(
    `posun ${CLOSE_DRAG - 60}px dole pomaly → NEzatvára, vracia sa`,
    shouldClose({ translationY: CLOSE_DRAG - 60, velocityY: 100 }) === false,
    'krátky ťah nesmie zavrieť fotku omylom',
  );
  check(
    'krátky ale RÝCHLY ťah dole → zatvára',
    shouldClose({ translationY: 55, velocityY: 1400 }) === true,
    'posun 55px, rýchlosť 1400',
  );
  check(
    'ťah NAHOR nezatvára ani pri veľkej rýchlosti',
    shouldClose({ translationY: -300, velocityY: -2000 }) === false,
    'posun -300px → false',
  );
  check('nulový posun nezatvára', shouldClose({ translationY: 0, velocityY: 0 }) === false, '0 → false');
}

console.log('\n── 5. pás fotiek: pozícia a odpor na krajoch ──');
{
  check(
    'stred pásu: druhá fotka bez ťahu leží presne na -šírka',
    stripOffset({ index: 1, count: 3, width: W, translationX: 0 }) === -W,
    `stripOffset = ${stripOffset({ index: 1, count: 3, width: W, translationX: 0 })}`,
  );
  const mid = stripOffset({ index: 1, count: 3, width: W, translationX: -100 });
  check('ťah v strede pásu ide 1:1 s prstom', mid === -W - 100, `stripOffset = ${mid}`);

  const beyondFirst = stripOffset({ index: 0, count: 3, width: W, translationX: 200 });
  check(
    'ťah pred prvú fotku sa spomalí (odpor), nie zablokuje',
    beyondFirst > 0 && beyondFirst < 200,
    `ťah +200px → posun ${beyondFirst.toFixed(1)}px`,
  );

  const beyondLast = stripOffset({ index: 2, count: 3, width: W, translationX: -200 });
  check(
    'ťah za poslednú fotku sa tiež len spomalí',
    beyondLast < -2 * W && beyondLast > -2 * W - 200,
    `ťah -200px → posun ${beyondLast.toFixed(1)}px (koniec pásu je ${-2 * W})`,
  );
}

console.log('\n── 6. PRIBLÍŽENIE: posun nesmie fotku vytiahnuť mimo obraz ──');
{
  check(
    'nepriblížená fotka sa posúvať nedá (meza 0)',
    panLimit(1, W) === 0,
    `panLimit(1, ${W}) = ${panLimit(1, W)}`,
  );
  const limit = panLimit(DOUBLE_TAP_SCALE, W);
  check(
    `dvojťap (${DOUBLE_TAP_SCALE}×) → posun do ±${limit.toFixed(0)}px`,
    Math.abs(limit - (W * DOUBLE_TAP_SCALE - W) / 2) < 0.001,
    `panLimit = ${limit}`,
  );
  check(
    'ťah za mezu sa zastaví PRESNE na meze',
    zoomOffset({ scale: DOUBLE_TAP_SCALE, saved: 0, translation: 5000, size: W }) === limit,
    `ťah +5000px → ${zoomOffset({ scale: DOUBLE_TAP_SCALE, saved: 0, translation: 5000, size: W })}`,
  );
  check(
    'to isté opačným smerom',
    zoomOffset({ scale: DOUBLE_TAP_SCALE, saved: 0, translation: -5000, size: W }) === -limit,
    `ťah -5000px → ${zoomOffset({ scale: DOUBLE_TAP_SCALE, saved: 0, translation: -5000, size: W })}`,
  );
  const kept = zoomOffset({ scale: DOUBLE_TAP_SCALE, saved: 50, translation: 30, size: W });
  check('posun sa skladá na predchádzajúci (fotka neskočí na začiatok)', kept === 80, `50 + 30 = ${kept}`);
  check(
    'zvislá meza sa počíta z VÝŠKY, nie zo šírky',
    panLimit(2, H) === (H * 2 - H) / 2,
    `panLimit(2, ${H}) = ${panLimit(2, H)}`,
  );
  check(
    `štipnutie sa nedá roztiahnuť nad ${MAX_SCALE}×`,
    clamp(1 * 40, 0.8, MAX_SCALE) === MAX_SCALE,
    `clamp(40) = ${clamp(40, 0.8, MAX_SCALE)}`,
  );
}

console.log('\n' + '='.repeat(60));
if (fails > 0) {
  console.log(`ZLYHALO: ${fails} kontrol. Gestá galérie sa rozhodujú nesprávne.`);
  process.exit(1);
}
console.log('VŠETKO OK — rozhodovanie gest galérie je v poriadku.');
console.log('POZOR: toto NEDOKAZUJE, že gesto do kódu dorazí (natívna vrstva) — to sa overuje na telefóne.');
