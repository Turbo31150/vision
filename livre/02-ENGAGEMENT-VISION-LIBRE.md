# VISION sera libre : le fondateur n'aura aucun pouvoir une fois le réseau lancé

Version du 05/11/2026, rédigée à la demande de Franck (05/11, vers 00:40).

> **Rappel réseau d'essai** : sur la chaîne d'essai actuelle, les unités sont exclusivement des crédits techniques d'essai sans valeur marchande, non transférables et non vendus.

## 1. L'engagement, tel que Franck le pose
> « VISION sera donc libre, et je n'aurai aucun pouvoir une fois lancé. »
> « Si je suis sur le réseau, c'est ma mémoire exportée. »

Concrètement :
1. Une fois VISION lancé, Franck ne pourra plus rien modifier seul : ni les règles d'époque, ni la distribution, ni le contenu d'un bloc, ni la liste des validateurs.
2. S'il reste présent sur le réseau, ce sera comme un nœud ordinaire, qui porte sa mémoire exportée (moissons, dépôts GitHub depuis leur création, points de contrôle). Il n'aura aucun droit particulier.
3. Ce sont les témoins et les utilisateurs qui vérifient, et non le fondateur.

## 2. L'écart avec aujourd'hui (mesuré, à ne pas cacher)
Au 05/11/2026, l'engagement n'est **pas encore vrai**. Le réseau d'essai initial présente encore ces dépendances :

| Pouvoir actuel | Où on le voit | Source |
|---|---|---|
| Un seul producteur de blocs signe avec la clé initiale | nœud producteur initial, `producteur_pub` | spécification de la chaîne d'essai v0.3 |
| Les validations de l'époque 0 sont des nœuds de test internes | aucun témoin hors du réseau d'essai initial | analyse des risques v0.3 (« autonomie progressive ») |
| Les témoins actuels sont des nœuds de test initiaux | registre local des témoins (`temoins.json`, non publié) | dossier d'analyse réglementaire MiCA |
| Les règles d'époque et de distribution sont fixées par le protocole initial | spécification des époques et du modèle d'émission | feuille de route technique v0.3 |
| Le dépôt de code initial est hébergé sous le compte du projet | dépôt GitHub public de référence | cartographie des versions |
| Le canal d'accès initial passe par la vitrine officielle | boutique officielle | feuille de route de distribution |

## 3. Les conditions qui rendent l'engagement vrai (à remplir AVANT le lancement)
- [ ] **Au moins 3 propriétaires indépendants** (étape B : registre des propriétaires, fourche simulée sur clés jetables, bascule réussie sur une chaîne neuve ; étape C : au moins 4, f = 1).
- [ ] **Plusieurs producteurs indépendants**, hors des machines de test initiales. La clé initiale n'a plus aucun poids particulier, par une règle de consensus de la chaîne et non par une promesse.
- [ ] **Témoins tiers**, au moins un hors de l'infrastructure initiale (opérateurs indépendants, puis des utilisateurs). Aucune validation d'époque ne doit dépendre d'un seul opérateur.
- [ ] **Règles figées dans le code**, versionnées et publiques. Changer une règle passe par un vote vérifiable des participants, jamais par une clé d'administration.
- [ ] **Aucune clé « maître »** : pas de mise à jour unilatérale, pas de gel de comptes, pas de réémission.
- [ ] **Dépôt et nom de domaine** transférés à une structure à gouvernance partagée, ou rendus forkables sans permission.
- [ ] **Mémoire exportée en lecture seule** : les moissons et la mémoire du fondateur sont publiées comme des données, sans droit d'écriture sur la chaîne.
- [ ] **Annonce publique datée** de l'abandon de pouvoir, signée, avec la liste ci-dessus cochée et ses preuves.

## 4. Point pour l'avocat (dossier MiCA)
- Si l'absence d'émetteur ou de prestataire identifiable devient réelle, elle peut compter dans la qualification au regard du règlement (UE) 2023/1114 (MiCA). Le considérant consacré aux services fournis « de manière entièrement décentralisée » est **absent de notre corpus local** : à faire lire et trancher par l'avocat.
- **Tension à trancher** : une vente par une boutique commerciale identifiée désigne un offrant identifiable, même si le réseau est libre.
- Tant que les cases du § 3 ne sont pas cochées, aucune communication ne doit présenter VISION comme décentralisé.
