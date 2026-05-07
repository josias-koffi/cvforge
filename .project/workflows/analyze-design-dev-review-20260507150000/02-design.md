# Stage 2 — Design

Agent: designer | US-062 | 2026-05-07

## Screen: `/candidatures/[id]`

### Layout

AppShell wrapper (breadcrumb: `Candidatures > [Poste]`) — consistent with all other authenticated pages.

### Header card

```
┌─────────────────────────────────────────────────────────┐
│ ← Candidatures                                          │
│ [Titre du poste]                      [badge statut]    │
│ Entreprise · Créée le DD MMM YYYY                       │
└─────────────────────────────────────────────────────────┘
```

- Title: `font-size: 1.5rem; font-weight: 700`
- Subtitle: company + created date, muted (`color: #6B6860`)
- Status badge: reuses `getApplicationStatusTone()` pill style

### Tab bar

```
[ Offre ]  [ CV ]  [ LM ]  [ Interviews ]  [ Historique ]
```

- Horizontal pill tabs, `role="tablist"`, each `role="tab"`, `aria-selected`
- Active tab: `border-bottom: 2px solid #1A1A18`; inactive: `color: #6B6860`
- Tab panel: `role="tabpanel"`, `aria-labelledby`
- Keyboard: arrow key navigation between tabs

### Tab — Offre

Structured card with labeled rows:
- Résumé (full summary paragraph)
- Lieu / Contrat / Salaire (inline chips if not null)
- Responsabilités (ul list)
- Prérequis (ul list)
- Source URL (link if not null)

### Tab — CV

- If generated: two buttons "Éditer" (→ `/cv/[id]`) and "Télécharger PDF" (→ `/cv/[id]/pdf`)
- If not generated: "Aucun CV généré" + GenerateCvButton inline

### Tab — LM

- Mirror of CV tab using `/letters/[id]` and `/letters/[id]/pdf`
- If not generated: "Aucune lettre générée" + GenerateLetterButton inline

### Tab — Interviews

- Table: Date | Score | Actions
- Empty: "Aucun entretien pour cette candidature"
- CTA button: "Démarrer un entretien" → `/interview?candidatureId=[id]`

### Tab — Historique

Vertical timeline:
```
● [date] — [badge statut]
│
● [date] — [badge statut]
```
Ordered descending (most recent first). Uses same status badge style.

### WCAG notes

- All tabs keyboard-navigable (ArrowLeft/Right)
- Focus rings visible
- Status badges meet contrast ratios (same palette as existing)
- All action buttons have descriptive labels

## Verdict: PASS
