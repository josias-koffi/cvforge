import type { Metadata } from "next"
import Link from "next/link"
import { SparklesIcon } from "lucide-react"

import { SearchProjectForm } from "@/components/job-search/search-project-form"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { loadSearchProject } from "@/lib/search-project"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Ma recherche" }

/**
 * A page of its own, not a tab inside the profile editor.
 *
 * The search is what feeds the daily offers, and sending somebody into the CV
 * editor to configure it lost them — the two are edited at different moments,
 * for different reasons.
 */
export default async function SearchProjectPage(props: PageProps<"/ma-recherche">) {
  const session = await requireSession()
  const { profileId } = await props.searchParams
  const registry = await loadRegistry(session.email)
  const selected = pickProfile(
    registry,
    typeof profileId === "string" ? profileId : undefined
  )
  const searchProject = await loadSearchProject(selected.id)

  return (
    <>
      <PageHeader
        title="Ma recherche"
        description="Ce que vous cherchez. C'est d'ici que viennent vos offres du jour."
        actions={
          <Button asChild variant="outline">
            <Link href="/offres-du-jour">
              <SparklesIcon />
              Mes offres du jour
            </Link>
          </Button>
        }
      />
      <div className="w-full max-w-3xl px-4 lg:px-6">
        {registry.profiles.length > 1 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Recherche du profil
            </span>
            {registry.profiles.map((profile) => (
              <Button
                key={profile.id}
                asChild
                size="sm"
                variant={profile.id === selected.id ? "default" : "outline"}
              >
                <Link href={`/ma-recherche?profileId=${profile.id}`}>
                  {profile.label}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
        <SearchProjectForm key={selected.id} initialProject={searchProject} />
      </div>
    </>
  )
}
