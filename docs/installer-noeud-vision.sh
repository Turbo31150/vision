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
