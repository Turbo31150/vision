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
/1yEdHAAqAIA
