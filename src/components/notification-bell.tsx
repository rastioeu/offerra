/**
 * Zvonček s počtom neprečítaných. Vzor MUTARK `app-header.tsx` —
 * zvonček v hlavičke, `unreadCount` ako bodka.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CountBadge } from '@/components/count-badge';
import { Icon } from '@/components/icon';
import { useNotifications } from '@/hooks/use-notifications';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';

export function NotificationBell() {
  const palette = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const { unread } = useNotifications();
  const { t } = useTranslation();

  if (!session) return null;

  return (
    <Pressable
      onPress={() => router.push('/oznamenia')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('oznamenia.unreadLabel', { count: unread }) : t('oznamenia.title')}>
      <View>
        <Icon name={unread > 0 ? 'bell.badge' : 'bell'} size={24} color={palette.textSecondary} />
        {/* Odznak je spoločný komponent — ten istý nosí tab „Správa". */}
        <CountBadge count={unread} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { fontSize: 22, lineHeight: 26 },
});
