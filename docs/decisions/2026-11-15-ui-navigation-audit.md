# Audit des visuels, navigation et code livré

Objectif : corriger les défauts reproduits et retirer les éléments obsolètes démontrés dans les apps IRL coach/athlète/Club, Web/Android/Windows. Source : branche publique générative existante, copie isolée. Propriétaire : orchestration Athlys, méthode d’ingénierie du dépôt (Spec Kit historique).

Budget0€, noms/couleurs/logo conservés, pas de modification de vitrine/production, rôles/Auth/RLS/consentements et calculs numériques préservés. Tests avec fixtures synthétiques, tous appels de mutation distants bloqués. Aucun dossier privé ou compte participant créé.

Critères : matrice de navigation par rôle et formats360/412/768/1440px ; entrées, retours, rechargement, vide/chargement/erreur ; inspection visuelle, débordements et cibles tactiles, clavier/focus et contraste ; contrôles des liens/ressources/modes natifs ; graphe des références avant suppression. Les fichiers générés dépendent de leurs sources ; les documents historiques ne sont pas du code actif à effacer.

Vérification : tests existants, navigateur réel local, captures et mesures par écran, régressions ciblées, builds et nouvelle preview/packages si modifications. Les fixtures ne prouvent pas le backend réel ; installation Nothing Phone, exécution Windows et parcours Auth réel seront indiqués NOT RUN si les appareils/comptes sont indisponibles. Ne pas marquer « tout vérifié » sans préciser cette frontière.

Retour arrière : branche d’audit isolée et versions IRL précédentes conservées ; aucune migration de données.
