import { describe, expect, it } from "vitest";
import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types";
import { renderCvPdfHtml, renderLetterPdfHtml } from "./index";

const cvContent: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "alice@example.com",
    firstName: "Alice",
    github: "",
    lastName: "Martin",
    linkedin: "",
    phone: "+33600000000",
    summary: "Profil cible",
    title: "Engineer",
  },
  certifications: [{ issuer: "AWS", title: "Architect", year: "2025" }],
  education: [
    {
      degree: "Master",
      description: "Systèmes distribués",
      institution: "Université",
      mention: "Bien",
      year: "2020",
    },
  ],
  experiences: [
    {
      achievements: ["Résultat mesurable"],
      company: "CVforge",
      description: "Description",
      endDate: "2026",
      position: "Engineer",
      startDate: "2024",
    },
  ],
  interests: "Lecture",
  languages: [{ language: "Anglais", level: "C1" }],
  projects: [
    {
      description: "Outil interne",
      title: "Plateforme",
      url: "https://example.com?a=1&b=2",
    },
  ],
  skills: {
    categories: [{ items: ["TypeScript", "NestJS"], label: "Backend" }],
    hard: ["TypeScript"],
    soft: ["Communication"],
  },
};

const letterContent: LetterDocumentContent = {
  body: {
    paragraph1: "Premier paragraphe.",
    paragraph2: "Deuxième paragraphe.",
    paragraph3: "Troisième paragraphe.",
  },
  candidate: {
    city: "Paris",
    email: "alice@example.com",
    firstName: "Alice",
    github: "",
    lastName: "Martin",
    linkedin: "",
    phone: "+33600000000",
    title: "Engineer",
  },
  company: { city: "Lyon", name: "Acme" },
  date: "10 juin 2026",
  object: "Candidature",
  signature: { firstName: "Alice", lastName: "Martin" },
};

describe("document renderer", () => {
  it("renders the CV preview and PDF from the same ordered model", () => {
    const html = renderCvPdfHtml(cvContent);

    expect(html).toContain(
      "var(--preview-margin-inline, 7.143%)",
    );
    expect(html).toContain("<strong>Backend</strong> : TypeScript · NestJS");
    expect(html.indexOf("Profil")).toBeLessThan(html.indexOf("Compétences clés"));
    expect(html.indexOf("Compétences clés")).toBeLessThan(
      html.indexOf("Expériences"),
    );
    expect(html).toContain("Formation");
    expect(html).toContain("Centres d'intérêt");
    expect(html).toContain("Anglais C1");
    expect(html).toContain("Architect (2025) · AWS");
    expect(html).toContain("https://example.com?a=1&amp;b=2");
  });

  it("falls back to flat skills and omits empty optional sections", () => {
    const html = renderCvPdfHtml({
      ...cvContent,
      candidate: { ...cvContent.candidate, summary: "" },
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      projects: [],
      skills: {
        categories: [],
        hard: ["TypeScript", "<Node>"],
        soft: [],
      },
    });

    expect(html).toContain("<h2>Compétences</h2>");
    expect(html).toContain("TypeScript · &lt;Node&gt;");
    expect(html).not.toContain("<h2>Profil</h2>");
    expect(html).not.toContain("<h2>Expériences</h2>");
  });

  it("omits the skills section when no rendered skill is available", () => {
    const html = renderCvPdfHtml({
      ...cvContent,
      skills: { categories: [], hard: [], soft: ["Communication"] },
    });

    expect(html).not.toContain("<h2>Compétences</h2>");
    expect(html).not.toContain("<h2>Compétences clés</h2>");
  });

  it("renders the letter with its print-equivalent screen margins", () => {
    const html = renderLetterPdfHtml(letterContent);

    expect(html).toContain("--preview-margin-inline: 11.905%");
    expect(html).toContain("<strong>Objet :</strong> Candidature");
    expect(html).toContain("Paris, le 10 juin 2026");
  });

  it("renders optional letter content and escapes user text", () => {
    const html = renderLetterPdfHtml({
      ...letterContent,
      body: {
        ...letterContent.body,
        paragraph4: "Merci & à bientôt.",
      },
      candidate: {
        ...letterContent.candidate,
        title: "",
      },
      object: "<Lead> & plateforme",
    });

    expect(html).toContain("Merci &amp; à bientôt.");
    expect(html).toContain("&lt;Lead&gt; &amp; plateforme");
    expect(html).not.toContain('class="contact-program"');
  });
});
