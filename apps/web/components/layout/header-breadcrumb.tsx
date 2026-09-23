"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/**
 * Looked up by full path first, then by segment. `new` means a different thing
 * under `/candidatures` than under `/entretiens`, and a bare segment map
 * cannot say so.
 */
const pathLabels: Record<string, string> = {
  "/candidatures/new": "Nouvelle candidature",
  "/entretiens/new": "Nouvel entretien",
}

const segmentLabels: Record<string, string> = {
  admin: "Administration",
  candidatures: "Candidatures",
  compte: "Mon compte",
  credits: "Crédits",
  cv: "CV",
  dashboard: "Tableau de bord",
  edit: "Modifier",
  entretiens: "Entretiens",
  legal: "Documents légaux",
  letter: "Lettre de motivation",
  new: "Nouveau",
  notifications: "Notifications",
  "ma-recherche": "Ma recherche",
  "offres-du-jour": "Offres du jour",
  profile: "Mes profils",
  progression: "Progression",
  rapport: "Rapport",
  users: "Utilisateurs",
}

/**
 * What an id-shaped segment is called, by what it hangs off. Bare "Détail"
 * says nothing once there are three of them in the app.
 */
const parentFallbacks: Record<string, string> = {
  candidatures: "Détail de la candidature",
  entretiens: "Détail de l'entretien",
  users: "Détail du compte",
}

export function HeaderBreadcrumb() {
  const segments = usePathname().split("/").filter(Boolean)
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const parent = segments[index - 1] ?? ""

    return {
      href,
      label:
        pathLabels[href] ??
        segmentLabels[segment] ??
        parentFallbacks[parent] ??
        "Détail",
    }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {index === crumbs.length - 1 || crumb.href === "/admin" ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
