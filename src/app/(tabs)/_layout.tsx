import { Tabs } from 'expo-router/tabs';
import { type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { Type, Weight } from '@/theme/tokens';

/**
 * 4 taby podľa navrhnutej štruktúry (zadanie Marco, bod 5):
 * Nehnuteľnosti / Dopyty / Pridať / Profil.
 *
 * Klasické `Tabs` z `expo-router/tabs` — rovnako ako MUTARK
 * (`src/app/main/_layout.tsx`). Šablóna `create-expo-app` ponúka
 * `unstable-native-tabs`, tie sme vedome NEPOUŽILI: MUTARK je na
 * klasických a cieľom je prenosnosť vzorov medzi projektmi.
 *
 * Ikony sú zatiaľ textové glyfy — Fáza 0 nemá ikonovú sadu a ťahať sem
 * `expo-symbols` (iOS-only SF Symbols) bez fallbacku by rozbilo Android/web.
 */
export default function TabsLayout() {
  const palette = useTheme();
  const { session } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarLabelStyle: { ...Type.caption, fontWeight: Weight.medium },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nehnuteľnosti',
          tabBarIcon: ({ color }) => <TabGlyph name="house" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dopyty"
        options={{
          title: 'Dopyty',
          tabBarIcon: ({ color }) => <TabGlyph name="envelope" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pridat"
        options={{
          title: 'Pridať',
          tabBarIcon: ({ color }) => <TabGlyph name="plus.circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabGlyph name="person.circle" color={color} />,
        }}
      />
      {/* `href: null` tab úplne ODSTRÁNI, nielen zamkne jeho obsah —
          bežný používateľ o ňom nemá ako vedieť. Server ho aj tak
          nepustí ďalej: každá admin funkcia sa pýta na rolu. */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Správa',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <TabGlyph name="checkmark.seal" color={color} />,
        }}
      />
    </Tabs>
  );
}

// `tabBarIcon` dodáva `ColorValue` (nie `string`) — natívne platformy vedia
// posielať aj nepriehľadné handle-y, nie len hex. `Icon` chce `string`,
// takže sa berie len keď to hex naozaj je.
function TabGlyph({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} size={24} color={typeof color === 'string' ? color : undefined} />;
}
