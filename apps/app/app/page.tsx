import React from "react";
import { AppShell } from "@cvforge/ui";
import { appContent } from "./content";

export default function HomePage() {
  return (
    <AppShell
      title={appContent.title}
      description={appContent.description}
      navigation={appContent.navigation}
    />
  );
}
