# Audit Athlys des visuels et de la navigation

Lot correctif : Android **1.3.14 / code18**, Windows Coach/Club **1.2.7 IRL**. Branche `fix/athlys-ui-navigation-20261115`. Source de départ publique `329bf6d34f65d6c5560fb16a043e5cdf7a4456f8`. Le résultat CI et la release du commit exact confirment le packaging ; ce document ne vaut pas preuve d’installation.

L’audit initial a identifié des écrans Analyse cassés (`todayOffset` absent), une boucle de rendu Health Connect dans le navigateur, l’affichage `null/100`, deux raccourcis sans gestionnaire, des modules mobiles inaccessibles, des contrastes/libellés manquants côté Club, des dialogues sans gestion du focus et une navigation recouverte par la barre mobile. L’inspection du flux RPE a aussi trouvé une variable de rendu absente et une expression de date incorrecte et une confirmation qui effaçait l’aperçu d’un formulaire ouvert. Ces défauts ont été corrigés.

| Contrôle | Exécution et portée |
| --- | --- |
| Navigation et visuel | 320 passages (160 par thème) sur les interfaces coach, athlète et Club ; 360/412/768/1440 px ; aucune erreur JavaScript, ressource manquante, route inaccessible, débordement extérieur ou violation Axe A/AA détecté lors du contrôle local. Les tableaux défilants sont testés séparément. |
| Parcours | 37 parcours réussis : historique précédent/suivant/rechargement, formulaires, focus/Tab/Échap, validation non recouverte, vues vides/erreurs/connexion, hors ligne et rôles Club sur données synthétiques. Les seuils 320/820/821/1920 px sont inclus. |
| Accessibilité | Axe-core4.11, WCAG 2/2.1/2.2 A/AA, clavier et examen de captures. Thèmes clair/sombre et préférence de texte agrandi font partie du contrôle. Cela ne remplace pas un audit humain complet de tous les critères WCAG. |
| Cache et plateformes | 6 contrôles réussis : service worker réellement installé et rechargements hors ligne mobile/Club/diagnostic ; branchements de scripts natifs et retour Android simulés dans Chromium ; 118 liens/ressources locaux contrôlés dans les deux dossiers Windows. |
| Régression | 114 tests logiciels passent, 1 test de migration privée est explicitement ignoré car sa source est absente du dépôt public. Lint sur les 16 sources JavaScript embarquées : aucune référence indéfinie, aucun code inaccessible ou binding inutilisé détecté. |
| Publication | Nouveau job UI obligatoire avant les builds Android/Windows. APK debug et portables Windows non signés ; anciens téléchargements conservés. Pas de promotion de production ni de modification de la vitrine. |

Les fichiers sans références actives sont retirés : anciennes feuilles de style et ancien client mobile, moteur USB remplacé, fonctions et variables inutilisées, workflow de qualité pointant sur un ancien script inexistant, et anciens pipelines publiant d’autres versions. Les tests dépendant exclusivement de fonctions Supabase privées absentes sont retirés de ce dépôt public et remplacés ici par des vérifications du client ; cela ne constitue pas une validation de ces serveurs. [Liste des retraits](decisions/ui-audit-removed-files.json). Le fichier de connaissances fermé a été renommé `athlys-knowledge.js`, en conservant les réponses et leurs limites.

Les paquets utilisent une liste explicite de ressources. Ils n’embarquent plus les tests, les sources non compilées, les anciennes palettes ou la vitrine. Le diagnostic Club ne pointe que vers les entrées présentes dans son paquet. L’ancien bundle natif suivi dans Git est retiré ; il est régénéré par le build. Les poids quantifiés du petit classifieur restent identiques : seule une variable inutilisée de son code d’exécution est supprimée.

Les erreurs de chargement sont signalées sans écraser le dernier snapshot par des données partielles. Les autorisations, le consentement, les calculs RPE, les règles de transmission et l’inférence distante restent soumis aux contrôles existants. Aucune base, aucun compte réel et aucun programme nominatif n’a été modifié.

**Non exécuté :** installation Nothing Phone3a, lancement réel des EXE sur Windows, notifications/Health Connect au niveau Android, parcours authentifié positif et RLS réels, revue par lecteur d’écran sur appareil, validation scientifique ou terrain. Les fixtures de rôles sont une preuve d’interface seulement. Aucun entraînement ou gain de précision n’est revendiqué par cet audit.

[Contrat et retour arrière](decisions/2026-11-15-ui-navigation-audit.md) · [100 décisions](decisions.json). Les rapports JSON et captures du job `Athlys-UI-Audit` sont conservés comme artefact CI pendant7 jours. Le rapport local final est publié dans `audits/ui-20261115.json` après réussite du contrôle complet.
