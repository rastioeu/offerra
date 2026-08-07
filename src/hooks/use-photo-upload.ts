/**
 * Fotky inzerátu. Výber a nahratie rieši `@/lib/photo` (spoločné
 * s profilovkou) — vrátane krokového logovania, aby sa pri zlyhaní
 * vedelo, KDE to padlo.
 *
 * Cesta je `{ownerId}/{propertyId}/{časová pečiatka}.{ext}` — prvý segment
 * musí byť `auth.uid()`, presne to kontroluje Storage RLS.
 */
import { useState } from 'react';
import { Alert } from 'react-native';

import { BUCKET, photoErrorMessage, pickPhoto, uploadPhoto } from '@/lib/photo';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';

export function usePhotoUpload(
  ownerId: string | undefined,
  propertyId: string | undefined,
  onChanged: () => Promise<void> | void
) {
  const [uploading, setUploading] = useState(false);

  async function addPhoto(nextIndex: number) {
    if (!ownerId || !propertyId || uploading) return;
    setUploading(true);
    try {
      // Fotky nehnuteľností sú na šírku — 4:3 sedí kartám aj galérii.
      const photo = await pickPhoto([4, 3]);
      if (!photo) return; // zrušené používateľom

      const path = `${ownerId}/${propertyId}/${Date.now()}.${photo.ext}`;
      const url = await uploadPhoto(path, photo, false);

      const { error } = await db()
        .from('media')
        .insert({ property_id: propertyId, url, sort_order: nextIndex });
      if (error) throw error;

      console.log('[FOTKA] 7 HOTOVO');
      await onChanged();
    } catch (e: unknown) {
      const m = photoErrorMessage(e);
      console.log(`[FOTKA] ZLYHALO: ${m}`);
      Alert.alert('Fotku sa nepodarilo pridať', m);
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
        if (rmErr) console.log(`[FOTKA] Súbor ostal v Storage: ${rmErr.message}`);
      }
      await onChanged();
    } catch (e: unknown) {
      const m = photoErrorMessage(e);
      console.log(`[FOTKA] Zmazanie zlyhalo: ${m}`);
      Alert.alert('Fotku sa nepodarilo zmazať', m);
    }
  }

  return { uploading, addPhoto, removePhoto };
}
