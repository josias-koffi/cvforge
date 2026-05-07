# Task: US-063 — Créer l'écran setup entretien `/interview/new`

## Sprint: 017
## Workflow: analyze-design-dev-review
## Run ID: analyze-design-dev-review-20260507160000

## Description
Créer l'écran de setup multi-étapes `/interview/new` permettant au candidat de configurer une session d'entretien avant de démarrer.

## Acceptance criteria
- [ ] Étape 1: sélection candidature (search/select) ou "Mode libre"
- [ ] Étape 2: sélection du profil recruteur (liste de cards)
- [ ] Étape 3: sélection langue et difficulté
- [ ] CTA "Démarrer" crée la session et redirige vers `/interview/[sessionId]`
- [ ] URL param `?candidatureId=` pré-sélectionne la candidature (appelé depuis `/candidatures/[id]`)

## Source
Vision §10
