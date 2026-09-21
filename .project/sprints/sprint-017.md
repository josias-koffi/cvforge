<!-- generated-by: run-workflow designer-product-owner -->

# Sprint 017

## 🎯 Sprint Goal

Refondre l'expérience interview : écran de setup, VAD automatique (plus de bouton push-to-talk), continuité de l'agent via messages[] Redis, et écran rapport dédié.

## 📅 Period

- Start: 2026-11-29
- End: 2026-12-12

## ✅ Tasks (3–8 max)

- [x] **[US-063]** Créer l'écran setup entretien `/interview/new`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Étape 1: sélection candidature (search/select) ou "Mode libre"
    - [x] Étape 2: sélection du profil recruteur (liste de cards)
    - [x] Étape 3: sélection langue et difficulté
    - [x] CTA "Démarrer" crée la session et redirige vers `/interview/[sessionId]`
    - [x] URL param `?candidatureId=` pré-sélectionne la candidature (appelé depuis `/candidatures/[id]`)
  - Source: vision `§10`

- [x] **[US-064]** Refondre l'Interview Studio avec VAD automatique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Le bouton push-to-talk manuel est **supprimé**
    - [x] Le VAD `AnalyserNode` est actif dès l'entrée en session
    - [x] Les états VAD sont affichés: `🟢 À l'écoute` / `🔴 Enregistrement` / `🟡 Traitement` / `⚫ Muet`
    - [x] Mute toggle disponible (optionnel, ne casse pas le VAD)
    - [x] Transcript défilant avec messages AI et utilisateur alternés
    - [x] Timer de session visible
    - [x] Bouton "Fin de session" en haut (pas en bas)
    - [x] Auto-scroll du transcript au dernier message
  - Source: vision `§10`

- [x] **[US-065]** Corriger la continuité de l'agent: messages[] server-side par sessionId
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] Chaque session interview a une clé Redis `interview:session:[sessionId]:messages` contenant un tableau de messages `{role, content, timestamp}`
    - [x] Chaque chunk STT reçu est **ajouté** au tableau existant (pas de remplacement)
    - [x] Le tableau complet est envoyé au LLM à chaque tour (contexte total)
    - [x] La session est terminée proprement: le tableau est purgé après `ttl` (conforme RGPD §15.5)
    - [x] Aucun "reset" implicite du contexte LLM mid-session
    - [x] Test: après 3 échanges, le LLM répond en tenant compte des messages précédents
  - Source: vision `§10`

- [ ] **[US-066]** Créer l'écran rapport entretien `/interview/[id]/report`
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Score global affiché (0–100)
    - [ ] 3–4 dimensions notées: pertinence, clarté, structure, méthode STAR
    - [x] Transcript complet avec timestamps
    - [ ] Lecteur audio natif `<audio controls>` si audio disponible
    - [ ] Actions: "Voir la candidature" (→ `/candidatures/[id]`) et "Retour au dashboard"
    - [x] Page accessible sans connexion audio (rapport texte seul)
  - **Livré le 2026-09-21** dans `apps/web` à `/entretiens/[sessionId]/rapport`
    (la route `/interview/[id]/report` visait le front v1, supprimé depuis).
    Score, dimensions notées, transcript horodaté, actions « Voir la
    candidature » et « Retour aux entretiens », page utilisable sans audio.
  - **Écarts à arbitrer par le propriétaire — case principale laissée décochée :**
    - Score affiché sur **10**, pas sur 100 : c'est l'échelle que l'API produit
      (`InterviewReport.overallScore`, 0–10) et que le prompt impose au modèle.
      Passer à 100 est un changement de contrat, pas d'affichage.
    - **5 dimensions** (`clarity`, `keywords`, `pacing`, `hesitations`,
      `relevance`) au lieu des 3–4 énoncées (« structure », « méthode STAR »
      n'existent pas côté API). Les renommer suppose de changer le schéma du
      rapport et les rapports déjà stockés.
    - **Pas de lecteur audio** : l'audio n'est jamais persisté (transcrit à la
      volée puis jeté, cf. `docs/privacy-retention-policy.md`), donc il n'y a
      rien à rejouer. Le critère « rapport texte seul » est lui satisfait.
    - Retour vers `/entretiens` plutôt que le dashboard : c'est de là que
      l'utilisateur vient.
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
