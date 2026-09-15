# Décisions d architecture (ADR) — CVForge


---

# ADR-001: Adopt shadcn/ui runtime helpers in the shared UI package
Date: 2026-04-19
Status: accepted

## Context
`US-007` requires the repository to install `shadcn/ui` foundations and expose reusable base components from `packages/ui`. The monorepo already has a centralized "Papier & Crayon" token layer, but it did not yet have the helper dependencies typically used by shadcn/ui primitives for slotting, variant composition, and class merging.

## Decision
Add `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, and `tailwind-merge` to `@cvforge/ui` and use them as the base runtime helpers for shared component primitives.

## Consequences
- The shared UI package can now expose shadcn-style primitives with consistent APIs (`variant`, `size`, `asChild`) while keeping the current tokenized visual language.
- Future stories can add more primitives without reintroducing local component conventions per app.
- The repository accepts a small runtime dependency increase in exchange for a more standard and maintainable component layer.

## Alternatives considered
- Keep custom one-off React components with no shared helper layer.
- Delay the component work until a full Tailwind/shadcn CLI setup exists in every app.


---

# ADR-002: Use Nodemailer for SMTP-based auth email delivery
Date: 2026-04-19
Status: accepted

## Context
The MVP vision requires passwordless login by email magic link. The repository already has a provider-neutral SMTP configuration module, but it does not yet have a delivery mechanism that can send auth emails through that configuration. Implementing a production-safe SMTP client from scratch on top of Node sockets would add avoidable protocol complexity for TLS negotiation, authentication, and message formatting.

## Decision
Add `nodemailer` to `@cvforge/api` and use it as the SMTP transport layer for auth email delivery. The application will keep the provider-neutral SMTP configuration and use `EMAIL_FROM` as the sender identity.

## Consequences
- Magic-link delivery can reuse the existing SMTP environment variables without binding the code to Resend-specific APIs.
- The auth flow becomes production-usable for real email delivery while remaining swappable through environment changes only.
- The repository accepts one focused runtime dependency in exchange for a mature SMTP implementation.

## Alternatives considered
- Keep the current generated-link preview and defer real delivery indefinitely.
- Implement SMTP directly with Node `net` and `tls`.
- Integrate a provider-specific API instead of SMTP.


---

# ADR-003: Integrate Puck Editor as the WYSIWYG layer for template creation and CV editing

Date: 2026-04-20
Status: accepted
Note: The package was renamed from `@measured-co/puck` to `@puckeditor/core`. The installed package is `@puckeditor/core@0.21.2`. All references in this ADR using `@measured-co/puck` should be read as `@puckeditor/core`.

## Context

The vision mandates Puck Editor (`@measured-co/puck`) as the single WYSIWYG authoring surface across two distinct flows:

1. **Admin — template creation**: the admin assembles a CV or LM layout by dragging and dropping predefined blocks (CVHeader, ExperienceItem, SkillsList, etc.) into a canvas and saving the result as structured JSON.
2. **User — CV editing**: after AI generation, the user edits the content of their CV in the same visual environment before exporting to PDF.

Both flows were implemented without Puck during sprints 006–007 due to the absence of the dependency:

- The admin "Editeur Puck" card (`apps/app/app/admin/templates/page.tsx`) is a raw JSON textarea that requires the admin to hand-write `{ blocks: [] }` JSON — no drag-and-drop.
- The user CV editor (`apps/app/app/cv/[applicationId]/cv-editor.tsx`) is a form-based shadcn/ui editor that fulfills the content-editing use case but provides no visual layout feedback.

The block components and their registry (`packages/ui/src/document-blocks.tsx`) already exist and are Puck-ready: each entry exposes a `component`, `defaultProps`, and `fields` array that map directly to Puck's `ComponentConfig`. A migration is needed, not a rewrite.

## Decision

Install `@measured-co/puck` in `packages/ui` and integrate it at both surfaces as described below.

### 1. Package installation

```
pnpm add @measured-co/puck --filter @cvforge/ui
```

Puck is a peer of React 18 and has no server-side rendering support for its editor shell — the `<Puck>` component must always be rendered in a `"use client"` context. The `<Render>` component is SSR-safe and will be used for read-only surfaces (mobile preview, Puppeteer PDF rendering).

### 2. JSON format — adopt Puck's native `Data` type

The current `TemplateRecord.layout` uses `{ blocks: [] }` which is an internal approximation. Going forward the canonical format is Puck's own:

```ts
// Puck Data type (simplified)
{
  content: Array<{ type: string; props: Record<string, unknown> }>;
  root: { props: Record<string, unknown> };
}
```

A one-time migration script must be written before the Puck stories are merged to convert existing seeded templates from `{ blocks: [] }` to `{ content: [], root: { props: {} } }`. The `TemplateRecord` type in `packages/types` will be updated to use `import('@measured-co/puck').Data` as the type for `layout`.

### 3. Block registry → Puck ComponentConfig

The existing `documentBlockRegistry` entries already carry `component`, `defaultProps`, and `fields`. Each entry maps to a Puck `ComponentConfig` with text fields auto-derived from the `fields` array. A thin adapter function `toPuckConfig(registry)` will be added to `packages/ui` and exported alongside the registry.

```ts
// packages/ui/src/puck-config.ts
export function toPuckConfig(registry: typeof documentBlockRegistry, kind: TemplateKind) {
  // returns Puck Config with components filtered by templateKinds
}
```

### 4. Admin surface — full Puck drag-and-drop editor

Replace the raw JSON textarea with a `<PuckTemplateEditor>` Client Component exported from `packages/ui`. The component:
- Receives the current Puck `Data` and a `TemplateKind`
- Renders `<Puck config={toPuckConfig(documentBlockRegistry, kind)} data={initialData} onPublish={onSave} />`
- Calls a `PUT /templates/:id` endpoint on publish (replacing the current form POST)
- Is loaded via `next/dynamic` with `ssr: false` to avoid the SSR constraint

The admin page becomes a Server Component that fetches the template and passes data down; the editor panel becomes the `<PuckTemplateEditor>` Client Component.

### 5. User surface — Puck in content-locked mode

Replace `<CvEditor>` with a `<PuckCvEditor>` Client Component. The user edits content (text, dates, bullet points) but cannot add, remove, or reorder blocks — the layout structure is fixed by the chosen template. Puck supports this via the `permissions` API:

```ts
<Puck
  config={toPuckConfig(documentBlockRegistry, "cv")}
  data={cvData}
  permissions={{ delete: false, drag: false, duplicate: false, insert: false }}
  onPublish={onSave}
