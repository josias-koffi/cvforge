import type { CreditLedgerSummary, NotificationSummary } from "@cvforge/types"

import { Suspense } from "react"

import { FlashToast } from "@/components/feedback/flash-toast"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/lib/api"
import { requireSession } from "@/lib/session"

async function loadSidebarCounters() {
  const [credits, notifications] = await Promise.allSettled([
    api<{ credits: CreditLedgerSummary }>("/credits/me"),
    api<{ summary: NotificationSummary }>("/notifications/summary"),
  ])

  return {
    balance: credits.status === "fulfilled" ? credits.value.credits.balance : null,
    unreadCount:
      notifications.status === "fulfilled"
        ? notifications.value.summary.unreadCount
        : 0,
  }
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession()
  const { balance, unreadCount } = await loadSidebarCounters()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        balance={balance}
        email={session.email}
        isAdmin={session.role === "admin"}
        unreadCount={unreadCount}
      />
      <SidebarInset>
        <SiteHeader />
        <Suspense>
          <FlashToast />
        </Suspense>
        <div className="@container/main flex flex-1 flex-col gap-6 py-4 md:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
