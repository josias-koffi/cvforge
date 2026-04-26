US-048 stays inside vision `§10.4` and `§10.5`: the interview loop already exists, but the declared recruiter profiles do not. The missing product contract is explicit profile selection plus a clean end-of-session transition that QA can verify directly.

Acceptance mapping:
- End-to-end voice mode: existing authenticated session start, chunk upload, transcript hydration, AI response stream, and app/API routes must still work after the change.
- Recruiter profiles: `Standard`, `Agressif`, `Passif`, `Technique`, `Comportemental` must exist in shared types, backend prompt shaping, and UI selection.
- Clean start/end: user must be able to start an interview, keep the active session state, and terminate it through a dedicated completion action rather than only clearing browser state.

No product blockers remain. Later vision items such as post-interview report, replay, transcription replay, and free-practice mode are explicitly deferred to other sprint tasks.
