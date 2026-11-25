import type { Metadata } from "next"
import type { AgentTokenSummary } from "@cvforge/types"

import { AgentTokensList } from "@/components/account/agents/agent-tokens-list"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Agents connectés" }

export default async function AgentTokensPage() {
  const { tokens } = await api<{ tokens: AgentTokenSummary[] }>("/agent-tokens")

  return (
    <div className="px-4 lg:px-6">
      <AgentTokensList tokens={tokens} />
    </div>
  )
}
