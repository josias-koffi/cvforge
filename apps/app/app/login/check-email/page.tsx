import React from "react";
import Link from "next/link";

type CheckEmailPageProps = {
  searchParams?: Promise<{
    email?: string;
    expiresAt?: string;
    sessionDurationDays?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams?.email ?? "email inconnu";
  const expiresAt = resolvedSearchParams?.expiresAt
    ? new Date(resolvedSearchParams.expiresAt).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "expiration inconnue";
  const sessionDurationDays = resolvedSearchParams?.sessionDurationDays ?? "7";

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
        Verifiez votre boite mail
      </h1>
      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
        Un email contenant votre magic link vient d&apos;etre envoye. Ouvrez votre
        boite de reception puis cliquez sur le lien pour terminer la connexion.
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
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Email</dt>
        <dd style={{ margin: 0 }}>{email}</dd>
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Expiration du lien</dt>
        <dd style={{ margin: 0 }}>{expiresAt}</dd>
        <dt style={{ color: "#6B6860", fontWeight: 600 }}>Session signee</dt>
        <dd style={{ margin: 0 }}>{sessionDurationDays} jours (configurable)</dd>
      </dl>
      <p style={{ color: "#6B6860", margin: 0 }}>
        Pensez a verifier vos spams si vous ne voyez pas le message tout de suite.
      </p>

      <Link href="/login" style={{ color: "#2C2C2A" }}>
        Generer un nouveau lien
      </Link>
    </main>
  );
}
