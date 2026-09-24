---
tags: [run/developer-20260924180000, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924180000/task]]"
next: "[[workflows/runs/developer-20260924180000/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-116, suite

- **API** :
  - `companies/employer-pages.source.ts` : recherche par nom et département, reconnaissance par le SIREN. Le résultat est une page, `null` s'il n'y en a pas, ou `undefined` en cas d'échec.
  - Le store renvoie maintenant `due()`, avec le nom et le département de l'établissement. `save()` ne touche pas à la page quand elle vaut `undefined`.
  - Migration 0038.
- **Web** : un bloc « Sa page employeur sur France Travail » sur la fiche entreprise.
- **Rythme** : l'Annuaire passe à 2 appels/s après des 429 à 5 appels/s.
- **Infra** : `pages-employeurs` est activée par défaut.
- **Vérifié en réel** : 51 pages sur 174, et le lien HELPLINE s'affiche sur la fiche.
- **Tests** : 1742 côté API, 377 côté web.
