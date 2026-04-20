# Stage 2 — Design

Agent: `designer`

## Design Direction

La story n'introduit pas encore un nouvel écran. Le livrable design est donc un brief de composant:

- composants documentaires sobres, orientés impression, cohérents avec la direction "Papier & Crayon"
- markup sémantique (`header`, `section`, `article`, titres hiérarchiques, listes)
- styles légers et neutres pour rester compatibles avec différents templates futurs

## Reuse Strategy

- un registre unique expose le nom du bloc, son label, ses props attendues, ses `defaultProps`, et les contextes où il peut être utilisé (`cv`, `letter`)
- l'admin pourra l'utiliser comme palette de blocs
- le user pourra l'utiliser comme moteur de rendu du document final

## UX / Accessibility Notes

- textes de contact regroupés de manière lisible
- listes d'accomplissements rendues avec une vraie structure de liste
- titres de section et séparateurs distincts mais visuellement discrets
- aucun bloc n'introduit d'interaction clavier à ce stade

## Risk Notes

- éviter de sur-styliser les blocs maintenant, sinon les futurs templates seront difficiles à différencier
- garder les props strictement alignées sur la vision pour préserver le contrat IA -> JSON -> rendu
