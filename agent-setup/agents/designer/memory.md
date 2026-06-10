<!-- generated-by: /init-project -->
<!-- vars: ROLE_TITLE, STACK, ARCHITECTURE_STYLE, TODAY_ISO -->

# Memory — Designer

> Append-only journal. Most recent entry at the bottom.
> Every agent action writes here per the memory protocol in CLAUDE.md.

## 2026-04-18 — init

- **Did**: Initialised agent definition and empty memory.
- **Why**: Project bootstrap.
- **Learned**: Stack detected as node. Architecture: monorepo (source: vision §2).
- **Open**: See `.project/state.json > clarifications_pending`.

## 2026-04-19 — US-006

- **Did**: Defined the first "Papier & Crayon" token set and documented a mobile-first base shell using centralized palette, typography, and spacing roles.
- **Why**: Sprint `US-006` required the visual foundations to exist before component-library customization work can start.
- **Learned**: A shared token file plus CSS custom properties is enough to propagate the art direction across both Next apps without adding new tooling.
- **Open**: Later stories should extend the token usage into forms, navigation, and the authenticated dashboard shell.

## 2026-04-19 — US-007

- **Did**: Specified the first reusable primitive set and aligned it with the existing "Papier & Crayon" token layer through a shared style injector and mobile-first surface rules.
- **Why**: The component library needed a concrete visual and accessibility brief before implementation.
- **Learned**: The token system is flexible enough to support shadcn-style primitives without introducing app-local visual drift.
- **Open**: Navigation and dashboard stories should reuse the same card, button, and form primitives rather than inventing new patterns.

## 2026-04-19 — US-008

- **Did**: Specified a dual-mode navigation shell with a mobile bottom bar, a `lg` desktop sidebar, and semantic nav landmarks that preserve the existing "Papier & Crayon" feel.
- **Why**: The sprint story required a responsive navigation system that works across the current Next apps without fragmenting the shared UI language.
- **Learned**: The existing token system already provides enough structure for both compact mobile navigation and a richer desktop sidebar treatment.
- **Open**: Future authenticated screens should inject task-specific content into this shell instead of forking the layout.

## 2026-04-19 — smtp backend setup

- **Did**: Reviewed the SMTP setup task and explicitly marked the design stage as a non-UI skip while documenting the intended infrastructure shape.
- **Why**: The workflow requires a design-stage artifact even when the requested work does not affect user-facing experience.
- **Learned**: The current email setup request is purely backend infrastructure and does not create any new UX or accessibility surface yet.
- **Open**: A later email-auth or notifications story may need actual user-facing copy and delivery-state UX.

## 2026-04-19 — US-009

- **Did**: Specified a minimal three-step passwordless flow covering login request, generated-link preview, and post-consumption session verification, while keeping the UI intentionally narrow.
- **Why**: The sprint story needed enough UX to prove the auth flow end to end without inventing later dashboard, admin, or invitation surfaces.
- **Learned**: A compact flow with explicit copy about the temporary link-preview behavior is enough to validate the auth contract and remain honest about current delivery capabilities.
- **Open**: A future story should replace the preview step with real email delivery status once the SMTP-backed mailer exists.

## 2026-04-19 — US-010

- **Did**: Reviewed the first-admin bootstrap story and explicitly recorded the design stage as a non-UI skip with a backend-only technical shape.
- **Why**: The workflow still requires a design artifact even when the requested change does not alter any user-facing surface.
- **Learned**: The current passwordless flow can absorb one-time admin bootstrap rules without any new screen, copy, or accessibility work.
- **Open**: Admin invitation and route-protection stories may create the first actual admin-facing UX surfaces.

## 2026-04-20 — US-011

- **Did**: Specified a dedicated invitation acceptance page that exposes the invited email, role, expiry, and a single acceptance action while explicitly skipping the not-yet-built admin panel UI.
- **Why**: The story needed one consumable user-facing surface so the invitation link could work end to end without inventing future admin screens.
- **Learned**: A minimal invitation page is enough to satisfy the vision's "special registration page" requirement while staying aligned with the existing passwordless session flow.
- **Open**: The later admin-panel story should provide a proper invitation generation UI on top of this API contract.

