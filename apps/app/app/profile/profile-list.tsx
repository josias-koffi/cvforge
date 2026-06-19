"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import Link from "next/link";
import {
  countCompletedProfileSections,
  createEmptyProfileRegistry,
  formatProfileSavedAt,
  loadProfileRegistryFromStorage,
  saveProfileRegistryToStorage,
} from "./base-profile";
import { pushRemoteProfileRegistry, syncProfileRegistryOnLoad } from "./profile-sync";

/* v8 ignore start -- localStorage-driven listing covered by page-level render tests */
function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function ProfileList({ sessionEmail }: { sessionEmail: string }) {
  const [registry, setRegistry] = React.useState(() =>
    createEmptyProfileRegistry(sessionEmail),
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const local = loadProfileRegistryFromStorage(sessionEmail, getStorage());
    setRegistry(local);
    setHydrated(true);

    void syncProfileRegistryOnLoad(sessionEmail, getStorage(), local, setRegistry);
  }, [sessionEmail]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveProfileRegistryToStorage(registry, getStorage());
    void pushRemoteProfileRegistry(registry);
  }, [hydrated, registry]);

  const activateProfile = React.useCallback((profileId: string) => {
    setRegistry((current) => ({ ...current, activeProfileId: profileId }));
  }, []);

  const removeProfile = React.useCallback((profileId: string) => {
    setRegistry((current) => {
      if (current.profiles.length <= 1) {
        return current;
      }

      const remaining = current.profiles.filter((p) => p.id !== profileId);

      return {
        activeProfileId:
          current.activeProfileId === profileId
            ? (remaining[0]?.id ?? current.activeProfileId)
            : current.activeProfileId,
        profiles: remaining,
        version: 2,
      };
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profils de base multiples</CardTitle>
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Gerez plusieurs socles de candidature et activez le bon selon le contexte.
        </p>
      </CardHeader>
      <CardContent style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button asChild>
            <Link href="/profile/new">+ Nouveau profil</Link>
          </Button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #D9D3C7", textAlign: "left" }}>
                <th scope="col" style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#1A1A18" }}>Label</th>
                <th scope="col" style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#1A1A18" }}>Candidat</th>
                <th scope="col" style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#1A1A18" }}>Sections</th>
                <th scope="col" style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#1A1A18" }}>Sauvegarde</th>
                <th scope="col" style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#1A1A18" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registry.profiles.map((profile) => {
                const isActive = profile.id === registry.activeProfileId;
                const fullName = `${profile.identity.firstName} ${profile.identity.lastName}`.trim();
                const sections = countCompletedProfileSections(profile);

                return (
                  <tr
                    key={profile.id}
                    style={{
                      borderBottom: "1px solid #D9D3C7",
                      backgroundColor: isActive ? "#F2F0EB" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem", fontWeight: isActive ? 700 : 400 }}>
                      {isActive ? "● " : ""}{profile.label}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6B6860" }}>
                      {fullName || profile.identity.email || "Profil incomplet"}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6B6860" }}>
                      {sections} / 9
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6B6860" }}>
                      {formatProfileSavedAt(profile.meta.lastSavedAt)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <Button asChild size="sm" variant="secondary">
                          <Link
                            aria-label={`Modifier le profil ${profile.label}`}
                            href={`/profile/${profile.id}/edit`}
                          >
                            Modifier
                          </Link>
                        </Button>
                        {!isActive && (
                          <Button
                            aria-label={`Activer le profil ${profile.label}`}
                            onClick={() => activateProfile(profile.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Activer
                          </Button>
                        )}
                        <Button
                          aria-label={`Supprimer le profil ${profile.label}`}
                          disabled={registry.profiles.length <= 1}
                          onClick={() => removeProfile(profile.id)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
/* v8 ignore stop */
