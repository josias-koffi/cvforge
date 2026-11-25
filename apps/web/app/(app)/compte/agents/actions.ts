"use server"

import type {
  AgentTokenCreateRequest,
  AgentTokenCreateResponse,
} from "@cvforge/types"

import { publicMcpUrl } from "@/lib/agent-mcp"
import { api, ApiError, runAction, type ActionResult } from "@/lib/api"
import { requireSession } from "@/lib/session"

export type CreateAgentTokenResult =
  { ok: true; token: string; mcpUrl: string } | { ok: false; message: string }

export async function createAgentToken(
  request: AgentTokenCreateRequest
): Promise<CreateAgentTokenResult> {
  await requireSession()

  try {
    const { token } = await api<AgentTokenCreateResponse>("/agent-tokens", {
      body: request,
      method: "POST",
    })

    return { mcpUrl: publicMcpUrl(), ok: true, token }
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, ok: false }
    }

    throw error
  }
}

export async function revokeAgentToken(id: string): Promise<ActionResult> {
  await requireSession()

  return runAction(
    () => api(`/agent-tokens/${encodeURIComponent(id)}`, { method: "DELETE" }),
    "Jeton révoqué : l'agent n'a plus accès."
  )
}
