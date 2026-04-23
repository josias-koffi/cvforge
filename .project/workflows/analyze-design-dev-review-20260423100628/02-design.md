# Design — US-038

UI design:

- Add a new import card at the top of `/profile` with a file input restricted to `.pdf,.docx`.
- Keep the interaction server-backed and simple: choose file, submit, receive extracted fields, then explicitly merge them into the active profile.
- Show a compact quality note under the form: scan quality, multi-column layouts, tables, icons, and image-only PDFs may require manual correction.

Accessibility:

- Use a labeled native file input and a standard submit button.
- Return extraction feedback inline in a bordered status panel.
- Keep the imported-field summary text-based so it remains readable on mobile and screen readers.

Non-UI architecture decision:

- API accepts multipart upload, extracts raw text from `DOCX` and `PDF`, pseudonymises the extracted candidate payload before the OpenRouter call, and returns a normalized base-profile patch plus quality notes.
- The app route proxies the upload to the API and redirects back to `/profile` with a signed result payload stored in session storage.

Pass verdict: the design fits the analyzed scope and keeps the UX honest about extraction limits.
