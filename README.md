# Zhī — Apprendre le mandarin

Frontend personnel en français, connecté au backend Spring Boot situé dans `../chinese-learning-backend`. Aucune donnée de démonstration ni clé OpenAI n’est incluse dans l’application.

## Démarrer

Prérequis : Node.js compatible avec Vite 8 (22.12+ ou version LTS récente), npm et backend Spring Boot. Développement vérifié avec Node 26.7.0.

```sh
npm ci
cp .env.example .env
npm run dev
```

Ouvrir **http://localhost:5173**. Le port est strict : Vite ne bascule pas silencieusement vers une origine non autorisée par le CORS du backend. La configuration `VITE_API_BASE_URL` vaut `http://localhost:8080` par défaut. Redémarrer Vite après un changement de `.env`.

Dans un autre terminal, démarrer le backend conformément à son README :

```sh
cd ../chinese-learning-backend
# Après configuration de son .env et installation de Java 25 et Docker :
docker compose up -d --wait
set -a
. ./.env
set +a
./mvnw spring-boot:run
```

Une instance PostgreSQL existante peut remplacer Docker ; consulter le README backend. Le frontend ne modifie aucune configuration serveur. OpenAI n’est pas nécessaire pour les quatre types d’exercices locaux ; sa configuration et sa clé restent exclusivement côté serveur.

## Fonctionnalités

- Tableau de bord : vocabulaire, compétences évaluées / maîtrisées / à réviser, taux de réussite, activité récente, révisions quotidiennes UTC et état initial vide.
- Vocabulaire : recherche, pagination serveur, détail, création, modification, suppression confirmée avec explication de ses effets, niveaux par compétence et export JSON.
- Imports : vocabulaire et progression, sélection ou glisser-déposer, contrôle d’extension et syntaxe JSON, nom / taille, confirmation explicite, compteurs retournés et erreurs métier.
- Séances : 1–20 exercices, difficulté 1–5, six types, quatre stratégies, indication des types nécessitant OpenAI et de la source effective (`local`, `openai`, `local_fallback`).
- Exercices : QCM envoyant le texte du choix, champs de réponse adaptés, correction et explication après enregistrement, protection contre les doubles soumissions et traitement HTTP 409.
- Bilan : bonnes réponses, erreurs, taux, réponses saisies, corrections et exercices à retravailler.
- Progression : niveaux 0–5 distincts de « non évalué », filtres par compétence / maîtrise / difficulté / échéance, succès et erreurs, dernières et prochaines révisions. Historique des événements, y compris les imports, chargé à la demande depuis l’export de progression.
- Statistiques : trois endpoints de statistiques, tableau accessible des valeurs du graphique et compétences difficiles.
- Historique : corrections paginées, questions récupérées par l’endpoint de détail, dates localisées en français.
- Interface responsive, modes clair/sombre, lien d’évitement, focus visible, contrôles natifs, dialogues Radix accessibles et réduction des animations selon les préférences système.

## Formats d’import

Le fichier est lu puis envoyé en **JSON brut**, avec `Content-Type: application/json`, jamais en multipart. Aucune conversion silencieuse n’est effectuée. La validation métier des entrées reste celle du backend.

Vocabulaire : tableau ou enveloppe `vocabulary` ; exemple :

```json
{
  "vocabulary": [
    { "hanzi": "朋友", "pinyin": "péngyou", "traductions_fr": ["ami", "amie"] }
  ]
}
```

Progression : tableau ou enveloppe `progress` contenant les événements du backend : `id` UUID stable, `hanzi`, `pinyin`, `skill`, `correct`, `reviewedAt`, `answer`. Importer les mots d’abord. Un fichier HelloChinese d’un autre format doit être adapté explicitement avant l’import. Un simple niveau ne permet pas de reconstruire un historique de réponses.

L’import vocabulaire fusionne les traductions ; la modification d’un mot les remplace. La suppression efface aussi progression, exercices et événements liés selon le comportement backend. Les deux exports sont réimportables.

## Persistance des séances

Les données enregistrées par le backend restent en PostgreSQL. Le cache TanStack Query est en mémoire et est rechargé depuis le serveur à la réouverture.

Une seule séance est sauvegardée dans `localStorage` sous `zhi-session-v1` : exercices publics, index courant, réponses saisies, corrections déjà obtenues et envois dont le résultat est incertain. La sauvegarde est validée avec Zod à la lecture. Les réponses attendues ne sont connues qu’après soumission. Une nouvelle séance remplace cette sauvegarde. Une panne de stockage est signalée et laisse la séance fonctionner en mémoire.

Après interruption d’un envoi, seule la même réponse est renvoyée : l’idempotence du backend évite de compter deux fois la réponse. Un conflit 409 bloque une nouvelle soumission et propose l’historique. La séance peut continuer sans inventer un résultat local pour l’exercice en conflit.

Une reprise nécessite le même navigateur, la même origine et une sauvegarde locale intacte. L’API n’a pas de route de lecture d’une séance complète : pas de restauration garantie sur un autre appareil ou après effacement du stockage. Les résultats déjà enregistrés restent consultables depuis le backend. Le frontend ne calcule jamais les niveaux.

## Contrat et limites

`openapi.json` est le contrat fourni, comparé au contrat actif à `http://localhost:8080/v3/api-docs` le 9 novembre 2026 : identique. `src/types/openapi.ts` est généré :

