/**
 * Celoobrazovkový modál so spoločnou hlavičkou.
 *
 * PREČO EXISTUJE — koreňová príčina, ktorú Rastio nahlásil dvakrát:
 *
 * `SafeAreaView` z `react-native-safe-area-context` vnútri `<Modal>`
 * **nedostane správne odsadenie**. Modál sa na iOS vykresľuje vo vlastnej
 * natívnej hierarchii MIMO `SafeAreaProvider`, takže kontext k nemu
 * nedosiahne a insety vyjdú nula. Nadpis a „Zavrieť" potom sedia pod
 * dynamic islandom — a keďže sú prekryté, nedá sa na ne ani ťuknúť.
 *
 * Nebola to teda chyba jednej obrazovky. Tri modály (nahlásenie, výber
 * obce, oslovenie k dopytu) mali každý vlastnú hlavičku a rovnakú chybu.
 * Preto sa to nerieši ďalším odsadením, ale tým, že hlavička je JEDNA.
 *
 * Odsadenie sa berie z `useSafeAreaInsets()` volaného TU — tento komponent
 * žije v bežnom strome pod providerom, takže hodnoty sú správne, a do
 * modálu ich odovzdá ako obyčajný `paddingTop`.
 */
import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Icon } from './icon';

export function ModalScreen({
  visible,
  onClose,
  title,
  children,
  closeLabel,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const close = closeLabel ?? t('ui.close');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View
        style={[
          styles.root,
          {
            backgroundColor: palette.background,
            // Bezpečná zóna hore je jediné, čo tu naozaj hrozí; dole si
            // vlastné odsadenie rieši obsah, ktorý tam niečo prilepené má.
            paddingTop: insets.top,
          },
        ]}>
        <View style={[styles.head, { borderBottomColor: palette.border }]}>
          {/* DVE cesty von, nie jedna. Šípka vľavo je to, kam na iOS siahne
              palec zo zvyku; „Zavrieť" vpravo je to, čo človek hľadá očami.
              Obe robia to isté — na obrazovke, z ktorej sa nedalo vrátiť,
              je jedna cesta málo. */}
          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={t('ui.back')}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="chevron.left" size={22} color={palette.primary} />
          </Pressable>

          <Text numberOfLines={1} style={[styles.title, { color: palette.textPrimary }]}>
            {title}
          </Text>

          <Pressable
            onPress={onClose}
            hitSlop={16}
            accessibilityRole="button"
            style={({ pressed }) => [styles.closeWrap, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.close, { color: palette.link }]}>{close}</Text>
          </Pressable>
        </View>

        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    // Výška hlavičky je rovnaká ako natívna na ostatných obrazovkách,
    // aby modál nepôsobil ako iná appka.
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4, borderRadius: Radius.sm },
  title: { flex: 1, ...Type.subtitle, fontWeight: Weight.bold },
  closeWrap: { padding: 4 },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
});
