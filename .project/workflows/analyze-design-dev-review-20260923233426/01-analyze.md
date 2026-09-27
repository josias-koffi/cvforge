---
tags: [run/analyze-design-dev-review-20260923233426, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260923233426/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260923233426/02-design]]"
---
### Verdict: PASS
### Périmètre
- **Entrée ROMEO** : chaque intitulé de `targetRoles` (10 au plus) et `profile.headline`, le titre du CV, en **un seul appel** (ROMEO accepte plusieurs textes, vérifié le 2026-09-23).
- **Agrégation** : meilleur score par appellation, tri décroissant. On écarte ce que le candidat a déjà confirmé ou retiré, puis on garde les 5 premières.
- **États d'une appellation** : `suggested` (ROMEO), `confirmed` (le candidat), `dismissed` (retirée ; jamais reproposée). Seules les `confirmed` pilotent la suite (US-124).
- **Confirmer ou retirer** prend effet tout de suite, sans nouvel « Enregistrer » : une puce qui ne se sauvegarde qu'au second clic sur un autre bouton ne serait pas comprise.
- **Enregistrer** relance ROMEO et remplace les suggestions en attente. Les confirmées et les retirées sont intactes.
- **Repli** : autocomplétion sur `rome_appellations`, sans accents et sans appel extérieur. Un ajout manuel est confirmé d'office.
- **ROMEO en panne ou non souscrite** : le projet s'enregistre, les suggestions restent celles d'avant, un avertissement est journalisé, rien n'est montré au candidat.
- **RGPD** : la purge du compte supprime `search_project_rome`, dans le même store que `search_projects`.
### Critères testables
Les cinq critères du sprint, tous vérifiables par test.
### Questions ouvertes (non bloquantes)
- Export RGPD : faut-il exporter les appellations ? Recommandé ; hors critère.
- Coût : aucun crédit (ADR-024 §3).