```sh
npm run api:generate
```

Après modification backend, remplacer le contrat puis régénérer et vérifier les types. `src/types/models.ts` rend obligatoires les propriétés effectivement renvoyées par les records Java. Il corrige explicitement la nullabilité de `ProgressView.level`, `lastReview` et `nextReview`, absente du schéma OpenAPI mais confirmée par les DTO/services et le README backend.

Limites exposées dans l’interface :

- `Overview` compte des **compétences**, pas des mots, pour les évaluations, la maîtrise et les échéances. Les cartes conservent cette unité. Les mots évalués sont les identifiants distincts avec au moins une compétence évaluée. Le compteur « mots maîtrisés » est explicitement défini comme toutes les compétences retournées aux niveaux 4–5 ; les niveaux restent ceux du serveur.
- L’API ne retourne pas d’historique des niveaux. Le graphique représente les révisions effectuées et prévues sur la période réellement retournée (jours UTC), pas une fausse courbe de maîtrise. Les autres horodatages sont affichés dans le fuseau du navigateur.
- L’historique des exercices ne contient pas la réponse saisie. Celle-ci apparaît dans le bilan local ; l’export des événements de progression permet aussi de consulter les réponses de révision, sans inventer de liaison entre événement et exercice.
- Les exercices publics n’exposent pas le mot cible. Le bilan liste les questions échouées avec leur correction, sans attribuer une maîtrise à tous les mots d’une phrase.
- `WRITING` n’est pas retourné par la liste actuelle de progression ; les événements importés d’écriture sont consultables dans l’historique des révisions.
- Difficulté locale indicative, exercices avancés dépendant d’OpenAI, et corrections limitées aux variantes acceptées par le serveur.
- Progression / statistiques et export des événements ne sont pas paginés côté serveur. Leur affichage est paginé localement lorsque pertinent, adapté à un vocabulaire personnel.

## Architecture

```text
src/app/              Routes et navigation
src/components/       Contrôles, dialogues, états et pagination
src/features/         Vocabulaire, imports, séances, résultats, progression, statistiques, historique
src/lib/api/          Client HTTP, erreurs ProblemDetail, export
src/lib/validation.ts Validation des formulaires et fichiers
src/types/            Contrat généré et modèles adaptés aux DTO Java
tests/                Vitest, Testing Library, MSW et parcours Playwright
```

React, TypeScript strict, Vite, React Router, TanStack Query, Tailwind CSS, Radix Dialog, Lucide, React Hook Form et Zod. Les pages sont chargées à la demande. Les mutations ne sont pas relancées automatiquement ; les lectures peuvent être retentées une fois. Aucune dépendance à une police ou image hébergée à distance.

## Vérifications

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Vitest utilise MSW avec rejet des requêtes non simulées. Playwright intercepte toutes les routes du backend et exécute les parcours sur Chromium ordinateur et écran mobile. Les tests ne contactent jamais OpenAI et ne modifient pas la base réelle.

La configuration Playwright réutilise un serveur local sur 5173 hors CI, ou le lance automatiquement. Pour un hébergement statique, configurer le serveur pour retourner `index.html` sur les routes de l’application ; le backend mono-utilisateur reste destiné à un usage local.

### Indices et clavier

`GET /api/exercises/{id}/hint` retourne `{"firstLetter":"a"}`. Cette route ajoutée au backend ne soumet aucune réponse, ne modifie pas la progression et ne renvoie pas la correction complète. Elle choisit une réponse acceptée de façon déterministe et renvoie son premier caractère Unicode complet (accent compris). Un exercice inconnu retourne 404.

Le bouton « Afficher un indice » appelle cette route. L’indice est aussi demandé automatiquement après 10 secondes consécutives avec une réponse vide ; une saisie interrompt ce délai. La touche I sert uniquement à saisir du texte. Après correction, Entrée passe à la question suivante, ou au bilan pour la dernière question. Les touches maintenues et la composition de texte ne déclenchent pas cette navigation.

Redémarrer le backend après compilation pour rendre la nouvelle route disponible. Le contrat local inclut désormais cette extension ; le contrat actif comparé le 9 novembre correspondait à la version précédente sans indice.

## Phrases enregistrées — sans IA

Dans **Entraînement**, choisir **Phrases enregistrées — sans IA**. Le frontend affiche la réserve de traductions de phrases et de phrases à compléter, avec filtres de type et de difficulté. Le nombre d’exercices peut être réglé de 1 à 20 ; si la réserve est plus petite, seules les phrases disponibles sont proposées, sans répétition du même couple type/phrase dans la séance.

Ce mode utilise uniquement `GET /api/exercises/reusable` puis `POST /api/exercises/reuse`. Il n’appelle jamais la route de génération. Il fonctionne sans clé OpenAI dès que des phrases ont déjà été enregistrées. Chaque séance reçoit de nouvelles tentatives, avec des réponses et une progression indépendantes des tentatives précédentes. La source affichée est `reused` (« phrases enregistrées · sans appel à OpenAI »).

Si la réserve est vide, le bouton est désactivé et un message propose de changer les filtres ou d’alimenter d’abord la réserve via le mode de génération habituel. Redémarrer le backend mis à jour pour appliquer la migration V2 et exposer les nouvelles routes.
