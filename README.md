# Athlys — LM génératif et RPE, essai IRL

[APK Android 1.3.12 LM IRL](https://github.com/Lijw936/Athlys-downloads/releases/download/irl-20261115-43769766816/Athlys-1.3.12-LM-IRL.apk) · [Windows Coach/Club](https://github.com/Lijw936/Athlys-downloads/releases/tag/irl-20261115-43769766816) · [Preview Web protégée](https://athlys6-preview-k1h3ckz9g-adiceamlilian-6530.vercel.app/trial.html)

[88 décisions](docs/DECISIONS.md) · [Empreintes et preuves](docs/LIVRAISON-LM-IRL.json) · [Rapport de développement](docs/research/generative-rpe-development.json)

LFM2.5 externe : texte coach → source/hypothèses à confirmer → calibration numérique existante → explication et brouillon. Aucun poids sur téléphone/PC, pas de changement automatique des séances. Modèles de recherche RPE toujours désactivés.

68 tests logiciels locaux passent ; 67 dans le build client, puis un garde-fou serveur supplémentaire. Signature/source APK vérifiées, canary génératif réel et CORS vérifiés en ligne. Les cas de développement sont synthétiques et ne prouvent pas une compréhension parfaite.

Pour essayer : se connecter comme coach, ouvrir Nouveau programme, saisir un texte anonymisé et lancer l’analyse. Vérifier les propositions, choisir explicitement la cible et renseigner la durée, puis utiliser « Faire expliquer cette estimation par le LM ». Le brouillon conserve le contenu local ; nom et historique brut ne partent pas pour l’explication.

APK debug, portables non signés ; installation Phone, exécution Windows et parcours authentifié réel restent à tester. Pas de fine-tuning Athlys ni de validation terrain revendiqué. Licence du modèle et limites d’hébergement dans services/athlys-generative/README.md.
