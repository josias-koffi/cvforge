import React from "react";
import Link from "next/link";
import { SessionStatus } from "./session-status";

export default function LoginSuccessPage() {
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
        Session ouverte
      </h1>
      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
        Le magic link a ete consomme par l&apos;API. Cette page verifie ensuite la
        session signee et persistante renvoyee par le backend.
      </p>
      <SessionStatus />
      <Link href="/" style={{ color: "#2C2C2A" }}>
        Retour a l&apos;application
      </Link>
    </main>
  );
}
