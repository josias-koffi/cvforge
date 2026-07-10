<!-- generated-by: run-workflow analyst-designer (analyst-designer-20260709205519) -->

# Sprint 020

## 🎯 Sprint Goal

Rationalisation UI/UX desktop-first (1/2) — écrans d'entrée et de pilotage : login/register, dashboard, notifications, onboarding. Direction "Papier & Crayon raffiné, brutally minimal" (voir `.project/designs/frontend-rationalization-20260709.md`) — **remplace** US-070/071 de sprint 019, qui devient obsolète pour ces écrans.

## 📅 Period

- Start: 2026-07-13
- End: 2026-07-26

## ✅ Tasks (3–8 max)

- [x] **[US-074]** Refondre Login / Register pour le desktop
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `/login/request`, `/login/check-email`, `/login/success` centrés en colonne étroite (max 420px), pas de mise en page mobile étirée sur grand écran
    - [x] `/register/invitation/accept` reprend le même gabarit (rôle/expiration en lecture, action unique)
    - [x] Consentement RGPD (US-016) conservé inline, sans régression
    - [x] Tokens `design-system.ts` réutilisés — aucune nouvelle couleur/police introduite
    - [x] WCAG 2.1 AA : labels associés, focus visible, contraste ≥4.5:1
  - Source: `.project/designs/frontend-rationalization-20260709.md` §1, vision `§3`

- [x] **[US-075]** Refondre le Dashboard : 3 KPI + 2 tables + quick actions
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [x] `dashboard/page.tsx` (672 lignes) scindé en `kpi-row.tsx`, `recent-tables.tsx`, `quick-actions.tsx` (chacun <300 lignes)
    - [x] 3 KPI cards en ligne : candidatures actives, crédits restants, prochaine interview
    - [x] Table "Candidatures récentes" (5 dernières : Poste, Statut, Date)
    - [x] Table "Sessions entretien récentes" (5 dernières : Candidature, Score, Date)
    - [x] Quick actions : "Nouvelle candidature", "Commencer un entretien", "Acheter des crédits"
    - [x] Responsive : stacked mobile, 2-col tablet, 3-col desktop
  - Source: absorbe US-070 (sprint 019, non exécutée), vision `§12.1`–`§12.4`

- [ ] **[US-076]** Refondre `/notifications` en liste dense groupée par jour
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] Liste triée par date décroissante, non-lu en tête avec pastille visible
    - [ ] Groupement visuel par jour (aujourd'hui / hier / plus ancien)
    - [ ] Carte "Préférences email" (US-041, déjà livrée) repositionnée en pied de liste, format dense
    - [ ] Lien direct vers la candidature liée conservé
    - [ ] WCAG 2.1 AA : `aria-live` sur le compteur non-lu, focus visible
  - Source: `.project/designs/frontend-rationalization-20260709.md` §8, vision `§14`

- [ ] **[US-077]** Scinder et resserrer l'onboarding pour le desktop
  - Agent: `designer` + `developer`
  - Workflow: `analyze-design-dev-review`
  - Acceptance criteria:
    - [ ] `onboarding/wizard.tsx` (670 lignes) scindé en un composant par étape : `step-identity.tsx`, `step-links.tsx`, `step-extra.tsx`, `step-import.tsx`, `step-recap.tsx` (chacun <300 lignes)
    - [ ] Largeur desktop resserrée (≈600px centré) au lieu du plein-écran mobile actuel
    - [ ] Progression visible en haut (pas de barre latérale dédiée)
    - [ ] Reprise de session (résumé local, US-013) non régressée
    - [ ] Aucune perte de logique métier (`draft.ts`, `wizard-state.ts` inchangés)
  - Source: `.project/designs/frontend-rationalization-20260709.md` §10, vision `§4`

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] Coverage ≥ spec threshold
- [ ] QA review ✅
- [ ] Aucun fichier touché ne dépasse 400 lignes après refonte (spec §9)
- [ ] Rapport de contraste WCAG 2.1 AA passé sur les 4 écrans

## 🚧 Risks

- US-075/077 : scinder de gros fichiers en composants peut introduire des régressions de state partagé (formulaires, drafts) — couvrir par les tests existants avant de merger.
- US-074 : ne pas casser le flux magic-link (`/auth/callback`) qui reste hors périmètre visuel de ce sprint.

## ⚠️ To Clarify

- Aucune — voir `.project/workflows/analyst-designer-20260709205519/` pour l'audit complet ayant mené à ce découpage.

## 🔁 Suite

Sprint 021 couvre le reste du périmètre : CV, Letters, Credits, Profile, Admin.

## 🔁 Workflow Runs

- 2026-07-09 — [[workflows/runs/analyze-design-dev-review-20260709210000|analyze-design-dev-review]] (US-074) — passed
- 2026-07-10 — [[workflows/runs/analyze-design-dev-review-20260710010750|analyze-design-dev-review]] (US-075) — passed
