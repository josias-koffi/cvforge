# Stage 1 — Analyze
Agent: product-owner
Date: 2026-04-20

## Scope

US-028 mirrors the existing CV documentary pipeline for the letter of motivation:
- same candidature source (`StoredApplication.extracted` + `rawOfferText`)
- same user profile source (prompt-safe profile from the app + local sensitive fields reinjected after generation)
- same document system (normalized JSON content -> default ATS template blocks -> user edition page)

The implementation should extend the current CV slice instead of creating a separate document architecture.

## Acceptance Criteria — Testable Mapping

| Criterion | Evidence |
|---|---|
| LM générée à partir des mêmes sources métier | service test shows the LM prompt payload uses `promptProfile` plus `offerContext` from the application record, matching CV inputs |
| Template LM ATS utilisable par défaut | the generated letter renders through the seeded `template-letter-ats` structure and the shared LM block registry |
| Pseudonymisation cohérente avec le CV | prompt payload sent to OpenRouter still excludes lastName, phone, and email; those fields are only reintroduced locally in stored/rendered letter content |

## Boundaries

**In scope:**
- extend application persistence for generated letter content
- authenticated API endpoints to generate, fetch, and update letter content
- Next.js route handler + client button to trigger LM generation from candidature cards
- user-side letter page using the shared LM blocks and the seeded default template

**Out of scope:**
- Puck-native drag-and-drop editing migration
- DOCX export
- credits / billing deduction
- standalone letters detached from a candidature

## Missing Product Questions
None. Vision §9 explicitly says the LM is attached to a candidature and follows the same pipeline as the CV, with the ATS LM template as the MVP default.

## Pass Verdict
✅ Scope is clear. Acceptance criteria are testable. No blockers.
