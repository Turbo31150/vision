#!/usr/bin/env bash
# Installateur du nœud VISION (réseau d'essai, chaîne VISION-essai) et de son portefeuille de bureau.
# Tout s'installe dans l'espace de l'utilisateur, sans sudo. Unités d'essai sans valeur ; rien n'est vendu.
#
#   bash installer-noeud-vision.sh [--nom NOM] [--pair URL]... [--miroir URL]... [--api 127.0.0.1:PORT] [--p2p ADRESSE:PORT]
#                                       [--prefixe DOSSIER] [--sans-systemd] [--sans-bureau]
#                                       [--p2p-public http://IP:PORT] [--cockpit URL]   (adresse annoncée aux pairs)
#   bash installer-noeud-vision.sh --role producteur --chaine D --bloc0 F --cle-producteur K [--vision D]
#   bash installer-noeud-vision.sh --desinstaller [--prefixe DOSSIER]     (les clés du portefeuille restent)
#
# Construit le 2026-11-02 · bloc 0 épinglé 0f777921fe8377009c7f69515713e111c2f527ec7cff32844f1ca5c2249bb046 · producteur AAAAC3NzaC1lZDI1NTE5AAAA…
set -euo pipefail
PRODUCTEUR_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC/xh5PCUsfeopF0YqAzSC7SzNPrG3UiuV9u8d5INsub'
BLOC0_EMPREINTE='0f777921fe8377009c7f69515713e111c2f527ec7cff32844f1ca5c2249bb046'
PAIR_DEFAUT=''
MIROIR_DEFAUT='https://turbo31150.github.io/vision/chaine'
DEPOT='Turbo31150/vision'
MIROIRS=()
ROLE=pair; NOM=$(hostname -s | tr 'A-Z' 'a-z' | tr -c 'a-z0-9-\n' '-' | cut -c1-30); PAIRS=()
API=127.0.0.1:8861; P2P=127.0.0.1:8862; PREFIXE="$HOME/.local/share/vision-noeud"
P2P_PUBLIC=""; COCKPIT=""; SYSTEMD=1; BUREAU=1; CHAINE=""; BLOC0=""; CLE_PROD=""; VISION=/nonexistent; DESINSTALLER=0
while [ $# -gt 0 ]; do
  case "$1" in
    --role) ROLE=$2; shift 2;; --nom) NOM=$2; shift 2;; --pair) PAIRS+=("$2"); shift 2;; --miroir) MIROIRS+=("$2"); shift 2;;
    --api) API=$2; shift 2;; --p2p) P2P=$2; shift 2;; --prefixe) PREFIXE=$2; shift 2;;
    --sans-systemd) SYSTEMD=0; shift;; --sans-bureau) BUREAU=0; shift;;
    --chaine) CHAINE=$2; shift 2;; --bloc0) BLOC0=$2; shift 2;; --cle-producteur) CLE_PROD=$2; shift 2;;
    --vision) VISION=$2; shift 2;; --desinstaller) DESINSTALLER=1; shift;;
    --p2p-public) P2P_PUBLIC=$2; shift 2;; --cockpit) COCKPIT=$2; shift 2;;
    *) echo "option inconnue : $1" >&2; exit 2;;
  esac
