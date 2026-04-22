import React from "react";
import { AppShell } from "@cvforge/ui";
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
      <ProfileEditor sessionEmail={session.email} />
    </AppShell>
  );
}
