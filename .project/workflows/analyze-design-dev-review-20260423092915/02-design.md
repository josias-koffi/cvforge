# Design

UI direction:

- `/profile` becomes a multi-profile workspace with a summary card, profile chips/cards, add/remove actions, and one editable active profile form
- The active profile keeps the existing long-form editing surface to avoid retraining the user
- `/candidatures` adds a simple native selector per application labeled "Profil actif pour cette candidature"

UX and accessibility notes:

- Selection is explicit and local to each candidature
- Buttons remain keyboard reachable and form labels stay associated
- The selector uses plain language explaining that the preference is saved locally

Non-UI risk is low because the feature reuses local storage and the existing client-side generation entry points.
