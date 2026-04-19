import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PaperStyles,
  Textarea,
} from "./index";

describe("AppShell", () => {
  it("should render the provided title and description", () => {
    const markup = renderToStaticMarkup(
      <>
        <PaperStyles />
        <AppShell title="Paper Shell" description="Rendered for coverage." />
      </>,
    );

    expect(markup).toContain("Paper Shell");
    expect(markup).toContain("Rendered for coverage.");
    expect(markup).toContain("Papier &amp; Crayon");
    expect(markup).toContain("Composants de base disponibles");
    expect(markup).toContain("WCAG AA ready");
    expect(markup).toContain("--paper-canvas");
    expect(markup).toContain("@media (min-width: 768px)");
  });
});

describe("base primitives", () => {
  it("should expose styled building blocks for forms and cards", () => {
    const markup = renderToStaticMarkup(
      <>
        <PaperStyles />
        <Card>
          <CardHeader>
            <CardTitle>Heading</CardTitle>
            <CardDescription>Supporting copy</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="jane@example.com" />
            <Textarea placeholder="Résumé" />
            <Button variant="ghost">Continue</Button>
          </CardContent>
        </Card>
      </>,
    );

    expect(markup).toContain("cvforge-card");
    expect(markup).toContain("cvforge-button--ghost");
    expect(markup).toContain("cvforge-input");
    expect(markup).toContain("cvforge-textarea");
    expect(markup).toContain("cvforge-label");
  });
});
