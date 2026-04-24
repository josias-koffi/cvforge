import React from "react";
import { AppShell } from "@cvforge/ui";
import { requireSession } from "../auth/session";
import { getAppNavigation } from "../content";
import { NotificationBell } from "../notifications/notification-bell";
import { InterviewStudio } from "./interview-studio";

export default async function InterviewPage() {
  const session = await requireSession();

  return (
    <AppShell
      description="Prototype V1.2 du pipeline interview vocal: capture navigateur, ingestion backend et STT progressif."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/interview")}
      title="Interview vocal"
    >
      <InterviewStudio sessionEmail={session.email} />
    </AppShell>
  );
}
