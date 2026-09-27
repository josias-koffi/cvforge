---
tags: [run/analyze-design-dev-review-20260925000215, workflow/analyze-design-dev-review, sprint/030, task/US-141]
sprint: "[[sprints/sprint-030#US-141]]"
workflow: "[[workflows/analyze-design-dev-review]]"
next: "[[workflows/runs/analyze-design-dev-review-20260925000215/01-analyze]]"
---
# US-141 — Questions d'entretien probables
Sprint 030, épic E23 (hors vision, décision produit du 2026-09-24). Pas de ligne `Workflow:` dans le sprint : on prend celui d'US-137 à US-140, `analyze-design-dev-review`.

Critères :
- Pour un texte d'offre : 5 questions, un appel LLM court via `OpenRouterService`, prompt dérivé de `interview.prompts.ts`, sortie en schéma JSON strict.
- Budget global quotidien et limite par IP (US-132) ; budget épuisé ⇒ 503 avec `Retry-After`.
- Panne OpenRouter ⇒ message propre, jamais une 500.
- CTA « S'entraîner à l'oral avec un recruteur IA » → service lead.

Critères communs E23 (backlog) : sans compte, FR/EN sans texte en dur (test de parité), événements US-131 à chaque étape, WCAG 2.1 AA (`aria-live`), `prefers-reduced-motion`, page dans `sitemap.ts`, métadonnées via `pageMetadata()`.
DoD sprint : gate coût, budget global et limite par IP vérifiés sur cette route avant mise en ligne.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web (Next), packages/types
