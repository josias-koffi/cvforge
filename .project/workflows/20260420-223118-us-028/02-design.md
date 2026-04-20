# Stage 2 — Design
Agent: designer
Date: 2026-04-20

## Surface 1 — "Générer la LM" action on candidature cards

The candidature card already exposes generation and progression actions. Add a second document action beside the CV flow:
- primary/secondary button label: `Générer la LM`
- loading label: `Génération en cours…`
- success redirect: `/letters/[applicationId]`
- inline error state reuses the same message panel style as the CV button

This keeps the user mental model simple: one candidature, two generated documents.

## Surface 2 — Letter editor/read page `/letters/[applicationId]`

Mirror the current CV page structure:
- same authenticated shell and candidature navigation context
- centered paper-like document preview
- serif document typography (`EB Garamond` / `Libre Baskerville`)
- existing LM blocks only: `LMHeader`, `LMBody`, `LMSignature`

For MVP consistency, the page uses the default ATS LM structure from the seeded admin templates. The editing form should stay narrow and focused on:
- company name / city
- object
- date
- three body paragraphs
- signature identity

## UX risks

- Generation can fail when the profile is incomplete; the button must keep the same preflight guard as the CV flow.
- Long paragraphs can harm print readability; the preview should remain single-column and letter-like to expose overflow early.

## Pass Verdict
✅ Design fits the analyzed scope and reuses the established documentary UI language.
