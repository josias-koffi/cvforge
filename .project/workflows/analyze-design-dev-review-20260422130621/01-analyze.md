US-034 stays inside vision `§13.3` and roadmap `§16`: complete the admin templates panel with visible analytics, CSV export, and the remaining operational tooling around the existing template management flow. The current code already covered create, edit, duplicate, activate/deactivate, default selection, delete, and live preview, so the missing product gap was observability and exportability.

Acceptance criteria are testable as:
1. Admin page shows template analytics, including top templates and generation volume.
2. Admin can trigger a CSV export of template admin data.
3. Panel remains operationally complete after the additions, with no regression in existing template actions.

No product blocker remains. The only implementation nuance is that “top templates” must come from persisted usage, not a static placeholder, so engineering should add minimal template-usage tracking to generated CV/LM flows.
