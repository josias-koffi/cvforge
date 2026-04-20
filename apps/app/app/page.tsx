import React from "react";
import { AppShell } from "@cvforge/ui";
import { getAppNavigation } from "./content";
import { requireSession } from "./auth/session";
import { OnboardingWizard } from "./onboarding/wizard";

export default async function HomePage() {
  const session = await requireSession();

  return (
    <AppShell
      title="Onboarding candidat"
      description="Premier parcours mobile-first pour collecter les informations du profil candidat."
      navigation={getAppNavigation("/")}
    >
      <OnboardingWizard sessionEmail={session.email} />
    </AppShell>
  );
}
