import React from "react";
import Link from "next/link";
import { getServerApiUrl } from "../../auth-config";

type InvitationPreview = {
  email: string;
  role: "admin" | "user";
  expiresAt: string;
};

type InvitationPageProps = {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
};

async function readInvitationPreview(token: string) {
  const response = await fetch(
    `${getServerApiUrl()}/auth/invitations/preview?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as InvitationPreview;
}

export default async function InvitationPage({
  searchParams,
}: InvitationPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token?.trim() ?? "";
  const invitation = token ? await readInvitationPreview(token) : null;
  const errorMessage =
    resolvedSearchParams?.error === "consume_failed"
      ? "Impossible de consommer cette invitation."
      : resolvedSearchParams?.error === "consent_required"
        ? "Le consentement RGPD est requis avant d'accepter l'invitation."
      : null;

  if (!token || !invitation) {
    return (
      <main
        style={{
          display: "grid",
          gap: "1rem",
          margin: "0 auto",
          maxWidth: "36rem",
          padding: "3rem 1.5rem",
        }}
      >
        <h1
          style={{
            color: "#1A1A18",
            fontFamily: "Lora, serif",
            fontSize: "2rem",
            margin: 0,
          }}
        >
          Invitation invalide
        </h1>
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Cette invitation est absente, deja consommee ou expiree.
        </p>
        <Link href="/login" style={{ color: "#2C2C2A" }}>
          Retour a la connexion
        </Link>
      </main>
    );
  }

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        margin: "0 auto",
        maxWidth: "36rem",
        padding: "3rem 1.5rem",
      }}
    >
      <h1
        style={{
          color: "#1A1A18",
          fontFamily: "Lora, serif",
          fontSize: "2rem",
          margin: 0,
        }}
      >
        Invitation {invitation.role === "admin" ? "admin" : "utilisateur"}
      </h1>
      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
        Cette invitation nominative est reservee a {invitation.email}. En la
        consommant, vous ouvrez une session signee avec le role invite.
      </p>

      {errorMessage ? (
        <p
          style={{
            backgroundColor: "#F8E8E5",
            border: "1px solid #C0392B",
            borderRadius: "0.75rem",
            color: "#C0392B",
            margin: 0,
            padding: "0.875rem 1rem",
          }}
        >
          {errorMessage}
        </p>
      ) : null}

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
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Email invite</dt>
        <dd style={{ margin: 0 }}>{invitation.email}</dd>
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Role attribue</dt>
        <dd style={{ margin: 0 }}>{invitation.role}</dd>
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Expire le</dt>
        <dd style={{ margin: 0 }}>
          {new Date(invitation.expiresAt).toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </dd>
      </dl>

      <form action="/register/invitation/accept" method="post">
        <input name="token" type="hidden" value={token} />
        <label
          htmlFor="invitation-consent-accepted"
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "0.75rem",
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}
        >
          <input
            id="invitation-consent-accepted"
            name="consentAccepted"
            required
            type="checkbox"
            value="true"
          />
          <span>
            J&apos;accepte la creation de mon compte invite et le traitement des
            donnees necessaires au MVP selon les futures CGU et la politique de
            confidentialite.
          </span>
        </label>
        <button
          type="submit"
          style={{
            backgroundColor: "#2C2C2A",
            border: "none",
            borderRadius: "999px",
            color: "#FAFAF7",
            cursor: "pointer",
            fontWeight: 600,
            padding: "0.875rem 1.25rem",
          }}
        >
          Accepter l&apos;invitation
        </button>
      </form>

      <p style={{ color: "#6B6860", margin: 0 }}>
        Ce lien est a usage unique et expire automatiquement apres 48 heures.
      </p>
    </main>
  );
}
