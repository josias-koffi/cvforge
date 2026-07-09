import React from "react";
import { paperTokens } from "@cvforge/ui/design-system";
import {
  AuthColumn,
  AuthConsentField,
  AuthCopy,
  AuthErrorBanner,
  AuthEyebrow,
  AuthFooterLink,
  AuthHeading,
  AuthSubmitButton,
} from "../auth-column";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorMessage =
    resolvedSearchParams?.error === "request_failed"
      ? "Impossible de generer le magic link pour le moment."
      : resolvedSearchParams?.error === "consent_required"
        ? "Le consentement RGPD est requis pour creer un compte."
        : resolvedSearchParams?.error === "session_unavailable"
          ? "Le service d'authentification est indisponible pour le moment."
          : null;

  return (
    <AuthColumn>
      <div>
        <AuthEyebrow>Authentification</AuthEyebrow>
        <div style={{ marginTop: paperTokens.spacing.md }}>
          <AuthHeading>Connexion passwordless</AuthHeading>
        </div>
      </div>

      <AuthCopy>
        Entrez votre email pour recevoir un magic link. Le lien ouvre une session
        signee, persistante et expiree selon la duree configuree cote API.
      </AuthCopy>

      {errorMessage ? <AuthErrorBanner>{errorMessage}</AuthErrorBanner> : null}

      <form
        action="/login/request"
        method="post"
        style={{ display: "grid", gap: paperTokens.spacing.md }}
      >
        <label
          htmlFor="email"
          style={{ color: paperTokens.color.text, fontWeight: 600 }}
        >
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="vous@example.com"
          style={{
            border: `1px solid ${paperTokens.color.border}`,
            borderRadius: paperTokens.radius.md,
            padding: `${paperTokens.spacing.md} ${paperTokens.spacing.lg}`,
          }}
        />
        <AuthConsentField id="consent-accepted" name="consentAccepted">
          Je consens a la creation de mon compte et j&apos;accepte les futures CGU et
          la politique de confidentialite du MVP, y compris l&apos;usage encadre
          d&apos;OpenRouter/Mistral.
        </AuthConsentField>
        <AuthSubmitButton>Recevoir mon magic link</AuthSubmitButton>
      </form>

      <AuthCopy>
        Le lien a une duree de vie courte. La duree de session recommandee est
        actuellement de 7 jours, en attendant la decision produit finale.
      </AuthCopy>

      <AuthFooterLink href="/">Retour a l&apos;accueil</AuthFooterLink>
    </AuthColumn>
  );
}
