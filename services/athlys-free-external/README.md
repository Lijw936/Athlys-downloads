# Athlys — secours externe gratuit

Serveur Node sans dépendance, génération LM désactivée. Il exécute extérieurement les références Athlys, la classification d'intentions expérimentale existante et un décodeur source conservateur. Aucun poids génératif ou modèle RPE de recherche n'est chargé.

`node services/athlys-free-external/server.mjs` ; tests `node --test services/athlys-free-external/server.test.mjs`. Variables : SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (publique), ATHLYS_FREE_ONLY=true, ATHLYS_ALLOWED_ORIGINS (origines exactes). Ne jamais fournir de service-role.

GET /health ne contient aucune donnée privée. POST /infer vérifie Auth puis le rôle courant via profiles/RLS avec le même jeton à chaque demande, sans cache d'identité. Deux tâches : chat et program_parse ; conversion réservée au coach. Le texte est soumis manuellement, filtré heuristiquement, non journalisé ; ce filtre ne garantit pas une anonymisation complète. Aucun dossier d'athlète ou historique envoyé automatiquement.

Même endpoint HTTPS pour chat et conversion ; WebRTC reste disponible dans le client pour un futur pair/TURN validé. Render HTTP seul ne fournit pas ce chemin UDP. Une instance gratuite peut dormir et subir des quotas ; après indisponibilité complète, aucune réponse en temps réel ne peut être garantie. Pas de maintien artificiel en activité.

La conversion conserve les citations et positions, garde durée/RPE/date de séance inconnus et demande validation coach. Elle ne démontre pas la compréhension générale des textes. Les résultats restent des brouillons. Le modèle 0.5B testé est rejeté pour réponses françaises erronées et marge mémoire insuffisante ; son échec ne devient pas une activation cachée.

Retour arrière : externalRtcGatewayConfigured=false et désactivation/suppression du service, conservation des versions actuelles. Aucun schéma ni droit de données modifié.

## Provenance de cette proposition de publication

Ces trois fichiers server.mjs, server.test.mjs et README.md sont nouvellement rédigés dans cette tâche ; aucun fichier serveur privé n’est copié. Ils utilisent exclusivement quatre modules client déjà publics au commit 29497966cac59844d3840fd0abbceea7b893cdd2 de Lijw936/Athlys-downloads, vérifiés par lecture publique. Aucun poids, donnée, historique individuel, migration ou secret n’est nécessaire. La proposition séparée de modifications client n’est pas incluse dans cette publication de serveur.
