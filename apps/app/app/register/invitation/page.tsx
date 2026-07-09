import React from "react";
import { getServerApiUrl } from "../../auth-config";
import {
  AuthColumn,
  AuthConsentField,
  AuthCopy,
  AuthErrorBanner,
  AuthFactList,
  AuthFactTerm,
  AuthFactValue,
  AuthFooterLink,
  AuthHeading,
  AuthSubmitButton,
} from "../../auth-column";

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
      <AuthColumn>
        <AuthHeading>Invitation invalide</AuthHeading>
        <AuthCopy>
          Cette invitation est absente, deja consommee ou expiree.
        </AuthCopy>
        <AuthFooterLink href="/login">Retour a la connexion</AuthFooterLink>
      </AuthColumn>
    );
  }

  return (
    <AuthColumn>
      <AuthHeading>
        Invitation {invitation.role === "admin" ? "admin" : "utilisateur"}
      </AuthHeading>
      <AuthCopy>
        Cette invitation nominative est reservee a {invitation.email}. En la
        consommant, vous ouvrez une session signee avec le role invite.
      </AuthCopy>

      {errorMessage ? <AuthErrorBanner>{errorMessage}</AuthErrorBanner> : null}

      <AuthFactList>
        <AuthFactTerm>Email invite</AuthFactTerm>
        <AuthFactValue>{invitation.email}</AuthFactValue>
        <AuthFactTerm>Role attribue</AuthFactTerm>
        <AuthFactValue>{invitation.role}</AuthFactValue>
        <AuthFactTerm>Expire le</AuthFactTerm>
        <AuthFactValue>
          {new Date(invitation.expiresAt).toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </AuthFactValue>
      </AuthFactList>

      <form
        action="/register/invitation/accept"
        method="post"
        style={{ display: "grid", gap: "1rem" }}
      >
        <input name="token" type="hidden" value={token} />
        <AuthConsentField id="invitation-consent-accepted" name="consentAccepted">
          J&apos;accepte la creation de mon compte invite et le traitement des
          donnees necessaires au MVP selon les futures CGU et la politique de
          confidentialite.
        </AuthConsentField>
        <AuthSubmitButton>Accepter l&apos;invitation</AuthSubmitButton>
      </form>

      <AuthCopy>
        Ce lien est a usage unique et expire automatiquement apres 48 heures.
      </AuthCopy>
    </AuthColumn>
  );
}
