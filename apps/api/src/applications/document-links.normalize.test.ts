import type { CVDocumentContent } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { withContactLinks } from "./document-links.normalize";

function legacy(candidate: Record<string, unknown>) {
  return { candidate } as unknown as CVDocumentContent;
}

describe("withContactLinks", () => {
  it("ports a pre-links document's LinkedIn and GitHub into the list", () => {
    const migrated = withContactLinks(
      legacy({
        firstName: "Jémima",
        github: "",
        linkedin: " https://www.linkedin.com/in/jemima ",
      }),
    );

    expect(migrated.candidate.links).toEqual([
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jemima" },
    ]);
    expect(migrated.candidate).not.toHaveProperty("linkedin");
    expect(migrated.candidate.firstName).toBe("Jémima");
  });

  it("gives an empty list to a document that had no link", () => {
    expect(withContactLinks(legacy({ firstName: "A" })).candidate.links).toEqual([]);
  });

  it("returns a current document and a missing one untouched", () => {
    const current = legacy({ links: [{ label: "Site", url: "a.fr" }] });

    expect(withContactLinks(current)).toBe(current);
    expect(withContactLinks(null)).toBeNull();
  });
});
