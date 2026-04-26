# Stage 2 — Design

**Agent**: designer
**Date**: 2026-04-26

## UI Changes

### Audio replay
- After session completes, show a new `<audio controls>` element under the report card title.
- Label: "Réécoute de l'enregistrement" with a muted grey subtitle "Fichier local — perdu au rechargement de la page."
- Element only appears when `audioBlobUrlRef.current` is non-null and `sessionCompleted === true`.
- WCAG: `<audio>` has an `aria-label` and is fully keyboard accessible (native controls).

### Mode pratique libre
- Add `<option value="">Aucune (mode pratique)</option>` as the first option in the candidature `<select>`.
- Change the `canStartInterview` check to remove the `Boolean(applicationId)` guard.
- Hint text updates: when no candidature is selected, show "Mode pratique libre — le rapport ne sera pas lié à une candidature."

### Pre-generation
- No dedicated UI. The pre-generation runs silently in background. Pipeline event log gains a new entry "Prefetch next question triggered" for debugging.

### RGPD purge
- No UI change. Backend-only.

## WCAG Compliance
- `<audio controls>` element is natively keyboard accessible.
- Candidature `<select>` already has `aria-label="Candidature liée"`.
- Hint text uses the existing `<p>` pattern with the current colour palette.
