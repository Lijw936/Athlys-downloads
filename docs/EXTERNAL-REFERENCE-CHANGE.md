# Changement : secours externe pour essais IRL

Objectif : permettre références et préparation conservatrice de programmes sur un serveur extérieur aux appareils, à 0 €, sans présenter un petit LM incorrect comme opérationnel. Risque élevé : jetons et frontière coach/athlète. Branche et préversion isolées ; aucun schéma ni droit Supabase modifié.

Le service neuf public utilise seulement des modules déjà publics. Render My Workspace sélectionné sur délégation ; plan free, auto-déploiement désactivé. Déploiement e4f1c9520237846329bb50be675b0b08d6eb8512, dep-dbsvdp0ae00c73979k3g : live. HTTPS remplace uniquement le chemin de transport de cette variante, WebRTC conservé pour une cible future avec TURN vérifié.

Le navigateur vérifie origine HTTPS exacte, anonymisation heuristique et rôle local avant de lire le jeton. Le serveur vérifie Auth puis profiles sous RLS avec ce jeton à chaque requête, sans service-role ni cache d’identité ; rôle coach imposé pour conversion. Requêtes bornées, pas de journalisation de texte ou d’identité ; réponses liées à l’ID et invalidées après déconnexion/changement de rôle. Source et champs inconnus préservés, validation coach obligatoire. Aucune lecture automatique de dossiers pour l’inférence.

Acceptation : 41 tests locaux (10 serveur, 5 HTTPS, 26 client précédents), santé HTTP200 distante ; sans jeton et jeton délibérément invalide HTTP401 ; origine étrangère HTTP403. Les tests d’auth positive utilisent des mocks, pas de compte humain. Parcours réel authentifié, révocation et installation sur appareils restent à vérifier ; une CI réussie ne remplace pas ces contrôles.

LM : Qwen0.5B GGUF Q4_0, révision 9217f5db79a29953eb74d5343926648285ec7e67, 428730208 octets, SHA256 7671c0c304e6ce5a7fc577bcb12aba01e2c155cc2efd29b2213c95b18edaf6ed. Essai CPU : erreur « résistance énergétique » pour RPE ; RSS max 689944 Kio initialement puis 490752 Kio sans repacking/cache, ctx512. La baisse mémoire observée est de 28,9 % sur ce processus en développement, pas une mesure de batterie ni une qualification. Candidat écarté, aucun poids LM déployé.

Retour arrière : garder versions actuelles, désinstaller la variante si nécessaire, repackager avec passerelle désactivée ou suspendre le service. Pas de suppression de données, pas de facturation changée, pas de promotion des modèles de recherche.
