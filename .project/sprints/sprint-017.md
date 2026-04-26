<!-- generated-by: run-workflow designer-product-owner -->

# Sprint 017

## 🎯 Sprint Goal

Refondre l'expérience interview : écran de setup, VAD automatique (plus de bouton push-to-talk), continuité de l'agent via messages[] Redis, et écran rapport dédié.

## 📅 Period

- Start: 2026-11-29
- End: 2026-12-12

## ✅ Tasks (3–8 max)

- [ ] **[US-063]** Créer l'écran setup entretien `/interview/new`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Étape 1: sélection candidature (search/select) ou "Mode libre"
    - [ ] Étape 2: sélection du profil recruteur (liste de cards)
    - [ ] Étape 3: sélection langue et difficulté
    - [ ] CTA "Démarrer" crée la session et redirige vers `/interview/[sessionId]`
    - [ ] URL param `?candidatureId=` pré-sélectionne la candidature (appelé depuis `/candidatures/[id]`)
  - Source: vision `§10`

- [ ] **[US-064]** Refondre l'Interview Studio avec VAD automatique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le bouton push-to-talk manuel est **supprimé**
    - [ ] Le VAD `AnalyserNode` est actif dès l'entrée en session
    - [ ] Les états VAD sont affichés: `🟢 À l'écoute` / `🔴 Enregistrement` / `🟡 Traitement` / `⚫ Muet`
    - [ ] Mute toggle disponible (optionnel, ne casse pas le VAD)
    - [ ] Transcript défilant avec messages AI et utilisateur alternés
    - [ ] Timer de session visible
    - [ ] Bouton "Fin de session" en haut (pas en bas)
    - [ ] Auto-scroll du transcript au dernier message
  - Source: vision `§10`

- [ ] **[US-065]** Corriger la continuité de l'agent: messages[] server-side par sessionId
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Chaque session interview a une clé Redis `interview:session:[sessionId]:messages` contenant un tableau de messages `{role, content, timestamp}`
    - [ ] Chaque chunk STT reçu est **ajouté** au tableau existant (pas de remplacement)
    - [ ] Le tableau complet est envoyé au LLM à chaque tour (contexte total)
    - [ ] La session est terminée proprement: le tableau est purgé après `ttl` (conforme RGPD §15.5)
    - [ ] Aucun "reset" implicite du contexte LLM mid-session
    - [ ] Test: après 3 échanges, le LLM répond en tenant compte des messages précédents
  - Source: vision `§10`

- [ ] **[US-066]** Créer l'écran rapport entretien `/interview/[id]/report`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Score global affiché (0–100)
    - [ ] 3–4 dimensions notées: pertinence, clarté, structure, méthode STAR
    - [ ] Transcript complet avec timestamps
    - [ ] Lecteur audio natif `<audio controls>` si audio disponible
    - [ ] Actions: "Voir la candidature" (→ `/candidatures/[id]`) et "Retour au dashboard"
    - [ ] Page accessible sans connexion audio (rapport texte seul)
  - Source: vision `§10`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Gate: continuité agent vérifiée par test d'intégration (3 échanges → LLM contexte complet)

## 🚧 Risks

- US-064: la suppression du push-to-talk change le comportement existant — nécessite un plan de migration et des tests de régression VAD.
- US-065: la taille du tableau Redis peut croître — prévoir une limite de tokens LLM context window ou une troncature des vieux messages.

## ⚠️ To Clarify

- Limite de taille de contexte LLM (nombre max de messages par session avant troncature).
- Comportement si VAD détecte du bruit de fond prolongé (seuil de silence à calibrer).
