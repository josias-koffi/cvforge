# Analyze — US-031

Verdict: pass

The scope is aligned with vision `§11.7`: the product needs a dedicated "Mes crédits" page showing the current balance, readable purchase and consumption history, a Stripe recharge entry point, and an automatic warning under 20 credits. Vision `§14.1` confirms the low-balance signal is an in-app notification concern, so the current sprint can satisfy it with a visible in-page alert without inventing the future notification center.

Current code already provides the required backend contract. `GET /credits/me` returns `balance`, `history`, `isLowBalance`, and `lowBalanceThreshold`. Stripe checkout for `Starter` and `Pro` already exists on the dashboard through `/credits/checkout`. The gap is entirely app-side: there is no `/credits` page and no navigation entry to reach one.

Acceptance criteria are testable through server-rendered page tests plus app lint/build evidence:
- visible balance on `/credits`
- readable mixed ledger history (Stripe purchase + AI debit)
- warning banner when `isLowBalance` is `true`

No product blocker remains. The implementation should reuse the ledger response as the single source of truth and avoid adding any parallel balance or payment store in the app.
