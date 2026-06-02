"use client";

import React from "react";
import Link from "next/link";
import type { BaseProfile } from "../profile/base-profile";
import {
  getSelectedProfileIdForApplication,
  loadApplicationProfileSelection,
  loadProfileRegistryFromStorage,
  saveApplicationProfileSelection,
} from "../profile/base-profile";

function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function hasMeaningfulContent(profile: BaseProfile) {
  return Boolean(
    profile.identity.firstName.trim() ||
      profile.identity.lastName.trim() ||
      profile.identity.city.trim() ||
      profile.headline.trim() ||
      profile.sections.summary.trim(),
  );
}

function ProfileCard({
  profile,
  selected,
  onSelect,
}: {
  profile: BaseProfile;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const fullName = [profile.identity.firstName, profile.identity.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      onClick={() => onSelect(profile.id)}
      type="button"
      style={{
        background: selected ? "#F3EEE3" : "#FFFFFF",
        border: selected ? "2px solid #C8A96E" : "1px solid #D9D4CA",
        borderRadius: "0.75rem",
        cursor: "pointer",
        display: "grid",
        gap: "0.2rem",
        padding: "0.75rem 1rem",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span
        style={{
          color: "#1A1A18",
          fontSize: "0.9rem",
          fontWeight: 600,
        }}
      >
        {profile.label || "Profil sans nom"}
      </span>
      {fullName ? (
        <span style={{ color: "#6B6860", fontSize: "0.82rem" }}>{fullName}</span>
      ) : null}
      {profile.headline ? (
        <span
          style={{
            color: "#6B6860",
            fontSize: "0.82rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {profile.headline}
        </span>
      ) : null}
      {!hasMeaningfulContent(profile) ? (
        <span style={{ color: "#C0392B", fontSize: "0.78rem" }}>
          Prénom manquant —{" "}
          <Link
            href={`/profile/${profile.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            style={{ color: "#C0392B" }}
          >
            compléter →
          </Link>
        </span>
      ) : null}
    </button>
  );
}

export function ApplicationProfileSelector({
  applicationId,
  sessionEmail,
}: {
  applicationId: string;
  sessionEmail: string;
}) {
  const [profiles, setProfiles] = React.useState<BaseProfile[]>([]);
  const [selectedId, setSelectedId] = React.useState("");

  React.useEffect(() => {
    const storage = getStorage();
    const registry = loadProfileRegistryFromStorage(sessionEmail, storage);
    const selection = loadApplicationProfileSelection(storage);
    const activeId = getSelectedProfileIdForApplication(applicationId, registry, selection);

    setProfiles(registry.profiles);
    setSelectedId(activeId);
  }, [applicationId, sessionEmail]);

  function handleSelect(profileId: string) {
    setSelectedId(profileId);

    const storage = getStorage();
    const selection = loadApplicationProfileSelection(storage);

    saveApplicationProfileSelection(
      { ...selection, [applicationId]: profileId },
      storage,
    );
  }

  if (profiles.length === 0 || !profiles.some(hasMeaningfulContent)) {
    return (
      <p
        style={{
          backgroundColor: "#FDF6E3",
          border: "1px solid #DCC7A0",
          borderRadius: "0.75rem",
          color: "#7A5A26",
          lineHeight: 1.6,
          margin: 0,
          padding: "0.75rem 1rem",
        }}
      >
        Aucun profil configuré.{" "}
        <Link href="/profile" style={{ color: "#7A5A26", fontWeight: 600 }}>
          Créez votre profil →
        </Link>{" "}
        avant de générer un CV.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <strong style={{ color: "#1A1A18", fontSize: "0.85rem" }}>
        Choisir le profil de base
      </strong>
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          onSelect={handleSelect}
          profile={profile}
          selected={profile.id === selectedId}
        />
      ))}
      <p style={{ color: "#6B6860", fontSize: "0.8rem", lineHeight: 1.5, margin: 0 }}>
        Le profil sélectionné sera utilisé comme base pour la génération IA.
      </p>
    </div>
  );
}
