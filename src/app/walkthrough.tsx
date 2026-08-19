/**
 * Úvodný walkthrough — PRED prihlásením, len pri prvom spustení appky
 * (Rastio, 14.8.2026). LOGIN → PREZÝVKA → UPOZORNENIA je onboarding PO
 * prihlásení; toto je krok PRED ním, takže nemôže byť stĺpec profilu —
 * príznak žije v `useWalkthrough()` (AsyncStorage, viď ten súbor prečo
 * provider a nie priame čítanie).
 *
 * OBSAH JE `HOW_STEPS` Z `how-it-works.ts`, ZÁMERNE ZDIEĽANÝ, NIE NOVÝ
 * TEXT: CLAUDE.md §8 vyžaduje, aby vysvetlenie appky žilo na JEDNOM
 * mieste a menilo sa v tom istom kroku ako appka. Tretia kópia toho istého
 * textu by bola presne to riziko, ktoré §8 vzniklo zabrániť.
 */
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { useWalkthrough } from '@/hooks/use-walkthrough';
import { useTheme } from '@/hooks/use-theme';
import { HOW_STEPS } from '@/lib/how-it-works';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WalkthroughScreen() {
  const palette = useTheme();
  const router = useRouter();
  const { markSeen } = useWalkthrough();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  async function finish() {
    await markSeen();
    router.replace('/login');
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    // Rovnaká ochrana ako v `property-tabs.tsx` — hlásený pád „Cannot read
    // property 'contentOffset' of null" (Rastio, 19.8.2026).
    const x = e.nativeEvent?.contentOffset?.x;
    if (x == null) return;
    const i = Math.round(x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  }

  function next() {
    if (index >= HOW_STEPS.length - 1) {
      void finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_WIDTH, animated: true });
  }

  const isLast = index === HOW_STEPS.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.top}>
        <Button title="Preskočiť" onPress={() => void finish()} variant="outline" />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}>
        {HOW_STEPS.map((step) => (
          <View key={step.title} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.surface, borderColor: palette.accent }]}>
              <Icon name={step.icon as never} size={40} color={palette.accentDeep} />
            </View>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{step.title}</Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>{step.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {HOW_STEPS.map((step, i) => (
          <View
            key={step.title}
            style={[
              styles.dot,
              { backgroundColor: i === index ? palette.accentDeep : palette.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.bottom}>
        <Button title={isLast ? 'Začať' : 'Ďalej'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.md },
  pager: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { ...Type.hero, fontWeight: Weight.bold, textAlign: 'center' },
  body: { ...Type.bodyLg, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, paddingBottom: Spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
});