## 2026-04-20 — US-012

- **Did**: Specified a minimal protected-route UX with the authenticated dashboard on `/`, an admin-only `/admin` surface, and a public `/forbidden` fallback for non-admin users.
- **Why**: The rerun needed a concrete route-level interaction design without prematurely designing the full admin panel.
- **Learned**: A small denial page plus server-side redirects are enough to satisfy the current authorization story while keeping the "Papier & Crayon" tone consistent.
- **Open**: The future admin panel should reuse the same denial pattern for any deeper privileged subroutes.

## 2026-04-20 — US-013

- **Did**: Specified a mobile-first five-step onboarding flow with visible progress, local resume affordance, and a final recap step that allows section-by-section correction before validation.
- **Why**: The story required a concrete UX pattern that matches the vision while fitting inside the existing authenticated shell and shared design primitives.
- **Learned**: The current `AppShell` and card primitives are sufficient for a usable wizard without inventing a second layout system.
- **Open**: `US-014` should decide how the onboarding completion state transitions into the editable base-profile screen.

## 2026-04-20 — US-014

- **Did**: Specified a protected `/profile` screen with a consultation summary, stacked editing sections, onboarding-seeded defaults, and no multi-profile controls.
- **Why**: The story needed a focused UX that satisfies the vision sections while preserving the sprint rule of a single profile in MVP.
- **Learned**: The existing shell and card system can support a fairly dense profile editor as long as the page stays vertically structured and clearly segmented.
- **Open**: Later CV-generation work should decide how this profile transitions from structured form data into the editor/template pipeline.

## 2026-04-20 — US-015

- **Did**: Marked the design stage as a non-UI data-contract task and specified a prompt-safe profile shape with explicit omission and reinjection metadata.
- **Why**: The workflow still required a design decision even though the story changes backend-facing data semantics rather than a user-facing screen.
- **Learned**: A pure helper contract is the least risky way to encode RGPD prompt rules now because it can be reused by future CV, letter, and interview flows without UI duplication.
- **Open**: Later AI surfaces should expose only explanatory copy if users need visibility into what data is withheld from prompts.

## 2026-04-20 — US-016

- **Did**: Specified mandatory consent checkboxes and inline error feedback on both signup surfaces, plus invisible data guardrails for URLs, phone numbers, dates, and bounded text inputs.
- **Why**: The story needed a minimal UX that makes consent explicit without adding new screens, while keeping the data-entry experience safe for the current MVP.
- **Learned**: The existing auth pages can absorb RGPD consent and validation affordances with small copy and form changes instead of a new registration flow.
- **Open**: The future legal copy should replace the placeholder wording once the real CGU and privacy policy are written in sprint `009`.

## 2026-04-20 — US-017

- **Did**: Marked the design stage as a non-UI skip; provided architecture notes for the developer on module layout and the RGPD invariant payload shape.
- **Why**: The story is pure backend infrastructure with no user-facing surface.
- **Learned**: Infrastructure stories still benefit from a design artifact that clarifies the API contract for the developer handoff, even when no screen or interaction is involved.
- **Open**: Future AI features that build on `OpenRouterService` may need UX for loading states, error feedback, and credit consumption affordances.

## 2026-04-20 — US-018

- **Did**: Specified a protected `/candidatures` import screen with a single URL field, deterministic success and error states, and vertically structured draft cards for the extracted offer data.
- **Why**: The story needed a concrete UX shape that supports offer ingestion now without inventing the later full pipeline table, filters, or editor workflow.
- **Learned**: A server-rendered submit/redirect pattern is enough for this MVP slice and avoids unnecessary client-state complexity while preserving accessibility.
- **Open**: The later candidature pipeline story should decide when this page evolves from draft-creation flow into the full list/table management screen from the vision.

