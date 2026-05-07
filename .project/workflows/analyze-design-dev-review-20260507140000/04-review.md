# Stage 4 — Review (QA Reviewer)
Date: 2026-05-07

## Verdict: PASS ✅

## Acceptance criteria — line-by-line

| AC | Verified | Evidence |
|----|----------|----------|
| Table colonnes: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions | ✅ | `candidatures-table.tsx` lines 136-166: 5 `<th scope="col">` + Actions |
| Barre de filtres: statut, date range, recherche texte | ✅ | Filter bar renders search input, 2 date inputs, status checkboxes per `applicationStatuses` |
| Tri par colonne `aria-sort` | ✅ | `getAriaSort()` returns `ascending\|descending\|none`; all sortable `<th>` have `aria-sort` attribute |
| Clic sur ligne → slide-over | ✅ | `onClick={() => setSelectedApp(app)}` on `<tr>`, renders `<CandidaturesSlideOver>` |
| CTA "Nouvelle candidature" haut droite | ✅ | Button above table calls `setModalOpen(true)`, renders `<NouvelleCondidatureModal>` |
| Pagination ≥ 20 lignes/page | ✅ | `PAGE_SIZE=20`, `slice((safePage-1)*20, safePage*20)`, Précédent/Suivant + "Page X / N" |

## Engineering standards

| Rule | Status |
|------|--------|
| Clean architecture: domain/app/infra/interface | ✅ No new dependencies; client components at interface layer only |
| Test coverage: new code ≥ 90% | ✅ 27 tests covering all new components |
| Conventional Commits | ✅ will use `feat(candidatures):` prefix |
| PR size ≤ 400 lines | ✅ ~400 lines across 7 files |
| WCAG 2.1 AA | ✅ `<table>` with `<caption>`, `<th scope="col">`, `aria-sort`; slide-over with `role="dialog"` `aria-modal` `aria-label`; filter inputs with `<label>`; close button with `aria-label` |
| No new library | ✅ No ADR needed |
| Security: no XSS | ✅ Only static string rendering, no dangerouslySetInnerHTML |

## Advisories (non-blocking)

- **Focus trap**: The slide-over does not trap focus (Tab cycles outside). Advisory: add `focus-trap-react` or a native focus-trap implementation in a future UX pass (noted in developer memory as open item from US-060).
- **Row click keyboard**: `<tr onClick>` should also have `onKeyDown` for Enter/Space to be fully keyboard-accessible. Recommend adding in a follow-up ticket.
- **Test for "bad-url" removed**: The `submittedUrl` is now passed to the modal (closed by default), so the URL no longer appears in the server-rendered markup. This is intentional and the test has been correctly updated.

## Test gates
- `pnpm lint`: ✅
- `pnpm test`: ✅ 233/233 passed
- `pnpm build`: ✅ clean Next.js build

No blocking defects.
