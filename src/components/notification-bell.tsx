/**
 * Zvonček s počtom neprečítaných. Vzor MUTARK `app-header.tsx` —
 * zvonček v hlavičke, `unreadCount` ako bodka.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotifications } from '@/hooks/use-notifications';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { Type, Weight } from '@/theme/tokens';

export function NotificationBell() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { unread } = useNotifications(session?.user.id);

  if (!session) return null;

  return (
    <Pressable
      onPress={() => router.push('/oznamenia')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Oznámenia, ${unread} neprečítaných` : 'Oznámenia'}>
      <View>
        <Text style={[styles.bell, { color: palette.textSecondary }]}>🔔</Text>
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: palette.danger, borderColor: palette.background }]}>
            <Text style={[styles.count, { color: palette.onPrimary }]}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { fontSize: 22, lineHeight: 26 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  count: { ...Type.caption, fontSize: 11, lineHeight: 13, fontWeight: Weight.bold },
});