done
dire() { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
UNITE="vision-noeud-$(basename "$PREFIXE" | tr -c 'a-z0-9-\n' '-').service"
[ "$PREFIXE" = "$HOME/.local/share/vision-noeud" ] && UNITE=vision-noeud.service

if [ "$DESINSTALLER" = 1 ]; then
  systemctl --user disable --now "$UNITE" 2>/dev/null || true
  [ -f "$PREFIXE/noeud.pid" ] && kill "$(cat "$PREFIXE/noeud.pid")" 2>/dev/null || true
  rm -f "$HOME/.config/systemd/user/$UNITE" "$HOME/.local/share/applications/vision-portefeuille.desktop"
  rm -rf "$PREFIXE/code"
  systemctl --user daemon-reload 2>/dev/null || true
  dire "nœud arrêté et retiré ; clés et chaîne conservées dans $PREFIXE (portefeuille/ = votre clé, à garder)"
  exit 0
fi

[[ "$NOM" =~ ^[a-z0-9][a-z0-9._-]{0,47}$ ]] || { echo "nom de nœud invalide : $NOM" >&2; exit 2; }
[[ "$API" == 127.0.0.1:* ]] || { echo "le portefeuille n'écoute que sur 127.0.0.1" >&2; exit 2; }
command -v python3 >/dev/null || { echo "python3 manquant" >&2; exit 2; }
python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' || { echo "python3 ≥ 3.10 requis" >&2; exit 2; }
command -v ssh-keygen >/dev/null || { echo "ssh-keygen manquant (paquet openssh-client)" >&2; exit 2; }
if [ "$ROLE" = producteur ]; then
  for f in "$CHAINE" "$BLOC0" "$CLE_PROD"; do [ -e "$f" ] || { echo "producteur : $f absent" >&2; exit 2; }; done
else
  [ ${#PAIRS[@]} -eq 0 ] && [ -n "$PAIR_DEFAUT" ] && PAIRS=("$PAIR_DEFAUT")
  [ ${#MIROIRS[@]} -eq 0 ] && [ -n "$MIROIR_DEFAUT" ] && MIROIRS=("$MIROIR_DEFAUT")
  [ ${#PAIRS[@]} -eq 0 ] && [ ${#MIROIRS[@]} -eq 0 ] && { echo "aucun pair ni miroir : donnez --pair URL ou --miroir URL" >&2; exit 2; }
  for m in "${MIROIRS[@]}"; do [[ "$m" =~ ^https://[A-Za-z0-9._-]+(/[A-Za-z0-9._/-]*)?$ ]] || { echo "miroir invalide (https seulement) : $m" >&2; exit 2; }; done
fi

dire "installation du nœud « $NOM » ($ROLE) dans $PREFIXE"
umask 077
mkdir -p "$PREFIXE"/{code,cles,portefeuille,chaine}
sed -n '/^__CHARGE__$/,$p' "$0" | tail -n +2 | base64 -d | tar -xz -C "$PREFIXE/code"
chmod 755 "$PREFIXE/code/vision-noeud" "$PREFIXE/code/vision-chaine" "$PREFIXE/code/ouvrir-portefeuille"
[ -f "$PREFIXE/cles/noeud_ed25519" ] || ssh-keygen -q -t ed25519 -N "" -C "vision-noeud-$NOM" -f "$PREFIXE/cles/noeud_ed25519"
[ -f "$PREFIXE/portefeuille/portefeuille_ed25519" ] || ssh-keygen -q -t ed25519 -N "" -C "vision-portefeuille-$NOM" -f "$PREFIXE/portefeuille/portefeuille_ed25519"

python3 - "$PREFIXE/config.json" <<PY
import json, sys
role = "$ROLE"
cfg = {"nom": "$NOM", "role": role, "api": "$API", "p2p": "$P2P",
       "pairs": [p for p in """${PAIRS[*]:-}""".split() if p],
       "miroirs": [m for m in """${MIROIRS[*]:-}""".split() if m], "depot": "$DEPOT" or None,
       "bloc0_empreinte": "$BLOC0_EMPREINTE", "producteur_pub": "$PRODUCTEUR_PUB",
       "outil_chaine": "$PREFIXE/code/vision-chaine", "ui": "$PREFIXE/code/ui",
       "cle_noeud": "$PREFIXE/cles/noeud_ed25519", "portefeuille": "$PREFIXE/portefeuille/portefeuille_ed25519",
       "chaine": "${CHAINE:-$PREFIXE/chaine}", "vision": "$VISION", "cadence_s": 5,
       "p2p_public": "$P2P_PUBLIC" or None, "cockpit": "$COCKPIT" or None,
       "services": []}
if role == "producteur":
    cfg.update(bloc0="$BLOC0", cle_producteur="$CLE_PROD")
json.dump(cfg, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
PY

LANCE="/usr/bin/env python3 -B $PREFIXE/code/vision-noeud --config $PREFIXE/config.json"
if [ "$SYSTEMD" = 1 ] && systemctl --user show-environment >/dev/null 2>&1; then
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/$UNITE" <<UNIT
[Unit]
Description=Nœud VISION « $NOM » (réseau d'essai) et portefeuille http://$API/
After=network-online.target

[Service]
ExecStart=$LANCE
Restart=on-failure
RestartSec=5
Nice=5

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable "$UNITE" >/dev/null 2>&1
  systemctl --user restart "$UNITE"   # une réinstallation charge le nouveau code
  dire "service $UNITE actif"
else
  nohup $LANCE >> "$PREFIXE/noeud.log" 2>&1 &
  echo $! > "$PREFIXE/noeud.pid"
  dire "nœud lancé en arrière-plan (pid $(cat "$PREFIXE/noeud.pid"), journal $PREFIXE/noeud.log)"
fi

if [ "$BUREAU" = 1 ]; then
  mkdir -p "$HOME/.local/share/applications"
  cat > "$HOME/.local/share/applications/vision-portefeuille.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=VISION Portefeuille
Comment=Nœud et portefeuille du réseau d'essai VISION
Exec=$PREFIXE/code/ouvrir-portefeuille $API $PREFIXE
Icon=$PREFIXE/code/ui/icone.svg
Terminal=false
Categories=Finance;Network;
DESK
  chmod 755 "$HOME/.local/share/applications/vision-portefeuille.desktop"
  dire "icône « VISION Portefeuille » ajoutée au menu des applications"
fi

for i in $(seq 1 30); do
  if python3 -c "import urllib.request,sys; urllib.request.urlopen('http://$API/api/etat', timeout=2)" 2>/dev/null; then
    ADR=$(python3 -c "import json,urllib.request; print(json.load(urllib.request.urlopen('http://$API/api/portefeuille'))['adresse'])")
    dire "nœud prêt · portefeuille http://$API/ · adresse $ADR"
    dire "pour dépenser ou vous inscrire : $PREFIXE/code/ouvrir-portefeuille $API $PREFIXE (l'adresse seule donne une lecture sans signature)"
    exit 0
  fi
  sleep 1
done
echo "le nœud ne répond pas sur http://$API/ : voir journalctl --user -u $UNITE ou $PREFIXE/noeud.log" >&2
exit 1
__CHARGE__
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
AgA=
