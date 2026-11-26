# Extension Chrome JobSpark (E33, ADR-034)

Le candidat connecte l'extension à son compte JobSpark (OAuth, ADR-033). Elle prépare ensuite ses candidatures et
remplit les formulaires des recruteurs. Ce paquet couvre pour l'instant US-195 : la connexion, le solde et la clé IA
personnelle.

## Lancer

```sh
pnpm --filter @cvforge/extension build                      # API de production
WXT_JOBSPARK_API_URL=https://jobspark-api-staging.koklo.dev \
  pnpm --filter @cvforge/extension build                    # préprod
```

Ensuite, dans `chrome://extensions` : activer le « Mode développeur », cliquer sur « Charger l'extension non
empaquetée » et choisir `apps/extension/.output/chrome-mv3`. L'icône JobSpark ouvre le panneau latéral.

L'identifiant est fixé par la clé du manifeste (`wxt.config.ts`) : `iciahkakhljbapmhkjjgopacegifndha`. Le serveur
doit admettre `chrome-extension://iciahkakhljbapmhkjjgopacegifndha` dans `MCP_ALLOWED_ORIGINS` (`.deploy/manifest.yaml`).
Sinon `/mcp` répond 403 et le panneau l'indique.

## Où vit quoi

- `src/domain` : règles pures (portée OAuth demandée, lecture de la réponse d'autorisation, masquage de la clé).
- `src/application/session.ts` : les cas d'usage du panneau. Les secrets restent dans le service worker.
- `src/infrastructure` : client OAuth du SDK MCP adossé à `chrome.storage.local`, `chrome.identity`, client MCP.
- `src/entrypoints` : service worker (`background.ts`) et panneau latéral (`sidepanel/`).
