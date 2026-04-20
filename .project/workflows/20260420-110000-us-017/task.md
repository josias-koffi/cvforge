# Task: US-017 — Intégrer OpenRouter avec `zdr: true` et fournisseur Mistral

**Sprint**: 005
**Run ID**: 20260420-110000-us-017
**Workflow**: analyze-design-dev-review
**Agent owner**: tech-lead

## Description

Mettre en place le module d'intégration OpenRouter dans le backend NestJS (`apps/api`), en forçant systématiquement `zdr: true` (Zero Data Retention), en désactivant le prompt logging, et en limitant le provider à Mistral.

## Acceptance Criteria

- [ ] Tous les appels OpenRouter forcent `zdr: true`
- [ ] Le prompt logging reste désactivé
- [ ] Le provider est limité à Mistral quand applicable

## Sources

- vision `§2` (stack OpenRouter + Mistral)
- vision `§15.2` (contraintes RGPD / ZDR)
- vision `§16` (MVP checklist)
