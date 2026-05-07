# Stage 2 — Design
Agent: designer
Date: 2026-05-07

## Context
Sprint 017 requires a dedicated `/interview/new` setup wizard before the interview studio. The "Papier & Crayon" design system applies (ivory backgrounds, charcoal text, gold accents, shadcn/ui components).

## Screen: `/interview/new` — Interview Setup Wizard

### Layout
Single-column centered card (max-width ~560px) inside the `AppShell`.
3 steps, rendered sequentially. A step indicator at the top (1 → 2 → 3) with shadcn-style pill badges.

### Step 1 — Candidature
**Header**: "Pour quelle candidature ?"
**Content**:
- Combobox / search-select listing candidatures (status ≠ draft) — label: `{title} — {companyName}`.
- First option is always "Mode pratique libre (sans candidature)".
- If `?candidatureId=` param is present, pre-select that candidature.
- Selected card preview: show company name + status badge.

**Design token usage**:
- Background `#FAFAF7`, border `#D9D4CA`, selected card border `#2C2C2A`.

### Step 2 — Profil recruteur
**Header**: "Quel style de recruteur ?"
**Content**: Horizontal-scrollable grid of 5 cards (one per profile):

| Card | Label | Icon | Hint |
|------|-------|------|------|
| standard | Standard | 🧑‍💼 | Entretien RH classique |
| aggressive | Agressif | ⚡ | Questions pièges, pression |
| passive | Passif | 🌫️ | Tonalité sobre, silences |
| technical | Technique | 🔧 | Focus hard skills |
| behavioral | Comportemental | 🧠 | Questions STAR |

Selected card: border `#2C2C2A`, background `#F2F0EB`, checkmark icon.
Unselected: border `#D9D4CA`, background `#FFFFFF`.

### Step 3 — Langue & Niveau
**Header**: "Langue et paramètres"
**Content**:
- Language toggle: two large buttons FR / EN. Active = `#2C2C2A` fill, white text. Inactive = outline.
- Difficulty note: same as recruiter profile (already set in step 2); just show a recap badge "Profil: [label]".
- Session duration hint: "Durée estimée: ~10 minutes".

### CTA Bar (bottom of wizard)
- Back button (ghost, appears on steps 2 and 3).
- "Suivant →" on steps 1 and 2.
- "Démarrer l'entretien →" on step 3 (primary, full-width on mobile).

### Step indicator
```
  ① Candidature  ②  Profil  ③ Paramètres
```
Active step: filled `#2C2C2A` circle. Past step: checkmark. Future: outline.

---

## Screen: `/interview/[sessionId]` — Interview Studio (shell)
Simple page shell: `AppShell` + existing `InterviewStudio` component passed a `preloadedSessionId` prop. The studio hydrates from the server-passed session ID instead of reading sessionStorage on mount.

---

## Candidature detail — "Préparer un entretien" button
In `candidature-detail-tabs.tsx`, in the `OffreTab` (or as a fixed action at the top of the detail tabs), add:
```
<Link href={`/interview/new?candidatureId=${application.id}`}>
  <Button>Préparer un entretien</Button>
</Link>
```

---

## UX risks
- Deep-link param `?candidatureId=` requires the server component to read `searchParams` and pass to the client stepper.
- The stepper is client-side (needs `"use client"`) for interactive step navigation.
- POST to `/interview/start` uses existing route — no API changes needed.
- After POST success, client redirects with `router.push(/interview/${sessionId})`.

## Pass verdict: Design fits analyzed scope. Proceed to Implement.
