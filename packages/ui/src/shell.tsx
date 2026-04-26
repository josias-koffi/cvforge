import React from "react";
import { paperTokenCssVars } from "./design-system";
import { Badge } from "./badge";
import { MobileDrawerNav } from "./shell-mobile-nav";

export type ShellNavItem = {
  href: string;
  label: string;
  description: string;
  shortLabel?: string;
  isActive?: boolean;
  requiresAdmin?: boolean;
};

type AppShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  headerAccessory?: React.ReactNode;
  navigation: ShellNavItem[];
  userEmail?: string;
  userRole?: "user" | "admin";
  breadcrumb?: string;
  children?: React.ReactNode;
};

function getEmailInitial(email?: string): string {
  if (!email) return "?";
  return email.charAt(0).toUpperCase();
}

function filterNavForRole(
  items: ShellNavItem[],
  role?: "user" | "admin",
): ShellNavItem[] {
  return items.filter((item) => !item.requiresAdmin || role === "admin");
}

function DesktopSidebar({
  eyebrow,
  navigation,
}: {
  eyebrow: string;
  navigation: ShellNavItem[];
}) {
  return (
    <aside className="cvforge-shell__sidebar">
      <div className="cvforge-shell__sidebar-brand">
        <Badge className="cvforge-shell__eyebrow" variant="outline">
          {eyebrow}
        </Badge>
      </div>
      <nav aria-label="Navigation principale" className="cvforge-shell__sidebar-nav">
        <ul className="cvforge-shell__sidebar-nav-list">
          {navigation.map((item) => (
            <li key={item.href}>
              <a
                aria-current={item.isActive ? "page" : undefined}
                className="cvforge-shell__nav-link"
                href={item.href}
              >
                <span className="cvforge-shell__nav-label">{item.label}</span>
                <span className="cvforge-shell__nav-description">
                  {item.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function ShellTopBar({
  breadcrumb,
  eyebrow,
  headerAccessory,
  navigation,
  userEmail,
}: {
  eyebrow: string;
  breadcrumb?: string;
  headerAccessory?: React.ReactNode;
  userEmail?: string;
  navigation: ShellNavItem[];
}) {
  return (
    <header className="cvforge-shell__topbar">
      <div className="cvforge-shell__topbar-left">
        <div className="cvforge-shell__topbar-mobile-controls">
          <MobileDrawerNav items={navigation} />
        </div>
        <Badge className="cvforge-shell__eyebrow cvforge-shell__topbar-brand" variant="outline">
          {eyebrow}
        </Badge>
        {breadcrumb ? (
          <nav aria-label="Fil d'Ariane" className="cvforge-shell__breadcrumb">
            <ol className="cvforge-shell__breadcrumb-list">
              <li className="cvforge-shell__breadcrumb-item">
                <span aria-current="page">{breadcrumb}</span>
              </li>
            </ol>
          </nav>
        ) : null}
      </div>
      <div className="cvforge-shell__topbar-right">
        {headerAccessory ? (
          <div className="cvforge-shell__topbar-accessory">{headerAccessory}</div>
        ) : null}
        {userEmail ? (
          <div
            aria-label={userEmail}
            className="cvforge-shell__avatar"
            role="img"
            title={userEmail}
          >
            {getEmailInitial(userEmail)}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function AppShell({
  title,
  description,
  eyebrow = "CVforge",
  headerAccessory,
  navigation,
  userEmail,
  userRole,
  breadcrumb,
  children,
}: AppShellProps) {
  const filteredNav = filterNavForRole(navigation, userRole);

  return (
    <div className="cvforge-shell" style={paperTokenCssVars()}>
      <ShellTopBar
        breadcrumb={breadcrumb ?? title}
        eyebrow={eyebrow}
        headerAccessory={headerAccessory}
        navigation={filteredNav}
        userEmail={userEmail}
      />
      <div className="cvforge-shell__body">
        <DesktopSidebar eyebrow={eyebrow} navigation={filteredNav} />
        <main className="cvforge-shell__main">
          <div className="cvforge-shell__page-header">
            <h1 className="cvforge-shell__page-title">{title}</h1>
            <p className="cvforge-shell__page-description">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
