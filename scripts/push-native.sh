#!/usr/bin/env bash
# Zapne alebo vypne NATÍVNU časť push notifikácií.
#
# Kód v `src/` je napísaný tak, aby bez modulu len ticho nefungoval, takže
# sa tu prepínajú len DVE veci: závislosť v `package.json` a config plugin
# v `app.json`. Práve tie menia EAS fingerprint, a teda to, či OTA dorazí
# na existujúci build.
#
#   scripts/push-native.sh on    — pred `eas build`
#   scripts/push-native.sh off   — kým sa build nespraví, nech ide OTA
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-}" in
  on)
    npx expo install expo-notifications
    python3 - <<'PY'
import json, io
d = json.load(open('app.json', encoding='utf-8'))
pl = d['expo']['plugins']
if not any(isinstance(x, list) and x[0] == 'expo-notifications' for x in pl):
    pl.append(['expo-notifications', {'color': '#C9703B', 'defaultChannel': 'default'}])
io.open('app.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
PY
    echo "Push je ZAPNUTÝ. Pozor: mení fingerprint → treba NOVÝ BUILD."
    ;;
  off)
    python3 - <<'PY'
import json, io
d = json.load(open('package.json', encoding='utf-8'))
d['dependencies'].pop('expo-notifications', None)
io.open('package.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
d = json.load(open('app.json', encoding='utf-8'))
d['expo']['plugins'] = [x for x in d['expo']['plugins']
                        if not (isinstance(x, list) and x[0] == 'expo-notifications')]
io.open('app.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
PY
    echo "Push je ODLOŽENÝ. OTA znovu dorazí na existujúci build."
    ;;
  *) echo "Použitie: $0 on|off" >&2; exit 1 ;;
esac
