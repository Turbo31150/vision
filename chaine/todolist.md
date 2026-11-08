# Todolist Projet VISION & Chaîne Multimédia

Mise à jour du 08/11/2026 : chaque case est confrontée à une mesure du jour. Chemins relatifs à `livrables/` sauf mention.
Versions précédentes conservées : `todolist.md.avant-20261108` (original du 03/11) et `_mis-de-cote-20261108/p0-3-todolist/` (version de 01:38).

- [x] **Sauvegarde SQL des bases locales** : dernier instantané complet `~/jarvis-sql-backups/sql_20261107_202705` = **15 bases `.zst`** (et non 17), `MANIFEST.sha256` vérifié et `zstd -t` 15/15 OK le 08/11. Les instantanés suivants du 07/11 (21:12, 21:57, 22:42) ne contiennent qu'une base chacun. Volet « vectorisation » : non mesuré par cette case.
- [x] **Coupe de la fin figée de `Capture_video_coupee.mp4`** (`~/Vidéos/Captures vidéo/`) : exécutée à 348,8 s dans `Capture_video_coupee_348s.mp4` (348,83 s, 29 Mo, 0 segment figé résiduel mesuré par `freezedetect`). L'original de 360,02 s est conservé intact.
- [x] **Script podcast double voix** : version sur mesures `vision-lecture-20261107/podcast-corrige-20261108.md` (2 nœuds actifs, 15 bases). `chaine/podcast_script.md` (03/11) garde deux chiffres faux (« 4 nœuds actifs », « 17 bases validées ») : ne plus l'utiliser.
- [x] **Synthèse vocale double voix (TTS local)** : `vision-lecture-20261107/voix-podcast-20261108/briefing-complet.wav` = 51,3 s (pistes `01-voix1` à `05-voix1`, 48,8 s cumulées), produite le 08/11 à 01:16 après le script corrigé (01:15) ; la 1re réplique dure 7,3 s, cohérent avec le texte corrigé.
- [x] **Vidéo de démonstration du portefeuille VISION** : `~/jarvis/data/cockpit-v4/video_atelier/sorties/20261104-080337-b5c5.mp4` (27,3 s, 1920×1080, voix `ff_siwis`, sous-titres `.srt`) ; la chaîne y apparaît par le ruban de blocs. Aucune vidéo de démonstration propre à la chaîne n'a été trouvée.
- [ ] **Assemblage final haute qualité** (upscaling M6 Quadro, illustrations) : non fait. Source, piste audio et cible à décider par Franck. Les « photos stock du rapport GitHub » ne sont pas identifiées : seules les 10 illustrations de `vision-public/docs/images/` existent.
