import React from "react";
import { AppShell } from "@cvforge/ui";
import { getAppNavigation } from "../content";
import { requireAdminSession } from "../auth/session";

export default async function AdminPage() {
  const session = await requireAdminSession();

  return (
    <AppShell
      title="Espace admin"
      description="Zone reservee aux comptes administrateurs."
      navigation={getAppNavigation("/admin")}
    >
      <div
        style={{
          display: "grid",
          gap: "1rem",
          maxWidth: "32rem",
        }}
      >
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Les controles d&apos;acces de sprint 003 confirment que cette route reste
          reservee au role admin.
        </p>
        <dl
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #D9D4CA",
            borderRadius: "1rem",
            display: "grid",
            gap: "0.5rem",
            margin: 0,
            padding: "1.25rem",
          }}
        >
          <dt style={{ color: "#6B6860", fontWeight: 600 }}>Session admin</dt>
          <dd style={{ margin: 0 }}>{session.email}</dd>
          <dt style={{ color: "#6B6860", fontWeight: 600 }}>Role</dt>
          <dd style={{ margin: 0 }}>{session.role}</dd>
        </dl>
      </div>
    </AppShell>
  );
}
