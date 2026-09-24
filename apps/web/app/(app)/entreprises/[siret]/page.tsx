import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CompanyProfileView } from "@/components/job-search/company-profile"
import { SpontaneousApplyButton } from "@/components/job-search/spontaneous-apply-button"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { loadHiringCompany } from "@/lib/hiring-companies"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Fiche entreprise" }

/**
 * One company of "Entreprises qui recrutent" (US-121). Only a company the
 * candidate's list shows opens; the page reads the copies, never an API.
 */
export default async function HiringCompanyPage(
  props: PageProps<"/entreprises/[siret]">
) {
  const session = await requireSession()
  const [{ siret }, { profileId }] = await Promise.all([
    props.params,
    props.searchParams,
  ])
  const selected = pickProfile(
    await loadRegistry(session.email),
    typeof profileId === "string" ? profileId : undefined
  )
  const detail = await loadHiringCompany(selected.id, siret)
  if (!detail) notFound()

  const { company } = detail

  return (
    <>
      <PageHeader
        title={company.name}
        description={[company.nafLabel, company.city].filter(Boolean).join(" · ")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/entreprises?profileId=${selected.id}`}>
              Toutes les entreprises
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <CompanyProfileView detail={detail} />
        <div className="max-w-sm">
          <SpontaneousApplyButton
            profileId={selected.id}
            siret={company.siret}
            companyName={company.name}
          />
        </div>
      </div>
    </>
  )
}
