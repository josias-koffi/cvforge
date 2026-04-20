# Stage 1 — Analyze
Agent: product-owner
Date: 2026-04-20

## Scope

US-025 delivers the core CV generation pipeline connecting the existing infrastructure:
- OpenRouter service (US-017) → pseudonymised prompt → JSON → local re-injection → CVDocumentContent
- Stored in the application record for rendering

The profile data lives in the Next.js app (localStorage). The API must receive a pseudonymised payload from the frontend and inject sensitive fields server-side after the AI call.

## Acceptance Criteria — Testable Mapping

| Criterion | Evidence |
|---|---|
| Prompt n'expose pas données interdites | `promptProfile` sent to OpenRouter contains no lastName, phone, email, exact address, or DOB |
| JSON compatible avec le template actif | The normalised `CVDocumentContent` matches the block registry props contract from US-021 |
| Champs réinjectés localement apparaissent | `cvContent.candidate.lastName`, `.phone`, `.email` contain real values from `localFields` at render |

## Boundaries

**In scope:**
- `POST /applications/:id/generate-cv` API endpoint (pseudonymised profile body + local fields)
- `GET /applications/:id/cv` API endpoint (retrieve stored cvContent)
- `cvContent` stored on the application record
- Next.js route handler + client component (reads localStorage profile, sends to API)
- CV render page using document block components

**Out of scope:**
- PDF export (US-027)
- WYSIWYG Puck editing (US-026)
- Credit deduction (future story)
- Motivation letter (US-028)

## Missing Product Questions
None — vision §8.1, §15.3, and §6.2 fully specify the pipeline.

## Pass Verdict
✅ Scope is clear. Acceptance criteria are testable. No blockers.
