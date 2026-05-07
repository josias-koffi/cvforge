# Stage 04 — Review (QA Reviewer)

## Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Le bouton push-to-talk manuel est supprimé | ✅ — "Demarrer l'entretien" and "Arreter" absent in auto-VAD mode; test confirms via DOM text absence |
| 2 | Le VAD AnalyserNode est actif dès l'entrée en session | ✅ — `initMicStream()` called automatically in mount effect when `preloadedSessionId` is set; `getUserMedia` test confirms call |
| 3 | Les états VAD: 🟢 À l'écoute / 🔴 Enregistrement / 🟡 Traitement / ⚫ Muet | ✅ — `vadBadge` map renders all 4 states; tests verify "À l'écoute" initial state and "🔴 Enregistrement" after speech detection |
| 4 | Mute toggle disponible (ne casse pas le VAD) | ✅ — Mute button toggles `isMuted`/`isMutedRef`; VAD loop checks `isMutedRef.current` before auto-starting recorder; test round-trips ⚫ Muet → 🟢 À l'écoute |
| 5 | Transcript défilant avec messages AI et utilisateur alternés | ✅ — Chat bubble list with `alignSelf: flex-end` (user) and `flex-start` (AI); populated from `session.chunks` on hydration and streaming AI text |
| 6 | Timer de session visible | ✅ — `⏱ MM:SS` Badge rendered in session header; test matches `⏱ \d+:\d{2}` |
| 7 | Bouton "Fin de session" en haut (pas en bas) | ✅ — "Fin de session" in header div above Transcript card; innerHTML index test confirms order |
| 8 | Auto-scroll du transcript au dernier message | ✅ — `<div ref={transcriptEndRef}/>` at bottom; `scrollIntoView` called via `useEffect([messages])` |

## Blocking Defects
None.

## Advisories
- Stale closure risk in `speakNext` for `language`/`aiState` state values captured by VAD loop. Pre-existing issue; not introduced by this PR. Language doesn't change mid-session.
- `SILENCE_FRAMES_TO_STOP = 45` hardcoded at top-level. Acceptable for MVP; could be configurable per-session in a future story.
- AbortController not wired on component unmount for SSE stream in `streamAIResponse`. Pre-existing issue from US-045.

## Regression Check
- 5 legacy tests (manual buttons, session hydration, language select, profile select, finish session) all pass — backward compat confirmed.

**Pass** ✅
