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
  documentBlockRegistry,
  getBlocksForTemplateKind,
  Input,
  Label,
  PaperStyles,
  type ShellNavItem,
  Textarea,
} from "./index";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER } from "../../types/src";

const shellNavigation: ShellNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Vue d'ensemble",
    shortLabel: "DB",
    isActive: true,
  },
  {
    href: "/templates",
    label: "Templates",
    description: "Bibliotheque",
    shortLabel: "TP",
  },
  {
    href: "/applications",
    label: "Candidatures",
    description: "Suivi",
    shortLabel: "CD",
  },
];

describe("AppShell", () => {
  it("should render the provided title and description", () => {
    const markup = renderToStaticMarkup(
      <>
        <PaperStyles />
        <AppShell
          title="Paper Shell"
          description="Rendered for coverage."
          navigation={shellNavigation}
        />
      </>,
    );

    expect(markup).toContain("Paper Shell");
    expect(markup).toContain("Rendered for coverage.");
    expect(markup).toContain("Papier &amp; Crayon");
    expect(markup).toContain("Navigation principale");
    expect(markup).toContain("Sections principales");
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Composants de base disponibles");
    expect(markup).toContain("WCAG AA ready");
    expect(markup).toContain("--paper-canvas");
    expect(markup).toContain("@media (min-width: 768px)");
    expect(markup).toContain("@media (min-width: 1024px)");
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

describe("document blocks", () => {
  it("should expose the full reusable CV and letter block registry", () => {
    const cvBlocks = getBlocksForTemplateKind(TEMPLATE_KIND_CV);
    const letterBlocks = getBlocksForTemplateKind(TEMPLATE_KIND_LETTER);

    expect(cvBlocks.map(([name]) => name)).toEqual([
      "CVHeader",
      "SummaryBlock",
      "ExperienceItem",
      "EducationItem",
      "SkillsList",
      "CertificationItem",
      "LanguageItem",
      "ProjectItem",
      "Divider",
      "SectionTitle",
    ]);
    expect(letterBlocks.map(([name]) => name)).toEqual([
      "LMHeader",
      "LMBody",
      "LMSignature",
      "Divider",
      "SectionTitle",
    ]);
    expect(documentBlockRegistry.ExperienceItem.fields).toEqual([
      "company",
      "position",
      "startDate",
      "endDate",
      "description",
      "achievements",
    ]);
  });

  it("should let admin and user flows reuse the same block definitions", () => {
    const adminPalette = renderToStaticMarkup(
      <ul>
        {Object.entries(documentBlockRegistry).map(([name, definition]) => (
          <li key={name}>
            {definition.label}:{definition.fields.join(",")}
          </li>
        ))}
      </ul>,
    );

    const userDocument = renderToStaticMarkup(
      <article>
        {[
          "CVHeader",
          "SectionTitle",
          "SummaryBlock",
          "Divider",
          "ExperienceItem",
        ].map((blockName) => {
          const definition = documentBlockRegistry[
            blockName as keyof typeof documentBlockRegistry
          ];
          const Component = definition.component as (
            props: (typeof definition)["defaultProps"],
          ) => React.ReactElement;

          return <Component key={blockName} {...definition.defaultProps} />;
        })}
      </article>,
    );

    expect(adminPalette).toContain("CV Header:firstName,lastName,title");
    expect(adminPalette).toContain("Letter Body:paragraph1,paragraph2,paragraph3");
    expect(userDocument).toContain("Jane Doe");
    expect(userDocument).toContain("Senior Product Engineer");
    expect(userDocument).toContain("Owned the document editor roadmap");
  });

  it("should render every block with its default props", () => {
    const markup = renderToStaticMarkup(
      <article>
        {Object.entries(documentBlockRegistry).map(([name, definition]) => {
          const Component = definition.component as (
            props: (typeof definition)["defaultProps"],
          ) => React.ReactElement;

          return <Component key={name} {...definition.defaultProps} />;
        })}
      </article>,
    );

    expect(markup).toContain("Solutions Architect Associate");
    expect(markup).toContain("Template Studio");
    expect(markup).toContain("Application for Senior Frontend Engineer");
    expect(markup).toContain("I would welcome the opportunity to discuss this role further.");
  });

  it("should handle the optional document block branches", () => {
    const markup = renderToStaticMarkup(
      <article>
        <documentBlockRegistry.ExperienceItem.component
          {...documentBlockRegistry.ExperienceItem.defaultProps}
          achievements={[]}
        />
        <documentBlockRegistry.EducationItem.component
          {...documentBlockRegistry.EducationItem.defaultProps}
          mention=""
        />
        <documentBlockRegistry.ProjectItem.component
          {...documentBlockRegistry.ProjectItem.defaultProps}
          url=""
        />
        <documentBlockRegistry.Divider.component style="spaced" />
        <documentBlockRegistry.SectionTitle.component
          label="Summary"
          style="plain"
        />
      </article>,
    );

    expect(markup).not.toContain("<ul");
    expect(markup).toContain("Universite de Lille");
    expect(markup).not.toContain("https://example.com/template-studio");
    expect(markup).toContain("border-top:1px dashed");
    expect(markup).toContain(">Summary<");
  });
});
