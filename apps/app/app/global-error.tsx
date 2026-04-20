"use client";

import React, { useEffect } from "react";
import { PaperStyles, Button, Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import { paperThemeBodyStyle } from "@cvforge/ui/design-system";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={paperThemeBodyStyle}>
        <PaperStyles />
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
              <CardTitle>Erreur critique</CardTitle>
            </CardHeader>
            <CardContent style={{ display: "grid", gap: "1rem" }}>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Une erreur critique a interrompu le chargement de l&apos;application.
                Vous pouvez tenter un nouveau chargement.
              </p>
              <div>
                <Button onClick={() => reset()} type="button">
                  Recharger
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </body>
    </html>
  );
}
