This is an incremental admin-UX extension, not a new page paradigm. Keep the current `/admin/templates` layout and add an analytics card in the left rail so the library, filters, actions, and new metrics remain visible together.

Design decisions:
- Add compact KPI tiles for total templates, active templates, generated CVs, and generated letters.
- Add a “Top templates” list with usage counts and locale/type context.
- Expose CSV export as a visible text action near analytics, not buried in the editor.
- Preserve existing card-based template actions for duplication, activation, default, and deletion.

Accessibility/WCAG notes:
- Export stays a normal link for keyboard/screen-reader clarity.
- Metrics remain text-first; no chart dependency or color-only meaning.
- Existing action buttons remain labeled and unchanged.
