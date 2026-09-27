"use client"

import { HistoryIcon, ShoppingCartIcon } from "lucide-react"

import { TabNav } from "@/components/layout/tab-nav"

/** Buying credits, and seeing where they went: one job per tab. */
const CREDIT_TABS = [
  { href: "/credits", icon: ShoppingCartIcon, label: "Recharger" },
  { href: "/credits/historique", icon: HistoryIcon, label: "Historique" },
] as const

export function CreditsNav() {
  return <TabNav label="Crédits" tabs={CREDIT_TABS} />
}
