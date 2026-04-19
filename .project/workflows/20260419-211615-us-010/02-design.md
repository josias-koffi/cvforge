# Stage 2 — Design

## Design Verdict

Pass with non-UI skip.

This story changes backend auth state only. No new user-facing screen, interaction pattern, or accessibility surface is introduced.

## Technical Design

- Add a minimal file-backed auth account store in the API package.
- Persist both account roles and a `bootstrapConsumed` flag.
- Resolve the session role on magic-link consumption:
  - first completed account => `admin`
  - all later new accounts => `user`
  - existing accounts keep their stored role

## UX Risk

- None for this story. The existing passwordless flow remains unchanged from the user perspective.
