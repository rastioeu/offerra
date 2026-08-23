/**
 * Právne texty v appke — ten istý obsah ako na webe.
 *
 * Zdroj je `src/lib/legal.ts` a HTML pre GitHub Pages sa z neho
 * GENERUJE. Appka teda nemôže tvrdiť niečo iné než verejná stránka,
 * na ktorú odkazuje App Store Connect.
 *
 * Prečo to je aj v appke, keď existuje web: Apple chce, aby sa
 * používateľ k podmienkam dostal bez opustenia aplikácie, a offline to
 * musí fungovať tiež.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { getLegalDoc, LEGAL_UPDATED, type LegalDoc } from '@/lib/legal';
import { Radius, Shadow, Spacing, Type, Weight } from '@/theme/tokens';

/** Verejná verzia toho istého dokumentu — tú vidí aj Apple. */
const WEB_BASE = 'https://rastioeu.github.io/offerra_web';

export default function LegalScreen() {
  const palette = useTheme();
  const { t, language } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const key = (doc === 'terms' ? 'terms' : 'privacy') as LegalDoc['slug'];
  const content = getLegalDoc(key, language);
  const other = getLegalDoc(key === 'privacy' ? 'terms' : 'privacy', language);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: content.title,
          headerTintColor: palette.primary,
          headerStyle: { backgroundColor: palette.surface },
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>{content.lead}</Text>
        <Text style={[styles.updated, { color: palette.textMuted }]}>
          {t('legal.updatedOn', { date: LEGAL_UPDATED })}
        </Text>

        {content.sections.map((s) => (
          <View
            key={s.heading}
            style={[
              styles.card,
              Shadow.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.heading, { color: palette.textPrimary }]}>{s.heading}</Text>
            {s.paragraphs.map((p) => (
              <Text key={p.slice(0, 40)} style={[styles.para, { color: palette.textSecondary }]}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <Pressable
          onPress={() => Linking.openURL(`${WEB_BASE}/${key}.html`)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.linkText, { color: palette.link }]}>
            {t('legal.openWebVersion')}
          </Text>
        </Pressable>

        <Text style={[styles.otherLabel, { color: palette.textMuted }]}>{other.title}</Text>
        <Pressable
          onPress={() => Linking.openURL(`${WEB_BASE}/${other.slug}.html`)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.linkText, { color: palette.link }]}>{`${WEB_BASE}/${other.slug}.html`}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  lead: { ...Type.bodyLg },
  updated: { ...Type.caption, marginTop: -Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  heading: { ...Type.subtitle, fontWeight: Weight.bold },
  para: { ...Type.bodyMd },
  link: { paddingVertical: Spacing.sm },
  linkText: { ...Type.bodyMd, fontWeight: Weight.semibold },
  otherLabel: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1, marginTop: Spacing.sm },
});
