/**
 * Rozpísané formuláre, ktoré prežijú odmountovanie obrazovky.
 *
 * PREČO: chyba z 9.8.2026 („pridám fotku a všetko vyplnené zmizne") mala
 * príčinu inde — v obnove dát zo servera, nie v remounte (viď
 * `use-form-draft.ts`). Toto je druhá poistka: aj keby obrazovku niekedy
 * naozaj odmountovalo (návrat z natívneho okna, výmena navigátora, pamäť),
 * rozpísaný text je mimo komponentu a vráti sa.
 *
 * Je to ÚMYSELNE obyčajná pamäť procesu, nie AsyncStorage. Rozpísaný
 * inzerát nemá prežiť reštart appky — na to slúži koncept v databáze,
 * ktorý je zdroj pravdy. Toto drží len tých pár minút písania.
 */
const drafts = new Map<string, unknown>();

export function readDraft<F>(key: string | undefined): F | undefined {
  if (!key) return undefined;
  return drafts.get(key) as F | undefined;
}

export function writeDraft<F>(key: string | undefined, value: F): void {
  if (!key) return;
  drafts.set(key, value);
}

/** Po úspešnom uložení: server sa práve vyrovnal formuláru, držať ho netreba. */
export function forgetDraft(key: string | undefined): void {
  if (!key) return;
  drafts.delete(key);
}

/**
 * Pri odhlásení. Rozpísaný text jedného človeka nesmie ostať v pamäti,
 * keď sa na tom istom telefóne prihlási niekto iný.
 */
export function forgetAllDrafts(): void {
  drafts.clear();
}

/** Len pre testy — koľko rozpísaných formulárov práve držíme. */
export function draftCount(): number {
  return drafts.size;
}

// ── PRAVIDLO, KVÔLI KTOREMU TO CELÉ VZNIKLO ─────────────────────────────

export type FillState<F> = {
  /** Záznam, pre ktorý je formulár už naplnený. `null` = ešte pre žiadny. */
  key: string | null;
  form: F | null;
};

/**
 * Smie server prepísať formulár?
 *
 * NÁMERANÁ CHYBA (9.8.2026): editor inzerátu napĺňal polia v efekte
 * závislom na načítanom riadku — `useEffect(…, [item])`. Každé `reload()`
 * (po pridaní fotky, po uložení, pri návrate na obrazovku) vytvorí NOVÝ
 * objekt, takže sa efekt spustil znova a prepísal všetko, čo mal človek
 * rozpísané, hodnotami z databázy. Pridanie fotky volá `reload()` — preto
 * sa formulár vymazal presne v tej chvíli.
 *
 * Pravidlo je preto jednoveté a platí pre KAŽDÝ formulár:
 * **server smie formulár naplniť, nikdy nie prepísať.**
 * Vracia nový stav, alebo `null`, keď sa nemá stať nič.
 */
export function fillFromServer<S, F>(
  state: FillState<F>,
  key: string | undefined,
  source: S | null | undefined,
  build: (s: S) => F
): FillState<F> | null {
  if (!key || source == null) return null;
  // Už naplnené pre TENTO záznam → server sem viac nesiaha.
  if (state.key === key) return null;
  // Iný záznam než naposledy (alebo prvé otvorenie): rozpísaný text má
  // prednosť pred serverom — je novší a je to práca používateľa.
  return { key, form: readDraft<F>(key) ?? build(source) };
}
