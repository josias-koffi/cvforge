# ADR-008: CVForge v2 front-end (`apps/web`) on Next.js 16, Tailwind v4 and shadcn/ui blocks
Date: 2026-09-15
Status: accepted

## Context
`apps/app` was designed mobile-first with a hand-written CSS token layer (`paperStylesCss`), many inline styles and card-heavy screens. Demo audiences did not understand the navigation, and retrofitting a desktop layout proved impractical. The product owner asked for a separate, simpler app that can be put online as a showcase, reusing ready-made shadcn templates (`dashboard-01`), a flat route set (dashboard, offers, CV, letter), a real admin CRUD, and the ability to edit an imported offer (description and source link).

## Decision
- Create `apps/web` (`@cvforge/web`) scaffolded with the shadcn CLI (`init -t next`, style `radix-nova`), which brings **Next.js 16**, React 19.2, **Tailwind CSS v4**, `radix-ui`, `lucide-react`, `sonner`, `recharts` and `@tanstack/react-table` v9 through the `dashboard-01` block.
- Keep the NestJS API (`apps/api`) and the JSON stores unchanged in nature; `apps/web` is a BFF: server components and server actions call the API with the forwarded session cookie.
- Reuse `@cvforge/types` and `@cvforge/document-renderer` (live A4 preview). `@cvforge/ui` is not used by `apps/web`.
- API additions required by the new UI: `GET /applications/:id/offer`, `PATCH /applications/:id`, `POST /applications/:id/re-extract`, and `GET|PATCH|DELETE /admin/users[/:email]`.
- Ship with a standalone Docker image (`docker/web.Dockerfile`), port 3100, routed on `WEB_DOMAIN` in production.

## Consequences
- Two front-ends coexist during the transition; `apps/app` is untouched and can be retired once `apps/web` becomes the main domain (point the API `NEXT_PUBLIC_APP_URL` at the v2 URL so magic links and Stripe returns land there).
- **Retired on 2026-09-20.** `apps/web` had become the only front-end served on `WEB_DOMAIN`, and `apps/app` was absent from the CI build matrix, so it had shipped nothing for some time while still failing `pnpm build` on a stale `CreateCheckoutSessionRequest["packId"]`. Removed along with `docker/app.Dockerfile`, its `docker-compose.yml` service and its lint and vitest wiring. It remains in git history if a screen needs to be recovered — notably the interview and template-administration UIs, which v2 never exposed even though the API still serves them. `@cvforge/ui` and the `creditPacks` types in `@cvforge/types` lost their only consumer with it.
- Next.js 16 differs from Next 15 used by `apps/app`/`apps/landing` (`proxy.ts` instead of middleware, async request APIs, `PageProps` globals via `next typegen`). Agents must read `apps/web/node_modules/next/dist/docs/` before changing it (see `apps/web/AGENTS.md`).
- `apps/web` uses ESLint 9 with `eslint-config-next` 16 in its own flat config, independent of the root config.
- Interview practice and template administration are intentionally not exposed in v2.

## Alternatives considered
- Refactor `apps/app` in place: rejected, the mobile-first structure and shared CSS layer leak into every screen.
- Tailwind v3 / Next 15 to match the other apps: rejected, the current shadcn CLI and blocks target Tailwind v4, and pinning older versions would fight the templates.
- A new API with Prisma/Postgres: rejected for this iteration, the existing API already covers the domain.
