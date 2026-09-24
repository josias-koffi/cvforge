---
tags: [run/analyze-design-dev-review-20260924145528, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924145528/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924145528/final-summary]]"
---
### Verdict: PASS (deux passes)
### Critères
1. VERIFIED — `RateLimitPolicy` et `rateLimitedRoutes()` : une route se déclare dans `rate-limit.policies.ts`.
2. VERIFIED — Les tests historiques du limiteur sont intacts et passent ; clés et variables ATS conservées.
3. VERIFIED — Horloge injectée, aucune attente réelle. ADR-022 amendée.
4. VERIFIED — Politique `events` : 60 par heure, 300 par jour, budget de 20 000 par jour, avec tests.
5. VERIFIED — `CLIENT_IP_HEADER` présent dans les trois fichiers compose.
6. VERIFIED (2e passe) — Relais signé : le navigateur ne peut pas usurper l'IP, la comparaison du secret se fait en temps constant, le secret reste côté serveur, un secret vide fait ignorer le relais.
### Findings
- [ADVISORY] **Corrigé.** Les chemins sont reconnus sans tenir compte de la casse, `/unlock/` inclus.
- [ADVISORY] **Corrigé.** L'IP relayée doit être une adresse (`isIP`).
- [ADVISORY] **Corrigé, découvert en cours de route.** Les conteneurs `api` ne recevaient ni `ATS_IP_HASH_SECRET` ni `ATS_PUBLIC_*`.
- [ADVISORY] Préexistant, reporté au backlog : `/public/ats-scan/` (avec barre finale) passe deux fois dans le middleware.
- [ADVISORY] La politique par défaut, le scan, consomme le budget ATS pour une route qui n'aurait pas sa propre politique.
- [ADVISORY] Exploitation : réserver l'origine aux plages Cloudflare, sinon `cf-connecting-ip` est falsifiable ; vérifier que Traefik ne journalise pas les en-têtes.
