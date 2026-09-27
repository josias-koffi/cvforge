import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
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
      {/* The name is in the hero, with its mark: the header only says where
          the candidate is, and how to go back. */}
      <PageHeader
        title="Fiche entreprise"
        description="Ce que l'on sait d'elle, et pourquoi elle est dans votre liste."
        actions={
          <Button asChild variant="outline">
            <Link href={`/entreprises?profileId=${selected.id}`}>
              <ArrowLeftIcon />
              Toutes les entreprises
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6 lg:px-6">
        <CompanyProfileView
          detail={detail}
          action={
            <SpontaneousApplyButton
              className="w-full"
              variant="default"
              profileId={selected.id}
              siret={company.siret}
              companyName={company.name}
            />
          }
        />
      </div>
    </>
  )
}
