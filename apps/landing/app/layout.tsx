import React from "react";
import type { ReactNode } from "react";
import { PaperStyles } from "@cvforge/ui";
import { paperThemeBodyStyle } from "@cvforge/ui/design-system";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body style={paperThemeBodyStyle}>
        <PaperStyles />
        {children}
      </body>
    </html>
  );
}
