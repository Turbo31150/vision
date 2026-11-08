# Todolist Projet VISION & Chaîne Multimédia

Mise à jour du 08/11/2026 : chaque case est confrontée à une mesure du jour. Chemins relatifs à `livrables/` sauf mention.
Versions précédentes conservées dans les archives locales de suivi.

- [x] **Sauvegarde SQL des bases locales** : dernier instantané complet `sql_20261107_202705` (sauvegardes SQL locales du producteur, non publiées) = **15 bases `.zst`** (et non 17), `MANIFEST.sha256` vérifié et `zstd -t` 15/15 OK le 08/11. Les instantanés suivants du 07/11 (21:12, 21:57, 22:42) ne contiennent qu'une base chacun. Volet « vectorisation » : non mesuré par cette case.
- [x] **Coupe de la fin figée de `Capture_video_coupee.mp4`** : exécutée à 348,8 s dans `Capture_video_coupee_348s.mp4` (348,83 s, 29 Mo, plus aucun gel en fin de fichier selon `freezedetect` n=0,003 d=2 ; restent des plans fixes internes de capture d'écran, le plus long 158,7 → 173,5 s, à couper ou non au montage). L'original de 360,02 s est conservé intact.
- [x] **Script podcast double voix** : version sur mesures [`podcast_script_corrige.md`](./podcast_script_corrige.md) (2 nœuds actifs, 15 bases). `chaine/podcast_script.md` (03/11) garde deux chiffres faux (« 4 nœuds actifs », « 17 bases validées ») : ne plus l'utiliser.
- [x] **Synthèse vocale double voix (TTS local)** : `briefing-complet.wav` (local, non publié) = 51,3 s (pistes `01-voix1` à `05-voix1`, 48,8 s cumulées), produite le 08/11 à 01:16 après le script corrigé (01:15) ; la 1re réplique dure 7,3 s, cohérent avec le texte corrigé.
- [x] **Vidéo de démonstration du portefeuille VISION** : `20261104-080337-b5c5.mp4` (atelier vidéo local, non publiée) (27,3 s, 1920×1080, voix `ff_siwis`, sous-titres `.srt`) ; la chaîne y apparaît par le ruban de blocs. Aucune vidéo de démonstration propre à la chaîne n'a été trouvée.
- [ ] **Assemblage final haute qualité** (upscaling M6 Quadro, illustrations) : non fait. Source, piste audio et cible à décider par Franck. Les « photos stock du rapport GitHub » ne sont pas identifiées : seules les 10 illustrations de `vision-public/docs/images/` existent.
