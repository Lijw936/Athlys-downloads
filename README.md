# Athlys — LM génératif et RPE, essai IRL

[Registre des 88 décisions](docs/DECISIONS.md) · [JSON](docs/decisions.json) · [Rapport de développement](docs/research/generative-rpe-development.json) · [Releases](https://github.com/Lijw936/Athlys-downloads/releases)

LM LFM2.5 externe : textecoach → valeurs source/hypothèses à confirmer → calibration numérique existante → explication et brouillon. Pas de poids sur téléphone/PC, pas de modification automatique des séances. Modèles de recherche RPE toujours désactivés.

67 tests logiciels passent et un test de packaging isolé. Les cas de développement sont synthétiques et ne prouvent pas une compréhension parfaite. Pas de fine-tuning Athlys ni de validation terrain revendiqué. Licence du modèle et limites d’hébergement documentées dans services/athlys-generative/README.md.
