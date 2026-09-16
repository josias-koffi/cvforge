# ADR-010: CVSpark landing site on Next.js 16, Tailwind v4, shadcn/ui and Motion

Date: 2026-09-16
Status: accepted

## Context

`apps/landing` was a placeholder: one page rendering the shared `AppShell` from `@cvforge/ui`, hard-coded French copy, Next 15, no Tailwind, no SEO, no images, and navigation links to pages that did not exist. Meanwhile `apps/web` was rebuilt on Next 16 + Tailwind v4 + shadcn (ADR-008) and the CVSpark visual identity was written down in `.project/marketing/`.

The product needs a real showcase site: a modern "AI app" landing that reuses the identity of `apps/web`, shows real screenshots of the product, and exists in French and English (the vision requires both).

## Decision

- Rebuild `apps/landing` on the same stack as `apps/web`: **Next.js 16.3.4, React 19.2, Tailwind CSS v4, shadcn/ui** (style `radix-nova`, lucide icons). The theme tokens of `apps/web/app/globals.css` are duplicated into `apps/landing/app/globals.css` rather than extracted into a shared package: the two apps must be able to drift, and a shared theme package would couple their release cycles for one file.
- `@cvforge/ui` (the older "paper" design system) is **no longer used** by the landing; it stays in place for `apps/app`.
- Add **`motion`** (v12, the successor package of framer-motion, MIT) for the scroll reveals, the hero border beam and the "profile + offer → CVSpark → resume + letter" animated diagram. Every animation is behind `prefers-reduced-motion`.
- Use free MIT components from the **Magic UI** shadcn registry (`border-beam`, `animated-beam`, `marquee`), restyled with CVSpark tokens. The Tailark registry considered for the page sections was unreachable from the build environment, so the sections are hand-written.
- **i18n without a library**: `app/[locale]` routes with `generateStaticParams`, typed dictionaries in `content/{fr,en}.ts`, and `proxy.ts` negotiating `Accept-Language` for locale-less paths. The story page keeps a localised slug (`/fr/histoire`, `/en/story`) through a rewrite.
- **Pricing is derived from `@cvforge/types`** (`creditPacks`, `AI_CREDIT_COSTS`) so the landing can never advertise prices the product does not charge.
- The app links (`/login`) go through a landing route handler that reads `APP_URL` **at request time**, because `NEXT_PUBLIC_*` values are inlined at build time while the deployment sets them at runtime.
- Ship as a **standalone Docker image** (like `apps/web`), port 3001.
- Placeholder testimonials are behind `NEXT_PUBLIC_SHOW_TESTIMONIALS`, off by default, so no fake review can reach production.

## Consequences

- `apps/landing` no longer depends on `@cvforge/ui`; its Docker image and compose volumes drop that package.
- One more app on Next 16 conventions (`proxy.ts`, async `params`, `PageProps`/`LayoutProps` globals from `next typegen`).
- The theme duplication must be kept in mind: a token change in `apps/web` that should be visible on the landing has to be copied over.
- `NEXT_PUBLIC_SITE_URL` must be passed as a build argument for canonical URLs, the sitemap and OG images to carry the real domain.
- Screenshots under `apps/landing/public/screenshots/` need to be refreshed when the product UI changes noticeably.

## Alternatives considered

- **Keep Next 15 and `@cvforge/ui`**: rejected, the landing would not look like the product it sells and the paper design system contradicts the CVSpark identity.
- **Extract a shared `@cvforge/theme` package**: rejected for now, one CSS file duplicated is cheaper than coupling two apps' build and release.
- **A paid template (Magic UI Pro, shadcnblocks)**: rejected, the same page structure is reachable with the MIT components already available.
- **`next-intl` for i18n**: rejected, two locales and static copy do not justify the dependency and its middleware.
