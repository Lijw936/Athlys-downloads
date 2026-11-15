# Athlys — LM génératif externe expérimental

LFM2.5-350M Q6_K (LiquidAI), révision et SHA256 dans contracts.mjs. Licence LFM Open License v1.0 jointe : usage IRL/recherche ; l’usage commercial a une condition de revenu annuel. Aucun poids n’est modifié ou distribué dans les apps ; aucune donnée Athlys utilisée pour fine-tuning. llama.cpp b12420 vérifié par empreinte.

Pipeline : LM pour interprétation qualitative de fragments anonymisés ; décodeur source pour les valeurs RPE écrites ; hypothèse CR10 selon un barème de travail Athlys non validé (easy3/moderate5/hard7/maximal10), uniquement si le texte exprime une intensité et après choix explicite du coach. Les séries, durées et distances ne deviennent pas RPE. Les échelles Borg ne sont pas converties. La cible de séance reste inconnue tant que le coach ne la choisit pas.

Le noyau numérique existant calcule le RPE projeté à partir de l’historique local autorisé. Pour l’explication, l’app envoie uniquement un instantané de chiffres et la méthode, sans identité, historique brut ou texte du programme. Le LM reçoit une consigne qualitative et reformule ; les chiffres de la réponse sont produits hors LM par le service. Le brouillon n’invente pas un exercice et ne modifie rien automatiquement.

Build : `node services/athlys-generative/bootstrap.mjs && npm run test:public-client`.
Démarrage : `node --max-old-space-size=48 services/athlys-generative/main.mjs`.
Variables : mêmes SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ATHLYS_ALLOWED_ORIGINS et ATHLYS_FREE_ONLY=true que le secours ; ATHLYS_MODEL_USAGE=research_trial ; PORT fourni par l’hôte. Aucun service-role. Modèle et runtime téléchargés seulement sur l’hôte externe. Plan gratuit Render, jamais de surclassement automatique.

Une génération à la fois ; requêtes répétées idempotentes et liées à l’acteur/texte/rôle, autorisation fraîche sur chaque poll. Programme fragmenté, progression visible, durée bornée ; annulation locale et expiration du travail sans poll. État en mémoire éphémère, sans journalisation des textes. Les jobs terminés expirent ; pas de compteur journalier imposé, mais ressources, sommeil et quotas d’hébergement subsistent.

Santé : `/health` expose statut, modèle, mesure mémoire et canary fixe synthétique de trois usages. Le canary n’accepte aucune requête libre non authentifiée et ne valide pas la qualité scientifique. Avant réussite du canary, le service conserve le secours. Si le processus dépasse le budget mémoire, il est arrêté et le secours est annoncé.

Le LM seul a produit des erreurs en développement. Les labels qualitatifs restent imparfaits et la source fait autorité ; les propositions ne sont pas des RPE ressentis ou des estimations cliniques. Les modèles RPE de recherche restent désactivés. Pas de compréhension parfaite, de disponibilité illimitée ni de test physique revendiqués.

Retour arrière : conserver le secours et l’APK1.3.10, désactiver externalGenerativeEnabled ou retirer la variante ; aucune migration ou suppression de données.
