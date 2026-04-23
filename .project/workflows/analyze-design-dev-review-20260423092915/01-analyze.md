# Analyze

US-037 stays inside the existing app-side profile flow. The product gap is not backend profile persistence; it is the inability to keep more than one base profile and to bind the right one to a candidature before generating CV/LM documents.

Testable scope:

- Replace the single local profile model with a local multi-profile registry
- Migrate legacy stored single-profile data automatically
- Let the user switch the active profile from `/profile`
- Let each candidature choose which profile will feed CV/LM generation
- Keep existing generation flows working for users who already have one stored profile

No product blocker remains. The acceptance criteria are directly verifiable through the profile page, candidature page, and regression tests around storage migration.
