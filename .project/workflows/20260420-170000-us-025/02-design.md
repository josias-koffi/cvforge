# Stage 2 — Design
Agent: designer
Date: 2026-04-20

## Non-UI stages

The CV generation pipeline is primarily backend logic. Two thin UI surfaces are required:

### Surface 1 — "Générer CV" button on candidature cards

The existing candidature card already holds status transitions and metadata. A new `GenerateCvButton` client component is added below the status section. It:
- Shows "Générer le CV" (primary action, anthracite)
- Shows a loading state during generation ("Génération en cours…")
- On success redirects to the CV view page
- On error shows an inline error message using existing error card styles

Visual treatment: standard `Button` from `@cvforge/ui`, same "feuille de travail" aesthetic.

### Surface 2 — CV render page `/cv/[applicationId]`

Displays the generated `CVDocumentContent` using the existing document block components from `@cvforge/ui`. Layout:
- Narrow centered A4-style column (max-width 760px) — matches print intent
- White card on `#FAFAF7` background, `shadow-sm`
- Back link to candidatures
- Each section rendered with existing blocks (CVHeader, SummaryBlock, ExperienceItem, SkillsList, etc.)
- EB Garamond / Libre Baskerville font for content — CV document feel
- Responsive: full-width on mobile, centered on desktop

### UX risks
- Profile might be empty (no experiences etc.) → blocks render gracefully (show empty state per section)
- Generation latency ~1-3s → loading state on button is essential

## Pass Verdict
✅ Design fits analyzed scope. No UX blockers.
