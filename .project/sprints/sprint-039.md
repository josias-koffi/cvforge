<!-- generated-by: plan « OAuth pour les clients MCP » (demande propriétaire 2026-11-25) -->

# Sprint 039 — Se connecter depuis Claude en ligne, ChatGPT ou tout agent (OAuth)

## 🎯 Sprint Goal

Épic **E34**. Le serveur MCP d'E32 n'accepte qu'un jeton collé dans un en-tête, ce que claude.ai
et ChatGPT ne savent pas faire. À l'issue du sprint, l'utilisateur colle l'adresse `/mcp` dans
claude.ai (Connecteurs › Ajouter un connecteur personnalisé), ChatGPT ou tout client MCP,
autorise l'accès sur une page JobSpark (permissions, plafond de crédits), et l'agent est branché.
La connexion apparaît dans `/compte/agents` avec les mêmes garde-fous qu'un jeton.

Décision d'architecture : **ADR-033** (`decisions/ADR-033-oauth-for-mcp-clients.md`).

> ⚠️ **Absent de la vision.** Demande explicite du propriétaire le 2026-11-25.

> ⚠️ **RÈGLES (ADR-033)** : OAuth 2.1, PKCE S256 seul ; jetons liés à l'adresse `/mcp` ; URI de
> redirection exactes (loopback tout port) ; rafraîchissement tournant, réutilisation = grant
> révoqué ; `iss` sur chaque réponse d'autorisation ; pas de `client_credentials`.

## 📅 Period

- Start: 2026-11-25
- End: —

## ✅ Tasks (3–8 max)

- [ ] **[US-189]** `/mcp` en serveur de ressources OAuth
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Sans jeton valide : 401 avec `WWW-Authenticate: Bearer resource_metadata="…", scope="…"`.
    - [ ] `/.well-known/oauth-protected-resource/mcp` (et sans suffixe) : `resource` = adresse
          exacte de `/mcp`, `authorization_servers` = notre émetteur.
- [ ] **[US-190]** Serveur d'autorisation
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `/.well-known/oauth-authorization-server` : S256, `none`, CIMD, `iss` RFC 9207, scopes
          dont `offline_access`.
    - [ ] `authorize` → page de consentement de l'app ; erreurs de client/redirection jamais
          redirigées ; refus → `access_denied` avec `state` et `iss`.
    - [ ] `token` (form-encoded) : code à usage unique (10 min), vérifieur PKCE, redirection et
          `resource` vérifiés ; jeton d'accès 1 h ; rafraîchissement 30 j tournant ; réutilisation
          d'un ancien jeton de rafraîchissement → connexion révoquée.
    - [ ] `revoke` ; réponses `Cache-Control: no-store`.
- [ ] **[US-191]** Clients OAuth
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] CIMD : `client_id` https lu par `safe-fetch` (pas d'adresse privée, délai, taille),
          `client_id` du document identique, redirection listée ; cache 24 h.
    - [ ] DCR : clients publics seulement, redirections https ou loopback.
    - [ ] Clients DCR sans connexion purgés après 30 jours.
- [ ] **[US-192]** Consentement et gestion
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `/autoriser-agent` : nom du client, hôte de redirection, permissions (préréglages),
          plafond de crédits ; Autoriser / Refuser ; sans session, invitation à se connecter.
    - [ ] `/compte/agents` : une connexion OAuth porte le nom du client, un badge « OAuth »,
          se révoque comme un jeton.
- [ ] **[US-193]** Limites, essais réels, confidentialité
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Limites par IP sur `/oauth/*` (larges : Claude sort d'un même bloc d'adresses).
    - [ ] Essai réel : claude.ai (connecteur personnalisé), Claude Code (`claude mcp add` sans
          en-tête), ChatGPT si un compte développeur est disponible.
    - [ ] Texte de confidentialité étendu dans `docs/agent-mcp.md`.

## 📊 Sprint DoD

- [ ] claude.ai connecté à la préprod par OAuth et un outil appelé avec succès.
- [ ] `pnpm lint` et tests API/web verts (CI).
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Surface la plus sensible** (elle émet des jetons) : chaque règle RFC a son test.
- **Adresses partagées** : Claude appelle depuis `160.79.104.0/21` ; des limites par IP trop
  serrées couperaient tous ses utilisateurs.

## ⚠️ To Clarify

- Retour claude.ai : `https://claude.ai/api/mcp/auth_callback` documenté ; `claude.com` accepté par
  précaution.

## 🔁 Workflow Runs

— aucun pour l'instant.
