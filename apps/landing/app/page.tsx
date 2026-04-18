import React from "react";
import { AppShell } from "@cvforge/ui";
import { landingContent } from "./content";

export default function LandingPage() {
  return (
    <AppShell
      title={landingContent.title}
      description={landingContent.description}
    />
  );
}
