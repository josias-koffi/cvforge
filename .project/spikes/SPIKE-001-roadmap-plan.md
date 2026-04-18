<!-- generated-by: run-agent analyst -->

# SPIKE-001 — Analyse de roadmap, backlog et plan de sprints

Date: 2026-04-18
Agent: `analyst`
Source unique: `.project/vision.md`

## Objectif

Transformer la vision produit en backlog exploitable et en plan de sprints complet, sans ajouter de périmètre absent de la vision.

## Méthode

- Relecture des sections fonctionnelles `§3` à `§15`
- Relecture de la roadmap explicite `§16`
- Extraction des contraintes transverses: UX mobile-first, conformité RGPD, intégrations IA, paiements, panel admin
- Découpage en tranches livrables de 2 semaines alignées sur les versions `MVP`, `V1.1`, `V1.2` et `V2.0`

## Constats clés

### 1. Le MVP est suffisamment détaillé pour planifier une livraison séquentielle

Le MVP liste 22 blocs livrables explicites, depuis le setup monorepo jusqu'au panel admin, en passant par l'authentification, les templates, la génération de CV/LM, les crédits et le dashboard (source: vision `§16`, bloc `MVP (V1.0)`).

### 2. Le périmètre se découpe naturellement en 4 horizons produit

- `MVP (V1.0)`: fondations, auth, profil, IA texte, templates, documents, paiements, dashboard, admin (source: vision `§16`)
- `V1.1`: productivité candidat, imports/exports, rappels, analytics avancées, partage social (source: vision `§16`)
- `V1.2`: interview vocal temps réel avec contraintes de latence critiques (source: vision `§10`, vision `§16`)
- `V2.0`: recruteur, comptes entreprise, import PDF d'offre, extension navigateur, analytics admin avancées, upgrade OpenRouter enterprise (source: vision `§16`)

### 3. Trois dépendances structurantes imposent l'ordre des sprints

- `Auth + rôles` avant `panel admin` et avant protection des routes `/admin` (source: vision `§3`, `§13.1`)
- `Puck blocks + templates` avant `génération CV`, `LM` et `édition WYSIWYG` (source: vision `§6.1` à `§6.7`, `§7`, `§8`, `§9`)
- `OpenRouter + pseudonymisation` avant toute génération documentaire (source: vision `§2`, `§15.2`, `§15.3`)

### 4. La conformité n'est pas un lot final, mais une contrainte transversale

La vision impose dès le MVP:

- hébergement EU pour PostgreSQL et MinIO (source: vision `§2`)
- `zdr: true` sur chaque appel OpenRouter et prompt logging désactivé (source: vision `§2`, `§15.2`)
- pseudonymisation des données envoyées à l'IA (source: vision `§15.3`)
- suppression RGPD et droits d'accès/portabilité à traiter avant lancement commercial (source: vision `§15.1`, `§15.5`)

### 5. L'interview vocal est explicitement différée après le MVP

Le mode interview vocal et ses optimisations critiques appartiennent à `V1.2`, avec une exigence de latence perçue `< 1,2 secondes` et plusieurs optimisations marquées critiques pour la qualité perçue (source: vision `§10`, notamment `Objectif cible : < 1,2 secondes perçues`, et vision `§16`).

## KPI dérivés de la vision

Les KPI de backlog doivent mesurer un résultat vérifiable directement dérivé de la vision:

- présence des écrans, rôles et routes explicitement requis
- disponibilité des intégrations attendues
- nombre exact d'indicateurs dashboard demandés
- présence des packs crédits et des statuts pipeline listés
- respect des contraintes RGPD et OpenRouter documentées

## Clarifications qui restent ouvertes dans la vision

- Provider email non figé: "`à définir — ex: Resend`" (source: vision `§2`)
- Durée de session à définir, avec recommandation 7 jours + refresh token (source: vision `§3.4`)
- Import de CV existant à réévaluer si la complexité IA est trop forte pour le MVP; déplacement possible en `V1.1` (source: vision `§4`, note MVP)
- Librairie de conversion `DOCX` à définir pour `V1.1` (source: vision `§6.6`)
- Upgrade OpenRouter enterprise seulement à évaluer en `V2.0` pour le routage EU garanti (source: vision `§15.5`, `§16`)

## Décision de planification

- Garder `Sprint 001` comme sprint de fondation déjà ouvert
- Planifier `Sprint 002` à `Sprint 009` pour fermer le `MVP`
- Planifier `Sprint 010` à `Sprint 011` pour `V1.1`
- Planifier `Sprint 012` à `Sprint 013` pour `V1.2`
- Planifier `Sprint 014` pour `V2.0`

## Livrables produits par ce spike

- `sprints/backlog.md` réécrit avec épics, KPI et stories planifiées
- `sprints/sprint-002.md` à `sprints/sprint-014.md` créés
- `.project/state.json` mis à jour

## Risques de plan

- Le MVP concentre beaucoup de dépendances externes: Stripe, OpenRouter, MinIO, Redis, Puppeteer
- La partie scraping d'offres et les imports documentaires peuvent dériver en complexité
- L'interview vocal dépend fortement de la qualité du streaming temps réel et de la latence perçue

## Recommandation

Le projet doit être piloté par jalons de version, avec validation stricte de la conformité RGPD et du pipeline IA avant l'ouverture commerciale du MVP.
