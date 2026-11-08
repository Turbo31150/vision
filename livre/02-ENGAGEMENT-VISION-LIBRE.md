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
Au 05/11/2026, l'engagement n'est **pas encore vrai**. Le fondateur garde aujourd'hui ces pouvoirs :

| Pouvoir actuel | Où on le voit | Source |
|---|---|---|
| Un seul producteur de blocs, M0, signe avec la clé du producteur | nœud `turbo-noeud` producteur sur M0, `producteur_pub` | mémoire `chaine-essai-noeud-portefeuille-2026-11-02` |
| Les validations de l'époque 0 sont internes (M0, M1, M6), et M1 est en panne | aucun témoin hors du domaine, aucun utilisateur tiers | `genesis_epoch_001/19_GAPS_AND_RISKS.md` § 4 (« décentralisation fictive ») |
| Les témoins (M6, M3) sont des machines de Franck | registre local des témoins (`temoins.json`, non publié) | mémoire `vision-dossier-avocat-mica-2026-11-04` |
| Les règles d'époque et de distribution sont fixées et modifiables par lui | `08_VISION_EPOCH_SPECIFICATION.md`, `09_TOKEN_EMISSION_MODEL.md` | audit genesis_epoch_001 |
| Le dépôt de code est sous son compte GitHub | `Turbo31150/vision` | mémoire `reference-sites-boutique-reseau-2026-11-02` |
| L'unique canal de vente est sa boutique commerciale | boutique systeme.io | même mémoire |

## 3. Les conditions qui rendent l'engagement vrai (à remplir AVANT le lancement)
- [ ] **Au moins 3 propriétaires indépendants** (étape B déjà écrite dans `vision-audit` : registre des propriétaires, fourche simulée sur clés jetables, bascule réussie sur une chaîne neuve ; étape C : au moins 4, f = 1). Rappelé par le Board vision-projet le 05/11 (7 citations).
- [ ] **Plusieurs producteurs indépendants**, hors des machines de Franck. La clé de M0 n'a plus aucun poids particulier, par une règle de la chaîne et non par une promesse.
- [ ] **Témoins tiers**, au moins un hors de son domaine (opérateurs indépendants, puis des utilisateurs). Aucune validation d'époque ne doit dépendre de M0.
- [ ] **Règles figées dans le code**, versionnées et publiques. Changer une règle passe par un vote vérifiable des participants, jamais par une clé d'administration.
- [ ] **Aucune clé « maître »** : pas de mise à jour unilatérale, pas de gel de comptes, pas de réémission.
- [ ] **Dépôt et nom de domaine** transférés à une structure à gouvernance partagée, ou rendus forkables sans permission.
- [ ] **Mémoire exportée en lecture seule** : les moissons et la mémoire de Franck sont publiées comme des données, sans droit d'écriture sur la chaîne.
- [ ] **Annonce publique datée** de l'abandon de pouvoir, signée, avec la liste ci-dessus cochée et ses preuves.
