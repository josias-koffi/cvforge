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
- **Legal documents are not copy**: CGU, CGV, legal notice and privacy policy come from the API (`GET /public/legal/:slug`, edited in the back-office at `/admin/legal`) through `lib/legal-api.ts`. Only their navigation labels live in the dictionaries. When the API cannot serve one, the page answers 404 — never an empty contract. Their bodies are plain text parsed by `parseLegalBody` (`@cvforge/types`), never HTML.
- **Theme tokens** in `app/globals.css` mirror `apps/web/app/globals.css`; copy changes across when they should be shared.
- Testimonials are placeholders behind `NEXT_PUBLIC_SHOW_TESTIMONIALS`; do not enable it until real reviews replace them.
- Animations use `motion` and must stay behind `prefers-reduced-motion` (`components/reveal.tsx`).

## Screenshots

`public/screenshots/{light,dark}/<name>.webp`, named after `ScreenshotName` in `content/types.ts`. **Never re-shoot them by hand — run the script:**

```bash
pnpm --filter @cvforge/landing capture              # all seventeen, both themes
pnpm --filter @cvforge/landing capture cv-editor    # one screen, both themes
```

`scripts/capture-screenshots.mjs` needs the local stack up (`docker compose up -d postgres redis`, `pnpm dev`) and the `cvspark-demo@yopmail.com` account seeded. It signs its own session cookie with `AUTH_SESSION_SECRET` instead of going through a magic link, resolves the records to shoot from the API so a re-seed does not break it, hides the dev overlay and the scrollbars, and swaps the demo address for `lea.moreau@example.com` before the shutter — nothing that identifies the mailbox reaches the landing page.

Captures are 1440×900 at `deviceScaleFactor: 2`, so 2880×1800 on disk. That is deliberate: the widest slot on the page is 1152 CSS px, which needs 2304 source pixels on a retina screen. The 1x captures this replaced were upscaled by the browser and looked soft. `SCREENSHOT_WIDTH`/`SCREENSHOT_HEIGHT` in `components/screenshot.tsx` must match.

Close-ups (`offer-ai`, `search-alerts`, `market-radar`, `cv-ats`) crop one or a few cards — or the ATS panel of a generated CV — out of the page at `deviceScaleFactor: 3`, so they stay sharp once enlarged. Their size depends on the component, so the script records every capture's size in `lib/screenshot-sizes.json`, which `components/screenshot.tsx` reads; a close-up wider than 1.9:1 is shown full width on the feature pages. The script also writes `assets/og/<name>.jpg` for the captures the share cards show (`lib/og-image.tsx`): ImageResponse cannot decode WebP.

The job-search screens need the demo account's search to be set up once — search project on the developer profile (Paris, AI ranking on, e-mail off), then a digest run (`pnpm --filter @cvforge/api job-digest:run -- --force`), `hiring-companies:refresh` and `market:refresh`.

The studio (`interview-studio`) only renders while a session is unfinished, and the seeded interviews are all completed — so the script rewinds one row in `interview_sessions` for the length of that single shot and restores it afterwards, with a fake microphone so the orb reaches "je vous écoute".

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
| `NEXT_PUBLIC_SITE_URL`          | build + runtime, canonical URLs / sitemap / OG images | `http://localhost:3101` |
| `NEXT_PUBLIC_SHOW_TESTIMONIALS` | build, `true` shows the testimonials section | off                     |
| `NEXT_DIST_DIR`                 | dev in docker-compose                        | `.next`                 |
