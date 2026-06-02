import React from "react";
import { AppShell } from "@cvforge/ui";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { ProfileCreateForm } from "./profile-create-form";

export default async function NewProfilePage() {
  const session = await requireSession();

  return (
    <AppShell
      breadcrumb="Nouveau profil"
      description="Donnez un nom a ce nouveau socle pour le retrouver facilement."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/profile", session.role)}
      title="Nouveau profil"
      userEmail={session.email}
      userRole={session.role}
    >
      <ProfileCreateForm sessionEmail={session.email} />
    </AppShell>
  );
}
