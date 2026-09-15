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

const segmentLabels: Record<string, string> = {
  admin: "Administration",
  candidatures: "Candidatures",
  credits: "Crédits",
  cv: "CV",
  dashboard: "Tableau de bord",
  edit: "Modifier",
  letter: "Lettre de motivation",
  new: "Nouvelle candidature",
  notifications: "Notifications",
  profile: "Mes profils",
  users: "Utilisateurs",
}

export function HeaderBreadcrumb() {
  const segments = usePathname().split("/").filter(Boolean)
  const crumbs = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: segmentLabels[segment] ?? "Détail",
  }))

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
