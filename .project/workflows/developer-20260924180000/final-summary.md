---
tags: [workflow-run, sprint-026, result/passed]
task: "[[sprints/sprint-026#US-116]]"
prev: "[[workflows/runs/developer-20260924180000/01-developer]]"
---
# US-116, suite — synthèse

- **Verdict** : la page employeur apparaît sur la fiche entreprise quand elle existe (29 % des cas), et elle est lue en arrière-plan.
- **À faire au déploiement** : ajouter `pages-employeurs` à `FRANCE_TRAVAIL_APIS` si la variable est surchargée, puis lancer `companies:refresh:built`.
