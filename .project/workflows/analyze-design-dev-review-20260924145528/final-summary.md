---
tags: [run/analyze-design-dev-review-20260924145528, run/final, workflow/analyze-design-dev-review, verdict/passed]
agent: "[[agents/tech-lead/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924145528/04-review]]"
sprint_task: "[[sprints/sprint-029#^us-132]]"
---
# Workflow verdict — US-132 : passed

Les 6 critères sont vérifiés, en deux passes de QA, sans défaut bloquant.

**Découverte majeure, corrigée** : en production, tous les visiteurs de la landing partageaient un seul compteur par IP. La cause : la landing appelle l'API par son domaine public, et Traefik y écrase `X-Forwarded-For`. Pour le scan ATS, cela faisait 3 analyses par heure pour tout le site. Correctif : un relais signé par `LANDING_PROXY_SECRET`.

**Hors code, avant la mise en ligne** :
1. Créer le secret GitHub `LANDING_PROXY_SECRET` (production et staging), avec une valeur aléatoire.
2. Vérifier que l'origine n'accepte que Cloudflare et que Traefik ne journalise pas les en-têtes.
3. Tester deux scans depuis deux IP différentes : ils doivent compter sur deux compteurs distincts.

Ces points sont inscrits au DoD du sprint 029.

**Next action** : US-133, le service lead générique.
