import type { Metadata } from "next"
import type { AgentToolCall, AgentTokenSummary } from "@cvforge/types"

import {
  AgentActivityCard,
  AgentTokensList,
} from "@/components/account/agents/agent-tokens-list"
import { CreateAgentTokenCard } from "@/components/account/agents/create-agent-token-card"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Agents connectés" }

export default async function AgentsPage() {
  await requireSession()
  const [{ tokens }, { calls }] = await Promise.all([
    api<{ tokens: AgentTokenSummary[] }>("/agent-tokens"),
    api<{ calls: AgentToolCall[] }>("/agent-tokens/activity"),
  ])

  return (
    <>
      <PageHeader
        title="Agents connectés"
        description="Votre agent IA fait ce que vous faites dans JobSpark, dans les limites que vous fixez."
      />
      <div className="grid gap-4 px-4 lg:px-6">
        <CreateAgentTokenCard />
        <AgentTokensList tokens={tokens} />
        <AgentActivityCard calls={calls} />
      </div>
    </>
  )
}
