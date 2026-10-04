---
tags: [run/developer-20261004131152, workflow/developer, result/failed]
sprint: "[[sprints/sprint-035#US-170]]"
workflow: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261004131152/01-developer]]"
---
# US-170 — final summary
- Developer : 7/8. **Résultat : failed**, US-170 non cochée : la politique de confidentialité doit être publiée par le propriétaire.
- Mise en service : publier depuis `/admin/legal` la ligne « Vos candidatures : un an après leur dernière modification, avec un rappel quinze jours avant. », puis `applications:purge:built -- --dry-run` en staging et en prod, puis `applications:purge:built`. Les premières suppressions arrivent au plus tôt 15 jours après.
- **Suite** : DoD du sprint 035 (dry-runs relus en staging et en prod).
