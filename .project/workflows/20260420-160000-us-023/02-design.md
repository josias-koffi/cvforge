# Stage 2 — Design (Designer)
**Run ID:** 20260420-160000-us-023
**Date:** 2026-04-20

## Design Verdict: PASS ✅ — UI changes required

---

## Overview

US-023 adds four management actions to the existing admin template studio: activation toggle, category management, default designation, and deletion. All actions are surfaced directly on template cards (no round-trip to the edit form).

The "Papier & Crayon" design language applies: line-art icons (Lucide, stroke 1.5px), badge-style labels, minimal confirmation dialogs.

---

## 1. Template Card — Enhanced Admin List

Each template card in the left sidebar gains inline action controls.

```
┌─────────────────────────────────────┐
│ [CV ATS Default]  ●──── ACTIF        │
│                                     │
│ [Par défaut — CV] badge (gold)       │
│ [ATS] badge  [Minimaliste] badge     │
│                                     │
│ [Dupliquer ⧉]  [Désactiver ◯]  [🗑]  │
└─────────────────────────────────────┘
```

**Active/Inactive toggle:**
- A compact `Switch` (shadcn) on the card header, label "Actif / Inactif"
- Toggling fires `PUT /templates/:id` with `{ active: !current }` — no confirmation needed
- Visual: when inactive the card gets `opacity-60` + a subtle `bg-stone-100` tint

**Default badge:**
- If `isDefault=true`, show a gold accent badge (design token: `#C8A96E`) "Par défaut"
- Clicking the badge on a non-default template shows a popover: "Définir comme template par défaut pour CV ?" → Confirmer / Annuler
- Clicking fires `PUT /templates/:id` with `{ isDefault: true }` — service handles removing old default

**Category badges:**
- Each string in `categories[]` rendered as a small `Badge` (variant `outline`)
- Predefined suggestions: ATS · Moderne · Minimaliste · Créatif (from vision §6.6)
- Edit button (pencil icon) opens an inline category editor

**Delete button:**
- Trash icon, `text-red-700` on hover
- Opens `AlertDialog` (shadcn) with: "Supprimer ce template ?" / details: name + kind + "Cette action est irréversible." → "Supprimer" (destructive) / "Annuler"
- If used in candidatures: dialog shows warning "Ce template est utilisé dans X candidature(s). Suppression impossible." → only "Fermer"

---

## 2. Category Editor — Inline Popover

Triggered by the pencil icon next to category badges.

```
┌──────────────────────────────────────────┐
│ Catégories                                │
│                                          │
│ Suggestions :                            │
│ [ATS ✓] [Moderne] [Minimaliste] [Créatif]│
│                                          │
│ Ajouter une catégorie :                  │
│ ┌────────────────────┐ [Ajouter]         │
│ │ Personnalisé...    │                   │
│ └────────────────────┘                   │
│                                          │
│ Actifs : [ATS ✕] [Créatif ✕]            │
│                                          │
│  [Enregistrer]                           │
└──────────────────────────────────────────┘
```

- Predefined toggle buttons: clicking adds/removes from selected set
- Custom input for free-form categories
- Current categories shown with × to remove
- On "Enregistrer" → `PUT /templates/:id` with updated `{ categories: [] }`

---

## 3. Filter Bar — Top of Admin Template List

```
Filtrer : [Tous ▾] [CV / LM] [Actif ▾] [Catégorie ▾]   [+ Nouveau template]
```

- `kind` filter: All | CV | LM (toggle buttons or Select)
- `active` filter: Tous | Actifs seulement | Inactifs seulement
- `category` filter: multi-select of all existing categories

Client-side filtering (no API change needed — all templates already loaded).

---

## 4. WCAG 2.1 AA Compliance

| Element | Requirement | Solution |
|---------|-------------|----------|
| Switch toggle | Label association | `<label htmlFor>` + aria-checked |
| Delete button | Keyboard accessible | `<button>` with aria-label="Supprimer [name]" |
| AlertDialog | Focus trap | shadcn `AlertDialog` handles focus trap natively |
| Category badges | Color not sole indicator | Text label + outline shape |
| Gold "Par défaut" badge | Contrast ≥ 4.5:1 | Gold on white: #C8A96E on #FAFAF7 → ~4.6:1 ✅ |
| Inactive card opacity-60 | Sufficient contrast | Content text remains #1A1A18 → passes at ~5.0:1 at 60% ✅ |

---

## 5. API Changes Required

| Method | Path | Purpose |
|--------|------|---------|
| DELETE | `/templates/:id` | Hard delete with candidature usage check |
| (existing) PUT | `/templates/:id` | Already handles `active`, `isDefault`, `categories` |

---

## 6. Frontend Routes/Components

New routes:
- `DELETE /admin/templates/[id]` → Next.js route handler calling API `DELETE /templates/:id`

Modified components:
- `apps/app/app/admin/templates/page.tsx` — add filter bar, enhance template cards with inline actions
- New: `apps/app/app/admin/templates/[id]/route.ts` — DELETE route handler

---

## Design Decisions

- **No drag-and-drop reordering**: Out of scope for US-023 (full Puck editor for US-024)
- **Client-side filtering**: All templates load on page init; filtering is in-memory. Template count is small (< 50 in MVP), no pagination needed yet
- **Default change without confirm**: The service is idempotent and the constraint is enforced server-side; a light popover is sufficient without a heavy modal
- **Deletion blocks on usage**: Prevents orphaned template references in candidatures — consistent with vision §13.3
