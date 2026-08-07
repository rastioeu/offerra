import { supabase } from './supabase';

/**
 * FÁZA 0 — prihlásenie e-mailom a heslom.
 *
 * Zámerne **len e-mail/heslo**. MUTARK má aj Apple a Google (viď
 * `/root/mutark/src/lib/auth.ts`), ale oba providery potrebujú v zdieľanom
 * Supabase Auth projekte zaregistrovať redirect pre schému `offerra` a
 * bundle id `com.offerra.app`. To je zásah do konfigurácie, ktorú používa
 * aj MUTARK — patrí do Fázy 1 s rozmyslom, nie do setupu.
 *
 * Účel tejto obrazovky vo Fáze 0: overiť v TestFlight builde, že session
 * zo zdieľaného Auth projektu naozaj dorazí do Offerra appky.
 */

export type AuthResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; message: string };

/**
 * CLAUDE.md §2 — žiadny tichý catch. Chyba sa vracia volajúcemu ako text,
 * ktorý sa zobrazí používateľovi; `console.log` navyše nechávame, aby sa
 * dala prečítať aj zo zariadenia pripojeného na konzolu.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const trimmed = email.trim();
  if (!trimmed || !password) {
    return { ok: false, message: 'Vyplň e-mail aj heslo.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    if (error) {
      console.log(`[AUTH] Prihlásenie zlyhalo: ${error.message}`);
      return { ok: false, message: error.message };
    }

    if (!data.session || !data.user) {
      console.log('[AUTH] Server nevrátil chybu, ale ani session.');
      return { ok: false, message: 'Server nevrátil session. Skús to znova.' };
    }

    console.log(`[AUTH] Prihlásený: user.id=${data.user.id}, email=${data.user.email}`);
    return { ok: true, userId: data.user.id, email: data.user.email };
  } catch (e) {
    // Sieťová chyba a podobne — surová správa, nič sa nezahladzuje.
    const message = e instanceof Error ? e.message : String(e);
    console.log(`[AUTH] Neočakávaná chyba pri prihlásení: ${message}`);
    return { ok: false, message };
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log(`[AUTH] Odhlásenie zlyhalo: ${error.message}`);
    throw new Error(error.message);
  }
  console.log('[AUTH] Odhlásený.');
}
