import React from "react";
import Link from "next/link";

export default function ForbiddenPage() {
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
        Acces refuse
      </h1>
      <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
        Cette section est reservee aux administrateurs. Connectez-vous avec un
        compte autorise ou revenez au tableau de bord candidat.
      </p>
      <Link href="/" style={{ color: "#2C2C2A", fontWeight: 600 }}>
        Retour au tableau de bord
      </Link>
    </main>
  );
}
