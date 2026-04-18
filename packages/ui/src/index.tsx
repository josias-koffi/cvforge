import React from "react";
type AppShellProps = {
  title: string;
  description: string;
};

export function AppShell({ title, description }: AppShellProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background:
          "linear-gradient(180deg, rgba(247, 240, 226, 1) 0%, rgba(255, 252, 247, 1) 100%)",
        color: "#2f241f",
        fontFamily: "Georgia, serif",
      }}
    >
      <section style={{ maxWidth: "40rem", textAlign: "center" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}>
          CVforge
        </p>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>{title}</h1>
        <p style={{ fontSize: "1.125rem", lineHeight: 1.6 }}>{description}</p>
      </section>
    </main>
  );
}
