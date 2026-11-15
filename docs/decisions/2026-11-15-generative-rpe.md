# LM génératif externe pour conversion texte/RPE et explication de projection

Objectif : rendre réellement génératif le service externe gratuit, avec une variante client et un build vérifiables. Propriétaire : orchestration Athlys. Périmètre : serveur expérimental Render, assistant/conversion coach et explication textuelle des projections ; pas de modèle sur téléphone/PC, pas de production/vitrine.

Invariants : 0 €, aucune API payante ou rotation de compte ; rôles Auth/RLS et consentements préservés, aucune donnée nominative ou historique brut automatiquement envoyé au LM. La projection numérique reste une estimation du noyau existant, jamais une valeur inventée par le LM. Séparer RPE écrit, proposé/inféré, projeté et ressenti déclaré ; citation et validation coach avant utilisation. Les trois modèles RPE de recherche et leurs gates scientifiques restent hors app.

Hypothèse à vérifier : Qwen3 0.6B en quantification compacte peut fournir des propositions en français dans la mémoire gratuite, contrairement au Qwen2.5 précédent. Tester mémoire totale moteur+service et sorties réelles avant choix. Modèle préentraîné : ne pas revendiquer un entraînement Athlys ni une compréhension parfaite.

Acceptation : artefacts/révisions/licences figés ; benchmark synthétique de développement séparant syntaxe, fidélité des citations, RPE de bloc/séance, inconnus et texte de projection sans chiffres ajoutés. Validation stricte des sorties, abstention explicite et secours distant. Tests de service/client et construction APK. Déploiement expérimental après contrôles et canary fixe réel, sans endpoint public de génération libre.

Risques : mémoire/latence du gratuit, petites capacités linguistiques, hallucinations et prompt injection. Réponses structurées contraintes, valeurs source/calculées faisant autorité, limites de contexte et une inférence à la fois. Reporter les résultats négatifs, ne pas retoucher les labels du test pour obtenir un score.

Retour arrière : conserver service et préversion 1.3.10, désactiver le moteur génératif ou revenir au commit serveur e4f1c9520237846329bb50be675b0b08d6eb8512. Aucun schéma ni suppression de données.
