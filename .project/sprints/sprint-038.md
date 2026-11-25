<!-- generated-by: plan « Serveur MCP JobSpark » (demande propriétaire 2026-11-25) -->

# Sprint 038 — Brancher son propre agent sur JobSpark (serveur MCP)

## 🎯 Sprint Goal

Épic **E32 — Serveur MCP pour agents personnels**. À l'issue du sprint, un candidat crée un jeton
dans `/compte/agents`, le colle dans Claude Code, et son agent fait tout ce qu'il fait dans l'app :
lire et enrichir son profil, voir les offres et ses alertes, créer une candidature, générer CV et
lettre, les télécharger, voir son solde — puis postuler sur le site du recruteur avec Chrome.

Décision d'architecture : **ADR-032** (`decisions/ADR-032-mcp-server-for-personal-agents.md`).

> ⚠️ **Absent de la vision.** Demande explicite du propriétaire le 2026-11-25. À reporter dans la
> vision par le Product Owner, jamais en auto-édition (hard rule).

> ⚠️ **RÈGLES (ADR-032)** : le jeton n'ouvre que `/mcp` ; seul son SHA-256 est stocké ; plafond de
> crédits par jour et par jeton ; jamais d'envoi d'e-mail, d'admin, de suppression ni d'achat ;
> textes d'offres renvoyés comme contenu non fiable ; journal sans contenu.

## 📅 Period

- Start: 2026-11-25
- End: —

## ✅ Tasks (3–8 max)

- [x] **[US-182]** ADR-032, épic E32, sprint 038
  - Agent: `tech-lead`
  - Critères d'acceptation :
    - [x] ADR-032 rédigé (SDK MCP officiel, HTTP sans état, jetons personnels, pas d'OAuth en v1).
    - [x] E32 et US-182 à US-188 dans `backlog.md`.
- [ ] **[US-183]** Jetons d'agent
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Migration `0063_agent_tokens` : `agent_tokens` (compte, nom, SHA-256, 4 derniers
          caractères, scopes, expiration, plafond/jour, dépensé du jour, dernier usage, révocation)
          et `agent_tool_calls` (jeton, outil, issue, crédits, durée, date).
    - [ ] Création : `jsk_` + 32 octets aléatoires, affiché une fois, 10 jetons actifs max,
          expiration 1 à 90 jours, plafond 0 à 200 crédits/jour.
    - [ ] Vérification : jeton inconnu, expiré, révoqué, compte suspendu ou antérieur à
          `sessions_valid_from` → refusé. Tests.
    - [ ] API cookie : `GET/POST /agent-tokens`, `DELETE /agent-tokens/:id`,
          `GET /agent-tokens/activity`. Suppression du compte : jetons et journal effacés.
- [ ] **[US-184]** Point d'accès `/mcp` et outils de lecture
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `POST /mcp` en HTTP sans état ; `GET`/`DELETE` → 405 ; 401 sans jeton valide.
    - [ ] `tools/list` ne montre que les outils permis par les scopes du jeton.
    - [ ] Limite par jeton (60 appels/min, 1 000/jour) ; `Origin` présent et absent de
          `MCP_ALLOWED_ORIGINS` → 403 (test : `chrome-extension://…` listé → accepté). Pas de CORS.
    - [ ] Outils : compte, solde, historique de crédits, profils, recherche d'offres, offres du
          jour, offres récentes, alertes, candidatures, contenu CV/lettre.
    - [ ] Chaque appel journalisé sans contenu.
- [ ] **[US-185]** Profil en écriture fine
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Ajouter / modifier / retirer une expérience par identifiant, modifier une section.
    - [ ] Validation existante appliquée ; refus si le profil a changé depuis la lecture.
- [ ] **[US-186]** Outils payants et fichiers
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] `buildGenerationRequest` déplacé dans `@cvforge/types`, utilisé par le web et l'API.
    - [ ] Réservation atomique sur le plafond du jeton, rendue si l'appel échoue ; deux appels
          simultanés ne dépassent pas le plafond (test).
    - [ ] Générer CV et lettre, postuler à une offre, importer une offre (URL ou texte), changer
          le statut d'une candidature ; chaque réponse donne `creditsSpent` et `balanceAfter`.
    - [ ] Lien de téléchargement signé (10 min, usage unique, lié au compte) pour PDF/DOCX.
- [ ] **[US-187]** Page « Agents connectés » (`/compte/agents`)
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Création (nom, préréglage de scopes « Lecture seule » / « Assistant complet » /
          « Extension JobSpark » sans `profile:write`, expiration, plafond), avertissement de
          confidentialité, jeton affiché une fois avec la commande `claude mcp add` prête à copier.
    - [ ] Liste (nom, fin du jeton, scopes, dernier usage, dépensé/plafond), révocation, activité.
- [ ] **[US-188]** Documentation et confidentialité
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Guide « Connecter Claude Code et Chrome » dans `docs/`.
    - [ ] Texte de confidentialité prêt à coller dans `/admin/legal` (étape propriétaire).

## 📊 Sprint DoD

- [ ] Vérifié de bout en bout avec Claude Code sur un compte de test : solde, profil chiffré,
      CV + lettre générés, PDF téléchargé.
- [ ] `pnpm lint` et tests API/web verts (CI).
- [ ] Mémoire des agents concernés mise à jour.

## 🚧 Risks

- **Jeton volé** : accès aux données du profil et dépense jusqu'au plafond. D'où le hachage, les
  scopes, l'expiration, le plafond, la révocation et le journal visible.
- **Injection de prompt** depuis une offre : au pire une candidature créée ou une dépense dans le
  plafond ; aucun outil ne supprime ni n'envoie.

## ⚠️ To Clarify

- OAuth 2.1 pour les connecteurs claude.ai / ChatGPT : plus tard.

## 🔁 Workflow Runs

— aucun pour l'instant.
