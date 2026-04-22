QA verdict: ✅ pass

Acceptance criteria:
1. Paginated and filterable user list: verified by the new `GET /credits/admin/users` API query and `/admin` page rendering/tests. The page supports email search, role filtering, and previous/next pagination.
2. Manual credit assignment with mandatory note: verified by the `/admin` inline form, the Next route guard, and the existing credits service/controller validation that rejects blank notes.
3. Every manual assignment is logged: verified because all grants still flow through the shared credit ledger and the admin page now surfaces the latest manual grant note, date, and admin author per user.

Validation evidence:
- API tests/lint/build passed
- App tests/lint/build passed

Blocking findings: none.
Advisories: none for this task.
