import type { ShellNavItem } from "@cvforge/ui";

type AppRoute =
  | "/"
  | "/dashboard"
  | "/cv"
  | "/candidatures"
  | "/interview"
  | "/admin";

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
