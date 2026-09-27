import type {
  InterviewDurationMinutes,
  InterviewRealtimeCallResponse,
  InterviewRecruiterProfile,
  InterviewSessionStartResponse,
  InterviewSessionSummary,
  Locale,
} from "@cvforge/types"

/**
 * Calls the BFF route handlers, never the API directly: the session cookie is
 * httpOnly, so the browser cannot authenticate against NestJS itself.
 */
const BASE = "/api/interviews"

export class InterviewRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

async function readMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string }
    return payload.message ?? fallback
  } catch {
    return fallback
  }
}

export async function startSession(input: {
  applicationId?: string
  language: Locale
  profile: InterviewRecruiterProfile
  durationMinutes: InterviewDurationMinutes
}): Promise<InterviewSessionStartResponse> {
  const response = await fetch(`${BASE}/sessions`, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(
        response,
        response.status === 402
          ? "Crédits insuffisants pour démarrer un entretien."
          : "Impossible de démarrer l'entretien."
      )
    )
  }

  return (await response.json()) as InterviewSessionStartResponse
}

export async function fetchSession(
  sessionId: string
): Promise<InterviewSessionSummary> {
  const response = await fetch(`${BASE}/sessions/${sessionId}`)

  if (!response.ok) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Session introuvable.")
    )
  }

  return (await response.json()) as InterviewSessionSummary
}

/**
 * Pauses the interview: the server hangs the call up and stops the clock.
 * Resuming is simply opening the call again.
 */
export async function pauseSession(
  sessionId: string
): Promise<{ pausedAt: string | null }> {
  const response = await fetch(`${BASE}/sessions/${sessionId}/pause`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Impossible de mettre l'entretien en pause.")
    )
  }

  return (await response.json()) as { pausedAt: string | null }
}

/**
 * Opens the live call: the browser's WebRTC offer goes to the API, which
 * forwards it to OpenAI with the recruiter's brief and returns the answer.
 * The API key and the prompt never reach the page (ADR-026).
 */
export async function openRealtimeCall(
  sessionId: string,
  offerSdp: string
): Promise<InterviewRealtimeCallResponse> {
  const response = await fetch(`${BASE}/sessions/${sessionId}/realtime`, {
    body: JSON.stringify({ sdp: offerSdp }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Impossible de joindre le recruteur.")
    )
  }

  return (await response.json()) as InterviewRealtimeCallResponse
}
