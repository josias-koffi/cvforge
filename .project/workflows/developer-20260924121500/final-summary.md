---
tags: [workflow-run, sprint-027, result/passed]
task: "[[sprints/sprint-027#US-128]]"
prev: "[[workflows/runs/developer-20260924121500/01-developer]]"
---
# US-128 — synthèse

- **Verdict** : livré et vérifié. Coché le 2026-09-24 : le PO a validé les deux écarts.
  1. Les salaires ne viennent pas de l'API (qui n'en a pas par ROME), mais des offres collectées ; la source est affichée à part.
  2. « Département voisin » veut dire ici un autre département de la même région, pas un département limitrophe.
- **Migration** : 0035 au lieu de 0031.
- **À faire au déploiement** : ajouter `marche-travail` à `FRANCE_TRAVAIL_APIS` (fait dans les valeurs par défaut de Terraform et de compose), puis lancer `market:refresh:built` pour le premier remplissage.
