import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Rovnaký vzor ako MUTARK `src/lib/supabase.ts` — kľúče výhradne cez
 * `EXPO_PUBLIC_*` (lokálne `.env`, na builde EAS Environment Variables),
 * nikdy hardcodované v repe.
 *
 * Offerra zdieľa Supabase projekt s MUTARKom (`vxqvpgzwefcehugmhaft`) —
 * teda aj Auth používateľov. Dáta má však vo VLASTNEJ schéme `offerra`
 * (MUTARK je v `public`), viď OFFERRA_REGISTER.md, Fáza 0.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Chýba EXPO_PUBLIC_SUPABASE_URL alebo EXPO_PUBLIC_SUPABASE_ANON_KEY (.env).'
  );
}

// Expo Router SSR (statický web export/dev render) beží v Node bez `window` —
// AsyncStorage aj predvolený localStorage adaptér tam padajú s
// "window is not defined". Prevzaté z MUTARKu.
const isServer = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
