// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { InterviewSetupWizard } from "./interview-setup-wizard";

const APPLICATIONS = [
  { companyName: "Acme Corp", id: "app-001", title: "Product Engineer" },
  { companyName: null, id: "app-002", title: "Backend Dev" },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.removeChild(container);
});

describe("InterviewSetupWizard", () => {
  it("renders step 1 on mount", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    expect(container.textContent).toContain("Pour quelle candidature");
    expect(container.textContent).toContain("Mode pratique libre");
    expect(container.textContent).toContain("Candidature");
  });

  it("shows applications list in step 1", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    expect(container.textContent).toContain("Product Engineer");
    expect(container.textContent).toContain("Backend Dev");
  });

  it("pre-selects candidature from initialCandidatureId", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard
          applications={APPLICATIONS}
          initialCandidatureId="app-001"
        />,
      );
    });

    expect(container.textContent).toContain("Product Engineer");
    expect(container.textContent).toContain("Acme Corp");
  });

  it("navigates to step 2 when Suivant is clicked", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    const suivantButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Suivant"),
    );
    expect(suivantButton).toBeDefined();

    act(() => {
      suivantButton?.click();
    });

    expect(container.textContent).toContain("Quel style de recruteur");
    expect(container.textContent).toContain("Standard");
    expect(container.textContent).toContain("Agressif");
    expect(container.textContent).toContain("Comportemental");
  });

  it("navigates to step 3 after step 2", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    const buttons = () => Array.from(container.querySelectorAll("button"));

    act(() => {
      buttons().find((btn) => btn.textContent?.includes("Suivant"))?.click();
    });

    act(() => {
      buttons().find((btn) => btn.textContent?.includes("Suivant"))?.click();
    });

    expect(container.textContent).toContain("Langue et paramètres");
    expect(container.textContent).toContain("Démarrer l'entretien");
  });

  it("shows Retour button on step 2 and 3", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    const buttons = () => Array.from(container.querySelectorAll("button"));

    act(() => {
      buttons().find((btn) => btn.textContent?.includes("Suivant"))?.click();
    });

    expect(container.textContent).toContain("Retour");
  });

  it("shows all 5 recruiter profiles in step 2", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    act(() => {
      Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.textContent?.includes("Suivant"))
        ?.click();
    });

    expect(container.textContent).toContain("Standard");
    expect(container.textContent).toContain("Agressif");
    expect(container.textContent).toContain("Passif");
    expect(container.textContent).toContain("Technique");
    expect(container.textContent).toContain("Comportemental");
  });

  it("shows FR and EN language options in step 3", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    const buttons = () => Array.from(container.querySelectorAll("button"));

    act(() => { buttons().find((b) => b.textContent?.includes("Suivant"))?.click(); });
    act(() => { buttons().find((b) => b.textContent?.includes("Suivant"))?.click(); });

    expect(container.textContent).toContain("Français");
    expect(container.textContent).toContain("English");
  });

  it("displays step indicator with 3 steps", () => {
    act(() => {
      root.render(
        <InterviewSetupWizard applications={APPLICATIONS} initialCandidatureId="" />,
      );
    });

    const nav = container.querySelector('[aria-label="Étapes du setup"]');
    expect(nav).not.toBeNull();
    expect(container.textContent).toContain("Paramètres");
  });
});
