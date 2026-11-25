import type { ReactNode } from "react"

import { AgentsNav } from "@/components/account/agents/agents-nav"
import { CreateAgentTokenDialog } from "@/components/account/agents/create-agent-token-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { requireSession } from "@/lib/session"

/**
 * "Agents connectés", split like the cockpit: the tokens in one tab, what the
 * agents did in the other. Connecting an agent is a header action, from either.
 */
export default async function AgentsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireSession()

  return (
    <>
      <PageHeader
        title="Agents connectés"
        description="Votre agent IA fait ce que vous faites dans JobSpark, dans les limites que vous fixez."
        actions={<CreateAgentTokenDialog />}
      />
      <div className="flex flex-col gap-6">
        <div className="px-4 lg:px-6">
          <AgentsNav />
        </div>
        {children}
      </div>
    </>
  )
}
