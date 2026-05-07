# Task: US-065 — Continuité agent: messages[] server-side par sessionId

Sprint: 017
Workflow: analyze-design-dev-review
Run ID: analyze-design-dev-review-20260507220000

## Title
Corriger la continuité de l'agent: messages[] server-side par sessionId

## Acceptance Criteria
- [ ] Chaque session interview a une clé `interview:session:[sessionId]:messages` contenant un tableau de messages `{role, content, timestamp}`
- [ ] Chaque chunk STT reçu est **ajouté** au tableau existant (pas de remplacement)
- [ ] Le tableau complet est envoyé au LLM à chaque tour (contexte total)
- [ ] La session est terminée proprement: le tableau est purgé après `ttl` (conforme RGPD §15.5)
- [ ] Aucun "reset" implicite du contexte LLM mid-session
- [ ] Test: après 3 échanges, le LLM répond en tenant compte des messages précédents

## Source
Vision §10
