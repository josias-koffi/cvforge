# Stage 2 — Design

## UX Direction

- Reutiliser `AppShell` et les primitives `@cvforge/ui` pour rester dans la direction "Papier & Crayon".
- Conserver un parcours en colonne unique, avec progression visible, cartes empilees et boutons pleine largeur.
- Exposer la liste complete des etapes en tete pour que le wizard reste comprehensible meme sur mobile.

## Interaction Notes

- Etape 1: validation minimale sur les champs obligatoires avant passage a l'etape suivante.
- Etapes 2 a 4: progression lineaire avec retour arriere possible.
- Etape 5: recapitulatif global avec actions `Modifier` vers les sections precedentes.
- Reprise: stocker un brouillon local et afficher la date de derniere sauvegarde.
- Sortie: bouton `Completer mon profil` qui redirige vers un tableau de bord protege.

## Accessibility / Mobile Notes

- Labels explicites sur tous les champs.
- Boutons et zones de clic assez larges pour mobile.
- Structure semantique par cartes et sections, sans tableau complexe.
- Navigation mobile du shell conservee.

## Verdict

- Design coherent avec le scope.
- Aucun risque UX bloquant.
