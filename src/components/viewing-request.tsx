/**
 * „Dohodnúť obhliadku" — výber dňa a hodiny.
 *
 * ZÁMERNE bez natívneho date pickera, z rovnakého dôvodu ako
 * `deadline-picker.tsx`: `@react-native-community/datetimepicker` je
 * natívny modul, ktorý v aktuálnom TestFlight builde NIE JE — pridať ho
 * znamená nový build a nové podanie. Obhliadka sa aj tak dohaduje v tvare
 * „zajtra poobede", nie na minútu.
 *
 * Termín je NÁVRH. Majiteľ ho môže potvrdiť aj s posunom a záujemca to
 * potom buď príjme, alebo obhliadku zruší.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

import { Button, ErrorNote, Field, Label } from './ui';

/** Najbližších 14 dní. Ďalej sa obhliadky reálne nedohadujú a dlhší
 *  zoznam by sa už len skroloval. */
function nextDays(count: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function dayLabel(d: Date, index: number): string {
  if (index === 0) return 'Dnes';
  if (index === 1) return 'Zajtra';
  return d.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

export function ViewingRequest({
  visible,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (at: Date, note: string | null) => void;
}) {
  const palette = useTheme();
  const days = nextDays(14);
  const [dayIndex, setDayIndex] = useState(1); // zajtra — dnes býva neskoro
  const [hour, setHour] = useState(17);
  const [note, setNote] = useState('');

  const when = new Date(days[dayIndex]);
  when.setHours(hour, 0, 0, 0);
  // Dnešok po zvolenej hodine je termín v minulosti — nemá zmysel ho poslať.
  const inPast = when.getTime() < Date.now();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modal, { backgroundColor: palette.background }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Dohodnúť obhliadku</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
            <Text style={[styles.close, { color: palette.link }]}>Zavrieť</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.lead, { color: palette.textSecondary }]}>
            Navrhni termín. Majiteľ ho potvrdí, alebo navrhne iný — a až vtedy
            si navzájom uvidíte kontakt.
          </Text>

          <Label>Deň</Label>
          <View style={styles.row}>
            {days.map((d, i) => (
              <Chip key={i} label={dayLabel(d, i)} active={i === dayIndex} onPress={() => setDayIndex(i)} />
            ))}
          </View>

          <Label>Hodina</Label>
          <View style={styles.row}>
            {HOURS.map((h) => (
              <Chip key={h} label={`${h}:00`} active={h === hour} onPress={() => setHour(h)} />
            ))}
          </View>

          <Field
            label="Odkaz (nepovinné)"
            hint="Napríklad že ti vyhovuje aj iný čas."
            value={note}
            onChangeText={setNote}
            placeholder="Viem prísť aj cez víkend."
            multiline
          />

          {inPast ? (
            <Text style={[styles.warn, { color: palette.danger }]}>
              Tento termín je už za nami — vyber neskorší.
            </Text>
          ) : null}

          <ErrorNote error={error} />

          <Button
            title="Požiadať o obhliadku"
            onPress={() => onSubmit(when, note.trim() || null)}
            disabled={busy || inPast}
            loading={busy}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? palette.primary : palette.surface,
          borderColor: active ? palette.primary : palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? palette.onPrimary : palette.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { ...Type.title, fontWeight: Weight.bold },
  close: { ...Type.bodyLg, fontWeight: Weight.semibold },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  lead: { ...Type.bodyLg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  chipText: { ...Type.bodyMd, fontWeight: Weight.semibold },
  warn: { ...Type.bodyMd, fontWeight: Weight.medium },
});
