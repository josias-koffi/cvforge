# Stage 4 — Review

Agent: qa-reviewer | US-062 | 2026-05-07

## Acceptance criteria verification

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Header: titre poste, entreprise, badge statut, date création | ✅ PASS | `CandidatureDetailTabs` renders `extracted.title`, `extracted.companyName`, `getApplicationStatusTone()` badge, `createdAt` date. Test: "renders application title and company in header" |
| 2 | Onglets: Offre \| CV \| LM \| Interviews \| Historique | ✅ PASS | 5 `role="tab"` buttons in `TABS` array. Test: "renders all five tab buttons" |
| 3 | Onglet Offre: données scrapées structurées | ✅ PASS | `OffreTab` renders summary, chips for location/contractType/salaryRange, ul for responsibilities and requirements, source URL link. Tests: "renders offer summary", "renders chips", "renders responsibilities and requirements" |
| 4 | Onglet CV: aperçu + actions Éditer + PDF | ✅ PASS | `CvTab` branches on `cvGeneratedAt`: edit link → `/cv/[id]`, PDF link → `/cv/[id]/pdf`, DOCX link. Tests: "shows CV edit links when cvGeneratedAt set" |
| 5 | Onglet LM: même traitement que CV | ✅ PASS | `LmTab` mirrors CV with `/letters/[id]` and `/letters/[id]/pdf`. Tests: "shows LM edit links when letterGeneratedAt set" |
| 6 | Onglet Interviews: table + bouton démarrer | ✅ PASS | `InterviewsTab` renders reports table (date, score, summary) + "Démarrer un entretien" → `/interview?candidatureId=[id]`. Tests: "renders the start interview link", "renders interview reports table" |
| 7 | Onglet Historique: timeline changements statut | ✅ PASS | `HistoriqueTab` renders `statusHistory` entries reversed (newest first) with dot+line timeline + status badge. Test: "renders status history entries" |
| 8 | Breadcrumb: Candidatures > [Poste] | ✅ PASS | `breadcrumb={`Candidatures · ${title}`}` in page.tsx AppShell. Test: "renders the detail tabs when the application is found" |

## Blocking rules check

| Rule | Verdict |
|------|---------|
| Clean Architecture — no domain imports in UI | ✅ PASS |
| Test coverage — 251 tests all passing | ✅ PASS |
| Conventional Commits | ✅ N/A (workflow-only, commit at push gate) |
| PR size ≤ 400 lines | ✅ PASS (~290 lines net new code) |
| ADR for new library | ✅ PASS (no new library introduced) |
| Accessibility WCAG 2.1 AA | ✅ PASS: `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-labelledby`, keyboard ArrowLeft/Right, focus:outline |
| Security baseline | ✅ PASS: no new user-input surface, `offerUrl` renders via `<a href>` (XSS safe) |

## Advisory findings

- `<tr onClick>` in `CandidaturesTable` row now navigates directly to detail page (replacing slide-over open) — this is intentional per US-062 scope.
- `tabIndex={-1}` on inactive tabs enables roving tabindex pattern correctly.

## Verdict: ✅ ALL BLOCKING CRITERIA PASS
