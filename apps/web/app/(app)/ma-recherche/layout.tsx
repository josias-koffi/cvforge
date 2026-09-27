import { Suspense } from "react"
import Link from "next/link"
import { SparklesIcon } from "lucide-react"

import { SearchNav } from "@/components/job-search/search-nav"
import { SearchProfileSwitcher } from "@/components/job-search/search-profile-switcher"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

/**
 * "Ma recherche", split by what each part is for: the criteria the offers are
 * searched with, the ROME jobs and skills read from them, the market those
 * jobs are in, and the morning alerts. Each tab saves in one way only — a
 * page that mixed a "Save" button with chips saved on click lost people.
 */
export default async function SearchProjectLayout({
  children,
}: LayoutProps<"/ma-recherche">) {
  const session = await requireSession()
  const registry = await loadRegistry(session.email)

  return (
    <>
      <PageHeader
        title="Ma recherche"
        description="Ce que vous cherchez. C'est d'ici que viennent vos offres du jour."
        actions={
          <>
            <Suspense>
              <SearchProfileSwitcher
                defaultProfileId={pickProfile(registry).id}
                profiles={registry.profiles.map(({ id, label }) => ({
                  id,
                  label,
                }))}
              />
            </Suspense>
            <Button asChild variant="outline">
              <Link href="/offres-du-jour">
                <SparklesIcon />
                Mes offres du jour
              </Link>
            </Button>
          </>
        }
      />
      {/* On a large screen the header and the tabs stay put: each tab
          decides what scrolls under them (see SearchTabBody). */}
      <div className="flex w-full flex-col gap-6 lg:min-h-0 lg:flex-1">
        <div className="px-4 lg:px-6">
          <Suspense>
            <SearchNav />
          </Suspense>
        </div>
        <div className="flex flex-col lg:min-h-0 lg:flex-1">{children}</div>
      </div>
    </>
  )
}
