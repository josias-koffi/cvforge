import React from "react";
import { AppShell, Button } from "@cvforge/ui";
import Link from "next/link";
import { requireSession } from "../../../auth/session";
import { getAppNavigation } from "../../../content";
import { NotificationBell } from "../../../notifications/notification-bell";
import { CvImportPanel } from "../../cv-import-panel";
import { ProfileEditor } from "../../profile-editor";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  return (
    <AppShell
      breadcrumb="Modifier le profil"
      description="Completez ou mettez a jour les sections de ce profil de base."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/profile", session.role)}
      title="Modifier le profil"
      userEmail={session.email}
      userRole={session.role}
    >
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <Button asChild variant="secondary">
          <Link href="/profile">← Retour aux profils</Link>
        </Button>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <CvImportPanel sessionEmail={session.email} />
      </div>
      <ProfileEditor profileId={id} sessionEmail={session.email} />
    </AppShell>
  );
}
