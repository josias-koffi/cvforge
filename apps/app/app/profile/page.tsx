import React from "react";
import { AppShell, Button } from "@cvforge/ui";
import Link from "next/link";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { ProfileList } from "./profile-list";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <AppShell
      breadcrumb="Profil"
      description="Gerez plusieurs profils de base et reutilisez le bon socle selon chaque candidature du MVP."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/profile", session.role)}
      title="Profil de base"
      userEmail={session.email}
      userRole={session.role}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <Button asChild variant="ghost">
          <Link href="/profile/privacy">Export RGPD et suppression</Link>
        </Button>
      </div>
      <ProfileList sessionEmail={session.email} />
    </AppShell>
  );
}
