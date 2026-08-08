/**
 * Posledná záchrana — keď niekde v strome spadne JavaScript.
 *
 * Bez tohto React odmontuje CELÝ strom a ostane biela obrazovka bez
 * jediného slova. Presne to je „nestane sa nič", čo CLAUDE.md §2 zakazuje:
 * používateľ nevie, či je to chyba, alebo sa appka len načítava.
 *
 * Ukazuje CELÚ surovú chybu vrátane komponentu, v ktorom padla — nie
 * peknú náhradu. Pri hlásení chyby je to jediné, čo má cenu.
 *
 * Musí to byť TRIEDA: `componentDidCatch` nemá funkčný ekvivalent.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type, Weight } from '@/theme/tokens';

type Props = { children: ReactNode };
type State = { error: Error | null; stack: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do konzoly ide všetko — v TestFlighte sa to dá vytiahnuť cez Xcode
    // Console, aj keď obrazovku nikto neodfotí.
    console.log(`[PÁD] ${error.name}: ${error.message}`);
    console.log(`[PÁD] Komponent: ${info.componentStack ?? '(neznámy)'}`);
    this.setState({ stack: info.componentStack ?? null });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    // Téma sa tu nečíta cez hook — hook v triede nie je a v chybovom
    // stave je aj tak lepšie nezávisieť na ničom ďalšom, čo môže padnúť.
    const palette = Colors.light;

    return (
      <View style={[styles.wrap, { backgroundColor: palette.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: palette.danger }]}>Appka spadla</Text>
          <Text style={[styles.lead, { color: palette.textSecondary }]}>
            Odfoť túto obrazovku a pošli ju — je v nej presne to, čo treba na opravu.
          </Text>

          <View style={[styles.box, { borderColor: palette.danger, backgroundColor: palette.surface }]}>
            <Text style={[styles.mono, { color: palette.textPrimary }]}>
              {error.name}: {error.message}
            </Text>
          </View>

          {stack ? (
            <View style={[styles.box, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[styles.monoSmall, { color: palette.textSecondary }]}>{stack.trim()}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => this.setState({ error: null, stack: null })}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: palette.accentDeep }]}>
            <Text style={[styles.buttonText, { color: palette.onPrimary }]}>Skúsiť znova</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xxl * 2, gap: Spacing.md },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyMd },
  box: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  mono: { ...Type.bodyMd, fontFamily: 'Courier' },
  monoSmall: { ...Type.caption, fontFamily: 'Courier' },
  button: {
    borderRadius: Radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  buttonText: { ...Type.button, fontWeight: Weight.bold },
});
