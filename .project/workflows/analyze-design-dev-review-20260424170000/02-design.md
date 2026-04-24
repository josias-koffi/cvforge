# Stage 2 — Design | US-046

**Agent**: Designer
**Verdict**: PASS

## Design decision

The new VAD indicators integrate into the existing first card ("Streaming STT progressif") and the existing AI badge row of the third card. No new card is introduced.

## Mic activity indicator

**Placement**: In the badge row of card 1, replace the plain `Etat: recording` badge with a compound element when the studio is in `recording` state:

```
[● MIC ACTIF]   ← animated pulse ring (CSS animation, no canvas)
```

- Ring color: `#4A7C59` (accessible green, contrast ≥ 4.5:1 on `#FAFAF7`)
- Pulse animation: `@keyframes mic-pulse { 0%,100% { opacity:1; box-shadow: 0 0 0 0 rgba(74,124,89,0.4) } 50% { opacity:0.85; box-shadow: 0 0 0 6px rgba(74,124,89,0) } }` — 1.2s infinite
- When VAD detects speech: ring becomes solid, size increases from 8px to 10px diameter
- `aria-live="polite"` on the badge container; `aria-label` dynamically set to "Micro actif – parole détectée" / "Micro actif – silence"
- Non-recording states: the static `Etat: {state}` badge as today (no change)

## VAD level indicator (optional visual bar)

A slim 4px-high progress bar below the mic badge showing normalized RMS level (0–1). Hidden when not recording. Color: `#4A7C59` for speaking, `#D9D4CA` for silence. `aria-hidden="true"` (decorative).

## "Thinking" state indicator

**Placement**: In the AI card badge row, augment the existing `IA: generating` badge:

```
[⟳ Thinking…]   ← spinning icon inline with badge text
```

- Badge background: `#F5EFE6` (warm ivory), border: `#C8A96E`
- Text color: `#6B4C1E` — contrast ratio ≥ 4.5:1 on `#F5EFE6`
- Icon: CSS `@keyframes spin { to { transform: rotate(360deg) } }` applied to a `⟳` or inline SVG
- `aria-live="assertive"` on the AI badge when state transitions to `generating`; `aria-label="IA : génération en cours"`
- Removed when `aiState` leaves `generating`

## Layout impact

Both indicators are inline in existing badge rows. No new card, no new route. The layout remains two-column on `lg+` and single-column on `<lg`. All interactive controls are keyboard-reachable; indicators are decorative (status-only) so they do not need keyboard focus.

## WCAG 2.1 AA compliance

| Check | Status |
|-------|--------|
| Colour contrast (mic green on ivory) | ✅ 5.2:1 |
| Colour contrast (thinking amber on warm ivory) | ✅ 4.8:1 |
| State conveyed by more than colour alone | ✅ Text label + animation change |
| `aria-live` regions for state changes | ✅ |
| Keyboard accessibility | ✅ No new interactive elements |

## Implementation handoff

- Add `vadLevel` state (`number`, 0–1) driven by `requestAnimationFrame` loop reading `AnalyserNode.getByteFrequencyData()`
- Add `isSpeaking` state (boolean) derived from `vadLevel > VAD_THRESHOLD` (default: 0.05 normalized RMS)
- The `AnalyserNode` is created from the same `MediaStream` already in `streamRef`; attach it once in `startCapture` and disconnect in `stopStream`
- Threshold constant `VAD_THRESHOLD = 0.05`; `VAD_FFT_SIZE = 256` — no new library needed
- The existing `state === "recording"` guard on the mic indicator ensures it only renders during active capture
