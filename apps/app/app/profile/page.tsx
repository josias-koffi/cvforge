import React from "react";
import { AppShell, Button } from "@cvforge/ui";
import Link from "next/link";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <AppShell
      title="Profil de base"
      description="Edition du profil de base unique qui servira de socle pour les generations du MVP."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/profile")}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <Button asChild variant="secondary">
          <Link href="/profile/privacy">Export RGPD et suppression</Link>
        </Button>
      </div>
      <ProfileEditor sessionEmail={session.email} />
    </AppShell>
  );
}
