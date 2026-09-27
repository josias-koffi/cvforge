---
tags: [run/analyze-design-dev-review-20260924222645, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924222645/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924222645/03-implement]]"
---
### Verdict: PASS
### Page
`/fr/verifier-employeur` · `/en/employer-check`. Titre : « Vérifiez un employeur avant de postuler ». Même gabarit que `/fr/metier-recrute` (eyebrow, H1, sous-titre, carte).
### Recherche
- Un champ « Nom de l'entreprise ou SIREN » (libellé visible, `autocomplete="off"`, `inputmode` texte), bouton « Rechercher ». Pas de combobox : la recherche part à la validation, donc un appel par intention.
- Résultats dans une liste (`<ul>`) de boutons pleine largeur, 44 px mini : nom en gras, puis « Ville (CP) · NAF · effectif » en gris, badge « Fermée » bordé si cessée.
- Une seule correspondance (SIREN/SIRET) ⇒ la fiche s'ouvre directement.
- Aucun résultat ⇒ encart neutre dans la région live : « Aucune entreprise ne correspond à « … ». Vérifiez l'orthographe ou saisissez le SIREN (9 chiffres) » — jamais en rouge.
### Fiche (`aria-live="polite"`, focus sur le H2)
- En-tête : raison sociale, « SIREN 381 983 568 », catégorie ; alerte « déclarée fermée » si c'est le cas.
- **Chiffres clés** en cartes : effectif, activité (code NAF + section), création, établissements ouverts, chiffre d'affaires de la dernière année.
- **Engagements** : liste oui/non lisible sans couleur (icône + texte) : société à mission, ESS, bilan carbone publié, index Egapro « 94/100 (2025) » ou « non déclaré ».
- **Page employeur France Travail** : lien externe (« 8 offres publiées ») ou « Aucune page employeur connue ».
- **Sources**, toujours visibles : Annuaire des entreprises (lien vers la fiche), Egapro si affiché, France Travail si page.
- CTA « Voir les entreprises qui recrutent dans votre métier » → `EmailConsentForm` → « Vérifiez votre boîte mail ».
- « Vérifier un autre employeur » ramène à la recherche ; « Retour aux résultats » si plusieurs.
### Réutilisation
Le bloc CTA de US-137 devient générique (`ToolLeadCta`, envoi injecté) ; outil ajouté au hub et à la section home via `freeTools`.
### Accessibilité
Libellés visibles, erreurs et « aucun résultat » dans une région live toujours montée, `Reveal` pour `prefers-reduced-motion`, liens externes annoncés (« nouvel onglet »).
### Risque UX
Une recherche par nom renvoie des homonymes : la ville et le NAF de chaque ligne servent à trancher.
