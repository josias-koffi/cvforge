# ADR-021 — Moteur de score ATS : package pur, barème versionné, LLM borné à une dimension

- Statut : accepté
- Date : 2026-09-22
- Portée : `packages/ats-score`, `apps/api/src/ats`, `apps/landing`, `apps/web`

## Context

La vision décrit un score ATS affiché partout (`§7.1` colonne de liste, `§7.4` fiche candidature, `§12.2` KPI moyen, `§12.3` progression au fil des versions), mais rien n'était implémenté : « ATS » n'existait que comme argument marketing sur la landing. Il faut désormais servir un même score sur deux surfaces qui n'ont rien en commun :

- **la landing**, publique et non authentifiée, qui part d'un fichier PDF/DOCX inconnu et **sans offre d'emploi de référence** ;
- **l'app**, qui part d'un `CVDocumentContent` déjà structuré, **avec** l'offre liée à la candidature.

Trois exigences se contredisent en apparence : le score doit être **reproductible** (il est persisté, comparé entre versions de CV et agrégé en KPI), **précis** (un pur comptage de mots-clés ne vaut rien), et **gratuit** en usage courant (produit d'appel, 0 crédit in-app).

## Decision

### 1. Le moteur est un package TypeScript pur — `packages/ats-score`

Aucune dépendance runtime hors `@cvforge/types`. Il ne peut importer ni Nest, ni un store, ni une variable d'environnement : la pureté exigée par `engineering-standards.md` §1 devient **structurelle** plutôt que conventionnelle. Conséquence mesurée : 100 % de couverture lignes sans effort, ce qui finance l'exigence des 90 % sur le code neuf du reste de la fonctionnalité.

### 2. Un scoreur, deux adaptateurs, un modèle normalisé

L'asymétrie des deux surfaces n'est pas résolue par deux moteurs — ce qui produirait deux barèmes divergeant silencieusement — mais par un modèle commun `AtsDocument`, alimenté par `parseCvText()` (landing) et `fromCvDocument()` (in-app). Un test verrouille la cohérence : un CV équivalent passé par les deux adaptateurs doit scorer à ±3 points.

### 3. Une dimension non observable est exclue, jamais notée zéro

C'est la décision centrale. Le score est une moyenne pondérée **sur les seules dimensions `scored`, avec les poids renormalisés à leur propre somme**. Sans offre, `keywords` passe en `unavailable` et la renormalisation se fait sur 80.

Un CV scanné sans offre est donc évalué sur *moins de dimensions*, pas puni pour une question qu'on ne lui a pas posée. Une seule formule, une seule échelle 0-100, et l'UI peut dire honnêtement « 5 dimensions évaluées — l'adéquation à une offre nécessite une candidature », ce qui est en soi un argument de conversion.

Corollaire appliqué au cours de l'implémentation : **une règle d'absence de défaut ne crédite que s'il existe de la matière où ce défaut pourrait apparaître.** Un document vide récoltait sinon des points pour « ne pas contenir de tableau » et « avoir une chronologie correcte ».

### 4. Le barème est versionné et persisté

`ATS_SCORE_ENGINE_VERSION` accompagne chaque score en base. Tout changement de pondération bump la version ; les KPI groupent par version. Sans cela, la courbe « progression du score au fil des versions » (§12.3) ment dès le premier rééquilibrage, puisqu'elle comparerait des mesures prises avec deux règles différentes.

### 5. Le LLM est borné à une seule dimension et ne renvoie jamais le score

Le modèle produit quatre sous-notes sur 0..10 (`actionVerbs`, `quantification`, `relevance`, `consistency`) plus des recommandations, pour la seule dimension `impact`. **L'arithmétique appartient au moteur.** Garde-fou : `impact = clamp(llmImpact, ruleImpact ± 25)`, le repli par règles étant toujours calculé. Échec d'appel → `llmApplied: false` et score rendu en mode règles.

Ainsi un changement de modèle ne peut pas décaler le score de tous les utilisateurs, et **le scoring ne peut jamais faire échouer une génération de CV**.

### 6. Pas de piggyback sur l'appel de génération de CV

L'option d'obtenir les signaux du modèle dans le même appel que la génération (coût marginal nul) a été **rejetée** : `normalizeCvJson` puis `groundCvContent()` retirent, *après* l'appel, tout contenu non étayé par le profil. Un jugement rendu dans le même souffle décrirait le brouillon **avant grounding** — un document qui n'est jamais livré. S'y ajoutent le rayon d'explosion sur le prompt le plus critique du produit et la taille de `cv-generation.service.ts` (417 lignes, déjà au-delà du seuil bloquant de 400).

## Consequences

**Positives**
- Score reproductible, persistable, comparable entre versions et agrégeable en KPI.
- Une seule échelle entre landing et in-app malgré des entrées de nature différente.
- Le moteur est testable sans réseau, sans base et sans Nest ; les dimensions sont à 100 % de couverture.
- Les `findings` étant des **codes** et non des phrases, l'i18n vit dans les dictionnaires landing et dans `apps/web` : la règle « zéro texte en dur » tient sans effort, et le package reste pur.
- L'implémentation peut atterrir par tranches : une dimension pas encore écrite se déclare `unavailable` et la renormalisation produit déjà un score honnête sur le sous-ensemble existant.

**Négatives / coûts assumés**
- Un même CV peut obtenir deux scores légèrement différents selon la surface (avec ou sans offre). C'est explicite dans l'UI, mais c'est une question de support à anticiper.
- Le barème est une opinion. Les pondérations ne sont étalonnées sur aucun ATS réel (Workday, Taleo… ne publient rien) : elles codifient les bonnes pratiques documentées, pas un comportement observé. À réviser avec des retours terrain, en bumpant la version.
- Un second appel LLM sur la landing, donc un coût par scan anonyme — borné par le rate limiting et le budget global quotidien (voir ADR-022).

## Alternatives considered

- **Un module dans `apps/api`** plutôt qu'un package : rejeté, `apps/web` ne pourrait pas recalculer le volet déterministe et rien n'empêcherait structurellement un import d'infrastructure.
- **Tout IA** (un appel qui note) : rejeté, score instable d'un appel à l'autre, non reproductible, donc incompatible avec la persistance et les KPI — et coûteux sur une surface publique.
- **Tout déterministe** : rejeté pour la landing, où la valeur perçue du rapport déverrouillé tient largement aux recommandations rédigées.
- **Un pseudo-matching de mots-clés sans offre**, à partir d'un lexique métier générique : rejeté. La même clé porterait alors deux mesures différentes selon la surface et la comparabilité s'effondrerait — c'est précisément ce que la règle d'exclusion/renormalisation évite.
- **Noter zéro une dimension non observable** : rejeté, cela punit un CV pour une information que le contexte ne pouvait pas fournir et rend les deux surfaces incomparables.

## Amendement 2026-09-22 — barème 1.1.0 : les défauts rédhibitoires plafonnent le score

Le parcours joué en navigateur a montré une échelle inutilisable : un CV **squelettique de 35 mots
obtenait 61/100 « Perfectible »**, et toute la plage utile était écrasée entre 61 et 94.

**Cause** : une moyenne pondérée ne peut pas exprimer qu'un défaut est *disqualifiant*. Un CV de
trois lignes ne perdait que ~4 points au global, parce que la longueur ne pèse que sur une dimension
valant 10. Le défaut était noyé par tout ce que le candidat avait réussi par ailleurs.

**Décision** : un finding `critical` impose un **plafond au score global** (`CRITICAL_CAPS` dans
`weights.ts`), le plus bas l'emportant. La moyenne pondérée continue de classer les CV entre eux ;
le plafond empêche seulement qu'un défaut fatal soit moyenné. C'est ce que fait un recruteur : il
s'arrête à l'email manquant, quelle que soit la mise en page.

Seuls les findings `critical` plafonnent. Le même code levé en `warning` — un CV simplement court
plutôt que vide — laisse le score intact. D'où l'ajout d'un seuil **« squelettique » à 250 mots**,
distinct du seuil « court » à 400.

Le résultat expose `cappedBy` : un score plafonné sans explication se lit comme une jauge cassée.

**Étalonnage obtenu** (avant → après) : squelettique 61 → **45 « Fragile »** · CV moyen aux tâches
non chiffrées **63 « Perfectible »** · CV soigné mais un peu mince **95** · CV impeccable **100**.

`ATS_SCORE_ENGINE_VERSION` passe à **1.1.0** : les scores 1.0.0 ne sont pas comparables, il faut
grouper par version avant toute moyenne ou courbe — c'est précisément ce que le versionnage du
barème existait pour permettre. Aucun score n'était encore persisté en production, d'où le choix de
rééquilibrer **maintenant**.

Les 116 tests existants sont passés **sans modification** : ils asserent des ordres
(`score(fort) > score(faible)`) et non des valeurs figées. Un barème se rééquilibre sans réécrire sa
suite de tests — c'est ce que cette convention achetait.

## Amendement 2026-09-22 — barème 1.2.0 : le barème mesurait la langue, pas le CV

Un CV produit par notre propre générateur — trois postes, douze puces, résultats chiffrés, section
compétences complète — obtenait **65/100** sur le moteur que nous vendons comme la mesure d'un CV
prêt pour un ATS. Le même constat en staging. Nous vendons des CV optimisés ATS : notre sortie doit
survivre à notre propre mesure, ou l'une des deux est fausse.

**C'était le moteur.** Mesuré sur le CV réel, `impact` valait **24/100**, et cinq biais se
cumulaient — tous du même genre : des heuristiques de *résumé américain* appliquées à un CV français.

1. **Le style nominal était lu comme une absence d'action.** « Réduction du temps de chargement de
   6 à 1,8 s » n'ouvrait sur aucun verbe reconnu. Ratio de verbes d'action mesuré : **0,00 sur 12
   puces**, alors que les douze décrivent une action. C'est le registre standard du CV français,
   celui que recommandent les guides et que produit notre générateur. 30 des 100 points d'`impact`
   étaient structurellement inatteignables en français. → lexique de **noms d'action** (`ACTION_NOUNS_FR`).
2. **Une compétence ne pouvait être « prouvée » que dans une puce.** Un CV français nomme sa stack
   dans l'accroche et ne la répète pas — exiger la preuve en puce, c'est demander la répétition que
   `keywords` sanctionne comme bourrage. Mesuré : **1 compétence sur 9** validée. → `AtsDocument`
   porte désormais `evidenceText`, la prose du CV **hors liste de compétences** (la liste ne peut
   pas se porter garante d'elle-même).
3. **Les sous-scores d'`impact` exigeaient la perfection.** Ratio linéaire : 50 % de puces chiffrées
   ne valaient que 15 points sur 30. Or un CV dont *chaque* puce porte un chiffre se lit comme
   fabriqué. → seuils de **crédit plein** (`FULL_CREDIT`), exactement le raisonnement que `keywords`
   applique depuis toujours avec son plafond à 60 % de couverture.
4. **Le plancher de longueur de puce était à 8 mots.** « Encadrement de deux développeurs juniors »
   en fait 5 et ne manque de rien. Le français est plus dense que l'anglais ; le seuil récompensait
   le remplissage. → 5 mots.
5. **`wordCount` ne mesurait pas la même chose selon l'adaptateur.** Le chemin structuré n'aplatissait
   que la prose — ni nom, ni coordonnées, ni dates, ni langues — là où le chemin fichier compte toute
   la page. Le même CV valait 172 mots ici et ~250 là, sous un seuil unique de 250. → le rendu
   structuré rend la page entière, et le test de parité, qui passait à divergence nulle, l'a
   confirmé en cassant sur **51 points** dès que les seuils ont bougé.

Deux défauts collatéraux trouvés au passage :

- **`KEYWORD_STUFFING` comptait chaque terme deux à trois fois** : le bourrage était mesuré sur un
  texte concaténant compétences et puces par-dessus un `rawText` qui les contenait déjà. Un CV
  ordinaire déclenchait l'alerte. → compté sur `rawText` seul.
- **`MISSING_QUANTIFICATION` plafonnait à 80 dès 25 % de puces chiffrées.** Le plafond a été écrit
  pour le CV qui liste des tâches et jamais un résultat : il est désormais `critical` **uniquement à
  zéro chiffre**, `warning` en dessous du seuil. Un quart de puces chiffrées est un CV perfectible,
  pas un CV disqualifié.

**Contactability rééquilibrée** : email 40, téléphone 30, ville 15, LinkedIn 10, portfolio 5
(auparavant 30/25/15/20/10). Un ATS route sur l'email et le téléphone ; l'URL de profil est un bonus
qu'un recruteur clique. Accorder 30 points à LinkedIn + portfolio amputait d'un tiers cette dimension
tout candidat qui n'est pas un développeur avec un GitHub public.

**Résultat sur le CV réel** (en base, non retouché) : **65 → 93**. Dimension par dimension :
structure 95, keywords 100, impact 24 → 85, contactability 70 → 85, formatHygiene 75 → 100.

`ATS_SCORE_ENGINE_VERSION` passe à **1.2.0**. Les scores 1.1.0 restent en base et les KPI groupent
déjà par version ; un score existant se rafraîchit à la prochaine sauvegarde du CV, le volet
déterministe étant recalculé à chaque `save`.

**Ce que cet épisode dit de la méthode** : les 127 tests passaient, et le barème était faux. Ils
étaient écrits — correctement — sur des fixtures rédigées par nous, dans le registre que le lexique
attendait. Un moteur de score ne se valide pas sur ses propres fixtures : `french-style.test.ts`
part désormais d'un CV **réellement produit par le générateur** et pose un plancher à 90, parce que
c'est le seul chiffre qui engage le produit.
