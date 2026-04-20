import React from "react";
import { AppShell, Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import Link from "next/link";
import { requireSession } from "../auth/session";
import { appContent, getAppNavigation } from "../content";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <AppShell
      title="Tableau de bord candidat"
      description="Point d'entree du parcours apres validation de l'onboarding et edition du profil."
      navigation={getAppNavigation("/dashboard")}
    >
      <Card>
        <CardHeader>
          <CardTitle>Profil de base pret a etre enrichi</CardTitle>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            L&apos;onboarding alimente maintenant un profil de base unique que le candidat
            peut consulter et editer avant les futures generations IA.
          </p>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
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
            <dt style={{ color: "#6B6860", fontWeight: 600 }}>Session</dt>
            <dd style={{ margin: 0 }}>{session.email}</dd>
            <dt style={{ color: "#6B6860", fontWeight: 600 }}>Role</dt>
            <dd style={{ margin: 0 }}>{session.role}</dd>
          </dl>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Le MVP conserve un seul profil de base par compte pour rester aligne
            avec la contrainte sprint avant l'ouverture du multi-profils.
          </p>
          <Link href="/profile" style={{ color: "#2C2C2A", fontWeight: 600 }}>
            Ouvrir le profil de base
          </Link>
          <Link href="/" style={{ color: "#2C2C2A", fontWeight: 600 }}>
            Reprendre l&apos;onboarding
          </Link>
          <p style={{ color: "#6B6860", margin: 0 }}>{appContent.description}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
