/**
 * Prezývka — povinný krok po prvom prihlásení (vzor MUTARK `setup.tsx`:
 * LOGIN → NICKNAME → appka).
 *
 * Prečo povinný: ponuky sú verejné a podpisuje ich prezývka. Bez nej by
 * v zozname ponúk nebolo čo zobraziť. V DB je to vynútené cudzím kľúčom —
 * `property.owner_id` aj `property_offer.bidder_id` mieria na
 * `offerra.profile`, takže bez profilu sa nedá ani inzerovať, ani ponúkať.
 * Táto obrazovka je len pohodlná cesta k tomu istému pravidlu.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';
import { Button, CheckRow, ErrorNote, Field } from '@/components/ui';
import { isUsablePhone } from '@/lib/phone';
import { useProfile, saveProfile } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { suggestedFullName } from '@/lib/signin-name';
import { Radius, Spacing, Type, Weight } from '@/theme/tokens';

export default function PrezyvkaScreen() {
  const palette = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { reload } = useProfile();

  // Meno vie povedať Apple aj Google — netreba ho ťukať od nuly
  // (Rastio, 9.8.2026). Je to NÁVRH, nie zámok: pole ostáva bežné.
  const suggestedName = suggestedFullName(session);

  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState(suggestedName);

  // Session býva pri prvom renderi ešte nenačítaná. Návrh sa preto doplní
  // aj neskôr — ale LEN do prázdneho poľa. Prepísať to, čo už niekto
  // napísal, je presne tá chyba, ktorú sme opravovali v editore inzerátu.
  useEffect(() => {
    setFullName((cur) => (cur.trim() === '' ? suggestedName : cur));
  }, [suggestedName]);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adult, setAdult] = useState(false);
  const [ownName, setOwnName] = useState(false);

  const trimmed = nickname.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 3;

  async function submit() {
    if (!userId || busy) return;
    if (trimmed.length < 3) {
      setError('Prezývka musí mať aspoň 3 znaky.');
      return;
    }
    if (!adult) {
      setError('Bez potvrdenia veku sa registrovať nedá — inzerovať a podávať ponuky môžu len plnoletí.');
      return;
    }
    // Telefón je POVINNÝ (Rastio, 9.8.2026): appka stojí na tom, že sa
    // dvaja ľudia dohodnú telefonicky — pri obhliadke aj po prijatí
    // ponuky. Bez neho stráca hlavnú funkciu.
    if (!isUsablePhone(phone)) {
      setError(
        'Zadaj telefónne číslo. Bez neho sa s tebou druhá strana nemá ako spojiť ' +
          'pri obhliadke ani po prijatí ponuky.'
      );
      return;
    }
    if (!ownName) {
      setError(
        'Bez potvrdenia, že konáš vo vlastnom mene, sa registrovať nedá. ' +
          'Offerra je trh medzi ľuďmi, nie pre realitné kancelárie.'
      );
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await saveProfile(
      userId,
      {
        nickname: trimmed,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        // Čas potvrdenia, nie `true`: pri prípadnej neskoršej zmene
        // podmienok treba vedieť, KEDY to človek odklikol.
        age_confirmed_at: new Date().toISOString(),
        // Rovnaký dôvod ako pri veku: pri spore je podstatné KEDY to človek
        // potvrdil, nie len že áno.
        agent_declaration_at: new Date().toISOString(),
      },
      true
    );
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    // Presmerovanie robí brána v `_layout.tsx`, keď dorazí nový profil.
    await reload();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <FormScreen>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Ako ťa máme volať?</Text>
        <Text style={[styles.lead, { color: palette.textSecondary }]}>
          Pod prezývkou budú tvoje ponuky vidieť všetci — aj neprihlásení.
          Tvoje skutočné meno a telefón ostávajú skryté a odkryjú sa až vtedy,
          keď niekto tvoju ponuku prijme alebo si vypýta obhliadku.
        </Text>

        <Field
          label="Prezývka"
          hint="3 až 20 znakov. Vidí ju každý."
          value={nickname}
          onChangeText={setNickname}
          placeholder="napr. tichy_kupec"
        />
        {tooShort ? (
          <Text style={[styles.warn, { color: palette.warning }]}>Ešte aspoň {3 - trimmed.length} znaky.</Text>
        ) : null}

        <View style={[styles.divider, { borderTopColor: palette.border }]} />

        <Text style={[styles.section, { color: palette.textMuted }]}>
          SKRYTÉ ÚDAJE — ODKRYJÚ SA AŽ PRI DOHODE
        </Text>
        <Text style={[styles.note, { color: palette.textMuted }]}>
          Nevidí ich nikto — odkryjú sa výhradne druhej strane, a to až keď
          si vypýta obhliadku alebo keď sa prijme ponuka.
        </Text>

        <Field
          label="Meno a priezvisko (nepovinné)"
          hint={
            suggestedName
              ? 'Doplnili sme ho z tvojho prihlásenia. Pokojne ho prepíš.'
              : 'Doplniť sa dá aj neskôr v Nastaveniach.'
          }
          value={fullName}
          onChangeText={setFullName}
          placeholder="napr. Ján Novák"
        />
        <Field
          label="Telefón — povinné"
          hint="Bez neho sa s tebou druhá strana nemá ako dohodnúť na obhliadke ani po prijatí ponuky. Zostáva skrytý, kým na to nepríde čas."
          value={phone}
          onChangeText={setPhone}
          placeholder="+421 9xx xxx xxx"
          keyboardType="numbers-and-punctuation"
        />

        <View style={[styles.divider, { borderTopColor: palette.border }]} />

        {/* Tieto dve políčka MUSIA byť vykreslené.
            8.8.2026: stav `adult` existoval, validácia naň existovala, ale
            samotné políčko v obrazovke chýbalo — nikto nový sa preto nevedel
            zaregistrovať vôbec. Preto tu je aj tento komentár. */}
        <CheckRow
          checked={adult}
          onToggle={() => setAdult((v) => !v)}
          label="Mám 18 rokov alebo viac."
          hint="Inzerovať a podávať ponuky môžu len plnoletí."
        />

        <CheckRow
          checked={ownName}
          onToggle={() => setOwnName((v) => !v)}
          label="Konám vo vlastnom mene ako fyzická osoba — nie som realitná kancelária ani sprostredkovateľ."
          hint="Offerra je trh medzi ľuďmi. Nepravdivé potvrdenie je dôvod na zablokovanie účtu."
        />

        <ErrorNote error={error} />

      <Button title={busy ? 'Ukladám…' : 'Pokračovať'} onPress={submit} disabled={busy} />
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { ...Type.hero, fontWeight: Weight.bold },
  lead: { ...Type.bodyLg },
  warn: { ...Type.caption, fontWeight: Weight.medium, marginTop: -Spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  section: { ...Type.caption, fontWeight: Weight.bold, letterSpacing: 1 },
  note: { ...Type.caption, marginTop: -Spacing.sm },
  ageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tick: { ...Type.bodyMd, fontWeight: Weight.bold },
  ageText: { ...Type.bodyMd, flexShrink: 1 },
});
