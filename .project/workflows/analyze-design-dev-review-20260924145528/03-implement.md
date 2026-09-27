---
tags: [run/analyze-design-dev-review-20260924145528, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924145528/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924145528/04-review]]"
---
### Verdict: PASS
### Summary
- `rate-limit.policies.ts` : trois politiques (events, unlock, scan), la dernière acceptant tout chemin. `rateLimitedRoutes()` alimente `forRoutes` dans `app.module.ts`.
- Le middleware choisit une politique par chemin et garde une clé par politique ; le budget global est facultatif.
- `/public/events` : 60 par heure, 300 par jour, budget de 20 000 par jour (`PUBLIC_EVENTS_*`).
- Landing : `forwardedFor` lit `CLIENT_IP_HEADER`, posé à `cf-connecting-ip` dans les trois fichiers compose de production.
- ADR-022 amendée.

Tests : API 1783, landing 125. Les tests existants du limiteur passent sans aucune modification. Nouveau code : 100 % des lignes sur les politiques et `forwarded-for`.
### Findings
- [ADVISORY] Diff de la story : environ 250 lignes de code, sous la limite de 400.
- [ADVISORY] `docker compose config` échoue déjà sans ce changement (le service `app` n'a pas d'image dans l'assemblage local) : j'ai vérifié les fichiers d'infra par lecture YAML.
- [ADVISORY] Plusieurs fichiers de `shared/rate-limit` étaient déjà hors Prettier. Seul le middleware, réécrit, a été formaté.
### Refactors applied
- `rate-limit.middleware.ts` : `isUnlock` et les constantes propres à l'ATS remplacés par les politiques ; repli mort supprimé (environ 10 lignes de moins).
### Ajouté après la première revue (décision du propriétaire)
Relais signé de la landing vers l'API (`client-ip.ts`, `LANDING_PROXY_SECRET`, adresse vérifiée par `isIP`), branché dans compose, Terraform et CI. Les variables `ATS_*` sont désormais transmises au conteneur. API 1796 tests, landing 127.
### Next action
Revue QA.