/>
```

For mobile, the existing `<CvDocumentPreview>` using `<Render>` from Puck replaces the current preview component.

### 6. Puppeteer PDF rendering

The Puppeteer service renders a standalone Next.js route (`/cv/:id/print`) that uses Puck's `<Render>` (SSR-safe) to produce the document HTML. This route is not accessible to end users and accepts an auth token from the API service. No changes to the Puppeteer service itself are needed.

## Consequences

- **Admin**: drag-and-drop template authoring replaces the textarea. The admin can visually compose layouts from the existing block palette without knowing the JSON structure.
- **User**: the CV editing experience becomes visually faithful — edits reflect immediately in the document layout, eliminating the split panel approximation of the current form editor.
- **Uniformity**: both surfaces use the same block registry, the same Puck config adapter, and the same Puck `Data` JSON stored in PostgreSQL. There is one source of truth for layout structure.
- **Migration required**: existing template JSON in the database and in seed files must be converted to Puck's `Data` format before these stories ship. This is a one-time script, not an ongoing concern.
- **Bundle size**: `@measured-co/puck` adds ~120 kB gzipped to the client bundle. It is loaded only on the admin template editor and user CV editor routes — not on the dashboard, landing, or any other page.
- **SSR constraint**: `<Puck>` (editor) cannot run server-side. `<Render>` (read-only) is SSR-safe. Both routes that embed the editor must use `next/dynamic` with `ssr: false`.

## Alternatives considered

- **Keep the current form editor and textarea as permanent MVP surfaces**: rejected because it violates the core product promise (visual CV editing) and forces the admin to hand-write layout JSON indefinitely, which is not a viable authoring workflow.
- **Build a custom drag-and-drop editor from scratch**: rejected — high complexity, high maintenance, no benefit over adopting Puck which was designed for exactly this use case and whose data format the codebase already approximates.
- **Use a different editor (e.g., GrapeJS, TipTap, Lexical)**: rejected — Puck is block-based and React-native, which aligns with the existing component model. The others target rich-text or HTML editing, not structured block layouts.


---

# ADR-004: Use Mammoth for DOCX text extraction during CV import

Date: 2026-04-23
Status: accepted

## Context

`US-038` adds import of an existing CV to prefill a base profile. The API must extract text before sending a pseudonymised payload to OpenRouter. The repository had no DOCX text extraction dependency.

## Decision

Add `mammoth` to `@cvforge/api` and use `mammoth.extractRawText()` for DOCX imports. PDF imports are accepted through the same upload path and handled with a conservative built-in text-layer heuristic until a dedicated PDF/OCR parser is justified.

## Consequences

- DOCX imports get a maintained parser without adding a larger document-conversion stack.
- PDF quality is explicitly limited: image-only PDFs, compressed streams, tables, and multi-column layouts may require manual correction.
- The OpenRouter prompt receives only pseudonymised extracted text; direct identifiers are stripped before the IA call.

## Alternatives Considered

- Add a full PDF/OCR stack now: rejected for this sprint because it would add heavier dependencies and storage/processing concerns not required to expose the V1.1 import flow.
- Send the raw file to the IA model: rejected because the vision requires pseudonymisation before IA calls.
- DOCX-only import: rejected because the acceptance criteria and vision mention PDF or DOCX upload.


---

# ADR-005: Use docx for DOCX document export
Date: 2026-04-23
Status: accepted

## Context

`US-039` requires DOCX export for generated and edited CV/LM documents. The
repository already has PDF export through a Browserless/Puppeteer boundary, but
DOCX needs a native OpenXML package because Node does not provide a built-in DOCX
writer.

## Decision

Add `docx` to `@cvforge/api` and generate DOCX files server-side from the
normalized `CVDocumentContent` and `LetterDocumentContent` contracts. The app
keeps thin authenticated proxy routes, matching the existing PDF export shape.

## Consequences

- DOCX export stays behind the API authorization boundary.
- The exported file is generated from the same structured content used by PDF
  export and editor previews.
- The first DOCX layout is intentionally conservative and ATS-readable.
- Future template-specific DOCX styling can extend the same exporter without
  changing the public routes.

## Alternatives considered

- Hand-roll OpenXML/ZIP generation: rejected because it is fragile and hard to
  maintain.
- Convert rendered HTML to DOCX: rejected for MVP because it adds less control
  over ATS-friendly document structure.


---

# ADR-006: Use pdfjs-dist for PDF offer import with Mistral vision fallback
Date: 2026-05-07
Status: accepted

## Context

`US-052` (V2.0) requires an import path for PDF job offers as a fallback when URL
scraping fails. The candidature ingestion pipeline already supports URL scraping
and manual textarea (landed in `US-019`). PDF import was explicitly deferred from
MVP in `US-019` because no safe file-ingestion path existed at the time.

The backend already uses Mistral Small 4 (multimodal/vision) and has a PDF
rasterisation pipeline for CV/document processing. MinIO is available for file
storage. BullMQ handles async jobs.

Two constraints from the vision must be respected:
- §15: no personally identifiable data from the candidate must be sent to the
  Mistral API.
- §15.4: PDF files must not be retained beyond their processing window.

## Decision

Implement a hybrid extraction strategy in a new BullMQ job `pdf-extract`:

1. **Primary path — local extraction** via `pdfjs-dist`: parse the text layer of
   the PDF without any external API call. Free, RGPD-safe by design.
2. **Fallback path — Mistral vision**: if local extraction yields fewer than 100
   tokens (scanned/image-only PDF), rasterise each page and send to Mistral Small
   4 for OCR-style extraction. The PDF at this point contains only job offer text
   — no candidate personal data.

Flow:
```
POST /candidatures/:id/offer-pdf
  → validate (max 5 MB, PDF mime)
  → upload to MinIO (temp key, TTL 10 min)
  → enqueue BullMQ job pdf-extract
  → job: extractTextLocal() → if tokens >= 100 → done
                             → else → rasterize → Mistral vision → done
  → store result in candidature.offerRawText
  → delete MinIO object immediately after extraction
