import type { Metadata } from "next"
import Link from "next/link"

import { HiringCompanies } from "@/components/job-search/hiring-companies"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { loadHiringCompanies } from "@/lib/hiring-companies"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Entreprises qui recrutent" }

/**
 * The hidden job market (US-119): companies France Travail expects to hire in
 * the candidate's jobs, whether or not they published an offer.
 */
export default async function HiringCompaniesPage(
  props: PageProps<"/entreprises">
) {
  const session = await requireSession()
  const { profileId } = await props.searchParams
  const registry = await loadRegistry(session.email)
  const selected = pickProfile(
    registry,
    typeof profileId === "string" ? profileId : undefined
  )
  const view = await loadHiringCompanies(selected.id)

  return (
    <>
      <PageHeader
        title="Entreprises qui recrutent"
        description="Celles qui embauchent dans vos métiers près de chez vous, même sans annonce."
        actions={
          <Button asChild variant="outline">
            <Link href="/ma-recherche">Ma recherche</Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {registry.profiles.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Recherche du profil
            </span>
            {registry.profiles.map((profile) => (
              <Button
                key={profile.id}
                asChild
                size="sm"
                variant={profile.id === selected.id ? "default" : "outline"}
              >
                <Link href={`/entreprises?profileId=${profile.id}`}>
                  {profile.label}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
        <HiringCompanies view={view} />
      </div>
    </>
  )
}
