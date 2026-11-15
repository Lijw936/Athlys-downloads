# Athlys — registre des décisions connues

État au 15 novembre 2026. **64 décisions**, actives, remplacées, rejetées ou bloquées. Ce registre couvre la conversation accessible et les notes du projet inspectées ; il ne prétend pas lire d’autres fils. Il publie les choix, motifs synthétiques, preuves et critères de réexamen.

Organisation : Strategy Arena, diagnostic et exécution proportionnée. Budget autorisé : **0 €**. Les modèles RPE de recherche restent désactivés. Les états « prototype » et « retenu » ne signifient pas « déployé ».

[JSON exploitable](decisions.json) · [Versions et fichiers](https://github.com/Lijw936/Athlys-downloads/releases)

## Choix d’exécution

Le chemin retenu associe un client de test public, des builds publics de durée bornée et un calcul extérieur aux appareils. Render My Workspace est choisi sur délégation de l’utilisateur. Une variante HTTPS est envisagée pour éviter qu’un besoin TURN ne bloque le transport ; elle doit être intégrée et vérifiée avant activation. Les quotas gratuits, la mise en veille et la capacité mémoire restent des limites réelles.

L’alternative PC mesh est remplacée par la demande de calcul externe. Le statu quo (APK sans passerelle) permet les essais manuels mais pas le LM. Un abonnement ou du calcul hébergé plus puissant dépasseraient le budget et ne sont pas engagés. La limite principale demeure la qualité et la disponibilité du calcul gratuit ; un build réussi ne la supprime pas.

## D01 — Gouvernance · actif

**Décision :** Budget total autorisé : 0 €.

**Motif :** Contrainte explicite de l’utilisateur.

**Preuve :** Conversation actuelle.

**Réexamen / limite / retour arrière :** Aucun plan payant, crédit, abonnement ou dépassement automatique.

## D02 — Gouvernance · actif

**Décision :** Limiter la publication aux builds, décisions et client explicitement publiable.

**Motif :** L’autorisation de builds publics ne publie pas les données et serveurs privés.

**Preuve :** Branche client publique existante de Athlys-downloads, liste de fichiers examinée.

**Réexamen / limite / retour arrière :** Relecture de chaque ajout ; aucun corpus ou journal individuel dans les artefacts.

## D03 — Gouvernance · actif

**Décision :** Appliquer la méthode d’ingénierie Athlys actuelle.

**Motif :** AGENTS remplace Spec Kit comme workflow actif.

**Preuve :** AGENTS.md et docs/ENGINEERING-METHOD.md consultés.

**Réexamen / limite / retour arrière :** Les anciens specs restent historiques, leurs cases ne prouvent rien.

## D04 — Gouvernance · actif

**Décision :** L’entraîneur décide, l’IA explique.

**Motif :** Athlys aide à gérer la charge ; aucune autorité médicale ou décision autonome.

**Preuve :** AGENTS et contrats d’intégration.

**Réexamen / limite / retour arrière :** Validation coach avant import ou adaptation de programme.

## D05 — Gouvernance · actif

**Décision :** Utiliser Strategy Arena en diagnostic puis exécution proportionnée.

**Motif :** Comparer contraintes, options, preuves et réversibilité sans frais supplémentaires.

**Preuve :** Compétences strategy-arena et implementation-engine consultées.

**Réexamen / limite / retour arrière :** Une analyse structurée, pas un vote de 100 agents ni une affiliation à McKinsey.

## D06 — Transparence · actif

**Décision :** Distinguer proposition, source modifiée, tests, build, publication, installation et qualification.

**Motif :** Une compilation n’est ni un test réel utilisateur ni une validation scientifique.

**Preuve :** Méthode d’ingénierie et reçus de livraison.

**Réexamen / limite / retour arrière :** Ne passer chaque état qu’avec sa preuve exacte.

## D07 — Plateformes · actif

**Décision :** Cibler Android Nothing Phone 3a, Windows coach/Club et Web coach/athlète/Club.

**Motif :** Équipement et demande de l’utilisateur.

**Preuve :** Conversation et variantes IRL.

**Réexamen / limite / retour arrière :** Tests physiques sur ces appareils encore requis.

## D08 — Architecture · actif

**Décision :** Exécuter LM et compréhension des programmes en dehors du téléphone et PC utilisateurs.

**Motif :** Dernière orientation explicite de l’utilisateur.

**Preuve :** Contrat externe et client RTC.

**Réexamen / limite / retour arrière :** Ne pas basculer silencieusement vers un modèle embarqué.

## D09 — Architecture · remplacé

**Décision :** Ancien mesh USB Android → Ollama sur PC, facultatif.

**Motif :** Conçu pour la contrainte sans abonnement, puis remplacé par la demande d’exécution externe.

**Preuve :** Décision device-mesh du 14 novembre et client opt-in historique.

**Réexamen / limite / retour arrière :** Le code historique ne constitue pas le mode actif des variantes IRL.

## D10 — Optimisation · actif

**Décision :** Employer quantification et routage borné ; ne pas attribuer une compression au terme neural mesh.

**Motif :** Le routage ne modifie pas le nombre de paramètres.

**Preuve :** Poids GGUF comparés : 397 807 936 contre 986 048 512 octets dans les essais historiques.

**Réexamen / limite / retour arrière :** La baisse de 59,7 % concerne ces téléchargements, pas le poids de l’APK ni la batterie.

## D11 — Architecture · prototype

**Décision :** Un même DataChannel WebRTC pour chat et program_parse.

**Motif :** Réutiliser session et transport, tout en gardant les tâches distinctes.

**Preuve :** Vrai essai aiortc avec Qwen 1.5B, deux tâches sur un canal.

**Réexamen / limite / retour arrière :** Pas encore vérifié depuis Internet ou le Nothing Phone ; un essai local ne prouve pas le déploiement.

## D12 — Architecture · bloqué

**Décision :** Ne pas considérer un hébergement HTTP comme un pair WebRTC UDP complet.

**Motif :** ICE et réseaux restrictifs demandent des chemins réseau adaptés.

**Preuve :** Chromium géré bloque UDP direct ; aucun relais TURN configuré.

**Réexamen / limite / retour arrière :** Prévoir TURN/TLS puis essai appareil, ou transport HTTPS explicitement documenté.

## D13 — Architecture · retenu sous condition

**Décision :** Prévoir HTTPS comme transport externe de secours sur hébergement HTTP gratuit.

**Motif :** Permet de conserver calcul distant et même API de tâches sans dépendre d’un TURN payant.

**Preuve :** Capacités HTTP/WS Render et blocage WebRTC observé.

**Réexamen / limite / retour arrière :** N’activer qu’après auth, isolement, limites et smoke tests ; WebRTC reste une option de transport, pas le calcul.

## D14 — Résilience · implémenté

**Décision :** Circuit de 30 s, au plus deux pairs configurés, puis réponse documentaire ou précision distante.

**Motif :** Une panne ou un quota ne doit pas déclencher des frais ni fabriquer une réponse.

**Preuve :** Tests Python et Node du pool et du client RTC.

**Réexamen / limite / retour arrière :** Si tous les hébergeurs sont arrêtés, annoncer l’indisponibilité ; aucune disponibilité illimitée garantie.

## D15 — Résilience · rejeté

**Décision :** Écarter la rotation de comptes, les endpoints de démonstration tiers et Actions comme serveur LM permanent.

**Motif :** Pas de contournement de quota, exposition de textes à un tiers inconnu ou détournement du runner.

**Preuve :** Contrainte 0 € et architecture examinée.

**Réexamen / limite / retour arrière :** Les runners servent uniquement aux builds et contrôles de durée bornée.

## D16 — Hébergement · choisi

**Décision :** Choisir Render My Workspace pour l’essai d’hébergement gratuit.

**Motif :** Workspace unique constaté ; utilisateur a délégué le choix à Strategy Arena.

**Preuve :** Échange de confirmation et liste Render.

**Réexamen / limite / retour arrière :** Plan free seulement, pas de création payante implicite ; création et santé restent des étapes distinctes.

## D17 — Hébergement · vérifié

**Décision :** L’offre gratuite Render borne la mémoire à 512 Mo et le temps actif partagé à 750 h/mois.

**Motif :** Dimensionnement réel nécessaire.

**Preuve :** Documentation officielle Render Free consultée le 15 novembre 2026.

**Réexamen / limite / retour arrière :** Mise en veille après 15 min inactives et réveil lent ; pas de keepalive artificiel.

## D18 — Hébergement · rejeté

**Décision :** Ne pas mettre Qwen 1.5B ONNX dans une instance de 512 Mo.

**Motif :** Le runtime essayé nécessite beaucoup plus de mémoire.

**Preuve :** README du pair : environ 4 Go à mesurer, incompatible avec 512 Mo.

**Réexamen / limite / retour arrière :** Garder expérimental sur un hôte adapté ; aucun hôte payant autorisé.

## D19 — Hébergement · bloqué

**Décision :** Ne pas présenter ZeroGPU gratuit comme immédiatement disponible.

**Motif :** Le compte gratuit connecté a été créé le 2 novembre 2026 et n’a pas 30 jours.

**Preuve :** API publique HF et documentation Spaces/ZeroGPU consultées.

**Réexamen / limite / retour arrière :** Réexaminer après l’âge requis et vérification email ; quotas et conditions restent applicables.

## D20 — Hébergement · vérifié

**Décision :** Un Space statique ou Vercel ne fournit pas un LM CPU/GPU permanent compatible UDP.

**Motif :** Distinguer client, autorisation, transport et calcul.

**Preuve :** Documentation hébergeurs et architecture existante.

**Réexamen / limite / retour arrière :** Ne pas annoncer un LM déployé après simple publication du Web.

## D21 — LM · rejeté

**Décision :** Écarter SmolLM2 135M comme assistant français utilisable.

**Motif :** Réponse répétitive incorrecte sur la définition de RPE.

**Preuve :** Vrai probe Node CPU à révision figée, résultat conservé.

**Réexamen / limite / retour arrière :** Pas de réétiquetage comme modèle entraîné Athlys.

## D22 — LM · rejeté

**Décision :** Écarter Qwen 0.5B des réponses libres non encadrées.

**Motif :** Des erreurs ont été reproduites en développement.

**Preuve :** Décision device-mesh et comparaison de cinq notions connues.

**Réexamen / limite / retour arrière :** Un éventuel nouvel essai GGUF/mémoire n’annule pas ce résultat linguistique.

## D23 — LM · prototype

**Décision :** Qwen 1.5B préentraîné peut proposer du texte expérimental sur serveur.

**Motif :** Vrai calcul distant réalisé en développement.

**Preuve :** Révision ONNX d54957e3af1be04546436e874a60fe386041b244, essai RTC.

**Réexamen / limite / retour arrière :** Ni fine-tuning Athlys, ni qualité française générale, ni service public disponible démontrés.

## D24 — LM · actif

**Décision :** Conserver les références canoniques et les champs explicitement écrits comme source d’autorité.

**Motif :** La génération peut inventer unités, dates et métriques.

**Preuve :** Validateur de propositions et décodeur source.

**Réexamen / limite / retour arrière :** Propositions séparées, citations réellement présentes, inconnus conservés.

## D25 — ML · actif

**Décision :** Distinguer quatre familles ML des trois tâches RPE.

**Motif :** Quatre familles ne signifient pas quatre nouveaux modèles qualifiés.

**Preuve :** Wikipédia Apprentissage automatique consulté et contrat recherche.

**Réexamen / limite / retour arrière :** Rapporter chaque tâche, cible, échelle et mesure séparément.

## D26 — ML · recherche

**Décision :** Supervisé : estimer à partir de labels traçables.

**Motif :** Méthode adaptée aux trois expériences RPE et aux intentions.

**Preuve :** Entraînements privés et rapports agrégés.

**Réexamen / limite / retour arrière :** Groupes séparés, validation pour sélection, test figé, référence naïve.

## D27 — ML · recherche

**Décision :** Non supervisé : profils descriptifs, jamais diagnostics ou étiquettes de blessure.

**Motif :** Le clustering ne fournit pas une vérité physiologique.

**Preuve :** Expérience SoccerMon KMeans k=2..6 sur train.

**Réexamen / limite / retour arrière :** Silhouette descriptive uniquement ; stabilité et utilité non établies.

## D28 — ML · non activé

**Décision :** Semi-supervisé : garder les pseudo-étiquettes distinctes des labels experts.

**Motif :** Éviter d’amplifier les erreurs du modèle.

**Preuve :** Catalogue pédagogique et critères de qualification.

**Réexamen / limite / retour arrière :** Revue humaine et jeu indépendant avant tout entraînement revendiqué.

## D29 — ML · non activé

**Décision :** Renforcement : étude hors ligne, sans expérimentation autonome sur les athlètes.

**Motif :** Pas de fonction de récompense ou protocole terrain validé.

**Preuve :** Principe de décision coach et catalogue pédagogique.

**Réexamen / limite / retour arrière :** Aucun modèle RL déployé ou entraînement RL revendiqué.

## D30 — Données · vérifié

**Décision :** Aucun dataset Athlys réel fourni ; corpus de programmes explicitement synthétique.

**Motif :** Réponse de l’utilisateur : non.

**Preuve :** Corpus 600 programmes rédigés/synthétiques et provenance.

**Réexamen / limite / retour arrière :** Ne pas le présenter comme représentatif de coachs réels ni comme nouveau test aveugle.

## D31 — Données · actif

**Décision :** Aucune donnée privée d’athlète pour entraîner sans protocole de recherche consenti.

**Motif :** Consentement Health Connect distinct du consentement recherche.

**Preuve :** Registre observé : 0 consentement recherche et 0 paire admissible.

**Réexamen / limite / retour arrière :** Collecte prospective consentie, cible et échelle définies avant entraînement.

## D32 — Données · actif

**Décision :** Vérifier licence, fichiers et attribution avant réutilisation scientifique.

**Motif :** Un article accessible ne rend pas ses données libres.

**Preuve :** SciSpace consulté ; source Zenodo 7437230 restreinte non utilisée.

**Réexamen / limite / retour arrière :** Ne pas inférer autorisation depuis un résumé ou le seul lien DOI.

## D33 — Recherche · vérifié

**Décision :** Utiliser SciSpace comme recherche documentaire avec limites de transfert explicites.

**Motif :** Les études RAG/SLM ne valident pas les modèles sportifs Athlys.

**Preuve :** Deux articles RAG-Assisted Small Language Models et Small Language Models: A Systematic Review consultés.

**Réexamen / limite / retour arrière :** Résumé/méthodes disponibles, texte intégral non vérifié dans tous les cas ; aucune donnée personnelle envoyée.

## D34 — Recherche · vérifié

**Décision :** Intentions : conserver le résultat négatif de qualification.

**Motif :** 38/40 = 95 %, inférieur au seuil strict demandé >95 %.

**Preuve :** 56 configurations sélectionnées par validation groupée ; Wilson 95 % : 83,496–98,618 %, parité JS/Python 274/274.

**Réexamen / limite / retour arrière :** Le challenge connu est de développement ; aucun nouveau modèle runtime promu.

## D35 — Recherche · actif

**Décision :** Les sept familles enregistrées restent bloquées scientifiquement.

**Motif :** Preuves indépendantes revues insuffisantes.

**Preuve :** Gate de manifeste réel : BLOCKED, scientific_grade=false, promotion automatique=false.

**Réexamen / limite / retour arrière :** La réussite du test de refus ne signifie pas qualification ni APK scientifique.

## D36 — Recherche · vérifié

**Décision :** SoccerMon : expérience hors ligne rétrospective seulement, production_use=false.

**Motif :** Population spécifique et cibles quotidiennes dérivées.

**Preuve :** 66 configurations ; fit 6 982/30 groupes, validation 267/7, test 397/7 ; 13 tests logiciel.

**Réexamen / limite / retour arrière :** Ne pas transférer aux séances Athlys ; pas d’intervalle conforme 95 % avec seulement 7 groupes.

## D37 — Recherche · actif

**Décision :** Préserver les limites SoccerMon et ses résultats négatifs/qualité.

**Motif :** La cible est somme charges/somme durées, pas ressenti quotidien directement saisi.

**Preuve :** 185 lignes sur 14 191 avec flag de somme incohérente conservées selon filtre initial.

**Réexamen / limite / retour arrière :** Aucune exclusion ou réévaluation post-test ; pas de frontière calendaire commune vérifiée.

## D38 — RPE 1 · non activé

**Décision :** Extraction RPE source : modèle entraîné mais insuffisant.

**Motif :** Précision 100 %, rappel 44,0278 %, F1 0,611379 ; 0 programme entièrement exact sur 120.

**Preuve :** Test 120 programmes synthétiques, 720 tokens RPE ; rapport de recherche figé.

**Réexamen / limite / retour arrière :** Ne pas activer ; corpus coach revu et évaluation indépendante nécessaires.

## D39 — RPE 2 · recherche

**Décision :** Prévision : candidat limité au protocole course/sauts du dataset public.

**Motif :** MAE moyenne sujets 0,877498 contre dernier RPE 1,009524 et médiane 1,22789.

**Preuve :** Test 104 observations, 7 sujets ; source Figshare 21621411 CC0 vérifiée.

**Réexamen / limite / retour arrière :** Ne couvre pas un programme libre Athlys ; historique personnel passé disponible, pas cold-start.

## D40 — RPE 3 · non activé

**Décision :** Régression physiologique : conserver le candidat hors app.

**Motif :** MAE 1,091994, moins bonne que la médiane 0,818182.

**Preuve :** Test 22 lignes de 11 sujets, mesures PRE/POST de la source.

**Réexamen / limite / retour arrière :** Ne pas entraîner davantage sur le test ni convertir la cible source en CR10.

## D41 — RPE · actif

**Décision :** Ne jamais convertir linéairement Borg 6–20 ou une échelle non confirmée vers CR10.

**Motif :** Les ancrages et protocoles diffèrent.

**Preuve :** Contrats des trois chemins et revue de la source.

**Réexamen / limite / retour arrière :** Une conversion requiert un protocole et des observations appariées validées.

## D42 — RPE · vérifié

**Décision :** Séparer strictement groupes et temps ; figer artefacts avant scoring.

**Motif :** Éviter fuite de cible et sélection sur le test.

**Preuve :** 15 configurations sur les trois chemins, empreintes conservées et tests Python.

**Réexamen / limite / retour arrière :** Rapports agrégés publics ; données et artefacts privés restent hors build.

## D43 — RPE · implémenté

**Décision :** Exclure séances futures, dates invalides et dates seules du jour de référence.

**Motif :** L’ordre temporel est inconnu pour une date seule le même jour.

**Preuve :** Correctifs et régressions PR108.

**Réexamen / limite / retour arrière :** Ne pas interpréter les tests comme preuve sur des athlètes réels.

## D44 — RPE · implémenté

**Décision :** Conserver la cible prévue capturée à la saisie du journal malgré une édition ultérieure.

**Motif :** Éviter de réécrire les observations passées à partir du programme actuel.

**Preuve :** Correctif training_log et provenance explicite.

**Réexamen / limite / retour arrière :** Cette capture n’est pas la preuve d’une prévision avant l’effort ; copie horodatée pré-séance requise.

## D45 — Conversion · implémenté

**Décision :** Ne pas promouvoir durée ou RPE d’un bloc en total/RPE de séance.

**Motif :** Éviter des calculs plausibles mais faux.

**Preuve :** Décodeur et adaptateur du client externe.

**Réexamen / limite / retour arrière :** Champs inconnus conservés, validation explicite du coach, aucun import automatique.

## D46 — Conversion · implémenté

**Décision :** Préserver positions, texte et champs source, négations et ambiguïtés.

**Motif :** La conversion doit rester explicable et réversible.

**Preuve :** Corrections date confondue avec RPE, 1h30, secondes et offsets CRLF.

**Réexamen / limite / retour arrière :** Unités explicites uniquement ; régression logicielle distincte d’un benchmark représentatif.

## D47 — Sécurité · implémenté

**Décision :** Vérifier Auth Supabase et rôle via profiles/RLS à chaque autorisation externe.

**Motif :** Ne pas faire confiance au rôle fourni par le client.

**Preuve :** Passerelle Node et tests ; aucun service-role utilisé.

**Réexamen / limite / retour arrière :** Tests avec mocks ne remplacent pas la vérification réelle des droits multi-comptes.

## D48 — Sécurité · implémenté

**Décision :** Lier les tickets à texte haché, session, tâche et pair ; expiration et anti-rejeu.

**Motif :** Limiter réutilisation et réponses d’un ancien compte.

**Preuve :** Tickets connexion 180 s, requête 30 s, tests de rejet et invalidation.

**Réexamen / limite / retour arrière :** Aucun secret de signature ou TURN permanent dans l’APK.

## D49 — Sécurité · implémenté

**Décision :** Limiter les textes envoyés, refuser identifiants détectés et contexte de santé personnel.

**Motif :** Réduire l’exposition ; aucune lecture automatique des dossiers pour le LM.

**Preuve :** Filtres client/serveur et tests avant lecture du jeton.

**Réexamen / limite / retour arrière :** Filtre heuristique, anonymisation manuelle nécessaire ; aucune certification santé revendiquée.

## D50 — Sécurité · actif

**Décision :** Préserver consentements, frontières coach/athlète/Club et informations sensibles.

**Motif :** Aucun accès coach présumé au bien-être/cycle/données privées.

**Preuve :** AGENTS, protocole terrain et tests SQL locaux.

**Réexamen / limite / retour arrière :** Essais authentifiés réels de révocation et changement de rôle encore nécessaires.

## D51 — Client · implémenté

**Décision :** Embarquer et précacher le SDK Supabase plutôt que le télécharger au démarrage.

**Motif :** Démarrage robuste sans CDN tiers.

**Preuve :** Bundle local SDK 2.118.0, build:web et cache PWA v59-irl-rpe.

**Réexamen / limite / retour arrière :** Le réseau reste nécessaire à Auth, synchronisation et calcul externe.

## D52 — Client · implémenté

**Décision :** Corriger MIME .mjs sur les serveurs Windows et isoler les variantes IRL.

**Motif :** Le transport est un module navigateur ; limiter collisions d’installation.

**Preuve :** Port 41741 coach, 41742 Club ; noms/appIDs IRL ; test HTTP réel.

**Réexamen / limite / retour arrière :** Liens OAuth/récupération et co-installation à vérifier sur les appareils.

## D53 — Livraison · vérifié

**Décision :** APK locale IRL 1.3.9 produite et signature debug vérifiée.

**Motif :** Fournir un fichier réellement compilé.

**Preuve :** 8 082 048 octets ; SHA256 887e172201423da55f16e2837d09834d79ed70cf5978909255397926a6826502.

**Réexamen / limite / retour arrière :** Package com.athlys.app.irl, code 13 ; aucun test Nothing Phone exécuté.

## D54 — Livraison · vérifié

**Décision :** Deux portables Windows IRL locaux produits, non signés.

**Motif :** Permettre essais coach et Club sans installateur invalide.

**Preuve :** Coach 93 162 487 octets ; Club 92 971 688 octets ; reçus SHA256.

**Réexamen / limite / retour arrière :** NSIS Linux bloqué par Wine ; stub invalide écarté ; lancement Windows non effectué.

## D55 — Livraison · actif

**Décision :** Maintenir source par défaut désactivée et variante IRL externe sans faux endpoint.

**Motif :** Aucun LM disponible ne doit être annoncé comme fonctionnel.

**Preuve :** externalRtcGatewayConfigured=false ; rejet avant lecture du JWT.

**Réexamen / limite / retour arrière :** Ce lot initial ne permet pas encore chat LM ou conversion distante ; une nouvelle version doit configurer un service vérifié.

## D56 — Déploiement · vérifié

**Décision :** Preview Web protégée publiée ; pas de promotion production ni modification de vitrine.

**Motif :** Autorisation d’essais avec conservation des protections.

**Preuve :** Déploiement Vercel dpl_4276md7DrpcVip4g6ZUhE1D1n6jV, HTTP 200 via connecteur autorisé.

**Réexamen / limite / retour arrière :** Protection SSO retenue ; ne pas publier de token de partage.

## D57 — Tests · vérifié

**Décision :** 96 contrôles locaux réussis pour le lot privé IRL.

**Motif :** 74 Node, 9 mobile, 7 SQL locaux, 5 recherche Python, 1 HTTP desktop.

**Preuve :** Reçus de tests privés.

**Réexamen / limite / retour arrière :** Fixtures de trois rôles et SDK sans session ne prouvent ni Auth/RLS terrain ni validation clinique.

## D58 — CI · bloqué

**Décision :** Athlys9 reste inaccessible en écriture au compte GitHub autorisé.

**Motif :** Ne pas changer d’identité pour contourner la limite.

**Preuve :** Permissions vérifiées du compte Lijw936.

**Réexamen / limite / retour arrière :** Utiliser le dépôt public writable existant ; aucune prétendue compilation via Athlys9.

## D59 — CI · retenu

**Décision :** Utiliser la base client déjà publique de Lijw936/Athlys-downloads sur une nouvelle branche.

**Motif :** Public runners accessibles, pas de checkout privé requis.

**Preuve :** Base build/athlys-public-source, commit 2b0b9ef6dc1d8461012fb132ee69fe8a6525a428.

**Réexamen / limite / retour arrière :** Nouvelle préversion séparée, jamais écrasement des assets stables ; jobs et artefacts à vérifier.

## D60 — CI · actif

**Décision :** Exposer seulement les tests client réalisables dans le sous-ensemble public.

**Motif :** Ne pas publier les migrations privées ni prétendre exécuter la suite complète.

**Preuve :** Workflow public dédié : test:public-client.

**Réexamen / limite / retour arrière :** Tests backend/recherche restent privés ; les checks manquants sont des limites déclarées.

## D61 — CI · vérifié

**Décision :** Les jobs privés récents ont échoué avant toute étape exécutée.

**Motif :** Un échec d’infrastructure n’est pas une régression du code.

**Preuve :** Jobs inspectés : liste steps vide.

**Réexamen / limite / retour arrière :** Un ancien compte rendu mentionne facturation ; la cause des runs actuels reste non établie.

## D62 — Historique · bloqué

**Décision :** Ne pas inventer l’ingestion des conversations antérieures.

**Motif :** Aucun export ni outil de lecture des autres fils disponible.

**Preuve :** Pipeline intake privé et 12 fixtures synthétiques ; aucun vrai corpus historique ingéré.

**Réexamen / limite / retour arrière :** Réponses d’assistant non assimilées à labels experts ; revue et consentement requis.

## D63 — Transparence · actif

**Décision :** Publier la totalité des décisions connues dans ce registre versionné Markdown/JSON.

**Motif :** Répondre à la demande et rendre les résultats négatifs accessibles.

**Preuve :** Conversation accessible et huit notes de décisions inspectées.

**Réexamen / limite / retour arrière :** Couverture limitée à ces sources ; pas accès aux conversations ou décisions non fournies.

## D64 — Retour arrière · actif

**Décision :** Garder les installations actuelles et les modèles scientifiques bloqués.

**Motif :** Une variante de test ne doit pas remplacer un environnement fiable.

**Preuve :** AppIDs/ports IRL distincts, branche isolée et préversion séparée.

**Réexamen / limite / retour arrière :** Désinstaller IRL ou désactiver nouvelle route ; aucune migration de données nouvelle.

## Sources et traçabilité

- [Méthode générale ML](https://fr.wikipedia.org/wiki/Apprentissage_automatique) : taxonomie, sans validation sportive.
- [Render gratuit](https://render.com/docs/free), [WebSockets](https://render.com/docs/websocket) : contraintes de service consultées.
- [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces-overview), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu) : conditions consultées, évolutives.
- [Figshare 21621411](https://api.figshare.com/v2/articles/21621411) : licence et fichiers de la recherche RPE vérifiés.
- [SoccerMon](https://doi.org/10.1038/s41597-024-03386-x), [données](https://doi.org/10.5281/zenodo.10033832) : contexte de l’expérience hors ligne.
- SciSpace : [RAG-Assisted Small Language Models](https://scispace.com/papers/rag-assisted-small-language-models-for-domain-level-yzdeake7htlv), [revue SLM](https://scispace.com/papers/small-language-models-a-systematic-review-of-computational-fm7nmcfyyaxv) ; portée limitée aux informations consultées.
- Notes privées inspectées : scientific-model-release, soccermon-offline-evidence, conversation-corpus-intake, device-mesh, quota-independent-inference (14 novembre) ; external-rtc-lm et irl-rpe-three-paths (15 novembre) et probes associés. Sources privées et jeux individuels non publiés.

Les empreintes de builds publics peuvent différer du build local (environnement et signature debug CI). Chaque release doit fournir ses propres SHA256 ; ne pas confondre leurs fichiers.
