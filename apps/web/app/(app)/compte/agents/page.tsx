import type { Metadata } from "next"
import type { AgentTokenSummary } from "@cvforge/types"

import { AgentTokensList } from "@/components/account/agents/agent-tokens-list"
import { McpEndpointCard } from "@/components/account/agents/mcp-endpoint-card"
import { publicMcpUrl } from "@/lib/agent-mcp"
import { api } from "@/lib/api"

export const metadata: Metadata = { title: "Agents connectés" }

export default async function AgentTokensPage() {
  const { tokens } = await api<{ tokens: AgentTokenSummary[] }>("/agent-tokens")

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <McpEndpointCard mcpUrl={publicMcpUrl()} />
      <AgentTokensList tokens={tokens} />
    </div>
  )
}
