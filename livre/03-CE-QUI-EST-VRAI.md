# Ombre et lumière : ce qui est vrai derrière le récit

Annexe du 05/11/2026. Le récit est une fiction. Cette page sépare ce qui est mesuré de ce qui est annoncé.

> **Rappel réseau d'essai** : sur la chaîne d'essai VISION, les unités sont exclusivement des crédits techniques d'essai sans valeur marchande, non transférables et non vendus.

## Le livre
- **« Le code de papa »** : récit original, 10 795 octets, sha256 `0cf5b8f5…4c067`. C'est l'histoire d'un père et de **sa fille** Luna, avec son ami Théo.
- Le texte a servi de **document d'essai pour la compression** le 27/11/2025, dans le dépôt GitHub `Turbo31150/encodage-vectoriel-gpu` (commit `3de3fbf`, clé `PAPA_LUNA_HERITAGE`).
- **« Ombre et lumière »** reprend la métaphore du master prompt Symbiose : l'IA est l'ombre, l'humain la lumière. Elle est devenue en 2026 le thème visuel de `Turbo OS` (07/06) puis de VISION v6 (04/11).

## La compression (mesurée le 04/11/2026)
| Sur le texte Luna (10 795 o) | Taille obtenue | Sans perte |
|---|---|---|
| xz -9 | 5 000 o | oui |
| zstd -19 | 4 953 o | oui |
| compacteur du dépôt (LZMA + Base85) | 6 315 o | oui |
| encodeur « matriciel » (GPU) | 26 556 à 27 616 o (le texte gonfle) | oui sur ce texte, avec perte au-delà d'environ 2 500 symboles distincts |

- **« 100 Go en 1 Go »** : aucune trace ni mesure retrouvée dans les dépôts, les moissons ou les journaux. La moisson du 04/11 n'a pas non plus trouvé de trace de « 100 Go → 10 Mo ».
- **« Essai photo réussi »** : aucune trace retrouvée. Si l'essai existe, donner le dossier ou le fichier pour qu'on le mesure contre xz et zstd.
- **« C'est que du code, beaucoup moins lourd »** : décrire une image par le programme qui la produit peut être bien plus léger que l'image elle-même. Mais ce n'est vrai que pour des images que l'on sait regénérer, pas pour une photo réelle. Non mesuré ici.
- **La vraie compression du récit** : on compresse la **compréhension** (résumé, points forts, questions, renvoi vers l'original), pas les octets. C'est le sujet du chapitre 1. C'est aussi ce que fait la commande `compacter` (voir le LISEZMOI du dossier).

## La mémoire et l'historique (déjà rédigés et sourcés)
- Chronologie complète, du master prompt Symbiose (2025) et de SYMBIOSE (26/09/2025) jusqu'au canon (15/10/2026) et à la GRAINE (21-22/10/2026), avec les dépôts GitHub et leurs commits : `10-genesis-01_ORIGIN_AND_LINEAGE.md` (corpus interne Turbo OS). Le domaine du Board origines de Turbo OS est vectorisé.
- Audit Genesis, époque 001 (20 livrables) : `/mnt/nvme-data/vision/audits/genesis_epoch_001/`.

## « VISION libre, aucun pouvoir du fondateur »
Voir `02-ENGAGEMENT-VISION-LIBRE.md`. L'engagement est posé, mais il n'est pas encore vrai : il y a un producteur unique (M0), seulement des témoins internes, et les règles sont modifiables par le fondateur. La liste des conditions à remplir avant le lancement y figure.
