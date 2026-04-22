The admin surface should behave like a compact accounting register, consistent with the vision's admin tone. `/admin` becomes the users-and-credits panel, while `/admin/templates` remains a secondary action.

Design decisions:
- Top summary cards show admin session, filtered user count, and ledger logging reminder.
- A GET filter form provides email search plus role filter (`all`, `admin`, `user`).
- Each user renders as a responsive card so the page remains usable on smaller widths without a dense desktop-only table.
- Each card shows balance, activity timestamp, consent origin/date, and the latest manual grant note/date/admin to make logging visible.
- The credit grant form lives beside each user record and requires a positive amount plus mandatory note before submission.

Accessibility notes: labeled search/filter controls, labeled numeric and note fields, and explicit success/error banners after redirects.
