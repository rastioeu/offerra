/**
 * Je prihlásený správcom? Pýta sa `offerra.is_admin()`, nie stĺpca —
 * rolu si používateľ nesmie prečítať ako „povolenie", ale ako fakt zo
 * servera. Tab sa podľa toho úplne SKRYJE, nie len zamkne.
 */
import { useEffect, useState } from 'react';

import { db } from '@/lib/property';
import { errorText } from '@/lib/errors';

export function useIsAdmin(userId: string | undefined): boolean {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await db().rpc('is_admin');
        if (error) throw error;
        if (!cancelled) setAdmin(Boolean(data));
      } catch (e: unknown) {
        console.log(`[ADMIN] Overenie roly zlyhalo: ${errorText(e)}`);
        if (!cancelled) setAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return admin;
}
