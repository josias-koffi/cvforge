import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getServerApiUrl } from "@/lib/config"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

type ApiRequestInit = {
  body?: unknown
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Record<string, string | number | undefined>
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] }
    const message = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message

    if (message) {
      return message
    }
  } catch {
    // Non-JSON error body: fall back to a generic message.
  }

  return `La requête a échoué (${response.status}).`
}

export async function getCookieHeader() {
  const cookieStore = await cookies()

  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ")
}

/** Raw call to the NestJS API, forwarding the session cookie. */
export async function apiRequest(path: string, init: ApiRequestInit = {}) {
  const url = new URL(`${getServerApiUrl()}${path}`)

  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  const cookieHeader = await getCookieHeader()

  return fetch(url, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    headers: {
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    method: init.method ?? "GET",
  })
}

/** JSON call that throws ApiError on failure and redirects to login on 401. */
export async function api<T>(path: string, init: ApiRequestInit = {}) {
  const response = await apiRequest(path, init)

  if (response.status === 401) {
    redirect("/login?error=session_required")
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

/** Runs an API mutation inside a server action and maps errors to a result. */
export async function runAction(
  task: () => Promise<unknown>,
  successMessage?: string
): Promise<ActionResult> {
  try {
    await task()
    return { ok: true, message: successMessage }
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, message: error.message }
    }

    throw error
  }
}
