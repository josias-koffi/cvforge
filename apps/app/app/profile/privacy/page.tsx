import React from "react";
import { cookies } from "next/headers";
import { AppShell } from "@cvforge/ui";
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";
import { NotificationBell } from "../../notifications/notification-bell";
import { PrivacyManager } from "./privacy-manager";
import type { PrivacyRetentionPolicy } from "./route-types";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchRetentionPolicy() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/privacy/retention-policy`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer la politique de retention.");
  }

  const payload = (await response.json()) as {
    policy: PrivacyRetentionPolicy;
  };

  return payload.policy;
}

export default async function ProfilePrivacyPage() {
  const session = await requireSession();
  const retentionPolicy = await fetchRetentionPolicy();

  return (
    <AppShell
      breadcrumb="Profil · Confidentialité"
      description="Acces aux donnees personnelles exportables, suppression irreversible du compte et politique de retention MVP."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/profile", session.role)}
      title="Confidentialite et RGPD"
      userEmail={session.email}
      userRole={session.role}
    >
      <PrivacyManager
        retentionPolicy={retentionPolicy}
        sessionEmail={session.email}
      />
    </AppShell>
  );
}
