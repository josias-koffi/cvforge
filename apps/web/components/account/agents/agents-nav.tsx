"use client"

import { HistoryIcon, KeyRoundIcon } from "lucide-react"

import { TabNav } from "@/components/layout/tab-nav"

/** The tokens an agent holds, and what the agents did with them. */
const AGENT_TABS = [
  { href: "/compte/agents", icon: KeyRoundIcon, label: "Jetons" },
  { href: "/compte/agents/activite", icon: HistoryIcon, label: "Activité" },
] as const

export function AgentsNav() {
  return <TabNav label="Agents connectés" tabs={AGENT_TABS} />
}
