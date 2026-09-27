---
tags: [run/analyze-design-dev-review-20260925000215, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260925000215/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260925000215/03-implement]]"
---
### Verdict: PASS
### Page
- URL : `/fr/questions-entretien` et `/en/interview-questions`.
- En-tête centré comme les autres outils : eyebrow, H1 « Quelles questions vous posera le recruteur ? », sous-titre.
- **Formulaire** (carte) : le textarea de l'offre du comparateur (libellé, aide, compteur 200 min). Un bouton `spark` « Voir les questions », avec son état en cours « Le recruteur lit l'offre… ». Une note : « L'offre est envoyée à un modèle d'IA le temps de la réponse, rien n'est conservé. »
- **Résultat** : il remplace le formulaire et reçoit le focus (`tabIndex=-1`). Il contient :
  - un H2 ;
  - une liste ordonnée de 5 cartes. Chaque carte porte un badge de type, la question en gras et « Ce que le recruteur cherche : … » en texte secondaire ;
  - le lien « Essayer une autre offre » ;
  - `ToolLeadCta`, icône micro : « S'entraîner à l'oral avec un recruteur IA ». Le texte promet un entretien vocal sur cette offre, avec un rapport à la fin.
- **Erreurs** : dans la région `aria-live` du formulaire, comme le comparateur. Le code `QUESTIONS_UNAVAILABLE` a son propre message : « Le générateur ne répond pas pour le moment. Réessayez dans un instant. »
### Contenu
Dans `content/interview-questions/{fr,en,types}.ts`. Seuls vont dans `fr.ts`/`en.ts` la carte du hub et le message d'erreur (fichiers déjà hors plafond).
### Accessibilité
- Un seul H1. Libellé et `aria-describedby` sur le textarea.
- Le badge de type est du texte, pas une couleur seule.
- Les animations passent par `Reveal`/`animate-rise-in`, déjà neutralisés par `prefers-reduced-motion`.
### Risque
Les questions sont générées : on précise qu'elles sont « probables », pas certaines. Le sous-titre le dit.