## 2026-04-20 — US-019

- **Did**: Extended the `/candidatures` UX with a labeled pasted-text fallback beneath the URL import and documented the PDF MVP deferral as static explanatory copy.
- **Why**: The workflow needed a usable fallback without hiding options behind tabs or inventing a misleading PDF-upload surface.
- **Learned**: The current card layout can support two ingestion modes clearly as long as they are framed as alternatives to the same draft-creation action.
- **Open**: The future PDF story should decide whether the UX starts from upload-first, drag-and-drop, or a more guided import step.

## 2026-04-20 — US-020

- **Did**: Defined a status-management UX on `/candidatures` with badge-like current-state display, only-valid next-transition buttons, visible timestamped history, and KPI cards reused by `/dashboard`.
- **Why**: The workflow needed a concrete interaction pattern that exposes the candidature pipeline clearly without pretending the full fiche candidature or chart suite already exists.
- **Learned**: Rendering only the allowed next transitions keeps the MVP comprehensible and prevents the UI from drifting away from the enforced business rules.
- **Open**: A later dashboard story can replace the simple KPI cards with richer charts without changing the underlying status contract.

## 2026-04-20 — US-021

- **Did**: Produced a component-level design brief for the new CV/LM document blocks, centered on print-safe semantic structure and a shared registry for future admin and user surfaces.
- **Why**: The workflow still required an explicit design decision even though this story delivers reusable blocks more than a new screen.
- **Learned**: The "Papier & Crayon" direction is best preserved here with restrained document styling so later templates can still differentiate visually.
- **Open**: `US-024` should decide how preview data and live rendering layer on top of this shared block registry.

## 2026-04-20 — US-023 design

- **Did**: Designed the inline action surface on template cards (toggle, default badge, category pills, delete with confirm), the predefined category suggestion system, and a pill-style filter bar — all staying in the "Registre comptable" admin aesthetic from the vision.
- **Why**: The workflow required a concrete UX specification before implementation so the developer had explicit interaction targets.
- **Learned**: The existing card primitives are sufficient for dense admin actions when action buttons are small (0.8rem, ghost variant) and grouped below the card metadata.
- **Open**: The `window.confirm` delete pattern should be replaced by a proper `AlertDialog` client component when more interactive patterns are introduced in US-024 or later.

## 2026-04-20 — US-022 design

- **Did**: Designed a two-pane admin templates studio with a library sidebar, create/edit forms, and a live preview rendered from the shared block registry.
- **Why**: The sprint needed an admin UX that could create and modify templates without introducing a new editor framework.
- **Learned**: A Puck-compatible JSON editor is sufficient for the MVP as long as the preview and storage contract stay explicit.
- **Open**: Full drag-and-drop layout authoring can wait until the product commits to a dedicated Puck integration.

## 2026-04-20 — US-025 design

- **Did**: Specified two surfaces: a "Générer le CV" client button on candidature cards and a `/cv/[applicationId]` render page with A4-style centered layout using EB Garamond typography and the existing document block components.
- **Why**: The story needed minimal UI to trigger generation and display the result, without prematurely designing the WYSIWYG editor (US-026).
- **Learned**: The "feuille de travail" aesthetic from the vision maps directly to the document page: white card on ivory, serif font, section dividers — no new design tokens needed.
- **Open**: US-026 should overlay the Puck editor on top of this same render surface for the WYSIWYG editing flow.

## 2026-04-20 — US-028 design

- **Did**: Specified the mirrored LM surfaces: a candidature-card generation action and a `/letters/[applicationId]` ATS letter page built from `LMHeader`, `LMBody`, and `LMSignature`.
- **Why**: The workflow needed a concrete UX brief so the LM feature would stay visually aligned with the existing document flow and not invent a separate interface language.
- **Learned**: The current "Papier & Crayon" document treatment works for letters with an even narrower structure than the CV, which keeps the MVP readable and print-safe.
- **Open**: A future Puck migration should replace the structured LM editor with the same WYSIWYG environment promised by the vision.

