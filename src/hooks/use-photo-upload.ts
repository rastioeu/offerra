/**
 * Nahratie fotiek inzerátu do bucketu `offerra-media`.
 *
 * Vzor prevzatý z MUTARKovho `use-avatar-upload.ts`:
 *  - `require('expo-image-picker')` **vnútri handlera**, nie statický import.
 *    Build bez tohto natívneho modulu by inak spadol už pri OTVORENÍ
 *    obrazovky, nie až pri ťuknutí na tlačidlo.
 *  - base64 → `Uint8Array` → `storage.upload()`.
 *
 * ROZDIEL oproti MUTARKu: cesta je `{ownerId}/{propertyId}/{poradie}.{ext}`.
 * Prvý segment = `auth.uid()`, presne to kontroluje Storage RLS.
 *
 * KOMPRESIA: `quality: 0.6` znovu zakóduje JPEG — z 12 Mpx fotky z iPhonu
 * spraví rádovo 1–2 MB. Skutočné ZMENŠENIE rozmerov by vyžadovalo
 * `expo-image-manipulator`, čo je NOVÝ natívny modul → nový EAS build.
 * Preto je tu namiesto toho tvrdá poistka na veľkosť (`MAX_BYTES`), ktorá
 * používateľovi povie, čo sa stalo — nezlyhá ticho na limite bucketu.
 */
import { useState } from 'react';
import { Alert } from 'react-native';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type * as ImagePickerType from 'expo-image-picker';

import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';

const BUCKET = 'offerra-media';
/** Bucket má limit 10 MB; zastavíme sa skôr a s vysvetlením. */
const MAX_BYTES = 8 * 1024 * 1024;

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return e instanceof Error ? e.message : String(e);
}

export function usePhotoUpload(
  ownerId: string | undefined,
  propertyId: string | undefined,
  onUploaded: () => Promise<void> | void
) {
  const [uploading, setUploading] = useState(false);

  async function addPhotos(startIndex: number) {
    if (!ownerId || !propertyId || uploading) return;

    let ImagePicker: typeof ImagePickerType;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert(
        'Fotky sa nedajú pridať',
        'Táto verzia appky nemá modul na výber fotiek. Nainštaluj si najnovší build z TestFlightu.'
      );
      return;
    }

    setUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Chýba prístup k fotkám',
          'Bez prístupu k fotoalbumu sa fotky inzerátu nedajú pridať. Povoľ ho v Nastaveniach telefónu.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.6,
        base64: true,
      });
      if (result.canceled) return;

      let index = startIndex;
      const skipped: string[] = [];

      for (const asset of result.assets) {
        if (!asset.base64) {
          skipped.push('fotku sa nepodarilo načítať');
          continue;
        }
        const bytes = decodeBase64(asset.base64);
        if (bytes.byteLength > MAX_BYTES) {
          skipped.push(
            `jedna fotka má ${(bytes.byteLength / 1048576).toFixed(1)} MB (limit je 8 MB)`
          );
          continue;
        }

        const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
        const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const path = `${ownerId}/${propertyId}/${Date.now()}-${index}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType, upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const { error: rowErr } = await db()
          .from('media')
          .insert({ property_id: propertyId, url: pub.publicUrl, sort_order: index });
        if (rowErr) throw rowErr;

        index += 1;
      }

      await onUploaded();

      if (skipped.length > 0) {
        Alert.alert('Časť fotiek sa nenahrala', skipped.join('\n'));
      }
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[FOTKY] Nahratie zlyhalo: ${m}`);
      Alert.alert('Nahratie fotky zlyhalo', m);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(mediaId: string, url: string) {
    try {
      const { error } = await db().from('media').delete().eq('id', mediaId);
      if (error) throw error;

      // Súbor v Storage je druhý krok — ak zlyhá, riadok je už preč a
      // používateľ vidí správny stav. Osirelý súbor je menšie zlo než
      // fotka, ktorá sa „nedá zmazať".
      const marker = `/${BUCKET}/`;
      const at = url.indexOf(marker);
      if (at >= 0) {
        const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
        if (rmErr) console.log(`[FOTKY] Súbor ostal v Storage: ${rmErr.message}`);
      }
      await onUploaded();
    } catch (e: unknown) {
      const m = message(e);
      console.log(`[FOTKY] Zmazanie zlyhalo: ${m}`);
      Alert.alert('Fotku sa nepodarilo zmazať', m);
    }
  }

  return { uploading, addPhotos, removePhoto };
}
