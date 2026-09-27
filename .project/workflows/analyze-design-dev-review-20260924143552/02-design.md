---
tags: [run/analyze-design-dev-review-20260924143552, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924143552/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924143552/03-implement]]"
---
### Verdict: PASS
### Landing
Aucun changement visible. Les événements partent en arrière-plan : pas de bandeau, pas de délai, pas d'état d'erreur. Un échec d'envoi ne doit jamais apparaître au visiteur.

### Admin — `/admin/metrics`
Une carte par outil, avec le composant existant `MetricCard`. Pas de nouveau composant, pas de graphique : avec quelques dizaines de visiteurs, un entonnoir dessiné exagérerait des écarts de 1 ou 2 personnes.

- **Libellé** : « Tunnel · Analyse ATS (30 j) ». Le nom de l'outil vient d'une table de libellés côté web, pas de l'identifiant technique.
- **Chiffre principal** : les visiteurs de la page.
- **Détail**, dans l'ordre du parcours, chaque ligne avec son taux par rapport à l'étape précédente :
  - Résultat affiché
  - Clic sur l'appel à l'action
  - Email saisi
  - Compte activé
- **Taux** : `n · x %`, même format que la carte ATS actuelle. Pas de taux quand l'étape précédente vaut 0 : sur un tunnel vide, « 0 % » se lit comme un échec.
- **Compte activé** vaut `—` pour un outil qui n'a pas encore de service lead, avec l'explication dans la note de la carte.
- **Note** : « Visiteurs uniques par jour et par étape, sans cookie. »
- **Placement** : juste après la carte « Analyses ATS publiques », qui reste en place. Elle compte les scans en base depuis toujours, alors que le tunnel compte des visiteurs sur 30 jours : les deux sont vrais, mais ne mesurent pas la même chose.

### Accessibilité
Contenu en `<dl>` (déjà fait par `MetricCard`), chiffres en `tabular-nums`, aucune information portée par la seule couleur.
