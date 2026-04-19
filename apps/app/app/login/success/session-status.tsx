"use client";

import React from "react";
import { useEffect, useState } from "react";
import { fetchSession } from "./session-client";

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      email: string;
      expiresAt: string;
      role: string;
    };

export function SessionStatus() {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const payload = await fetchSession();

        if (!cancelled) {
          setState({
            status: "ready",
            email: payload.session.email,
            expiresAt: payload.session.expiresAt,
            role: payload.session.role,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Impossible de charger la session.",
          });
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p style={{ color: "#6B6860", margin: 0 }}>Validation de la session…</p>;
  }

  if (state.status === "error") {
    return <p style={{ color: "#C0392B", margin: 0 }}>{state.message}</p>;
  }

  return (
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
      <dd style={{ margin: 0 }}>{state.email}</dd>
      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Role</dt>
      <dd style={{ margin: 0 }}>{state.role}</dd>
      <dt style={{ color: "#6B6860", fontWeight: 600 }}>Expire le</dt>
      <dd style={{ margin: 0 }}>
        {new Date(state.expiresAt).toLocaleString("fr-FR", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </dd>
    </dl>
  );
}
