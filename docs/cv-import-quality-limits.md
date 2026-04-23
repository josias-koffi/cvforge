# CV Import Quality Limits

`US-038` exposes PDF/DOCX CV import to prefill the active base profile. The import is assistance, not an authoritative source.

## Supported Inputs

- DOCX files are parsed server-side with `mammoth`.
- PDF files are accepted when they expose a usable text layer.
- Files must be under 5 MB.

## Known Limits

- Image-only or scanned PDFs may not contain enough extractable text.
- Multi-column layouts, tables, icons, charts, and progress bars can be read in the wrong order.
- Dates, language levels, skill groupings, and certification metadata require manual review.
- Direct identifiers detected before the IA call are removed, so last name, phone, email, exact address, and birth date must be maintained locally by the user.

## Privacy Rule

The API strips directly identifying data before calling OpenRouter and instructs the model not to reconstruct it. The returned patch only contains professional profile fields. The user must validate and correct the imported data before relying on it.
