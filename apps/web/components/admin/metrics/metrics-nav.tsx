"use client"

import {
  BotIcon,
  EuroIcon,
  GaugeIcon,
  LayersIcon,
  MegaphoneIcon,
  TargetIcon,
} from "lucide-react"

import { usePeriod } from "@/components/admin/metrics/use-period"
import { TabNav } from "@/components/layout/tab-nav"
import { withPeriod } from "@/lib/admin-metrics/period"

/** One tab per question the owner asks: am I earning, spending, used, found? */
export const METRICS_TABS = [
  { href: "/admin/metrics", icon: GaugeIcon, label: "Vue d'ensemble" },
  { href: "/admin/metrics/revenus", icon: EuroIcon, label: "Revenus" },
  { href: "/admin/metrics/couts-ia", icon: BotIcon, label: "Coûts IA" },
  { href: "/admin/metrics/usage", icon: LayersIcon, label: "Produit" },
  { href: "/admin/metrics/marche", icon: TargetIcon, label: "Marché" },
  {
    href: "/admin/metrics/acquisition",
    icon: MegaphoneIcon,
    label: "Acquisition",
  },
] as const

/** The cockpit tabs, each link keeping the period being looked at. */
export function MetricsNav() {
  const period = usePeriod()

  return (
    <TabNav
      hrefFor={(href) => withPeriod(href, period)}
      label="Pilotage"
      tabs={METRICS_TABS}
    />
  )
}
