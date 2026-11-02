# VISION · nœud, portefeuille et partage de puissance (réseau d'essai)

> **Chaîne d'ESSAI.** Les unités n'ont aucune valeur, ne se transfèrent pas d'un compte à l'autre et ne sont ni vendues ni offertes au public.

VISION relie des machines équipées de cartes graphiques pour faire tourner des modèles d'IA en local. Chaque machine installe un **nœud** et son **portefeuille** ; le travail fait par une machine n'est récompensé qu'après avoir été **revérifié par une autre**.

- Site du projet : <https://turbo31150.github.io/vision/>
- Explorateur de la chaîne (blocs, nœuds, connexion par adresse) : <https://turbo31150.github.io/vision/explorateur/>

## Ce que contient ce dépôt

| Dossier | Rôle |
|---|---|
| `noeud/turbo-noeud` | Le nœud : rejoue et vérifie la chaîne, échange avec ses pairs, lit le miroir public, sert le portefeuille sur `127.0.0.1` |
| `noeud/ui/` | Le portefeuille de bureau : solde, dépenses signées, compte par adresse, partage de puissance, réseau, blocs |
| `chaine/jeton-chaine` | Les règles de la chaîne : blocs signés, racines de Merkle, soldes, dépenses (20 % détruits), forfaits, époques de récompense |
| `installateur/` | Le modèle de l'installateur et son constructeur reproductible |
| `outils/exporter-chaine-publique` | Ce que le nœud producteur publie dans `docs/chaine/` (le miroir) |
| `docs/` | Le site du projet, l'explorateur, le miroir de la chaîne et l'installateur |

## Rejoindre

Il faut Linux, Python 3.10 ou plus récent et `ssh-keygen` (paquet openssh-client). Rien ne demande de droits d'administrateur.

```bash
curl -LO https://turbo31150.github.io/vision/installer-noeud-vision.sh
curl -LO https://turbo31150.github.io/vision/installer-noeud-vision.sh.sha256
sha256sum -c installer-noeud-vision.sh.sha256
less installer-noeud-vision.sh            # un script shell, suivi d'une archive du code de ce dépôt
bash installer-noeud-vision.sh --nom mon-noeud
```

Ensuite :

1. Le portefeuille s'ouvre sur `http://127.0.0.1:8861/` (ou par l'icône « VISION Portefeuille »). Deux clés ed25519 ont été créées sur votre machine, une pour le nœud et une pour le portefeuille ; elles ne la quittent jamais.
2. Le nœud lit la chaîne sur le miroir public et la **rejoue entièrement** depuis le bloc 0, avec la clé du producteur épinglée dans l'installateur. Un miroir ne peut rien lui imposer.
3. Onglet **Mon compte** : connectez-vous avec une adresse (`te1…`) pour voir ce que la chaîne sait d'elle : solde, abonnement, dépenses, nœuds rattachés, matériel partagé et gains.
4. Onglet **Nœud** → **Préparer ma demande d'inscription** : une transaction signée par la clé de votre nœud (données publiques seulement) s'ouvre en ticket sur ce dépôt. Le producteur l'importe et votre nœud entre au registre.

Désinstaller : `bash installer-noeud-vision.sh --desinstaller` (les clés restent dans `~/.local/share/turbo-noeud`).

### Vérifier l'installateur vous-même

L'installateur se reconstruit à partir de ce dépôt ; la clé publique du producteur et l'empreinte du bloc 0 sont lues dans `docs/chaine/info.json` :

```bash
installateur/construire-installateur
cat docs/installer-noeud-vision.sh.sha256
```

## Comment ça marche

- **Blocs** : hauteur, empreinte du précédent, racine de Merkle des transactions, empreinte des soldes, signature du producteur (`ssh-keygen -Y`, espace dédié). Un nœud rejoue toute la chaîne avant d'accepter un bloc.
- **Unités d'usage** : un service rendu par le réseau se règle par une dépense signée par le portefeuille ; 20 % sont détruits, 80 % reviennent à la réserve qui récompense les machines. Il n'existe aucune instruction de transfert entre comptes.
- **Forfaits** : dans la conception, les unités ne viennent que d'un forfait payé en euros et converti. Pendant l'essai, seules des factures `ESSAI-` sont acceptées : aucune somme n'est encaissée.
- **Partage de puissance** : chaque nœud annonce lui-même sa machine (cartes, mémoire, cœurs, charge) ; les annonces sont vérifiées puis additionnées.
- **Récompense** : par époque hebdomadaire (frontière le mercredi 12:00 UTC). Points de travail (secondes d'une étape validée par un reçu indépendant, doublées si le résultat est rejoué à l'identique) et points de validation (un par reçu signé). Le budget de l'époque se partage au prorata ; il est divisé par deux chaque année ; le reliquat reste en réserve.

La vérification des reçus de travail s'appuie sur un module privé du producteur, qui n'est pas publié ici. Sans lui, un nœud vérifie tout le reste : liens, racines, signatures, soldes, règles et clôtures d'époque.

## Limites connues

- Un seul producteur de blocs (preuve d'autorité) ; pas encore de témoin tenu par un autre propriétaire.
- Transport entre nœuds en HTTP simple : les blocs et les transactions sont signés, le transport n'est pas chiffré. Pas de traversée de box (NAT) : hors du réseau local, un nœud lit le miroir public.
- Aucun audit externe à ce jour.

Les critiques et les questions sont bienvenues : ouvrez un ticket.