## 2026-04-20 — US-055 design

- **Did**: Marked the design stage as a non-UI skip and produced the technical contract specification for `toPuckConfig()`, the `PuckData` type shape, `normalizeLayout()` update, and the migration script interface.
- **Why**: US-055 is pure infrastructure; no user-facing surface is introduced.
- **Learned**: Even for infrastructure stories, a design artifact that clarifies the API contract (types, function signatures, migration script behavior) prevents developer ambiguity and avoids re-work.
- **Open**: US-056 will be the first story with an actual Puck UI surface — the `<PuckTemplateEditor>` Client Component.

## 2026-04-21 — Sprint 008 DoD

- **Did**: Reviewed the sprint-close request and explicitly kept the design stage as a non-UI skip because the work was limited to verification and bookkeeping.
- **Why**: The workflow still needs a design-stage decision even when no new interface or interaction is being introduced.
- **Learned**: Sprint closure reviews should not silently imply design approval beyond what the underlying task reviews already covered.
- **Open**: None for design; the remaining blockers are engineering gates.

## 2026-04-21 — Sprint 008 DoD retry

- **Did**: Reconfirmed the non-UI skip for the successful sprint-close rerun after the coverage fixes landed.
- **Why**: The retry still required an explicit design-stage decision even though the work remained purely verification-focused.
- **Learned**: Quality-gate recovery work can close a sprint without reopening any product or UX scope.
- **Open**: None.

## 2026-04-21 — US-029 design

- **Did**: Marked the design stage as a non-UI skip and documented the API-first credit-ledger contract for future user/admin surfaces.
- **Why**: US-029 introduces backend ledger behavior and read/write endpoints, but the first actual credits page is explicitly deferred to US-031.
- **Learned**: Defining user and admin credit endpoints now reduces UX ambiguity later because the upcoming "Mes credits" page and admin user sheet can both consume the same summary shape.
- **Open**: US-031 should decide the exact low-balance alert presentation on top of the new `lowBalanceThreshold` and `isLowBalance` fields.

## 2026-04-21 — US-030 design

- **Did**: Specified a minimal dashboard purchase section plus a thin Next checkout route, while keeping the billing logic API-first and the future full credits page out of scope.
- **Why**: The story needed one usable purchase entry point now without pre-empting the broader "Mes credits" UI planned in US-031.
- **Learned**: Native POST forms are enough for this payment entry point because Stripe-hosted checkout already owns the complex payment interaction; the product only needs clear pre-checkout package choice and post-return status messaging.
- **Open**: US-031 should decide where the persistent "Acheter des credits" CTA lives once the credits page itself exists.

## 2026-04-22 — US-031 design

- **Did**: Designed `/credits` as a first-class authenticated page with a low-balance alert, summary cards, a visual gauge, Stripe recharge cards, and a readable ledger timeline, plus a dashboard link to reach it directly.
- **Why**: The story needed a concrete page-level UX so the credits ledger became understandable to end users instead of remaining an API and dashboard checkout primitive only.
- **Learned**: The current shell and card primitives are enough to deliver the credits experience cleanly without adding a separate billing layout or charting dependency.
- **Open**: US-032 should decide whether the dashboard itself should surface the current balance as a KPI tile now that the dedicated page exists.

## 2026-04-22 — US-033 design

- **Did**: Designed `/admin` as a mobile-tolerant users register with summary cards, a labeled filter bar, user cards exposing activity and latest manual grant details, and an inline mandatory-note credit form.
- **Why**: The admin route already existed, but the story needed a concrete UX that made user filtering and manual credit logging visible without inventing a second admin shell.
- **Learned**: The existing shell and card primitives are sufficient for a "registre comptable" admin surface as long as dense data is split into small factual cards instead of a desktop-only table.
- **Open**: A later user-detail story can expand each card into a full fiche utilisateur with candidatures and deeper activity history.

