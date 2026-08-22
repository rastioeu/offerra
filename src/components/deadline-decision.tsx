/**
 * Výzva majiteľovi po uzávierke ponúk.
 *
 * PREČO VZNIKLA (Rastio, 17.8.2026): zmerané v dátach — DVA inzeráty boli
 * ACTIVE s uzávierkou prešlou 2 a 5 dní. Sedeli v katalógu ako živé, ponuku
 * na ne už nikto podať nemohol (uzávierku drží aj RLS) a majiteľovi to
 * NIKTO nepovedal. Odpočet dobehol a ďalej sa nestalo nič.
 *
 * Táto karta je ten chýbajúci posledný krok: ukáže sa LEN majiteľovi, LEN
 * keď uzávierka prešla a inzerát je ešte živý, a dá tri cesty von —
 * vybrať z ponúk, predĺžiť uzávierku, archivovať.
 *
 * Texty a to, ktoré akcie sa ponúknu, rozhoduje `deadlineOutcome()`
 * v `src/lib/deadline.ts` (čistá funkcia, test `scripts/check-deadline.ts`).
 * Tento komponent iba kreslí — aby sa ten istý text nezačal písať dvakrát.
 *
 * Prečo tu NIE JE push ani notifikácia: appka nemá serverovú časť, takže
 * kým ju majiteľ neotvorí, nemá ju kto poslať. Sľubovať upozornenie, ktoré
 * nemá kto odoslať, je presne to, čo CLAUDE.md §12a zakazuje.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast, useUndoToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n';
import { errorText } from '@/lib/errors';
import { db, EXTEND_DAYS, extendedDeadline, type DeadlineOutcome } from '@/lib/property';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export function DeadlineDecision({
  outcome,
  propertyId,
  onDone,
  onPickOffer,
}: {
  outcome: DeadlineOutcome;
  propertyId: string;
  /** Znovu načítať inzerát po zmene — bez toho by karta ostala visieť. */
  onDone: () => void;
  /** Otvorí správu ponúk (`/ponuky/[id]`), kde majiteľ rozhoduje. */
  onPickOffer: () => void;
}) {
  const palette = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  // Archivácia je nezvratná akcia → rovnaké undo okno ako „Zmazať inzerát"
  // a „Odmietnuť ponuku" (Fáza 23). Nie Alert: jeden vzor, nie dva.
  const confirmWithUndo = useUndoToast();

  if (outcome.kind !== 'AWAITING_OWNER') return null;

  async function extend() {
    const iso = extendedDeadline(EXTEND_DAYS);
    console.log(`[UZÁVIERKA] Predlžujem inzerát ${propertyId} do ${iso}`);
    const { error } = await db().from('property').update({ offer_deadline: iso }).eq('id', propertyId);
    if (error) {
      // §2: chyba sa NESMIE stratiť. Používateľ vidí celý dôvod.
      console.log(`[UZÁVIERKA] Predĺženie zlyhalo: ${errorText(error)}`);
      toast(t('deadlineDecision.extendFailed', { error: errorText(error) }), 'warning');
      return;
    }
    toast(t('deadlineDecision.extendedToast', { days: EXTEND_DAYS }));
    onDone();
  }

  function askArchive() {
    confirmWithUndo(t('deadlineDecision.archivePending'), async () => {
      console.log(`[UZÁVIERKA] Archivujem inzerát ${propertyId}`);
      const { error } = await db().from('property').update({ status: 'ARCHIVED' }).eq('id', propertyId);
      if (error) {
        console.log(`[UZÁVIERKA] Archivácia zlyhala: ${errorText(error)}`);
        toast(t('deadlineDecision.archiveFailed', { error: errorText(error) }), 'warning');
        return;
      }
      toast(t('deadlineDecision.archivedToast'));
      onDone();
    });
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: palette.surface, borderColor: palette.warning },
      ]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{outcome.title}</Text>
      <Text style={[styles.body, { color: palette.textSecondary }]}>{outcome.body}</Text>

      <View style={styles.actions}>
        {outcome.actions.map((action) => {
          const primary = action === 'PICK_OFFER';
          const label =
            action === 'PICK_OFFER'
              ? t('deadlineDecision.pickOfferAction')
              : action === 'EXTEND'
                ? t('deadlineDecision.extendAction', { days: EXTEND_DAYS })
                : t('deadlineDecision.archiveAction');
          const onPress =
            action === 'PICK_OFFER' ? onPickOffer : action === 'EXTEND' ? () => void extend() : askArchive;

          return (
            <Pressable
              key={action}
              onPress={onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: primary ? palette.accentDeep : palette.surface,
                  borderColor: primary ? palette.accentDeep : palette.borderStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.actionText,
                  { color: primary ? palette.onPrimary : palette.textSecondary },
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: { ...Type.title, fontWeight: Weight.bold },
  body: { ...Type.bodyMd },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  action: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  actionText: { ...Type.bodyMd, fontWeight: Weight.semibold },
});
