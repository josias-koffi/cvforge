# ADR-031: Job alerts reach the devices through Web Push

Date: 2026-11-18
Status: accepted

Amends ADR-027 §4 bis (alerts no longer go by e-mail).

## Context

Job alerts went out by e-mail through Resend, up to 10 a day per candidate,
then grouped hourly. They used up the free sending quota, which the owner
cannot pay for yet, and a user complained they cluttered their inbox. The
owner wants the alerts in the app instead, with the browser asking the user to
turn notifications on, and kept the morning e-mail.

## Decision

- Each batch of alerts is an in-app notification (`job_alert`), always.
- Browsers that accepted it also get a **Web Push** notification: standard
  Push API, VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`), service worker `apps/web/public/sw.js`. No third-party
  push service (OneSignal, Firebase SDK): free, nothing to sign up for, and
  no candidate data leaves us except the encrypted payload.
- Library: `web-push` (MIT, the reference Node implementation). Not a
  framework: one call, `sendNotification`.
- Subscriptions in `push_subscriptions` (endpoint, keys, account), deleted on
  404/410 from the push service and with the account. Only https endpoints
  on a public host are accepted, since the API posts to them.
- At most 2 pushes a day per candidate (`JOB_ALERT_DAILY_PUSH_CAP`); past it,
  in the app only. Quiet hours 21:00–7:00 still apply.
- Without VAPID keys, push is simply not offered; alerts stay in the app.

## Consequences

- iOS only allows push to an app added to the home screen; the UI says so.
- Push is per browser: the switch on `/notifications` speaks for the device
  in use.
- The privacy policy must mention the stored push subscription (owner to
  update in `/admin/legal`).
