<!-- generated-by: run-agent analyst -->

# Sprint 015

## 🎯 Sprint Goal

Ouvrir `V2.0` en étendant CVforge vers les usages recruteur et entreprise, tout en cadrant les intégrations futures explicitement citées par la vision (source: vision `§13.4`, `§16`).

## 📅 Period

- Start: 2026-10-31
- End: 2026-11-14

## ✅ Tasks (3–8 max)

- [ ] **[US-051]** Ajouter le rôle recruteur et les organisations / comptes entreprise
  - Agent: `product-owner`
  - Workflow: `none`
  - Acceptance criteria:
    - [ ] Le rôle recruteur est modélisé
    - [ ] Les organisations et comptes entreprise sont gérés
    - [ ] Les permissions sont séparées des rôles `user` et `admin`
  - Source: vision `§16`
- [ ] **[US-052]** Ajouter l'import PDF d'offre et la connexion sociale à évaluer
  - Agent: `analyst`
  - Workflow: `spike-research`
  - Acceptance criteria:
    - [ ] L'import PDF d'offre est intégré ou cadré précisément
    - [ ] La connexion sociale Google/LinkedIn est évaluée avec impacts sécurité et RGPD
    - [ ] Les choix sont documentés sans sortir du périmètre V2.0
  - Source: vision `§3.1`, `§16`
- [ ] **[US-053]** Ajouter l'extension browser pour le scraping d'offres
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Une extension navigateur capture les données d'offre
    - [ ] Le flux s'intègre au pipeline candidature existant
    - [ ] Les permissions navigateur sont minimisées
  - Source: vision `§16`
- [ ] **[US-054]** Ajouter analytics admin avancés, export CSV et évaluer OpenRouter enterprise
  - Agent: `tech-lead`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Les analytics admin avancés existent
    - [ ] L'export CSV est disponible
    - [ ] L'option OpenRouter enterprise est évaluée pour le routage EU garanti
  - Source: vision `§13.4`, `§15.5`, `§16`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅

## 🚧 Risks

- `V2.0` ajoute plusieurs zones de périmètre non critiques pour le coeur MVP.
- Les décisions enterprise et social login peuvent nécessiter des ADR ou un cadrage sécurité poussé.

## ⚠️ To Clarify (sprint blockers)

- Valider si les sujets `social login` et `OpenRouter enterprise` demandent un ADR dédié.
