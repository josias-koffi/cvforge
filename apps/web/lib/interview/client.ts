import type {
  InterviewAnswerPartRequest,
  InterviewDurationMinutes,
  InterviewRecruiterProfile,
  InterviewSessionStartResponse,
  InterviewSessionSummary,
  InterviewTranscriptionChunkRequest,
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
 * Sends the candidate's answer and opens the spoken reply.
 *
 * One request for the whole turn: the audio goes up, the interviewer's voice
 * comes back as it is generated. The caller must pass an `AbortSignal` and
 * fire it on unmount — the API streams from a generator that only stops when
 * the connection drops, so an abandoned response keeps a turn running.
 */
export async function openTurnStream(
  sessionId: string,
  chunk: InterviewTranscriptionChunkRequest,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${BASE}/sessions/${sessionId}/turn`, {
    body: JSON.stringify(chunk),
    headers: { accept: "text/event-stream", "content-type": "application/json" },
    method: "POST",
    signal,
  })

  if (!response.ok || !response.body) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Le recruteur n'a pas pu répondre.")
    )
  }

  return response.body
}

/**
 * Sends one piece of the answer while the candidate is still speaking.
 *
 * Deliberately not awaited in order by the caller: the server keys each piece
 * by its position, so what matters is that they all arrive, not when.
 */
export async function uploadAnswerPart(
  sessionId: string,
  part: InterviewAnswerPartRequest,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BASE}/sessions/${sessionId}/turn/chunk`, {
    body: JSON.stringify(part),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal,
  })

  if (!response.ok) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Le micro n'a pas pu être envoyé.")
    )
  }
}

/**
 * The interviewer's opening words. Carries no body: the session is all the
 * server needs, and the greeting depends only on its language and profile.
 */
export async function openOpeningStream(
  sessionId: string,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${BASE}/sessions/${sessionId}/opening`, {
    headers: { accept: "text/event-stream" },
    method: "POST",
    signal,
  })

  if (!response.ok || !response.body) {
    throw new InterviewRequestError(
      response.status,
      await readMessage(response, "Le recruteur n'a pas pu répondre.")
    )
  }

  return response.body
}
