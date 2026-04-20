import type { ShellNavItem } from "@cvforge/ui";

type AppRoute =
  | "/"
  | "/dashboard"
  | "/profile"
  | "/cv"
  | "/candidatures"
  | "/interview"
  | "/admin"
  | "/admin/templates";

const baseNavigation: ShellNavItem[] = [
  {
    href: "/",
    label: "Onboarding",
    description: "Profil initial en 5 etapes",
    shortLabel: "ON",
  },
  {
    href: "/dashboard",
    label: "Tableau de bord",
    description: "Suivi du profil",
    shortLabel: "TD",
  },
  {
    href: "/profile",
    label: "Profil de base",
    description: "Edition du profil unique",
    shortLabel: "PB",
  },
  {
    href: "/cv",
    label: "CV",
    description: "Edition et exports",
    shortLabel: "CV",
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
    description: "Preparation vocale",
    shortLabel: "IV",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Espace reserve",
    shortLabel: "AD",
  },
  {
    href: "/admin/templates",
    label: "Templates admin",
    description: "Editor Puck",
    shortLabel: "TP",
  },
];

export function getAppNavigation(activeHref: AppRoute): ShellNavItem[] {
  return baseNavigation.map((item) => ({
    ...item,
    isActive: item.href === activeHref,
  }));
}

export const appContent = {
  title: "CVforge App",
  description: "PWA candidat initialisee dans le monorepo.",
};
