import { Suspense } from "react"

import { BillingReturn } from "@/components/credits/billing-return"
import { CreditBalance } from "@/components/credits/credit-balance"
import { CreditsNav } from "@/components/credits/credits-nav"
import { PageHeader } from "@/components/layout/page-header"
import { getCreditBalance } from "@/lib/credits"

/**
 * "Crédits", split by what each part is for: buying credits, and seeing where
 * they went. The balance is in the header, so both tabs show it.
 */
export default async function CreditsLayout({
  children,
}: LayoutProps<"/credits">) {
  const credits = await getCreditBalance()

  return (
    <>
      <Suspense>
        <BillingReturn />
      </Suspense>
      <PageHeader
        title="Crédits"
        description="Chaque génération consomme des crédits. Rechargez quand vous voulez, sans abonnement."
        actions={<CreditBalance credits={credits} />}
      />
      <div className="flex flex-col gap-6">
        <div className="px-4 lg:px-6">
          <CreditsNav />
        </div>
        {children}
      </div>
    </>
  )
}
