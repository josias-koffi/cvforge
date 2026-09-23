"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  BriefcaseBusinessIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  MicIcon,
  ChartColumnIcon,
  PackageIcon,
  ScaleIcon,
  SettingsIcon,
  ScrollTextIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react"

import { Brand } from "@/components/brand"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const adminItems = [
  { href: "/admin/users", icon: UsersIcon, title: "Utilisateurs" },
  { href: "/admin/offers", icon: PackageIcon, title: "Offres de crédits" },
  { href: "/admin/metrics", icon: ChartColumnIcon, title: "Métriques" },
  { href: "/admin/audit-log", icon: ScrollTextIcon, title: "Journal d'audit" },
  { href: "/admin/legal", icon: ScaleIcon, title: "Documents légaux" },
]

const mainItems = [
  { href: "/dashboard", icon: LayoutDashboardIcon, title: "Tableau de bord" },
  { href: "/offres-du-jour", icon: SparklesIcon, title: "Offres du jour" },
  { href: "/offres", icon: SearchIcon, title: "Rechercher une offre" },
  { href: "/candidatures", icon: BriefcaseBusinessIcon, title: "Candidatures" },
  { href: "/entretiens", icon: MicIcon, title: "Entretiens" },
  { href: "/profile", icon: UserRoundIcon, title: "Mes profils" },
  { href: "/credits", icon: CoinsIcon, title: "Crédits" },
  { href: "/notifications", icon: BellIcon, title: "Notifications" },
  { href: "/compte", icon: SettingsIcon, title: "Mon compte" },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  balance: number | null
  email: string
  isAdmin: boolean
  unreadCount: number
}

export function AppSidebar({
  balance,
  email,
  isAdmin,
  unreadCount,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="px-1.5 py-1">
            <Brand />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Nouvelle candidature"
                  className="bg-primary text-primary-foreground shadow-surface hover:bg-primary/90 hover:text-primary-foreground hover:shadow-raised active:bg-primary/90 active:text-primary-foreground"
                >
                  <Link href="/candidatures/new">
                    <PlusIcon />
                    <span>Nouvelle candidature</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>
                  ) : null}
                  {item.href === "/credits" && balance !== null ? (
                    <SidebarMenuBadge>{balance}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={email} isAdmin={isAdmin} />
      </SidebarFooter>
    </Sidebar>
  )
}
