import React from "react";
import {
  AuthColumn,
  AuthCopy,
  AuthFactList,
  AuthFactTerm,
  AuthFactValue,
  AuthFooterLink,
  AuthHeading,
} from "../../auth-column";

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
    <AuthColumn>
      <AuthHeading>Verifiez votre boite mail</AuthHeading>
      <AuthCopy>
        Un email contenant votre magic link vient d&apos;etre envoye. Ouvrez votre
        boite de reception puis cliquez sur le lien pour terminer la connexion.
      </AuthCopy>
      <AuthFactList>
        <AuthFactTerm>Email</AuthFactTerm>
        <AuthFactValue>{email}</AuthFactValue>
        <AuthFactTerm>Expiration du lien</AuthFactTerm>
        <AuthFactValue>{expiresAt}</AuthFactValue>
        <AuthFactTerm>Session signee</AuthFactTerm>
        <AuthFactValue>{sessionDurationDays} jours (configurable)</AuthFactValue>
      </AuthFactList>
      <AuthCopy>
        Pensez a verifier vos spams si vous ne voyez pas le message tout de suite.
      </AuthCopy>

      <AuthFooterLink href="/login">Generer un nouveau lien</AuthFooterLink>
    </AuthColumn>
  );
}