## 2026-04-22 — US-034 design

- **Did**: Extended the existing `/admin/templates` layout with a compact analytics card, KPI tiles, a top-templates list, and a visible CSV export action while preserving the current library/editor split.
- **Why**: The story needed observable admin value without introducing a second template dashboard or disrupting the working editor flow.
- **Learned**: This admin surface remains clearer when analytics stay text-first and card-based, rather than adding charts or a separate reporting page.
- **Open**: A later analytics story could add richer historical breakdowns if product scope calls for them.

## 2026-04-22 — US-035 design

## 2026-04-23 — US-036

- **Did**: Designed a profile-adjacent privacy screen with a download-first GDPR export action, exact-email confirmation for irreversible deletion, and plain-language retention cards plus an audio-purge plan block.
- **Why**: The sprint needed a usable privacy surface without inventing a separate settings shell or weakening the destructive-action safeguards.
- **Learned**: The existing shell and card primitives are sufficient for sensitive privacy flows when the language stays factual and the confirmation step is explicit.
- **Open**: If a broader account-settings area appears later, this privacy screen can become one section within it without redesigning the underlying interaction model.

- **Did**: Designed the notification entry as a bell pill in the shared shell header and specified `/notifications` as an unread-first feed with explicit read/unread badges and direct candidature links.
- **Why**: The story needed a visible, reusable notification pattern that works across authenticated pages without inventing a second shell or modal system.
- **Learned**: The current shell can absorb notification affordances cleanly when the bell lives in the hero topline and the center stays card-based and text-first.
- **Open**: Later notification stories can add interview or low-credit items on top of the same feed without changing this entry pattern.

## 2026-04-23 — US-037 design

- **Did**: Designed `/profile` as a multi-profile workspace with switchable profile cards and kept `/candidatures` on a lightweight per-application selector instead of introducing a new settings surface.
- **Why**: The story needed explicit interaction rules for switching socles without destabilizing the existing long-form profile editor.
- **Learned**: The current card and form primitives are sufficient for multi-profile management when the active profile remains the only editable pane.
- **Open**: A future refinement could add duplication or archiving patterns if users accumulate many profiles.

## 2026-04-23 — US-038 design

- **Did**: Designed a `/profile` CV import card with native file input, inline status feedback, explicit quality-limit copy, and a user-controlled apply step.
- **Why**: Imported CV data must remain reviewable before it changes the active base profile.
- **Learned**: The existing profile page can host the import flow without adding a new route-level IA workspace.
- **Open**: A future OCR-quality improvement may need a richer preview/diff UI.

## 2026-04-23 — US-039 design

- **Did**: Added DOCX as a sibling download action on CV/LM editor pages and specified compact version-history cards.
- **Why**: The export and history controls belong where users already edit and review documents.
- **Learned**: An ordered history list is enough for auditability now without designing compare or restore flows outside the story scope.
- **Open**: Template-specific DOCX styling can be refined later if visual fidelity becomes a product requirement.

## 2026-04-24 — US-041 design

- **Did**: Added a compact "Preferences email" card to `/notifications` with native checkbox controls, provider status, and one save action.
- **Why**: Users need one obvious place to both read notifications and configure email delivery per type, matching vision `§14.2` and `§14.3`.
- **Learned**: The existing notification center can absorb settings cleanly without introducing a separate account-settings information architecture.
- **Open**: If more email-capable notification types arrive later, the same card can scale into grouped preference sections.

## 2026-04-24 — US-043 design

- **Did**: Designed the dashboard share section as a responsive two-column card with a live SVG preview, one download action, one native-share action, and one LinkedIn offsite share link.
- **Why**: Vision `§12.5` calls for social sharing, but the solution needed to stay inside the existing "Papier & Crayon" visual system and work on mobile and desktop.
- **Learned**: SVG is the right artifact for this MVP because it stays crisp, requires no extra backend service, and can still be posted manually when LinkedIn cannot preview a private dashboard route.
- **Open**: If later product scope requires richer public sharing pages, the card can become the visual asset for that future public route.