```

Add `pdfjs-dist` to `@cvforge/api`. No frontend dependency.

## Consequences

- RGPD-safe: the PDF is never retained; MinIO object is deleted in the same job
  run that reads it.
- Works for both native-text PDFs (primary) and scanned PDFs (fallback).
- Reuses the existing Mistral and BullMQ infrastructure — no new runtime.
- The 5 MB / 50-page cap prevents abuse and keeps Mistral token costs negligible
  (< €0.01 per document).
- `pdfjs-dist` is a well-maintained Mozilla project with no transitive security
  concerns for server-side use.

## Alternatives considered

- **pdf-parse**: smaller API but relies on `pdfjs-dist` internally and is less
  maintained; rejected in favour of the canonical upstream package.
- **Mistral vision only (no local extraction)**: rejected because it transmits
  all PDFs externally and fails the §15 RGPD constraint for PDFs that contain
  any candidate context.
- **Textract / AWS**: rejected as it introduces a cloud vendor dependency
  inconsistent with the self-hosted EU data residency principle.


---

# ADR-007: Add OAuth2 social login (Google + LinkedIn) via Passport.js
Date: 2026-05-07
Status: accepted

## Context

`US-052` (V2.0) requires evaluating Google and LinkedIn social login as a
complement to the passwordless magic-link system introduced in `US-009`. The
vision §3.1 explicitly defers social login to V2 and requires the passwordless
path to remain available.

The backend is NestJS and already uses Passport.js (`passport-jwt`) for JWT
validation. The frontend is Next.js. Auth state is managed server-side via
signed session cookies.

Two hard constraints apply:
- §3.1: passwordless must remain available; social login is additive, not a
  replacement.
- §15 / RGPD: transfers to Google (US) and Microsoft/LinkedIn (US) require
  Standard Contractual Clauses (SCC); a token revocation endpoint is mandatory
  to support the right to erasure.

## Decision

Add `passport-google-oauth20` and `passport-linkedin-oauth2` to `@cvforge/api`.
OAuth flows are initiated and handled entirely in the NestJS backend; the Next.js
app redirects to `/auth/google` and `/auth/linkedin` and receives a session cookie
on callback — the same shape as the existing magic-link session flow.

Security requirements (non-negotiable):
- **PKCE** (code_challenge / code_verifier) for Google OAuth2.
- **Minimal scopes**: Google → `email profile`; LinkedIn → `r_emailaddress r_liteprofile` only.
- **Session regeneration** after OAuth callback to prevent session fixation.
- **Account linkage**: if an account with the same email already exists
  (passwordless or other provider), link automatically and do not create a
  duplicate. If no match, create a new account.
- **Token revocation endpoint**: `DELETE /auth/social/:provider/revoke` — required
  before production deployment to satisfy GDPR right to erasure.

Privacy policy update required at the same time:
- Disclose that Google LLC and Microsoft (LinkedIn) receive the user's email
  address during sign-in.
- Reference the SCC basis for US data transfer.

## Consequences

- One auth boundary (NestJS Passport) handles all strategies: JWT, magic-link,
  Google OAuth2, LinkedIn OAuth2.
- The Next.js app remains a thin consumer of the session cookie — no auth logic
  added to the frontend.
- PKCE and scope minimisation reduce the OAuth attack surface to the minimum
  required by the product.
- The revocation endpoint is a hard prerequisite for go-live; it must be
  implemented in the same story as the OAuth strategies.
- Future providers (GitHub, Apple) can be added as additional Passport strategies
  without changing the session contract.

## Alternatives considered

- **Auth.js (next-auth v5)**: designed for Next.js only; would require duplicating
  session management across Next.js and NestJS, breaking the single-backend auth
  boundary established in `US-009`. Rejected.
- **Independent OAuth library (openid-client)**: more control but requires
  hand-rolling session integration already covered by Passport guards. Rejected for
  MVP complexity.
- **Google only, no LinkedIn**: LinkedIn is cited explicitly in vision §3.1 and
  §16; deferring it adds a future ADR with no architectural benefit. Rejected.


---

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
- Next.js 16 differs from Next 15 used by `apps/app`/`apps/landing` (`proxy.ts` instead of middleware, async request APIs, `PageProps` globals via `next typegen`). Agents must read `apps/web/node_modules/next/dist/docs/` before changing it (see `apps/web/AGENTS.md`).
- `apps/web` uses ESLint 9 with `eslint-config-next` 16 in its own flat config, independent of the root config.
- Interview practice and template administration are intentionally not exposed in v2.

## Alternatives considered
- Refactor `apps/app` in place: rejected, the mobile-first structure and shared CSS layer leak into every screen.
- Tailwind v3 / Next 15 to match the other apps: rejected, the current shadcn CLI and blocks target Tailwind v4, and pinning older versions would fight the templates.
- A new API with Prisma/Postgres: rejected for this iteration, the existing API already covers the domain.
