# Task: US-046 — Ajouter VAD navigateur et feedback visuel temps réel

**Sprint**: 013
**Workflow**: analyze-design-dev-review
**Source**: vision §10, §16

## Description

Ajouter la détection d'activité vocale (VAD) côté navigateur et les retours visuels temps réel associés : indicateur micro actif/inactif, état "thinking" de l'IA, sur une interface minimaliste et exploitable.

## Acceptance Criteria

- [ ] Le VAD navigateur détecte les prises de parole
- [ ] Le micro et l'état "thinking" sont visibles
- [ ] Le flux reste exploitable sur une interface minimaliste

## Context

Current state: The `InterviewStudio` component in `apps/app/app/interview/interview-studio.tsx` already delivers STT chunking (US-044) and LLM→TTS streaming (US-045). It exposes state badges (`idle`, `recording`, `syncing`, `booting`, `error`) and AI state (`idle`, `generating`, `speaking`, `done`, `error`). The start/stop controls are present. VAD and real-time visual feedback have not been added yet.

The designer notes from US-044 explicitly state: "US-046 should add speaking/thinking feedback on top of this same workspace instead of replacing it."
