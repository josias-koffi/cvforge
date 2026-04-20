"use client";

import React, { useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        alignItems: "center",
        display: "grid",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <Card style={{ margin: "0 auto", maxWidth: "40rem", width: "100%" }}>
        <CardHeader>
          <CardTitle>Une erreur est survenue</CardTitle>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            CVforge n&apos;a pas pu afficher cette page correctement. Vous pouvez
            reessayer immediatement.
          </p>
          <div>
            <Button onClick={() => reset()} type="button">
              Reessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
