# Task — US-049

Sprint: `014`
Workflow: `analyze-design-dev-review`
Run ID: `analyze-design-dev-review-20260426204050`

Story:
- Générer le rapport post-interview avec métriques et notes.

Acceptance criteria:
- Un rapport structuré est généré en fin de session.
- Les notes et métriques sont persistées.
- Le dashboard peut consommer ces scores.

Implementation scope:
- Link interview sessions to applications through `applicationId`.
- Generate a structured interview report at session completion.
- Persist the report on both the session summary and the application aggregate.
- Expose the report in the interview UI and consume persisted scores in dashboard analytics.

Evidence collected:
- `pnpm --filter @cvforge/types exec vitest run src/index.test.ts`
- `pnpm --filter @cvforge/api exec vitest run src/interview/interview.controller.test.ts src/interview/interview.service.test.ts src/applications/applications.service.test.ts`
- `pnpm --filter @cvforge/app exec vitest run app/interview/page.test.tsx app/interview/start/route.test.ts 'app/interview/[sessionId]/finish/route.test.ts' app/interview/interview-studio.test.tsx app/dashboard/analytics.test.ts app/dashboard/page.test.tsx app/dashboard/share-card-content.test.ts`
- `pnpm lint`
- `pnpm build`
- `pnpm test -- --coverage`