## 2026-04-24 — US-044 design

- **Did**: Designed `/interview` as a minimal two-card workspace with explicit state badges, start/stop/reset controls, resumable transcript display, and chunk-level incident feedback.
- **Why**: The story needed a usable shell for progressive STT evidence without prematurely designing VAD animations or the later voice-output experience.
- **Learned**: The existing shell and card primitives are sufficient for a real-time audio MVP when the status language is explicit and the transcript stays central.
- **Open**: `US-046` should add speaking/thinking feedback on top of this same workspace instead of replacing it.

## 2026-04-24 — US-046

- **Did**: Designed VAD and "Thinking" feedback as inline badge-row augmentations: an animated pulse ring mic indicator with aria-live and a slim RMS bar for recording, and an amber spinning ⟳ "Thinking…" badge for AI generation.
- **Why**: The story required visible state feedback without adding a new card or disrupting the existing minimal layout.
- **Learned**: CSS `@keyframes` animation on badge-level elements is enough to convey dynamic audio activity without canvas or WebGL; the existing "Papier & Crayon" palette has enough contrast room for both the green mic and amber thinking colors.
- **Open**: US-047 may need a latency-visible indicator (e.g., a timestamp or timer badge) if perceived-latency measurement requires user-observable checkpoints.

## 2026-04-26 — US-048 design

- **Did**: Extended the existing `/interview` control row with recruiter-profile selection, profile helper copy, a visible active-profile badge, and a dedicated completion action that preserves transcript context while closing the session cleanly.
- **Why**: The story needed the missing recruiter persona choice and a clearer end-state without replacing the already valid three-card interview workspace.
- **Learned**: Locking language/profile once a session exists keeps the scenario coherent and avoids mid-session semantic drift.
- **Open**: US-049 can reuse the completed-session state to anchor the future report CTA and score display.

## 2026-04-26 — US-049 design

- **Did**: Added candidature selection as a prerequisite to starting an interview and designed a dedicated post-session report card inside the existing interview workspace.
- **Why**: The report only makes sense if its ownership is explicit, and the dashboard story depends on candidature-linked scores rather than anonymous practice sessions.
- **Learned**: Reusing the current three-card workspace was the right move; the missing UX element was traceability to a candidature plus a readable score summary after completion.
- **Open**: Free-practice mode should become a separate branch of the same workspace in `US-050`, not a hidden bypass of candidature-linked interviews.

## 2026-04-26 — US-050 design

- **Did**: Designed audio replay `<audio controls>` in the report card (transient Object URL, WCAG-compliant native element), updated candidature selector with free-practice default option, and kept pre-generation and purge as invisible features.
- **Why**: Audio replay and free-practice are the only user-visible changes; the rest are backend or infrastructure.
- **Learned**: Native `<audio controls>` is the correct MVP approach — no custom player library needed, WCAG AA compliance is automatic.
- **Open**: If product later requires waveform visualization or chapter markers, a custom player would be needed.

## 2026-04-26 — UX Redesign desktop-first (E15)

- **Did**: Produced a full desktop-first UX redesign spec covering: shadcn-minimal design direction, new screen architecture (11 screens), sidebar navigation, candidature table with filters, candidature detail with tabs, interview setup screen, VAD-driven interview studio (no push-to-talk), interview report screen, documents hub, structured form document editor (Puck admin-only full-screen), dashboard simplification, and the agent continuity fix contract.
- **Why**: The current mobile-first app was identified as producing poor UX; primary use case is desktop; too much information density; interview mode was button-per-turn; Puck was misplaced for users; no intermediate screens.
- **Learned**: The VAD-driven approach removes push-to-talk entirely — this is a behavior removal, not just an addition, and requires developer awareness. The Puck-for-users replacement with a structured form conflicts with vision §8 and needs explicit product owner confirmation before Sprint 018.
- **Open**: Confirm US-068 product decision (structured form vs Puck for user document editor). Confirm whether "Papier & Crayon" tokens are fully replaced or kept for print surfaces (CV/LM PDF).

