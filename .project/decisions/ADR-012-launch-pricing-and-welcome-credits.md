# ADR-012: Launch pricing sized in applications, with welcome credits

Date: 2026-09-19
Status: superseded in part by ADR-017

> The three prices and the "pay for the applications you send" positioning
> still hold. The credit sizing below does not: once the voice interview and
> its report shipped, a complete application became 17 credits rather than 7,
> and the packs and welcome grant were resized accordingly (ADR-017).

## Context

The first packs (Starter €9.99 / 550 credits, Pro €19.99 / 1,400 credits) were placeholders. At 7 credits per complete application (offer analysis 1 + CV 3 + letter 3) they covered about 78 and 200 applications, far beyond a real job search (10 to 40 targeted applications over 1 to 3 months). New accounts started at 0 credits, so nobody could see a generated CV before paying.

A competitive review (September 2026) found that French CV builders mostly run "trial then subscription" plans (€1–3 for 7–14 days, then €20–27 every 4 weeks), with heavy reputational damage (UFC-Que Choisir threads, "hidden subscription" complaints). Newer entrants sell one-off passes (PerfectCV €29.90 / 30 days, JobzAI) or credits (CVpass), and every competitor lets people try something for free.

## Decision

- Keep the vision's pay-as-you-go model: no subscription, credits never expire. The positioning is "pay for the applications you send", the opposite of the trial-trap model.
- **Welcome credits**: every new account gets `WELCOME_CREDITS` = 16 once (a CV import + 2 complete applications). The vision (§11.1) says "no freemium". This one-off grant is a deliberate exception, approved by the product owner on 2026-09-19. It is granted from `CreditsModule` through `AuthService.onAccountCreated`, because auth cannot depend on credits (credits already imports auth). It is idempotent per email (`welcome:<email>`). Existing accounts get nothing retroactively.
- **Launch packs**, seeded by migration `0012_launch_pricing` (Starter and Pro are archived, not deleted, because past orders reference them):

  | Pack | Price | Credits | Applications |
  |---|---|---|---|
  | Essentiel | €5.90 | 40 | 5 |
  | Recherche active (featured) | €14.90 | 145 | 20 |
  | Intensif | €29.00 | 355 | 50 |

  Each pack carries fewer than 7 extra credits, so there is room for a CV import or one regeneration while the advertised count stays round.
- **Prices are shown in applications, not credits**, on the landing and in the app. `CREDITS_PER_APPLICATION` and `estimateApplications` live in `@cvforge/types`, so every surface counts the same way.

## Consequences

- After deploying, an admin must click "Synchroniser Stripe" on `/admin/offers`. The new offers have no Stripe price until then, and checkout answers 503 in the meantime.
- Welcome credits make throwaway-email sign-ups worth something. The cost is negligible (about €0.005 of AI per account). A disposable-email filter will be added if abuse shows up.
- The admin metrics' "credits granted" figure covers admin grants only. Welcome grants are a separate ledger type.
