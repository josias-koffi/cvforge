# Fidélité aperçu PDF CV et LM

## Design Thinking

**Purpose** — Permettre au candidat de modifier son CV ou sa lettre en sachant exactement ce qui sera téléchargé.

**Tone** — `brutally minimal` appliqué au document : la feuille exportée est la seule esthétique utile, sans décoration d’éditeur concurrente.

**Differentiator** — L’aperçu n’imite pas le PDF : il exécute le même renderer.

**Anti-convergence check** — Pas de nouvelle police, palette, grille de cards, gradient ou animation. Les styles existants du PDF et « Papier & Crayon » sont préservés.

## Mockup

Le panneau droit conserve son titre sticky « Aperçu PDF ». Une feuille blanche au ratio A4 remplit la largeur disponible. Son contenu est isolé dans un iframe et suit les marges d’impression CV ou LM.

## Journey

1. L’utilisateur modifie un champ.
2. Le brouillon React est rendu immédiatement par le renderer partagé.
3. L’iframe affiche le HTML exact utilisé lors du téléchargement.
4. Le PDF exporté reprend le même renderer avec les règles `@page`.

## Typography

Identique au PDF : EB Garamond / Libre Baskerville / Georgia, tailles en points.

## Color

Papier `#FFFFFF`, encre `#1A1A1A`, texte secondaire `#6B6860`, bordure d’enveloppe `#D9D4CA`.

## Motion

Aucune animation : le changement de contenu immédiat suffit à communiquer l’état.

## Interaction notes

L’iframe est non interactive et sandboxée. Son `title` décrit le document exporté. Aucun changement du parcours clavier.

## Developer brief

Maintenir une source unique du HTML. Toute évolution visuelle CV/LM doit être faite dans `@cvforge/document-renderer`, jamais dans un aperçu parallèle.

## Quality Gate

Audit Impeccable local : zéro finding. Contraste et hiérarchie inchangés par rapport au PDF de référence.
