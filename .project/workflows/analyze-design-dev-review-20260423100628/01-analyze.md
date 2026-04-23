# Analyze — US-038

Scope confirmed from the vision:

- The feature is a base-profile prefill flow, not a candidature import flow.
- Users must be able to upload an existing CV (`PDF` or `DOCX`) and receive a prefilled base profile they can still edit before saving.
- The extraction path must apply the same pseudonymisation rules as other AI calls: never send `lastName`, `phone`, `email`, `exactAddress`, or `birthDate`; send only `firstName`, `city`, and professional content.

Implementation boundary:

- UI entry point on `/profile`, because the imported data targets the active base profile.
- Parsing + AI extraction in `@cvforge/api`, because OpenRouter keys and privacy rules already live there.
- Merge happens locally in the active profile after explicit user action, preserving the current browser-storage source of truth.

Open questions converted into delivery constraints:

- Because the repo has no file parser yet, a small parser dependency and ADR are required.
- Quality is inherently lossy for complex layouts, image-based PDFs, and decorative CV designs; the product must surface that as guidance, not as silent failure.

Pass verdict: scope is clear and acceptance criteria are testable.
