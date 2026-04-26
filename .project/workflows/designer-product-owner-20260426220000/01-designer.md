# Stage 1 — Designer: Full UX/Design Overhaul Specification

## Diagnosis

The app was built mobile-first but the primary use case is desktop. This created seven structural problems:
1. Screens are data-dense with no breathing room
2. No intermediate/transition screens (e.g., candidature detail, interview setup, report view)
3. Navigation is cramped and low-information-scent
4. Interview mode is button-per-turn, not conversational
5. Puck Editor is embedded inline for all users — should be admin-only and full-screen
6. No table views for list-heavy data (candidatures, interviews, users)
7. Design language lacks the minimalist clarity of shadcn

---

## Design Direction: Desktop-First + shadcn Minimalism

**Aesthetic**: White/off-white surfaces, 1px borders (#e5e7eb), Inter/Geist font, generous padding (px-6 py-5 cards), subtle shadows (shadow-sm). Inspired by shadcn/ui's clean registry style.

**Color palette (revised)**:
- Background: `#fafafa` (app), `#ffffff` (cards)
- Border: `#e5e7eb`
- Primary: `#18181b` (text), `#71717a` (muted)
- Accent: existing brand color (kept for CTAs only)
- Danger: `#dc2626`

**Layout breakpoints**:
- `< 768px`: mobile — collapsed nav, stacked layout
- `768–1024px`: tablet — sidebar optional, single column content
- `≥ 1024px`: desktop (primary) — sidebar + main + optional detail panel

---

## New Screen Architecture

### Navigation (Desktop)

**Left sidebar** (fixed, 240px):
```
[Logo]
─────────────
Dashboard        /
Candidatures     /candidatures
Interview        /interview
Documents        /documents (CV + LM hub)
Crédits          /credits
─────────────
Profile          /profile
Notifications    /notifications
─────────────
[Admin] (role-gated)
  Users          /admin/users
  Templates      /admin/templates
  Analytics      /admin/analytics
```

**Top bar**: breadcrumb + user avatar + notification bell.
No bottom nav on desktop. Mobile: hamburger menu → slide-in drawer.

---

### Screen Inventory (New/Split)

#### 1. Dashboard `/`
- 3-col KPI row at top (candidatures actives, crédits restants, prochain entretien)
- 2-col below: recent candidatures table + recent interview sessions
- Quick actions panel (right, collapsible)
- **Removed**: chart overload — max 2 charts, both optional

#### 2. Candidatures List `/candidatures`
- **Full-page table** with columns: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions
- Filters bar: statut, date range, search (above table)
- Row click → detail slide-over (not new page) OR `/candidatures/[id]` detail page
- CTA: "Nouvelle candidature" (top right)

#### 3. Candidature Detail `/candidatures/[id]` *(new screen)*
- Header: job title, company, status badge, created date
- Tabs: **Offre | CV | LM | Interviews | Historique**
  - Offre: scraped offer data
  - CV: generated CV with "Éditer" (opens document page) and "PDF" actions
  - LM: same for letter
  - Interviews: table of past sessions for this candidature + "Démarrer un entretien"
  - Historique: timeline of status changes

#### 4. Interview Setup `/interview/new` *(new screen)*
- Step 1 — Select candidature (search/select dropdown or "Mode libre")
- Step 2 — Select recruiter profile (list of cards)
- Step 3 — Select language/difficulty
- "Démarrer" CTA

#### 5. Interview Studio `/interview/[sessionId]` *(redesigned)*
**Goal**: simulate a phone/video call experience.

Layout:
```
┌──────────────────────────────────────────────────┐
│  [← Fin de session]   Entretien — DevOps Sr.     │
│  00:04:23  ● En cours                            │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  [AI Recruteur]                            │  │
│  │  "Parlez-moi de votre expérience avec..."  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [Transcript défilant — messages alternés]       │
│  AI:  "..."                                      │
│  Vous: "..."                                     │
│                                                  │
├──────────────────────────────────────────────────┤
│  [🎙 VAD: silence]  [● REC: 00:12]               │
│  ← VAD is always ON; recording is automatic      │
│  No manual push-to-talk button.                  │
│  Mute toggle (optional) + End session            │
└──────────────────────────────────────────────────┘
```

**Key change**: VAD drives everything. User speaks → mic detects → auto-sends. No button press per turn.
State badges: `🟢 À l'écoute` / `🔴 Enregistrement` / `🟡 Traitement` / `⚫ Muet`.
Auto-scroll transcript. Session timer.

#### 6. Interview Report `/interview/[sessionId]/report` *(new screen)*
- Summary card: score global, 3-4 dimensions (pertinence, clarté, structure, STAR)
- Transcript with timestamps
- Audio replay (native `<audio>`)
- Actions: "Voir la candidature", "Retourner au dashboard"

#### 7. Documents Hub `/documents` *(new screen)*
- Table: Titre, Type (CV/LM), Candidature liée, Dernière modif, Actions (PDF, DOCX, Éditer)
- Filter: CV / LM / All
- No Puck here — "Éditer" opens `/documents/[id]/edit`

#### 8. Document Editor `/documents/[id]/edit`
- Full-page 2-pane: rendered preview (left) + structured form (right)
- User only edits field values (name, summary, experience entries, etc.)
- No Puck drag-and-drop for users — they use structured inputs
- "Télécharger PDF" and "Télécharger DOCX" actions in header

#### 9. Admin: Puck Template Editor `/admin/templates/[id]/edit` *(full-screen)*
- Full-screen Puck editor (no sidebar, no shell headers)
- Minimal top bar: template name + "Sauvegarder" + "← Retour aux templates"
- Puck entirely owns the viewport
- Only reachable by `admin` role

#### 10. Profile `/profile`
- 2-col: profile switcher (left, narrow) + active profile form (right)
- Sections as accordions: Identité, Expériences, Formation, Compétences, Langues
- Import CV action inline in section header

#### 11. Credits `/credits`
- Balance card (large, prominent)
- Pack purchase row (Starter / Pro)
- Ledger table: Date, Action, Montant, Solde

---

## Interview Agent Continuity Fix (Design Contract)

**Problem**: Agent receives appended text because every user utterance is sent as a new isolated message, losing conversation context.

**Design contract for developer**:
- The interview session must maintain a `messages: Message[]` array server-side (Redis key per sessionId)
- Each new STT chunk is appended to the existing messages array and the full array is sent to the LLM
- The session ID is the conversation thread — never restart the LLM context mid-session
- No "reset" happens unless the user explicitly ends and restarts the session
- UI must show the full thread, auto-scrolling to latest

---

## Puck Editor Placement (Final Rule)

| Surface | Who | Editor type |
|---------|-----|-------------|
| `/admin/templates/[id]/edit` | admin only | Puck full-screen |
| `/documents/[id]/edit` | authenticated user | Structured form (no Puck) |
| Template list `/admin/templates` | admin only | Card list + "Éditer" button |

Users never see Puck. Puck is a content-authoring tool for admins to define template layouts.

---

## WCAG 2.1 AA Notes

- All table columns have `<th scope="col">` and aria-sort
- Interview state badges use both color and icon (not color-only)
- Sidebar nav links have visible focus ring (`ring-2 ring-offset-2`)
- Audio player uses native `<audio controls>` (WCAG compliant)
- Form fields in document editor have associated `<label>`

---

## Summary

This redesign addresses all 7 diagnosed problems:
1. ✅ Intermediate screens added (candidature detail, interview setup, report, documents hub)
2. ✅ Tables added (candidatures list, documents, credits ledger, admin)
3. ✅ Interview is VAD-driven — no manual button press per turn
4. ✅ Agent continuity fixed via server-side messages array
5. ✅ Puck is admin-only, full-screen
6. ✅ Information density reduced via tabs, accordions, split layouts
7. ✅ shadcn-inspired minimalist design direction
