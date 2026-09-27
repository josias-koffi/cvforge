---
tags: [workflow-run, blocked, sprint-027]
task: "[[sprints/sprint-027#US-128]]"
agent: "[[agents/developer/agent|developer]]"
---
# US-128 — Radar marché : bloqué

- **Verdict** : bloqué avant tout code, sans rien modifier dans l'application.
- **Constat (2026-09-24)** : le serveur de jetons France Travail répond `400 invalid_scope` pour
  `api_stats-offres-demandes-emploiv1 offresetdemandesemploi` et ses variantes. L'API Marché du travail
  n'est donc pas rattachée à l'application cvspark, ou son scope diffère.
- **Pourquoi ne pas coder à l'aveugle** : indicateurs, granularité territoriale et corps de requête
  restent inconnus. Un contrat faux ne lève pas d'erreur, il renvoie une page vide (leçon d'Offres v2).
- **Pour débloquer** : ajouter « Marché du travail » à cvspark sur francetravail.io et accepter les CGU,
  puis relancer `/sprint 027 US-128`. La première étape sera la sonde `ft:smoke`.
