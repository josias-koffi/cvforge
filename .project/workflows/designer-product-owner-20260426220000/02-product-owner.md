# Stage 2 — Product Owner: Backlog Update + Sprint Plan

## Context
Reading designer stage output. A new epic E15 (UX Redesign) covers the full desktop-first overhaul. Sprints 016–019 deliver it. Sprint 015 stays as the last V2.0/B2B sprint unchanged.

---

## New Epic: E15 — UX Redesign Desktop-First

| Field | Value |
|-------|-------|
| Epic | E15 |
| Horizon | V2.1 (Design overhaul) |
| Outcome | Desktop-first, minimalist (shadcn-inspired), intermediate screens, table views, VAD-driven interview, admin-only Puck full-screen |
| Sprints | 016–019 |
| Source | User feedback 2026-04-26, vision §2.5, §2.6, §6, §8, §10 |

---

## New User Stories

| ID | Story | Epic | Est. | Priority | Sprint |
|----|-------|------|------|----------|--------|
| US-060 | Refondre la navigation en sidebar desktop-first avec drawer mobile | E15 | M | P0 | 016 |
| US-061 | Convertir la liste candidatures en table filtrée avec slide-over détail | E15 | L | P0 | 016 |
| US-062 | Créer l'écran détail candidature avec onglets Offre/CV/LM/Interviews/Historique | E15 | L | P0 | 016 |
| US-063 | Créer l'écran setup entretien `/interview/new` (sélection candidature, profil, langue) | E15 | M | P0 | 017 |
| US-064 | Refondre l'Interview Studio avec VAD automatique (sans bouton push-to-talk) | E15 | L | P0 | 017 |
| US-065 | Corriger la continuité de l'agent: messages[] server-side par sessionId (Redis) | E15 | M | P0 | 017 |
| US-066 | Créer l'écran rapport entretien `/interview/[id]/report` | E15 | M | P1 | 017 |
| US-067 | Créer le Documents Hub `/documents` avec table CV/LM et actions PDF/DOCX/Éditer | E15 | M | P0 | 018 |
| US-068 | Remplacer l'éditeur document utilisateur par un formulaire structuré (sans Puck) | E15 | L | P0 | 018 |
| US-069 | Passer l'éditeur Puck admin en mode full-screen viewport (admin-only) | E15 | M | P0 | 018 |
| US-070 | Refondre le Dashboard: 3 KPI + 2 tables récentes + quick actions | E15 | M | P1 | 018 |
| US-071 | Appliquer le design token shadcn-minimal à l'ensemble de l'app (surface, border, typography) | E15 | M | P1 | 019 |
| US-072 | Refondre la page Crédits avec table ledger et cards packs | E15 | S | P1 | 019 |
| US-073 | Refondre la page Profil: accordions par section + switcher multi-profil | E15 | M | P1 | 019 |

---

## Acceptance decisions

**US-064 (VAD auto)**: replaces the existing push-to-talk button entirely. VAD is always listening; no manual trigger per turn. This is a behavior change, not an addition — requires explicit developer note about removing the existing button handler.

**US-065 (agent continuity)**: the root cause is that messages are not accumulated server-side. Each STT chunk must append to a Redis-stored `messages[]` array keyed by `sessionId`. The full array is sent to the LLM, not just the latest chunk.

**US-068 (user editor without Puck)**: this reverses US-057's user-facing Puck integration. Users see a structured form. Puck stays only in admin. This is a scope reduction that improves UX — flag as explicit product decision ⚠️ (requires user approval since it contradicts vision §8 which mentions WYSIWYG for users — see Open below).

**US-069 (Puck full-screen admin)**: removes the embedded Puck container from the admin template detail shell and makes Puck own the full viewport. Confirms ADR-003 intent.

---

## ⚠️ Product Decision Required

**Vision §8** ("Permettre l'édition WYSIWYG Puck côté user") and the designer's recommendation (US-068) conflict: the designer proposes replacing the user Puck editor with a structured form. This provides better UX for casual users but reduces power-user flexibility. Options:
1. ✅ **Structured form for users** (designer recommendation, sprint delivery)
2. Keep Puck for users but redesign the embed to be cleaner

**Recommendation**: option 1 for V2.1 redesign; revisit Puck-for-users as a future enhancement once templates are stable.

---

## Sprint Plan Summary

| Sprint | Theme | Stories | Effort |
|--------|-------|---------|--------|
| 016 | Navigation + Candidatures | US-060, US-061, US-062 | M+L+L |
| 017 | Interview redesign | US-063, US-064, US-065, US-066 | M+L+M+M |
| 018 | Documents + Puck admin | US-067, US-068, US-069, US-070 | M+L+M+M |
| 019 | Design polish + Profile + Credits | US-071, US-072, US-073 | M+S+M |

**Prerequisite**: Sprint 015 B2B tasks (US-052, US-053, US-054) should be completed or explicitly deferred before Sprint 016 begins. Sprint 016 can start in parallel with US-052/053/054 if needed since they touch different domains.