## 2026-05-07 — US-062

- **Did**: Designed the `/candidatures/[id]` detail screen with a two-block layout: header card (title, company, status badge, date) + tabbed card (5 tabs: Offre, CV, LM, Interviews, Historique). Specified roving tabindex keyboard pattern, `display:none` inactive panels, and status timeline UI.
- **Why**: Sprint 016 — complete the candidature detail screen after the table and sidebar work were already shipped.
- **Learned**: All panels must be rendered in the DOM (hidden via CSS) to be testable with `renderToStaticMarkup`; conditional rendering blocks SSR testing of inactive tabs.
- **Open**: CV/LM tabs link to `/cv/[id]` and `/letters/[id]` editors — the Puck editor flow is unchanged.

## 2026-04-26 — US-060

- **Did**: Specified the desktop-first navigation architecture: 240px fixed sidebar at ≥1024px, mobile drawer slide-in with hamburger at <768px, top bar with breadcrumb + avatar + notification bell, role-gated Admin item, focus rings meeting WCAG 2.1 AA on all interactive elements.
- **Why**: Sprint 016 E15 redesign — primary use case is desktop; the old mobile-first bottom-bar nav was a UX regression.
- **Learned**: The 768px-1023px gap shows the hamburger until ≥768px where it hides. The topbar brand badge only shows ≥768px, giving tablet users a clean entry point.
- **Open**: None.

## 2026-06-01 — profile CRUD + border-radius (stage 02)

- **Did**: Spécifié l'architecture CRUD en 3 routes (listing table, création rapide, édition complète). Défini les nouvelles valeurs radius (sm→0.25rem, md→0.375rem, lg→0.5rem) avec justification éditorial.
- **Why**: La page profil monolithique cachait la structure multi-profils. Réduire les radius renforce le caractère éditorial "Papier & Crayon".
- **Learned**: La réduction de ~60% des border-radius donne un look sensiblement plus professionnel et moins "app mobile" sans casser le système de tokens.
- **Open**: None.

## 2026-06-03 — suivi candidature detail (stage 02 · [[workflows/runs/analyze-design-dev-review-20260603130216]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260603130216/02-design]]
- **Did**: Placé le contrôle de suivi dans l'en-tête de détail avec badge courant, select libellé et feedback discret.
- **Why**: Le changement de suivi doit rester proche du contexte candidature sans créer une nouvelle carte ou page.
- **Learned**: Quand un statut est final, un libellé "Suivi finalisé" est plus clair qu'un select désactivé.
- **Open**: None.

## 2026-06-03 — retrait Puck Editor (stage 02 · [[workflows/runs/analyze-design-dev-review-20260603145814]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260603145814/02-design]]
- **Did**: Défini un CV utilisateur par champs structurés + aperçu live et un atelier admin de blocs métier sans drag-and-drop.
- **Why**: Le besoin réel est l'édition ciblée de contenu, pas un canvas WYSIWYG lourd.
- **Learned**: Le registre de blocs partagé suffit comme source d'options admin et de rendu preview.
- **Open**: Le fichier LM reste à splitter si une prochaine évolution le touche.

## 2026-06-10 — structuration predictive des competences CV (stage 02 · [[workflows/runs/analyze-design-dev-review-20260610104253]])

- **Context**: ad hoc · [[workflows/runs/analyze-design-dev-review-20260610104253/02-design]]
- **Did**: Valide un skip UI et defini la compatibilite `category` vers `label` avec fallback plat.
- **Why**: Le rendu categorise existe deja; le risque porte sur le contrat et la conservation des donnees.
- **Learned**: La sauvegarde manuelle doit preserver les categories meme si l'editeur expose encore les listes plates.
- **Open**: None.
