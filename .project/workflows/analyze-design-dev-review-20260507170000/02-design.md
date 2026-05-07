# Stage 02 — Design (Designer)

## Layout — Auto-VAD session mode (preloadedSessionId set)

```
┌──────────────────────────────────────────────────────────────────┐
│ Session header row (flex, space-between)                         │
│  LEFT:  🟢 À l'écoute  ⏱ 04:23  Profil: Standard  Langue: FR  │
│  RIGHT: [🔇 Muet]  [Fin de session]                             │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│ Transcript card (maxHeight: 20rem, overflowY: auto)              │
│                                                                  │
│        [User bubble right-aligned, green tint]                   │
│  [AI bubble left-aligned, cream background]                      │
│        [User bubble right-aligned]                               │
│  [AI streaming bubble left, dashed border]                       │
│                                  ← scroll anchor <div>          │
└──────────────────────────────────────────────────────────────────┘
│ (pipeline events / latency / report — unchanged below)           │
```

## Component Changes
- New `VadStatus` type: `"listening" | "recording" | "processing" | "muted"`
- New `ChatMessage` type: `{ role: "user" | "ai"; text: string; ts: string }`
- `vadStatusRef` (ref) + `vadStatus` (state) kept in sync via `updateVadStatus()`
- `isMutedRef` (ref) + `isMuted` (state) for mute toggle
- `transcriptEndRef` for `scrollIntoView`
- Session timer via `setInterval` keyed on `session?.id`

## UX Non-Issues
- Config selects (language/profile/candidature) hidden in auto-VAD mode — set at setup
- Old UI (no preloadedSessionId) keeps all existing elements for backward compat

**Pass** ✅
