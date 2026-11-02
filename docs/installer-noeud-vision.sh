#!/usr/bin/env bash
# Installateur du nœud VISION (réseau d'essai, chaîne TURBO-essai) et de son portefeuille de bureau.
# Tout s'installe dans l'espace de l'utilisateur, sans sudo. Unités d'essai sans valeur ; rien n'est vendu.
#
#   bash installer-noeud-turbo-essai.sh [--nom NOM] [--pair URL]... [--miroir URL]... [--api 127.0.0.1:PORT] [--p2p ADRESSE:PORT]
#                                       [--prefixe DOSSIER] [--sans-systemd] [--sans-bureau]
#                                       [--p2p-public http://IP:PORT] [--cockpit URL]   (adresse annoncée aux pairs)
#   bash installer-noeud-turbo-essai.sh --role producteur --chaine D --bloc0 F --cle-producteur K [--vision D]
#   bash installer-noeud-turbo-essai.sh --desinstaller [--prefixe DOSSIER]     (les clés du portefeuille restent)
#
# Construit le 2026-11-02 · bloc 0 épinglé e5ef70671ea77ffe452dcdc9670ca498cfd86ffd06404dccc7c9d0783e922267 · producteur AAAAC3NzaC1lZDI1NTE5AAAA…
set -euo pipefail
PRODUCTEUR_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJQ782mQOcqO0AkeTQspSsD6/fkVifm1qkDcIcM6L4Tp'
BLOC0_EMPREINTE='e5ef70671ea77ffe452dcdc9670ca498cfd86ffd06404dccc7c9d0783e922267'
PAIR_DEFAUT=''
MIROIR_DEFAUT='https://turbo31150.github.io/vision/chaine'
DEPOT='Turbo31150/vision'
MIROIRS=()
ROLE=pair; NOM=$(hostname -s | tr 'A-Z' 'a-z' | tr -c 'a-z0-9-\n' '-' | cut -c1-30); PAIRS=()
API=127.0.0.1:8861; P2P=127.0.0.1:8862; PREFIXE="$HOME/.local/share/turbo-noeud"
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
UNITE="turbo-noeud-$(basename "$PREFIXE" | tr -c 'a-z0-9-\n' '-').service"
[ "$PREFIXE" = "$HOME/.local/share/turbo-noeud" ] && UNITE=turbo-noeud.service

if [ "$DESINSTALLER" = 1 ]; then
  systemctl --user disable --now "$UNITE" 2>/dev/null || true
  [ -f "$PREFIXE/noeud.pid" ] && kill "$(cat "$PREFIXE/noeud.pid")" 2>/dev/null || true
  rm -f "$HOME/.config/systemd/user/$UNITE" "$HOME/.local/share/applications/turbo-portefeuille.desktop"
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
chmod 755 "$PREFIXE/code/turbo-noeud" "$PREFIXE/code/jeton-chaine" "$PREFIXE/code/ouvrir-portefeuille"
[ -f "$PREFIXE/cles/noeud_ed25519" ] || ssh-keygen -q -t ed25519 -N "" -C "turbo-noeud-$NOM" -f "$PREFIXE/cles/noeud_ed25519"
[ -f "$PREFIXE/portefeuille/portefeuille_ed25519" ] || ssh-keygen -q -t ed25519 -N "" -C "turbo-portefeuille-$NOM" -f "$PREFIXE/portefeuille/portefeuille_ed25519"

python3 - "$PREFIXE/config.json" <<PY
import json, sys
role = "$ROLE"
cfg = {"nom": "$NOM", "role": role, "api": "$API", "p2p": "$P2P",
       "pairs": [p for p in """${PAIRS[*]:-}""".split() if p],
       "miroirs": [m for m in """${MIROIRS[*]:-}""".split() if m], "depot": "$DEPOT" or None,
       "bloc0_empreinte": "$BLOC0_EMPREINTE", "producteur_pub": "$PRODUCTEUR_PUB",
       "outil_chaine": "$PREFIXE/code/jeton-chaine", "ui": "$PREFIXE/code/ui",
       "cle_noeud": "$PREFIXE/cles/noeud_ed25519", "portefeuille": "$PREFIXE/portefeuille/portefeuille_ed25519",
       "chaine": "${CHAINE:-$PREFIXE/chaine}", "vision": "$VISION", "cadence_s": 5,
       "p2p_public": "$P2P_PUBLIC" or None, "cockpit": "$COCKPIT" or None,
       "services": [
         {"id": "mission-sauvegardes", "titre": "Mission vérifiée : contrôle des sauvegardes", "prix": 120, "noeud": "m6"},
         {"id": "inference-1k", "titre": "Inférence locale, 1 000 jetons (qwen2.5-7b)", "prix": 4, "noeud": "m0"},
         {"id": "vision-image", "titre": "Lecture d'image par le modèle de vision", "prix": 15, "noeud": "m6"},
         {"id": "audit-parc", "titre": "Mission d'audit vérifiée par deux machines", "prix": 60, "noeud": "m1"}]}
if role == "producteur":
    cfg.update(bloc0="$BLOC0", cle_producteur="$CLE_PROD")
json.dump(cfg, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
PY

LANCE="/usr/bin/env python3 -B $PREFIXE/code/turbo-noeud --config $PREFIXE/config.json"
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
  cat > "$HOME/.local/share/applications/turbo-portefeuille.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=VISION Portefeuille
Comment=Nœud et portefeuille du réseau d'essai VISION
Exec=$PREFIXE/code/ouvrir-portefeuille $API $PREFIXE
Icon=$PREFIXE/code/ui/icone.svg
Terminal=false
Categories=Finance;Network;
DESK
  chmod 755 "$HOME/.local/share/applications/turbo-portefeuille.desktop"
  dire "icône « VISION Portefeuille » ajoutée au menu des applications"
fi

for i in $(seq 1 30); do
  if python3 -c "import urllib.request,sys; urllib.request.urlopen('http://$API/api/etat', timeout=2)" 2>/dev/null; then
    ADR=$(python3 -c "import json,urllib.request; print(json.load(urllib.request.urlopen('http://$API/api/portefeuille'))['adresse'])")
    dire "nœud prêt · portefeuille http://$API/ · adresse $ADR"
    exit 0
  fi
  sleep 1
done
echo "le nœud ne répond pas sur http://$API/ : voir journalctl --user -u $UNITE ou $PREFIXE/noeud.log" >&2
exit 1
__CHARGE__
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
fD58Pnw+fD581n/+f/1ENsgAWAIA
