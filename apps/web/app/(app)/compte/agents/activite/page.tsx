import type { Metadata } from "next"
import type { AgentToolCall } from "@cvforge/types"

import { AgentActivityCard } from "@/components/account/agents/agent-tokens-list"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Activité des agents" }

export default async function AgentActivityPage() {
  const { calls } = await api<{ calls: AgentToolCall[] }>(
    "/agent-tokens/activity"
  )

  return (
    <div className="px-4 lg:px-6">
      <AgentActivityCard calls={calls} />
    </div>
  )
}
