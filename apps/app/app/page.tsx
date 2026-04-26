import React from "react";
import { AppShell } from "@cvforge/ui";
import { getAppNavigation } from "./content";
import { requireSession } from "./auth/session";
import { NotificationBell } from "./notifications/notification-bell";
import { OnboardingWizard } from "./onboarding/wizard";

export default async function HomePage() {
  const session = await requireSession();

  return (
    <AppShell
      breadcrumb="Onboarding"
      description="Premier parcours mobile-first pour collecter les informations du profil candidat."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/dashboard", session.role)}
      title="Onboarding candidat"
      userEmail={session.email}
      userRole={session.role}
    >
      <OnboardingWizard sessionEmail={session.email} />
    </AppShell>
  );
}
