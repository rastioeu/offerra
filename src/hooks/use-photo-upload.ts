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

import { useTranslation } from '@/i18n';
import { BUCKET, photoErrorMessage, pickPhotos, uploadPhoto } from '@/lib/photo';
import { MAX_PHOTOS, remainingSlots, takeWithinLimit } from '@/lib/photo-limits';
import { db } from '@/lib/property';
import { supabase } from '@/lib/supabase';

export function usePhotoUpload(
  ownerId: string | undefined,
  propertyId: string | undefined,
  onChanged: () => Promise<void> | void
) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  /** Pridá naraz viac fotiek (najviac do `MAX_PHOTOS` spolu s tými, čo už sú). */
  async function addPhotos(currentCount: number) {
    if (!ownerId || !propertyId || uploading) return;
    const slots = remainingSlots(currentCount);
    if (slots === 0) {
      Alert.alert(t('photo.limitTitle'), t('photo.limitReached', { max: MAX_PHOTOS }));
      return;
    }
    setUploading(true);
    setProgress(null);
    let saved = 0;
    try {
      const picked = await pickPhotos(t, slots);
      if (picked.length === 0) return; // zrušené používateľom
      const { accepted, dropped } = takeWithinLimit(picked, slots);

      const stamp = Date.now();
      for (let i = 0; i < accepted.length; i++) {
        setProgress({ done: i, total: accepted.length });
        const photo = accepted[i];
        // Index v ceste — všetky fotky z jedného výberu majú rovnaký `stamp`.
        const path = `${ownerId}/${propertyId}/${stamp}-${i}.${photo.ext}`;
        try {
          const url = await uploadPhoto(path, photo, false);
          const { error } = await db()
            .from('media')
            .insert({ property_id: propertyId, url, sort_order: currentCount + i });
          if (error) throw error;
          saved++;
        } catch (e: unknown) {
          // Nič sa nestratí potichu: hlásime, ktorá fotka zlyhala a koľko
          // ich už je uložených (tie ostávajú).
          const m = photoErrorMessage(t, e);
          console.log(`[FOTKY] ZLYHALO pri fotke ${i + 1}/${accepted.length}: ${m}`);
          Alert.alert(
            t('photo.addFailedTitle'),
            t('photo.partialFailed', { saved, total: accepted.length, n: i + 1, message: m })
          );
          return;
        }
      }

      console.log(`[FOTKY] 7 HOTOVO (${saved})`);
      if (dropped > 0) {
        Alert.alert(t('photo.limitTitle'), t('photo.droppedOverLimit', { dropped, max: MAX_PHOTOS }));
      }
    } catch (e: unknown) {
      const m = photoErrorMessage(t, e);
      console.log(`[FOTKY] ZLYHALO: ${m}`);
      Alert.alert(t('photo.addFailedTitle'), m);
    } finally {
      setUploading(false);
      setProgress(null);
      // Aj po čiastočnom zlyhaní sa zoznam obnoví — uložené fotky majú byť vidieť.
      if (saved > 0) await onChanged();
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
      const m = photoErrorMessage(t, e);
      console.log(`[FOTKA] Zmazanie zlyhalo: ${m}`);
      Alert.alert(t('photo.removeFailedTitle'), m);
    }
  }

  return { uploading, progress, addPhotos, removePhoto };
}
