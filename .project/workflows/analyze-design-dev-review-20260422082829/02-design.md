# Design — US-031

Verdict: pass

This is a UI stage, not a skip. The page should live in the authenticated shell as `/credits`, with a direct nav item so it sits beside dashboard, profile, and candidatures instead of hiding behind a billing callback.

Proposed layout:
- top alert card only when the API says `isLowBalance = true`; wording must mention the remaining balance and threshold
- first row of summary cards: current balance, estimated full candidatures remaining, movement count
- balance card includes a simple visual gauge to satisfy vision `§11.7` without introducing a charting dependency
- Stripe recharge cards mirror the existing dashboard purchase UI for consistency
- history section renders each ledger entry as a readable card with date, movement amount, resulting balance, and a plain-language badge (`Achat confirme`, `Consommation IA`, `Attribution admin`)

Accessibility and UX notes:
- no color-only communication; alert and movement badges include text labels
- forms keep native submit buttons for Stripe checkout
- chronological cards remain readable on mobile because details stack vertically

Dashboard should expose a plain link to `/credits` so the page is discoverable from both the shell and the existing billing entry point.
