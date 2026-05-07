# Stage 1 — Analyze

Agent: product-owner | US-062 | 2026-05-07

## Scope

New protected route `/candidatures/[id]` — detail screen for a single candidature. Server-rendered page, data fetched from existing `GET /applications/:id` API endpoint (already exists via `findByIdForUserEmail`). No new backend endpoint required.

## Data available

`DraftApplication` exposes: `extracted` (offer fields), `status`, `statusHistory`, `cvGeneratedAt`, `letterGeneratedAt`, `interviewReports`, `createdAt`, `offerUrl`. API also persists `cvContent` and `letterContent` (StoredApplication), but the current `GET /applications` list response only returns `DraftApplication`. A single `GET /applications/:id` endpoint should return the full `StoredApplication`.

## Acceptance criteria — testable decomposition

1. **Header** — renders `extracted.title`, `extracted.companyName`, status badge (using `getApplicationStatusTone`), and `createdAt` date.
2. **Tabs** — five tabs: Offre, CV, LM, Interviews, Historique; controlled state with `aria-selected`.
3. **Offre tab** — renders all `ExtractedOfferFields` fields in readable structure (summary, responsibilities, requirements, location, contractType, salaryRange).
4. **CV tab** — if `cvGeneratedAt` exists, show link to `/cv/[id]` (Éditer) and link to `/cv/[id]/pdf` (PDF); else show "Aucun CV généré" + GenerateCvButton.
5. **LM tab** — if `letterGeneratedAt` exists, show link to `/letters/[id]` (Éditer) and link to `/letters/[id]/pdf` (PDF); else show "Aucune LM générée" + GenerateLetterButton.
6. **Interviews tab** — table of `interviewReports` (date, score, link to report) + "Démarrer un entretien" button → `/interview?candidatureId=[id]`.
7. **Historique tab** — timeline of `statusHistory` entries (changedAt date + status badge).
8. **Breadcrumb** — `Candidatures > [extracted.title]` passed to AppShell.

## Open questions

None blocking. `CandidaturesTable` already links to the slide-over; the "Voir" action should also navigate to `/candidatures/[id]` — but the sprint scope is the detail page itself, not modifying the slide-over link (advisory).

## Verdict: PASS — scope clear, all AC testable.
