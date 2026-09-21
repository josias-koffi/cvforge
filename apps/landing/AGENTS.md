<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CVSpark landing (`@cvforge/landing`)

Public showcase site. Same stack as `apps/web` (Next 16, Tailwind v4, shadcn `radix-nova`, lucide) — see `.project/decisions/ADR-010-landing-nextjs16-motion.md`.

## Rules

- **All copy lives in `content/fr.ts` and `content/en.ts`**, typed by `content/types.ts`. Never hard-code user-facing text in a component. Both dictionaries must keep the same keys (a test enforces it).
- **Wording and identity come from `.project/marketing/`**: CVSpark is never written CVSPARK, no gradient on the wordmark, no font weight 700, sentence case, amber (`--spark`) only for the primary "generate" call to action.
- **Prices are never hard-coded**: packs come from the API (`GET /public/credit-offers`, managed in the back-office) through `lib/offers-api.ts`; action costs come from `AI_CREDIT_COSTS` in `@cvforge/types`. When the API is unreachable the section shows no price at all.
- **Links to the product** go through `/login` (a route handler reading `APP_URL` at request time), never a build-time `NEXT_PUBLIC_APP_URL`.
- **Theme tokens** in `app/globals.css` mirror `apps/web/app/globals.css`; copy changes across when they should be shared.
- Testimonials are placeholders behind `NEXT_PUBLIC_SHOW_TESTIMONIALS`; do not enable it until real reviews replace them.
- Animations use `motion` and must stay behind `prefers-reduced-motion` (`components/reveal.tsx`).

## Screenshots

`public/screenshots/{light,dark}/<name>.webp`, captured from `apps/web` at 1440×900, named after `ScreenshotName` in `content/types.ts`. They must never contain real personal data — capture them from a demo account.

The interview captures (`interview-studio`, `interview-report`, `interview-progress`) were taken from `cvspark-demo@yopmail.com` against a fictional interview history seeded locally: the studio needs a spoken session, which cannot be replayed. Re-shoot them the same way, and crop the sidebar footer out — it carries the demo address, and in `next dev` the issue badge sits there too.

## Commands

```bash
pnpm --filter @cvforge/landing dev        # port 3101
pnpm --filter @cvforge/landing lint
pnpm --filter @cvforge/landing typecheck
pnpm --filter @cvforge/landing test
pnpm --filter @cvforge/landing build
```

## Environment

| Variable                        | When                                         | Default                 |
| ------------------------------- | -------------------------------------------- | ----------------------- |
| `APP_URL`                       | runtime, target of `/login`                  | `http://localhost:3100` |
| `API_INTERNAL_URL`              | runtime, API serving the credit offers       | `NEXT_PUBLIC_API_URL`, then `http://localhost:3333` |
| `NEXT_PUBLIC_SITE_URL`          | build, canonical URLs / sitemap / OG images  | `http://localhost:3101` |
| `NEXT_PUBLIC_SHOW_TESTIMONIALS` | build, `true` shows the testimonials section | off                     |
| `NEXT_DIST_DIR`                 | dev in docker-compose                        | `.next`                 |
