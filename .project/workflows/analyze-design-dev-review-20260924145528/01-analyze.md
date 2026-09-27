---
tags: [run/analyze-design-dev-review-20260924145528, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924145528/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924145528/02-design]]"
---
### Verdict: PASS (un critère scindé)
### Périmètre
- **Politique par route** : `{ nom, routes Nest, reconnaissance du chemin, limites par IP, budget global ou aucun, messages }`. Le middleware prend la première politique qui reconnaît le chemin. `app.module.ts` applique le middleware à l'union des routes déclarées : ajouter une route revient à ajouter une politique.
- **ATS inchangé** : clés `scan:<ip>`, `unlock:<ip>`, `global:ats-scan`, variables `ATS_*`, messages et `resolveRateLimitConfig` identiques. Les assertions des tests actuels ne bougent pas.
- **`/public/events`** : 60 par heure et 300 par jour pour une IP, budget global de 20 000 par jour. Variables `PUBLIC_EVENTS_HOURLY_LIMIT`, `PUBLIC_EVENTS_DAILY_LIMIT`, `PUBLIC_EVENTS_DAILY_BUDGET`.
- **Chemin inconnu** : politique du scan ATS, la plus stricte. Jamais de passage libre.
### Critère scindé (`X-Forwarded-For`)
L'analyse d'infrastructure montre que le risque n'est pas là où la revue d'US-131 le plaçait :
- **Vers l'API**, l'accès public passe par Traefik. Par défaut, Traefik remplace les en-têtes `X-Forwarded-*` d'une source non déclarée fiable. Un appel direct ne choisit donc pas son IP, sauf si Dokploy configure `trustedIPs` ou `insecure`.
- **Vers la landing**, les domaines passent par le proxy Cloudflare. Le premier `X-Forwarded-For` qu'elle reçoit est soit l'IP du nœud Cloudflare (beaucoup de visiteurs partagent alors un seul compteur), soit une valeur falsifiable, selon Traefik. C'est l'en-tête `CF-Connecting-IP` qui porte le visiteur.

Découpage :
- **Code (dans US-132)** : la BFF lit l'IP dans un en-tête configurable (`CLIENT_IP_HEADER`, par défaut le comportement actuel) ; `cf-connecting-ip` est posé dans les fichiers compose de production.
- **Exploitation (hors code)** : vérifier en production quel en-tête arrive, et que l'origine n'accepte que Cloudflare. Ce n'est pas vérifiable depuis le dépôt : c'est une case du DoD du sprint, pas un critère de cette story.
### ADR
ADR-022 est amendée : politique par route, route d'événements, en-tête du client derrière Cloudflare.
