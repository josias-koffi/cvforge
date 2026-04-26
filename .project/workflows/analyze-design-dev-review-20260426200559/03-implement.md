Implemented the missing recruiter-profile contract and clean session completion across `@cvforge/types`, `@cvforge/api`, and `@cvforge/app`.

Code changes:
- Added recruiter profile constants/types plus `completed` session state, `profile`, and `completedAt` fields to the shared interview contract.
- Extended the Nest interview service/controller/store to persist a selected profile, shape the LLM system prompt per profile, and expose `POST /interviews/sessions/:sessionId/finish`.
- Added the matching Next route proxy for `/interview/[sessionId]/finish`.
- Updated `InterviewStudio` with profile selection, profile badges/hints, completed-session handling, and a dedicated `Terminer la session` action.
- Expanded app/API/types tests for profiles, completion, and the updated request/response payloads.

Validation:
- `pnpm --filter @cvforge/types test`
- `pnpm --filter @cvforge/api exec vitest run src/interview/interview.service.test.ts src/interview/interview.controller.test.ts`
- `pnpm --filter @cvforge/app exec vitest run 'app/interview/interview-studio.test.tsx' 'app/interview/page.test.tsx' 'app/interview/start/route.test.ts' 'app/interview/[sessionId]/chunk/route.test.ts' 'app/interview/[sessionId]/respond/route.test.ts' 'app/interview/[sessionId]/route.test.ts' 'app/interview/[sessionId]/finish/route.test.ts'`
- `pnpm --filter @cvforge/types lint && pnpm --filter @cvforge/types build`
- `pnpm --filter @cvforge/api lint && pnpm --filter @cvforge/api build`
- `pnpm --filter @cvforge/app lint && pnpm --filter @cvforge/app build`

Coverage impact: targeted regression suites were expanded, but numeric coverage was not re-measured in this workflow run.
