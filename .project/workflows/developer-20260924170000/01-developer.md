---
tags: [run/developer-20260924170000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924170000/task]]"
next: "[[workflows/runs/developer-20260924170000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-116

- Avec les deux scopes, le jeton est délivré et `POST /page-employeur/recherche` répond 200. Toutes les autres ressources répondent 403.
- `where`, un département, est obligatoire. `what` est une recherche plein texte sur le nom et l'accroche. `siret` est ignoré, et `pageMaxSize` n'est pas respecté.
- L'URL publique est `recrute.francetravail.fr/page-employeur/<urlPath>`, vérifiée dans le navigateur.
- **Couverture** : 52 des 179 entreprises de La Bonne Boîte ont une page (29 %), dont 25 rédigées par l'employeur et 42 avec des offres.
- `FT_APIS` gagne `pages-employeurs` : `ft:smoke` répond 200 et les 45 tests France Travail passent.
