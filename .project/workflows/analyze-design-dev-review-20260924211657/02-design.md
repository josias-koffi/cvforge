---
tags: [run/analyze-design-dev-review-20260924211657, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924211657/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924211657/03-implement]]"
---
### Verdict: PASS
### Page
`/fr/metier-recrute` · `/en/job-market`. Titre : « Ce métier recrute-t-il près de chez vous ? ».
### Formulaire (une ligne sur desktop, empilé sur mobile)
1. **Métier** : combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox).
   - Suggestions à partir de 2 caractères, 250 ms après la frappe.
   - Flèches, Entrée, Échap.
   - Chaque option affiche l'appellation, puis le métier ROME en gris.
2. **Département** : `<select>` natif avec les 101 départements (« 44 — Loire-Atlantique »). Accessible sans effort, rien à deviner.
3. Bouton « Voir le marché », désactivé tant que le métier n'est pas choisi dans la liste.
### Résultat (`aria-live="polite"`, focus sur le titre)
- **Tension** : jauge de 5 segments. Le libellé en mots (« Recrutement très difficile ») porte le sens, pas la couleur seule. La période est indiquée.
- **Trois chiffres en cartes** :
  - offres du trimestre, avec le total sur 12 mois en dessous ;
  - demandeurs d'emploi (catégorie A) ;
  - salaire médian brut annuel, avec « d'après N offres ».
- **Salaire masqué** : la carte dit « Pas assez d'offres affichant un salaire (moins de 5) pour donner une médiane fiable ».
- **En cours de collecte** : un encart neutre « Nous n'avons pas encore lu ce métier dans ce département. Les chiffres arrivent sous 24 h : revenez, ou recevez les offres par email ».
- **Sources**, toujours visibles sous les cartes :
  - « Source : Marché du travail, France Travail » ;
  - « Salaires : offres collectées par CVSpark ».
- **CTA** « Recevoir chaque matin les offres de ce métier » → `EmailConsentForm` → « Vérifiez votre boîte mail ».
- « Chercher un autre métier » remet le formulaire à zéro.
### Accessibilité
- Libellés visibles ; erreurs dans une région live ; cibles d'au moins 44 px.
- `Reveal` pour `prefers-reduced-motion`.
- Puces bordées lisibles (leçon d'US-135).
### Risque UX
Le métier ROME est plus large que l'appellation choisie. Le résultat nomme donc le métier (« Chiffres du métier ROME M1805 — Études et développement informatique »).
