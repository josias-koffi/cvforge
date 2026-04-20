# Stage 4 — Review
Agent: qa-reviewer
Date: 2026-04-20

## Acceptance Criteria Verification

| # | Criterion | Evidence | Verdict |
|---|---|---|---|
| 1 | **Le prompt n'expose pas les données interdites** | `CV_SYSTEM_PROMPT` in `cv-generation.service.ts` explicitly instructs: "Ne génère JAMAIS de numéro de téléphone ni d'adresse email" and uses "[CANDIDATE]" as the lastName token. `PromptSafeProfile` type has no `lastName`, `phone`, `email`, or `exactAddress` fields. Service test at line "calls openRouter.chat with pseudonymised profile" asserts that `payload.pseudonymisedProfile.identity` does not have `lastName`, `phone`, or `email`. Route test asserts `sent.promptProfile.identity` has none of those fields. | ✅ PASS |
| 2 | **Le JSON généré est compatible avec le template actif** | `normalizeCvJson()` maps the AI response to `CVDocumentContent`, which is the exact type used by the block registry (`CVHeader`, `ExperienceItem`, etc.). The `CVDocumentContent` type is the shared contract between OpenRouter output, template props, and the render page. The CV view page uses each block component directly with `cvContent` props. | ✅ PASS |
| 3 | **Les champs réinjectés localement apparaissent au rendu final** | `normalizeCvJson()` replaces `candidate.lastName` with `localFields.lastName`, `candidate.phone` with `localFields.phone`, and `candidate.email` with `localFields.email`. The service test "injects localFields into the returned cvContent" asserts `cvContent.candidate.lastName === "Dupont"`, `.phone === "+33612345678"`, `.email === "user@test.example"`. The CV view page renders `CVHeader` with the complete `cvContent.candidate` including re-injected fields. | ✅ PASS |

## Engineering Standards Verification

| Standard | Evidence | Verdict |
|---|---|---|
| Clean Architecture | `cv-generation.service.ts` is in Infrastructure layer, depends only on domain types. No reverse imports. | ✅ |
| Test coverage 90% new code | cv-generation service: 90.21% lines; route: 100% lines | ✅ |
| Conventional Commits | No commit to check — will be applied at push | N/A |
| Security | No PII transmitted to OpenRouter. `localFields` re-injected only server-side. Input validation via TypeScript types and BadRequestException guard. | ✅ |
| Observability | Service inherits existing NestJS error propagation. No new unhandled exceptions. | ✅ |
| WCAG Accessibility | CV view page uses semantic HTML (`<header>`, `<h1>`, etc.) from document block components. Back link is a standard anchor. | ✅ |

## Blocking Defects
None.

## Advisory Items
1. The `GenerateCvButton` client component uses `window.location.href` for redirect after success — a Next.js `router.push()` would be more idiomatic but works correctly.
2. The CV view page does not show a loading state while the server fetches content — a Suspense boundary could improve UX on slow connections.
3. Line coverage for `cv-generation.controller.ts` was brought from 10% to 100% by the controller test.

## Pass Verdict
✅ All three acceptance criteria verified with direct code and test evidence. No blocking defects.
