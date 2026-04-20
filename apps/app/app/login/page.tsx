import React from "react";
import Link from "next/link";

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
      : null;

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        margin: "0 auto",
        maxWidth: "32rem",
        padding: "3rem 1.5rem",
      }}
    >
      <div>
        <p
          style={{
            color: "#6B6860",
            fontSize: "0.875rem",
            letterSpacing: "0.08em",
            marginBottom: "0.75rem",
            textTransform: "uppercase",
          }}
        >
          Authentification
        </p>
        <h1
          style={{
            color: "#1A1A18",
            fontFamily: "Lora, serif",
            fontSize: "2rem",
            margin: 0,
          }}
        >
          Connexion passwordless
        </h1>
      </div>

      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
        Entrez votre email pour recevoir un magic link. Le lien ouvre une session
        signee, persistante et expiree selon la duree configuree cote API.
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

      <form
        action="/login/request"
        method="post"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D9D4CA",
          borderRadius: "1rem",
          display: "grid",
          gap: "0.75rem",
          padding: "1.25rem",
        }}
      >
        <label
          htmlFor="email"
          style={{ color: "#1A1A18", fontWeight: 600 }}
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
            border: "1px solid #CFC8BC",
            borderRadius: "0.75rem",
            padding: "0.875rem 1rem",
          }}
        />
        <label
          htmlFor="consent-accepted"
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          <input
            id="consent-accepted"
            name="consentAccepted"
            required
            type="checkbox"
            value="true"
          />
          <span>
            Je consens a la creation de mon compte et j&apos;accepte les futures CGU et
            la politique de confidentialite du MVP, y compris l&apos;usage encadre
            d&apos;OpenRouter/Mistral.
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
          Recevoir mon magic link
        </button>
      </form>

      <p style={{ color: "#6B6860", margin: 0 }}>
        Le lien a une duree de vie courte. La duree de session recommandee est
        actuellement de 7 jours, en attendant la decision produit finale.
      </p>

      <Link href="/" style={{ color: "#2C2C2A" }}>
        Retour a l&apos;accueil
      </Link>
    </main>
  );
}
