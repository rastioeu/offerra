/**
 * Výber a nahratie fotky — jedno miesto pre inzeráty aj pre profilovku.
 *
 * CHYBA, KTORÚ TO OPRAVUJE (7.8.2026, nahlásil Rastio: „fotka nejde
 * nahrať"). Namerané: v `storage.objects` bolo pre jeho účet **0 súborov**,
 * takže upload z telefónu vôbec neodišiel — padalo to pred odoslaním.
 * Príčina: pôvodný výber používal `allowsMultipleSelection: true` spolu
 * s `base64: true`. Pri viacnásobnom výbere `expo-image-picker` base64
 * nevracia spoľahlivo, kód teda dostal `asset.base64 === undefined`
 * a fotku ticho preskočil.
 *
 * Teraz je to presne MUTARK vzor (`use-avatar-upload.ts`): JEDNA fotka,
 * `allowsEditing: true`, `quality`, `base64: true` — overený, funkčný.
 * Viac fotiek sa pridáva opakovaným ťuknutím.
 *
 * `require('expo-image-picker')` je ZÁMERNE vnútri funkcie, nie statický
 * import — build bez tohto natívneho modulu by inak spadol už pri otvorení
 * obrazovky, nie až pri ťuknutí.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type * as ImagePickerType from 'expo-image-picker';

import { supabase } from './supabase';

export const BUCKET = 'offerra-media';
/** Bucket má limit 10 MB; zastavíme sa skôr a s vysvetlením. */
const MAX_BYTES = 8 * 1024 * 1024;

/** Chyba, ktorá vie povedať, na ktorom KROKU to padlo (CLAUDE.md §2). */
export class PhotoError extends Error {
  constructor(
    public readonly step: string,
    message: string
  ) {
    super(message);
    this.name = 'PhotoError';
  }
}

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export type PickedPhoto = { bytes: Uint8Array; contentType: string; ext: string };

/** Vráti `null`, keď používateľ výber zrušil — to nie je chyba. */
export async function pickPhoto(aspect: [number, number]): Promise<PickedPhoto | null> {
  console.log('[FOTKA] 1 ŠTART');

  let ImagePicker: typeof ImagePickerType;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ImagePicker = require('expo-image-picker');
  } catch {
    throw new PhotoError(
      '1 modul',
      'Táto verzia appky nemá modul na výber fotiek. Nainštaluj si najnovší build z TestFlightu.'
    );
  }

  console.log('[FOTKA] 2 pýtam povolenie');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoError(
      '2 povolenie',
      'Offerra nemá prístup k tvojim fotkám. Povoľ ho v Nastaveniach telefónu → Offerra → Fotky.'
    );
  }

  console.log('[FOTKA] 3 otváram galériu');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) {
    console.log('[FOTKA] 3 zrušené používateľom');
    return null;
  }

  const asset = result.assets[0];
  if (!asset?.base64) {
    throw new PhotoError(
      '4 načítanie',
      'Fotku sa nepodarilo načítať zo zariadenia. Skús inú fotku alebo ju najprv ulož do Fotiek.'
    );
  }

  const bytes = decodeBase64(asset.base64);
  console.log(`[FOTKA] 4 načítané ${bytes.byteLength} B`);

  if (bytes.byteLength > MAX_BYTES) {
    throw new PhotoError(
      '4 veľkosť',
      `Fotka má ${(bytes.byteLength / 1048576).toFixed(1)} MB, limit je 8 MB. Skús menšiu.`
    );
  }

  const ext = (asset.uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { bytes, contentType, ext: ext === 'png' || ext === 'webp' ? ext : 'jpg' };
}

/** Nahrá do Storage a vráti verejnú URL. Cesta MUSÍ začínať `auth.uid()`. */
export async function uploadPhoto(path: string, photo: PickedPhoto, upsert: boolean): Promise<string> {
  console.log(`[FOTKA] 5 nahrávam → ${path}`);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo.bytes, { contentType: photo.contentType, upsert });
  if (error) {
    throw new PhotoError('5 upload', error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  console.log('[FOTKA] 6 nahraté');
  return data.publicUrl;
}

/** Text pre používateľa vrátane kroku — aby sa nehádalo, kde to padlo. */
export function photoErrorMessage(e: unknown): string {
  if (e instanceof PhotoError) return `${e.message}\n\n(krok ${e.step})`;
  return e instanceof Error ? e.message : String(e);
}
