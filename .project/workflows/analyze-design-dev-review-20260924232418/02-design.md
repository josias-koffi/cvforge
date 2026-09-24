---
tags: [run/analyze-design-dev-review-20260924232418, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924232418/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924232418/03-implement]]"
---
### Verdict: PASS
### Page
- **Fil d'Ariane** : Outils → Vérifier un employeur → nom de l'entreprise.
- **H1** : « EVERIENCE : fiche employeur ». Sous le titre, le SIREN et la catégorie.
- **Chapeau** : une phrase tirée des données (activité, effectif, âge). Deux variantes selon que l'effectif est connu ou non. Aucun texte inventé.
- **Fiche** : `CompanyFigures`, `CompanyCommitments`, `CompanyEmployerPage` et `CompanySources` d'US-139, réutilisés tels quels (composants serveur). On y ajoute la source La Bonne Boîte et la date de relecture.
- **« Où elle recrute »** : un métier par ligne avec sa ville. Le lien va vers la page métier × département si elle existe, sinon c'est du texte seul.
- **CTA** : `ToolLeadCta` de l'outil, avec le SIREN. Même promesse : « Voir les entreprises qui recrutent ».
- **« Autres employeurs du secteur »** : des liens vers des pages qui existent.
- **Lien vers l'outil** : « Vérifier un autre employeur ».
### Refactor
- Le fil d'Ariane de `MarketPage` est extrait dans `components/breadcrumbs.tsx` et partagé entre les deux pages.
- Idem pour `slugify`/segment (`lib/slug.ts`), `formatSiren` et le `BreadcrumbList` JSON-LD.
- Le contenu des pages va dans `content/company-check/`, pas dans `fr.ts`/`en.ts` (au-dessus du plafond).
### Accessibilité
- Un seul H1. La fiche est une section à H2 (« La fiche de l'entreprise ») : ses blocs gardent leurs H3, sans toucher aux composants.
- Nav `aria-label` + `ol`, `aria-current="page"`.
- Liens externes annoncés « nouvel onglet ».
### Risque
Un titre « {nom} : fiche employeur » en majuscules (données INSEE) crie. On garde la graphie officielle, pour rester fidèle à la source.
