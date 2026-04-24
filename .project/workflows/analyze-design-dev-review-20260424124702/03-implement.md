# Stage 3 — Implement

Agent: developer
Verdict: passed

Implemented email-notification delivery and preference management across shared types, API services, billing integration, and the app notification center.

Key changes:

- extended shared notification types with email preference contracts and a credit-purchase notification type;
- persisted notification preferences in the existing notifications state store;
- added `NotificationsMailerService` using the current SMTP configuration and `EMAIL_FROM`;
- updated `NotificationsService` to expose preference read/update endpoints, send `J+7` follow-up emails, and report provider readiness to the UI;
- updated `BillingService` to send purchase-confirmation emails after successful Stripe crediting;
- expanded `/notifications` with an email-preferences card and added a Next route to save preferences.

Verification:

- `pnpm --filter @cvforge/api test -- notifications.service.test.ts billing.service.test.ts`
- `pnpm --filter @cvforge/app test -- notifications/page.test.tsx notifications/preferences/route.test.ts`
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/app lint`
- `pnpm --filter @cvforge/api build`
- `pnpm --filter @cvforge/app build`

All passed.
