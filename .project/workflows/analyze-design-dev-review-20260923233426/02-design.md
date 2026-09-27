---
tags: [run/analyze-design-dev-review-20260923233426, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260923233426/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260923233426/03-implement]]"
---
### Verdict: PASS
### Écran
Nouvelle carte **« Vos métiers »**, juste après « Le poste » : c'est la traduction des postes visés.
- Description : « Les métiers du référentiel de France Travail qui correspondent à vos postes. Confirmez ceux qui vous ressemblent. »
- **Confirmés** : puces pleines, avec une croix accessible (« Retirer … »).
- **Suggérés** : puces en contour avec le score en pourcentage, un bouton ✓ (« Confirmer … ») et une croix. Libellé de la liste : « Suggestions ».
- **Vide avant tout enregistrement** : « Enregistrez votre recherche : nous vous proposerons les métiers correspondants. »
- **Ajouter un métier** : champ d'autocomplétion, même motif que « Ajouter une ville » (anti-rebond, liste de boutons). Chaque ligne affiche l'appellation et son métier en gris.
- Pied de carte : « Source : ROME 4.0, France Travail », en petit (licence).
### Accessibilité
Boutons avec `aria-label` explicites, puces en `<ul>`, contraste des variantes shadcn existantes.
### Risques UX
- La suggestion n'arrive qu'après un enregistrement : un toast le dit (« 3 métiers proposés »).
- `search-project-form.tsx` fait 376 lignes : la carte et les alertes vont dans leurs propres fichiers.
