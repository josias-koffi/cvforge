Design keeps the existing three-card `/interview` workspace and extends the control row rather than introducing a new flow.

UX decisions:
- Add a recruiter-profile select beside the language select, locked once a session exists so the running scenario stays stable.
- Surface the active profile as a badge and short helper copy so the user understands the interviewer tone before starting.
- Add a dedicated `Terminer la session` action distinct from `Nouvelle session`; completion preserves the transcript, clears resumable browser state, and shows a completed-session message.
- Prevent restarting AI generation or capture from a completed session; the user must explicitly create a new session.

Accessibility stays within the existing pattern: native `select` controls, button semantics preserved, and completion/error feedback remains exposed through status text.
