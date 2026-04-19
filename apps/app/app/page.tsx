import React from "react";
import { AppShell } from "@cvforge/ui";
import { appContent } from "./content";
import Link from "next/link";

export default function HomePage() {
  return (
    <AppShell
      title={appContent.title}
      description={appContent.description}
      navigation={appContent.navigation}
    >
      <div
        style={{
          display: "grid",
          gap: "1rem",
          maxWidth: "26rem",
        }}
      >
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Le flux passwordless du sprint 003 est disponible avec un magic link de
          demonstration et une session signee cote API.
        </p>
        <Link href="/login" style={{ color: "#2C2C2A", fontWeight: 600 }}>
          Ouvrir la connexion passwordless
        </Link>
      </div>
    </AppShell>
  );
}
