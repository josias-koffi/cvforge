"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@cvforge/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEmptyBaseProfile,
  createEmptyProfileRegistry,
  loadProfileRegistryFromStorage,
  saveProfileRegistryToStorage,
} from "../base-profile";
import { pushRemoteProfileRegistry } from "../profile-sync";

/* v8 ignore start -- client-side form covered by e2e; localStorage interaction covered by base-profile.test.ts */
function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function ProfileCreateForm({ sessionEmail }: { sessionEmail: string }) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState(sessionEmail);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const storage = getStorage();
    const registry = loadProfileRegistryFromStorage(sessionEmail, storage) ??
      createEmptyProfileRegistry(sessionEmail);

    const newProfile = createEmptyBaseProfile(sessionEmail, {
      label: label || `Profil ${registry.profiles.length + 1}`,
    });

    newProfile.identity.firstName = firstName;
    newProfile.identity.lastName = lastName;
    newProfile.identity.email = email;

    const newRegistry = {
      activeProfileId: newProfile.id,
      profiles: [...registry.profiles, newProfile],
      version: 2 as const,
    };

    saveProfileRegistryToStorage(newRegistry, storage);
    void pushRemoteProfileRegistry(newRegistry);

    router.push(`/profile/${newProfile.id}/edit`);
  }

  return (
    <Card style={{ maxWidth: "480px" }}>
      <CardHeader>
        <CardTitle>Creer un profil</CardTitle>
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Seul le nom du profil est obligatoire. Completez les autres champs sur la page
          suivante.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label htmlFor="new-label">Nom du profil *</Label>
            <Input
              id="new-label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Profil Dev Backend"
              value={label}
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label htmlFor="new-first-name">Prenom</Label>
            <Input
              id="new-first-name"
              onChange={(e) => setFirstName(e.target.value)}
              value={firstName}
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label htmlFor="new-last-name">Nom</Label>
            <Input
              id="new-last-name"
              onChange={(e) => setLastName(e.target.value)}
              value={lastName}
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button type="submit">Creer le profil</Button>
            <Button asChild variant="ghost">
              <Link href="/profile">Annuler</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
/* v8 ignore stop */
