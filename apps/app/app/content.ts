import type { ShellNavItem } from "@cvforge/ui";

export type AppRoute =
  | "/dashboard"
  | "/candidatures"
  | "/interview"
  | "/cv"
  | "/credits"
  | "/profile"
  | "/notifications"
  | "/admin"
  | "/admin/templates";

const baseNavigation: ShellNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Vue d'ensemble",
    shortLabel: "DB",
  },
  {
    href: "/candidatures",
    label: "Candidatures",
    description: "Pipeline et rappels",
    shortLabel: "CD",
  },
  {
    href: "/interview",
    label: "Interview",
    description: "Préparation vocale",
    shortLabel: "IV",
  },
  {
    href: "/cv",
    label: "Documents",
    description: "CV, lettres et exports",
    shortLabel: "DC",
  },
  {
    href: "/credits",
    label: "Crédits",
    description: "Solde et historique",
    shortLabel: "CR",
  },
  {
    href: "/profile",
    label: "Profil",
    description: "Profils socles",
    shortLabel: "PR",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Rappels et alertes",
    shortLabel: "NT",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Espace réservé",
    shortLabel: "AD",
    requiresAdmin: true,
  },
];

export function getAppNavigation(
  activeHref: AppRoute,
  role?: "user" | "admin",
): ShellNavItem[] {
  return baseNavigation
    .filter((item) => !item.requiresAdmin || role === "admin")
    .map((item) => ({
      ...item,
      isActive: item.href === activeHref || activeHref.startsWith(item.href + "/"),
    }));
}

export const appContent = {
  title: "CVforge App",
  description: "PWA candidat initialisee dans le monorepo.",
};
