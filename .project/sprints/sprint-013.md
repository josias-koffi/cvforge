<!-- generated-by: run-agent analyst -->

# Sprint 013

## 🎯 Sprint Goal

Poser la base temps réel de `V1.2` pour l'interview vocal avec STT, TTS, streaming et latence perçue maîtrisée (source: vision `§10`, `§16`).

## 📅 Period

- Start: 2026-10-03
- End: 2026-10-17

## ✅ Tasks (3–8 max)

- [ ] **[US-044]** Intégrer Voxtral Small pour le STT streaming progressif
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le STT fonctionne par chunks progressifs
    - [ ] Les flux audio sont ingérés côté navigateur et backend
    - [ ] Les cas de reprise/erreur sont gérés
  - Source: vision `§10`, `§16`
- [ ] **[US-045]** Intégrer Voxtral TTS et le pipeline streaming LLM -> TTS
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] La voix IA est générée via Voxtral TTS
    - [ ] Le premier chunk audio arrive avant la fin de génération complète
    - [ ] Le pipeline complet est observable
  - Source: vision `§10`, `§16`
- [ ] **[US-046]** Ajouter VAD navigateur et feedback visuel temps réel
  - Agent: `designer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Le VAD navigateur détecte les prises de parole
    - [ ] Le micro et l'état "thinking" sont visibles
    - [ ] Le flux reste exploitable sur une interface minimaliste
  - Source: vision `§10`, `§16`
- [ ] **[US-047]** Tenir la latence perçue cible `< 1,2 s` sur la boucle interview
  - Agent: `analyst`
  - Workflow: `spike-research`
  - Acceptance criteria:
    - [ ] La mesure de latence perçue est instrumentée
    - [ ] Les optimisations critiques sont identifiées et exécutées
    - [ ] La cible `< 1,2 s` est démontrée ou l'écart est documenté
  - Source: vision `§10`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- La complexité temps réel peut déborder fortement par rapport aux sprints précédents.
- La latence dépend autant du frontend que du routage IA.

## ⚠️ To Clarify (sprint blockers)

- Aucun bloqueur de vision, mais la cible de latence devient un critère de go/no-go.
