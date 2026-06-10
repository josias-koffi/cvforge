# Rationalisation frontend desktop

## Design Thinking

**Purpose** — Aider un candidat à suivre ses candidatures et finaliser ses documents depuis un poste de travail, avec moins de défilement et moins de décisions parasites.

**Tone** — `brutally minimal`: calme, précis et fonctionnel. L'identité Papier & Crayon reste dans les couleurs et les documents, pas dans un excès d'espace ou de décoration.

**Differentiator** — Un bureau de candidature compact où statut, prochaine action et document sont visibles ensemble.

**Anti-convergence check** — Pas de gradient, pas de grille de cartes identiques, pas de pill de marque répétée, pas d'animation décorative, pas de nouvelle police.

## Mockup

- Shell desktop: sidebar 216 px, topbar 52 px, contenu max 1600 px, padding 20 px.
- Candidatures: bande KPI compacte, feedback inline, barre de filtres puis table sans carte englobante.
- Détail: en-tête compact; onglets dans une surface unique; contenu en colonnes quand la matière le permet.
- CV/LM: barre d'actions compacte; formulaire à gauche, aperçu sticky à droite; historique secondaire replié.

## Journey

Login réussi → dashboard → candidature → détail → édition CV/LM → sauvegarde/export → retour candidature.

## Typography

DM Sans pour l'interface, EB Garamond réservé aux documents. Titres UI à échelle fixe; descriptions limitées à une ligne utile.

## Color

Conserver les tokens existants: texte `#1A1A18`, muted `#6B6860`, canvas `#FAFAF7`, bordure `#D9D3C7`. Accent uniquement pour action et sélection.

## Motion

Transitions d'état 150 ms maximum. Aperçu sticky sans animation. Respect de `prefers-reduced-motion`.

## Interaction notes

Focus visible conservé, onglets avec flèches gauche/droite, lignes de table cliquables mais actions explicites, cibles tactiles au moins 40–44 px sur petits écrans.

## Developer brief

Réutiliser `AppShell`, les tokens et primitives existants. Extraire les gros fichiers touchés au lieu d'ajouter des blocs supplémentaires. Aucun package.
