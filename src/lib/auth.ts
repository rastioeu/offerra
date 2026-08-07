import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type * as AppleAuthenticationType from 'expo-apple-authentication';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * FÁZA 0 — prihlásenie.
 *
 * Apple a Google sú tu **kvôli overeniu totožnosti** (Rastio, 7.8.2026), nie
 * kvôli pohodliu: pri nehnuteľnostiach je dôležité, aby za inzerátom stál
 * skutočný, overený človek. Preto sú to jediné dve viditeľné cesty.
 *
 * E-mail/heslo ostáva ako **skrytá** cesta (5 ťuknutí na logo) — rovnaký vzor
 * ako MUTARK (`/root/mutark/src/lib/auth.ts`, K12): App Store recenzenti
 * nemajú na review zariadení Apple ani Google účet, a my ňou testujeme
 * zdieľaný účet. Bežný používateľ na ňu nenarazí.
 *
 * Vlastný scheme (nie Expo proxy — tá už v tejto SDK verzii nie je),
 * rovnako ako MUTARK.
 */
const redirectTo = makeRedirectUri({ scheme: 'offerra' });

export type AuthResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; message: string }
  | { ok: 'canceled' };

/** Dokončí OAuth prihlásenie z redirect URL (PKCE aj implicit tokeny). */
async function createSessionFromUrl(url: string): Promise<AuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { ok: false, message: errorCode };

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { ok: false, message: error.message };
    if (!data.session) return { ok: false, message: 'Server nevrátil session.' };
    return { ok: true, userId: data.session.user.id, email: data.session.user.email };
  }

  const { access_token, refresh_token } = params;
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { ok: false, message: error.message };
    if (!data.session) return { ok: false, message: 'Server nevrátil session.' };
    return { ok: true, userId: data.session.user.id, email: data.session.user.email };
  }

  return { ok: false, message: 'Prihlásenie sa nedokončilo — chýba token v odpovedi.' };
}

/**
 * Google — browserový OAuth flow cez ten istý Supabase Google client, aký
 * používa MUTARK. Nepotrebuje vlastný Google client id; potrebuje len, aby
 * `offerra://` bolo v Supabase Auth medzi povolenými redirect URL.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      console.log(`[AUTH] Google — začiatok zlyhal: ${error.message}`);
      return { ok: false, message: error.message };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      console.log(`[AUTH] Google — používateľ prerušil (${result.type}).`);
      return { ok: 'canceled' };
    }

    const session = await createSessionFromUrl(result.url);
    if (session.ok === true) {
      console.log(`[AUTH] Google — prihlásený: user.id=${session.userId}`);
    } else if (session.ok === false) {
      console.log(`[AUTH] Google — dokončenie zlyhalo: ${session.message}`);
    }
    return session;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`[AUTH] Google — neočakávaná chyba: ${message}`);
    return { ok: false, message };
  }
}

/**
 * Apple — natívny Sign in with Apple. `expo-apple-authentication` sa načítava
 * až v handleri (nie statickým importom): na builde bez tohto natívneho
 * modulu by statický import zhodil celú obrazovku pri jej OTVORENÍ.
 * Rovnaká poistka ako MUTARK pri `expo-image-picker`.
 */
export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Prihlásenie cez Apple je dostupné len na iPhone.' };
  }

  let AppleAuthentication: typeof AppleAuthenticationType;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppleAuthentication = require('expo-apple-authentication');
  } catch {
    return { ok: false, message: 'Prihlásenie cez Apple nie je v tomto builde dostupné.' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      console.log('[AUTH] Apple — chýba identityToken.');
      return { ok: false, message: 'Apple nevrátil overovací token.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      console.log(`[AUTH] Apple — Supabase odmietol token: ${error.message}`);
      return { ok: false, message: error.message };
    }
    if (!data.session) {
      return { ok: false, message: 'Server nevrátil session.' };
    }

    console.log(`[AUTH] Apple — prihlásený: user.id=${data.session.user.id}`);
    return { ok: true, userId: data.session.user.id, email: data.session.user.email };
  } catch (e) {
    // Apple hlási zrušenie ako chybu s kódom ERR_REQUEST_CANCELED —
    // to nie je porucha a nesmie sa tváriť ako chyba.
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') {
      console.log('[AUTH] Apple — používateľ prerušil.');
      return { ok: 'canceled' };
    }
    const message = e instanceof Error ? e.message : String(e);
    console.log(`[AUTH] Apple — neočakávaná chyba: ${message}`);
    return { ok: false, message };
  }
}

/**
 * SKRYTÁ cesta — e-mail/heslo. Odomkne sa 5 ťuknutiami na logo na
 * prihlasovacej obrazovke. Slúži na test zdieľaného účtu a pre App Store
 * recenzentov; v bežnom používaní sa nezobrazuje.
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
      console.log(`[AUTH] E-mail — prihlásenie zlyhalo: ${error.message}`);
      return { ok: false, message: error.message };
    }
    if (!data.session || !data.user) {
      return { ok: false, message: 'Server nevrátil session. Skús to znova.' };
    }

    console.log(`[AUTH] E-mail — prihlásený: user.id=${data.user.id}`);
    return { ok: true, userId: data.user.id, email: data.user.email };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`[AUTH] E-mail — neočakávaná chyba: ${message}`);
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
