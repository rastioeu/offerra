# Build 1.3.0 spadol — chýba schopnosť Push Notifications na App ID

**Dátum:** 9. augusta 2026 · **Stav: 🔴 blokované na tvojej strane, 30 sekúnd práce**

---

## Čo sa stalo

Build `9f6e8fc7` spadol po dvoch minútach vo fáze Xcode:

```
Provisioning profile "*[expo] com.offerra.app AppStore 2026-08-07T08:00:04.306Z"
  doesn't include the Push Notifications capability.
Provisioning profile ...
  doesn't include the aps-environment entitlement.
```

Je to presne tá vec, ktorú som pred buildom označil za jedinú neistú —
len som čakal, že si ju EAS dorieši sám. Nedoriešil.

**Príčina:** provisioning profil je zo **7. augusta**, teda z čias pred
pushom. Vtedy appka žiadne push notifikácie nemala, takže profil tú
schopnosť neobsahuje. `expo-notifications` teraz pridáva iOS entitlement
`aps-environment` a Xcode odmietne podpísať niečo, na čo profil neznie.

---

## Prečo som to nespravil sám

Skúsil som dve cesty a obe skončili tam istom:

1. **Build s automatickou synchronizáciou** — EAS vypísal *„All
   credentials are ready to build"* a profil ani nepozrel. Schopnosti
   synchronizuje len vtedy, keď profil VYTVÁRA; existujúci nechá tak.
   Ten druhý build som **hneď zrušil**, aby zbytočne nespotreboval čas.
2. **`eas credentials`** — je výhradne interaktívny, iné rozhranie nemá
   (overené cez `--help`). Neinteraktívne sa profil regenerovať nedá.

Kľúč `.p8`, ktorý na stroji je, je pre **Sign in with Apple**, nie
App Store Connect API — na správu kredenciálov ho použiť nemožno.

Je to teda prístup k Apple účtu, a to je podľa nášho pravidla tvoja
strana. Nehádam a nepokúšam sa to obísť.

---

## Čo treba spraviť — dva kroky

### 1. Zapni schopnosť na App ID (~30 sekúnd)

```
developer.apple.com  →  Certificates, Identifiers & Profiles
  →  Identifiers  →  com.offerra.app
  →  zaškrtni  Push Notifications
  →  Save
```

Apple sa spýta na potvrdenie, že sa tým zneplatnia existujúce profily —
to je v poriadku, presne o to ide.

### 2. Nechaj EAS vyrobiť nový profil

Toto je interaktívne, takže to musíš spustiť ty. V tejto session stačí
napísať:

```
! npx eas credentials --platform ios
```

a prejsť: **iOS → production → Build Credentials → Provisioning Profile
→ Set up a new provisioning profile** (prípadne najprv *Delete*).

EAS si pri vytváraní nového profilu schopnosti z App ID **zosynchronizuje
sám** — vtedy sa `aps-environment` do profilu dostane.

*Ak by ti to pýtalo prihlásenie do Apple:* session z 7. augusta na stroji
uložená je, ale môže byť po expirácii.

---

## Potom už len jeden príkaz

Keď to budeš mať, napíš a spustím:

```
npx eas build --platform ios --profile production
```

Repozitár je pripravený a čistý:

| | |
|---|---|
| verzia / build | **1.3.0 / 5** |
| bundle | `com.offerra.app` |
| plugin `expo-notifications` | ✅ v `app.json` |
| závislosť v `package.json` aj `package-lock.json` | ✅ |
| commit | `40e3db0`, pushnutý |

---

## Jedna vec, ktorú som medzitým využil

Kým je build zastavený, presunul som `.claude/` z lokálneho
`.git/info/exclude` **do `.gitignore`** — tam patrí, lebo repozitár je
verejný a pracovné súbory agenta v ňom nemajú čo robiť.

Presne toto som **odkladal**, lebo zmena `.gitignore` mení runtime, a to
by odstrihlo existujúci build od OTA. Teraz je jediné okno, keď je to
zadarmo: nový build ešte neexistuje, takže niet čo odstrihnúť.

Runtime buildu 1.3.0 sa tým posunul:

| | |
|---|---|
| pôvodne dokumentovaný | `b9c2ff9e…` |
| **skutočný runtime buildu #5** | **`24919867e1bcc84715b1b4d6998cb6b27886e5d9`** |

Je to zároveň **tretie meranie**, ktoré potvrdzuje, že `.gitignore` je
vstupom do EAS fingerprintu. Zapamätané, nie odhadnuté.

---

## Čo to NEohrozuje

- **Tvoj build #4 beží ďalej normálne.** Runtime `451767ea` sa nemení
  a všetko, čo doň patrilo, sa doňho už doručilo.
- **Nič v databáze sa nemení.** Push je pripravený na strane servera
  a otestovaný (16/16, Expo našu správu prijalo). Chýba len podpis appky.
- Zrušený build kredit nespotreboval celý — zastavil som ho pár sekúnd
  po štarte.

---

## Poznámka pre budúcnosť

Zapisujem si to aj do registra: **pridanie natívneho modulu, ktorý žiada
iOS entitlement, vyžaduje regeneráciu provisioning profilu.** EAS to
neurobí sám, ak profil už existuje — a chyba sa prejaví až vo fáze Xcode,
teda po dvoch minútach buildu, nie pri kontrole kredenciálov.
