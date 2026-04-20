# Analyze

## Scope
- Admin-only management of template records for CV ATS and LM ATS.
- Seeded templates must exist so the admin can immediately edit at least one template of each kind.
- Storage should keep JSON template layouts in the API persistence layer.

## Testable Requirements
- At least one CV ATS template exists in the library.
- At least one LM ATS template exists in the library.
- An admin can create a new template from the editor surface.
- An admin can update an existing template and persist the JSON layout.

## Product Decisions
- Use the shared document block registry from `packages/ui` as the template preview/rendering source.
- Keep the current repo pattern of file-backed JSON state for the API persistence layer.
- Expose the editor as an admin-only page under `/admin/templates`.

## Open Questions
- None blocking for the MVP slice.
